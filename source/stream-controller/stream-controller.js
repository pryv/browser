/* global jQuery */
(function ($) {
  if (!$) {
    console.warn('Stream controller: cannot find jquery');
    return;
  }
  $.fn.streamController = function () {
    var $el, args, argument1, functionName, options;
    argument1 = arguments[0];
    args = 2 <= arguments.length ? [].slice.call(arguments, 1) : [];
    $el = this;
    if (!argument1) {
      console.warn('Stream controller: missing argument streams or connections');
      return;
    }
    if (typeof argument1 === 'object') {
      options = argument1;
      return createStreamController($el, options);
    } else if (typeof argument1 === 'string') {
      functionName = argument1;
      return callFunction($el, functionName, args);
    }
    console.warn('Stream controller: invalid arguments');
  };

  var createStreamController = function ($el, options) {
    var streamCtrl, el, existingStreamCtrl;
    console.log('DEBUG', 'createStreamController', $el, options, $el.length);
    for (var i = 0; i < $el.length; i++) {
      el = $el[i];
      existingStreamCtrl = getStreamControllerData(el);
      if (!existingStreamCtrl) {
        streamCtrl = new StreamController(el, options);
        if (!$.data(el, 'stream-controller')) {
          $.data(el, 'stream-controller', streamCtrl);
        }
      }
    }
  };
  var callFunction = function ($el, functionName, args) {
    var el, existingStreamCtrl;
    for (var i = 0; i < $el.length; i++) {
      el = $el[i];
      existingStreamCtrl = getStreamControllerData(el);
      if (existingStreamCtrl && existingStreamCtrl[functionName] &&
        typeof existingStreamCtrl[functionName] === 'function') {
        return existingStreamCtrl[functionName].apply(existingStreamCtrl, args);
      }
    }
  };
  var getConnectionId = function (connection) {
    if (connection && connection.auth && connection.username) {
      return connection.username + '-' + connection.auth;
    }
    return null;
  };
  var getStreamId = function (stream) {
    if (stream) {
      var id = getConnectionId(stream.connection);
      if (id && stream.id) {
        id += '-' + stream.id;
        return id;
      }
    }
    return null;
  };
  var getStreamLevel = function (stream) {
    if (stream) {
      var level = 2;
      var parent = stream.parent;
      while (parent)  {
        level ++;
        parent = parent.parent;
      }
      return level;
    }
    return null;
  };
  var getUniqueId = function () {
    return new Date().getTime() + '-' + Math.round((Math.random() * 100));
  };
  var getStreamControllerData = function ($el) {
    var streamCtrl = $.data($el, 'stream-controller');
    if (streamCtrl && streamCtrl instanceof StreamController) {
      return streamCtrl;
    } else {
      return null;
    }
  };
  var StreamController = function ($el, options) {
    console.log('DEBUG', 'new', $el, options);
    var defaults = {
      streams: [],
      connections: [],
      autoOpen: false,
      multiple: false,
      organize: false,
      addNew: false,
      closedIcon: '<i class="fa fa-chevron-right"></i>',
      openedIcon: '<i class="fa fa-chevron-down"></i>'
    };
    this.connectionNodes = {};
    this.streamNodes = {};
    options = $.extend({}, defaults, options);
    this.options = options;
    this.$el = $($el);
    this.streams = $.isArray(options.streams) ? options.streams : [options.streams];
    this.connections = $.isArray(options.connections) ? options.connections : [options.connections];
    this.addConnections(this.connections);
    this.addStreams(this.streams);
    return this;
  };
  StreamController.prototype.addStreams = function (streams) {
    if (!streams) {
      return;
    }
    streams = $.isArray(streams) ? streams : [streams];
    $.each(streams, function (i, stream) {
      this.addStream(stream);
      if (stream && stream.children && stream.children.length > 0) {
        this.addStreams(stream.children);
      }
    }.bind(this));
  };
  StreamController.prototype.addStream = function (stream) {
    if (!stream) {
      return;
    }
    var streamId = getStreamId(stream);
    if (streamId && !this.streamNodes[streamId]) {
      stream._streamId = streamId;
      var $html = this.generateStreamHtml(stream);
      stream._node = $html;
      stream._childNode = $html.find('ul .panel-body');
      var $parent = this.findParentNode(stream);
      $parent._node.find('.disclosure:first').removeClass('hidden');
      $html.appendTo($parent._childNode);
      this.streamNodes[streamId] = stream;
    }
  };
  StreamController.prototype.findParentNode = function (stream) {
    var parentId = getStreamId(stream.parent);
    if (stream && stream.parent && parentId && this.streamNodes[parentId]) {
      return this.streamNodes[parentId];
    } else {
      var connId = getConnectionId(stream.connection);
      if (connId && this.connectionNodes[connId]) {
        return this.connectionNodes[connId];
      }
    }
  };
  StreamController.prototype.addConnections = function (connections) {
    console.log('DEBUG', 'addConnections', connections);
    if (!connections) {
      return;
    }
    connections = $.isArray(connections) ? connections : [connections];
    $.each(connections, function (i, conn) {
      console.log('DEBUG', 'each', conn);
      this.addConnection(conn);
    }.bind(this));
  };
  StreamController.prototype.addConnection = function (connection) {
    if (!connection) {
      return;
    }
    var connId = getConnectionId(connection);
    if (connId && !this.connectionNodes[connId]) {
      connection._connId = connId;
      var $html = this.generateConnectionHtml(connection);
      connection._node = $html;
      connection._childNode = $html.find('ul .panel-body');
      $html.appendTo(this.$el);
      this.connectionNodes[connId] = connection;
      console.log('DEBUG', 'addConnections', $html, this.$el);

    }
  };
  StreamController.prototype.getSelectedConnections = function () {
    var result = [];
    $.each(this.connectionNodes, function (i, conn) {
      if (conn._node.find('input:first').prop('checked')) {
        result.push(conn);
      }
    });
    return result;
  };
  StreamController.prototype.getSelectedStreams = function () {
    var result = [];
    var parentId;
    var rootStreams = [];
    var walkStream = function (streams) {
      $.each(streams, function (i, stream) {
        if (stream._node.find('input:first').prop('checked')) {
          result.push(stream);
        } else if (stream.children) {
          walkStream(stream.children);
        }
      });
    };

    $.each(this.streamNodes, function (i, stream) {
      parentId = getStreamId(stream.parent);
      if (!(stream.parent && parentId && this.streamNodes[parentId])) {
        rootStreams.push(stream);
      }
    }.bind(this));
    walkStream(rootStreams);
    return result;
  };
  StreamController.prototype.generateStreamHtml = function (stream) {
    var label = stream.name;
    var level = getStreamLevel(stream);
    var opened = this.options.autoOpen === true || this.options.autoOpen >= level;
    return this.generateNodeHtml('stream', stream, label, false, opened);
  };
  StreamController.prototype.generateConnectionHtml = function (connection) {
    var label = connection.username;
    if (connection._accessInfo.name !== 'pryv-browser') {
      label += ' / ' + connection._accessInfo.name;
    }
    var opened = this.options.autoOpen === true || this.options.autoOpen >= 1;
    return this.generateNodeHtml('connection', connection, label, false, opened);
  };
  StreamController.prototype.generateNodeHtml = function (type, object, label,
                                                          showDisclosure, opened) {
    var inputId = getUniqueId();
    var collapseId = getUniqueId();
    var $html = $('<div><li class="stream-controller-node stream-controller-' + type  + '"></li>' +
      '</div>');
    var hidden = showDisclosure ? '' : 'hidden';
    if (this.options.multiple) {
      $html.find('li').append('<div class="pryv-checkbox">' +
        '<input type="checkbox" id="' + inputId + '"><label for="' + inputId + '">' +
        '</label></div>');
    } else {
      $html.find('li').append('<div class="pryv-radio">' +
        '<input type="radio" id="' + inputId + '"><label for="' + inputId + '">' +
        '</label></div>');
    }
    $html.find('label').html(label);
    $html.append('<ul id="' + collapseId +
      '" class="panel-collapse collapse stream-controller-child">' +
      '<div class="panel-body"></div></ul>');
    if (opened) {
      $html.find('ul').addClass('in');
      $html.find('li').append('<div class="disclosure opened ' +
        hidden + '">' + this.options.openedIcon + '</div>');
    } else {
      $html.find('li').append('<div class="disclosure closed ' +
        hidden + '">' + this.options.closedIcon + '</div>');
    }
    var self = this;
    $html.find('.disclosure').click(function () {
      var $el = $(this);
      if ($el.hasClass('opened')) {
        $el.removeClass('opened');
        $el.addClass('closed');
        $el.html(self.options.closedIcon);
        $('#' + collapseId).collapse('hide');
      } else {
        $el.removeClass('closed');
        $el.addClass('opened');
        $el.html(self.options.openedIcon);
        $('#' + collapseId).collapse('show');
      }
      return true;
    });
    $html.find('input').change(function (e) {
      this.inputChanged(e, type, object);
    }.bind(this));
    return $html;
  };
  StreamController.prototype.inputChanged = function (e, type, object)  {
    var $input = $(e.target)[0];
    object = type === 'stream' ? this.streamNodes[getStreamId(object)] :
      this.connectionNodes[getConnectionId(object)];

    if (this.options.multiple) {
      object._childNode.find('input').prop('checked', $input.checked);
      if (type === 'stream') {
        var $parent = this.findParentNode(object);
        this.updateInputState($parent);
      }
    } else {
      this.$el.find('input').prop('checked', false);
      $input.checked = true;
    }
    this.$el.trigger('inputChanged');
  };
  StreamController.prototype.updateInputState = function (object) {
    if (object) {
      if (object._childNode.find('input:checked').length === 0) {
        object._node.find('input:first').prop('checked', false).prop('indeterminate', false);
      } else {
        object._node.find('input:first').prop('checked', false).prop('indeterminate', true);
      }
      this.updateInputState(this.findParentNode(object));
    }
  };
})(jQuery);