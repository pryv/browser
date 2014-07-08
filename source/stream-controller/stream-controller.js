/* global jQuery, _ */
(function ($, _) {
  if (!$) {
    console.warn('Stream controller: cannot find jquery');
    return;
  }
  if (!_) {
    console.warn('Stream controller: cannot find underscore');
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
        typeof existingStreamCtrl[functionName] === 'function' && functionName[0] !== '_') {
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
    return new Date().getTime() + '-' + Math.round((Math.random() * 1000));
  };
  var canCreateStream = function (conn) {
    if (!conn._accessInfo) {
      return false;
    }

    if (conn._accessInfo.type === 'personal') {
      return true;
    }
    if (conn._accessInfo.permissions &&
      conn._accessInfo.permissions[0].level === 'manage') {
      return true;
    }
    return false;
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
    var defaults = {
      streams: [],
      connections: [],
      autoOpen: false,
      multiple: false,
      editMode: false,
      headerText: '',
      closedIcon: '<i class="fa fa-chevron-right"></i>',
      openedIcon: '<i class="fa fa-chevron-down"></i>'
    };
    this.connectionNodes = {};
    this.streamNodes = {};
    options = $.extend({}, defaults, options);
    this.options = options;
    this.$el = $($el);
    var $html = this._initHtml();
    $html.appendTo(this.$el);
    this.$streamList = $html.find('.stream-controller-stream-list');
    this.$header = $html.find('.stream-controller-header');
    this.$footer = $html.find('.stream-controller-footer');
    this.$manage = $html.find('.stream-controller-manage');
    this.isManageOpened = false;
    this.isNewStreamOpened = false;
    this.isSelectingParent = false;
    this.editingStream = {};
    this._initHeader();
    this._initFooter();
    this._initManage();
    this.streams = $.isArray(options.streams) ? options.streams : [options.streams];
    this.connections = $.isArray(options.connections) ? options.connections : [options.connections];
    this.addConnections(this.connections);
    this.addStreams(this.streams);
    return this;
  };
  StreamController.prototype._initHtml = function () {
    var $html = $('<div class="stream-controller-container">' +
      '<div class="stream-controller-select">' +
      '<div class="stream-controller-header hide-by-overlay"></div>' +
      '<div class="stream-controller-stream-list"></div>' +
      '<div class="stream-controller-footer hide-by-overlay"></div>' +
      '</div>' +
      '<div class="stream-controller-manage"></div>' +
      '</div>');
    return $html;
  };
  StreamController.prototype._initHeader = function () {
    if (this.options.headerText && typeof this.options.headerText === 'string') {
      this.$header.append('<div class="header-title pull-left">' + this.options.headerText + '</div>');
    }
    if (this.options.editMode === 'toggle') {
      this.isManageOpened = false;
      var $manageToggle = $('<div class="manage-toggle btn btn-default btn-xs pull-right">Manage</div>');
      $manageToggle.appendTo(this.$header);
      $manageToggle.click(function () {
        if (!this.isManageOpened) {
          this.isManageOpened = true;
          this.$manage.show();
          this.$footer.show();
          this._refreshManageView('toggleManageClicked');
          $manageToggle.text('Close');
        } else {
          this.isManageOpened = false;
          this.$manage.hide();
          this.$footer.hide();
          $manageToggle.text('Manage');
        }
      }.bind(this));
    }
    if (this.options.editMode === false && this.options.headerText === '') {
      this.$header.hide();
    }
  };
  StreamController.prototype._initFooter = function () {
    if (this.options.editMode === true || this.options.editMode === 'toggle') {
      this.isNewStreamOpened = false;
      var $newStream = $('<a href="#" class="add-new-stream "><div>+</div></a>');
      $newStream.click(function (e) {
        e.preventDefault();
        if (this.isNewStreamOpened) {
          this.isNewStreamOpened = false;
          $newStream.removeClass('opened');
        } else {
          this.isNewStreamOpened = true;
          $newStream.addClass('opened');
        }
        this._refreshManageView('addNewClicked');
      }.bind(this));
      $newStream.appendTo(this.$footer);
      if (this.options.editMode === 'toggle') {
        this.$footer.hide();
      }
    } else {
      this.$footer.hide();
    }
  };
  StreamController.prototype._initManage = function () {
    if (this.options.editMode === true || this.options.editMode === 'toggle') {
      var uniqueId = getUniqueId();
      var colors = ['#5383bd', '#4dc1ea', '#3ab899', '#a2ca69', '#fcce55',
        '#f56d52', '#ed5565', '#9e8fc0', '#e287b5', '#ccd1d8', '#666e79'];
      var colHtml = '';
      $.each(colors, function (i, color) {
        colHtml += '<label><input type="radio" value="' + color + '" name="' +
          uniqueId +
          '"><span class="pins-color" style="background-color: ' + color + '"></span></label>';
      });
      var html = $(
        '<form role="form">' +
          '<div class="form-group manage-stream-name hide-by-overlay">' +
            '<label>Name</label><input type="text" class="form-control" required>' +
          '</div>' +
          '<div class="form-group manage-stream-color hide-by-overlay">' +
            '<label>Color</label>' + colHtml +
          '</div>' +
          '<div class="form-group manage-stream-parent">' +
            '<label>Parent</label>' +
            '<div class="btn-group">' +
               '<button type="button" class="btn btn-default parent-name" disabled>' +
              'Select Parent' +
            '</button>' +
            '<button type="button" class="btn btn-default parent-select">' +
              '<i class=" fa fa-list"></i>&nbsp;' +
            '</button>' +
          '</div>' +
          '</div>' +
          '<div class="manage-stream-save hide-by-overlay">' +
            '<button type="submit" class="btn btn-primary">' +
              '<i class="fa fa-spin fa-spinner"></i> Save' +
            '</button>' +
          '</div>' +
          '<div class="manage-stream-delete hide-by-overlay">' +
            '<button class="btn btn-danger"><i class="fa fa-spin fa-spinner"></i> Delete</button>' +
          '</div>' +
        '</form>' +
        '<div class="manage-empty"><h5>Select a stream</h5></div>');
      this.uiManage = {};
      this.uiManage.streamName = html.find('.manage-stream-name input');
      this.uiManage.streamColor = html.find('.manage-stream-color');
      this.uiManage.streamParentName = html.find('.manage-stream-parent .parent-name');
      this.uiManage.streamParentSelect = html.find('.manage-stream-parent .parent-select');
      this.uiManage.streamDeleteBtn = html.find('.manage-stream-delete button');
      this.uiManage.streamDeleteSpin = html.find('.manage-stream-delete .fa-spinner').hide();
      this.uiManage.streamSaveBtn = html.find('.manage-stream-save button');
      this.uiManage.streamSaveSpin = html.find('.manage-stream-save .fa-spinner').hide();

      html.appendTo(this.$manage);
      this.uiManage.form = this.$manage.find('form');
      this.uiManage.empty = this.$manage.find('.manage-empty');
      this.uiManage.streamDeleteBtn.click(this._deleteClicked.bind(this));
      this.uiManage.form.submit(this._submitClicked.bind(this));
      this.uiManage.streamParentSelect.click(this._startParentSelection.bind(this));
      if (this.options.editMode === 'toggle') {
        this.$manage.hide();
      }
      if (this.options.editMode === true) {
        this.isManageOpened = true;
        this._refreshManageView('toggleManageClicked');
      }
    } else {
      this.$manage.hide();
    }
  };
  StreamController.prototype._submitClicked = function (e) {
    e.preventDefault();
    if (this.editingStream) {
      var updatedStream = this.editingStream, newName, newColor, newParentId;
      if (updatedStream.id) {
        newName = this.uiManage.streamName.val();
        if (newName && typeof newName === 'string' && newName !== '') {
          updatedStream._oldName = updatedStream.name;
          updatedStream.name = newName;
        }
        newColor = this.uiManage.streamColor.find('input:checked').val();
        if (newColor && typeof newColor === 'string' && newColor !== '') {
          if (!updatedStream.clientData) {
            updatedStream.clientData = {};
          }
          updatedStream._oldColor = updatedStream.color;
          updatedStream.color = newColor;
          updatedStream.clientData['pryv-browser:bgColor'] = newColor;
        }
        newParentId = this.uiManage.streamParentName.data('parentId');
        updatedStream._oldParentId = updatedStream.parentId;
        updatedStream.parentId = newParentId;
        console.log('DEBUG', newName, newColor, newParentId, updatedStream);
        this.updateStreams([updatedStream]);
      }  else {
        newName = this.uiManage.streamName.val();
        if (newName && typeof newName === 'string' && newName !== '') {
          updatedStream.name = newName;
        }
        newColor = this.uiManage.streamColor.find('input:checked').val();
        if (newColor && typeof newColor === 'string' && newColor !== '') {
          if (!updatedStream.clientData) {
            updatedStream.clientData = {};
          }
          updatedStream.color = newColor;
          updatedStream.clientData['pryv-browser:bgColor'] = newColor;
        }
        newParentId = this.uiManage.streamParentName.data('parentId');
        updatedStream.parentId = newParentId;

        /* temp before link with js lib */
        updatedStream.connection = this.uiManage.streamParentName.data('connection');
        updatedStream.parent = this.streamNodes[getStreamId({
          id: newParentId,
          connection: updatedStream.connection
        })];
        updatedStream.id = getUniqueId();
        this.addStreams([updatedStream]);
      }
    }

  };
  StreamController.prototype._deleteClicked = function (e) {
    e.preventDefault();
    if (this.editingStream && this.editingStream.id) {
      this.uiManage.streamDeleteSpin.show();
      this.unselectAll();
      this.removeStreams([this.editingStream]);
      this.uiManage.streamDeleteSpin.hide();
      this._refreshManageView('itemClicked');
    }
  };
  StreamController.prototype._startParentSelection = function () {
    if (this.isSelectingParent) {
      return;
    }
    var overlay = $('<div class="overlay"></div>');
    var $els = this.$el.find('.hide-by-overlay');
    this.isSelectingParent = true;
    if (this.editingStream.connection) {
      $.each(this.connectionNodes, function (i, conn) {
        if (conn._connId !== getConnectionId(this.editingStream.connection)) {
          conn._node.append(overlay);
        }
      }.bind(this));
    } else {
      $.each(this.connectionNodes, function (i, conn) {
        if (!canCreateStream(conn)) {
          conn._node.append(overlay);
        }
      }.bind(this));
    }

    $els.append(overlay);
  };
  StreamController.prototype._stopParentSelection = function () {
    if (!this.isSelectingParent) {
      return;
    }
    this.$el.find('.overlay').remove();
    this.isSelectingParent = false;
  };
  StreamController.prototype._refreshManageView = function (reason) {
    var stream, parent, parentName, parentConn;
    console.log('DEBUG', '_refreshView', reason, this.getSelectedStreams());
    if (!this.isManageOpened) {
      this.editingStream = null;
    } else {
      if (reason === 'itemClicked') {
        if (this.isSelectingParent) {
          parent = this.getSelectedStreams()[0];
          if (parent && getStreamId(parent) === getStreamId(this.editingStream)) {
            // The parent stream cannot be itself
            return;
          }
          if (!parent) {
            parent = this.getSelectedConnections()[0];
          }
          if (!parent) {
            return;
          }
          parentName = parent._accessInfo ? parent.username + '/' + parent._accessInfo.name : 
            parent.name;
          parentConn = parent.connection ? parent.connection : parent;
          if ((!this.editingStream.id && canCreateStream(parentConn)) ||
            getConnectionId(this.editingStream.connection) === getConnectionId(parentConn)) {
            this.uiManage.streamParentName.text(parentName);
            this.uiManage.streamParentName.data('parentId', parent.id);
            this.uiManage.streamParentName.data('connection', parent.connection || parent);
            this._stopParentSelection();
          }

        } else if (!this.isNewStreamOpened) {
          stream = this.getSelectedStreams()[0];
          if (stream && canCreateStream(stream.connection)) {
            this.editingStream = stream;
            parentName = stream.parent ? stream.parent.name :
              stream.connection.username + '/' + stream.connection._accessInfo.name;
            this.uiManage.streamColor.find('input').prop('checked', false);
            this.uiManage.streamColor.find('input[value="' + stream.color + '"]')
              .prop('checked', true);
            this.uiManage.streamName.val(stream.name);
            this.uiManage.streamParentName.text(parentName);
            this.uiManage.streamParentName.data('parentId', stream.parentId);
            this.uiManage.streamParentName.data('connection', stream.connection);
            this.uiManage.streamDeleteBtn.show();
          } else {
            this.editingStream = null;
          }
        }

      }
      if (reason === 'toggleManageClicked' ||
        (reason === 'addNewClicked' && !this.isNewStreamOpened)) {
        stream = this.getSelectedStreams()[0];
        if (stream && canCreateStream(stream.connection)) {
          this.editingStream = stream;
          parentName = stream.parent ? stream.parent.name :
            stream.connection.username + '/' + stream.connection._accessInfo.name;
          this.uiManage.streamColor.find('input').prop('checked', false);
          this.uiManage.streamColor.find('input[value="' + stream.color + '"]')
            .prop('checked', true);
          this.uiManage.streamName.val(stream.name);
          this.uiManage.streamParentName.text(parentName);
          this.uiManage.streamParentName.data('parentId', stream.parentId);
          this.uiManage.streamParentName.data('connection', stream.connection);
          this.uiManage.streamDeleteBtn.show();
        } else {
          this.editingStream = null;
        }
      }
      if (reason === 'addNewClicked' && this.isNewStreamOpened) {
        this.uiManage.streamName.val('');
        this.uiManage.streamColor.find('input').prop('checked', false);
        this.uiManage.streamParentName.text('Select parent');
        this.editingStream = {};
        parent = this.getSelectedStreams()[0];
        if (!parent) {
          parent = this.getSelectedConnections()[0];
        }
        if (parent) {
          parentName = parent._accessInfo ? parent.username + '/' + parent._accessInfo.name : 
            parent.name;
          parentConn = parent.connection ? parent.connection : parent;
          if (canCreateStream(parentConn)) {
            this.uiManage.streamParentName.text(parentName);
            this.uiManage.streamParentName.data('parentId', parent.id);
            this.uiManage.streamParentName.data('connection', parent.connection || parent);
            this.uiManage.streamDeleteBtn.hide();
          }
        }

      }
    }
    if (this.isManageOpened) {
      if (this.editingStream === null) {
        this.uiManage.empty.show();
        this.uiManage.form.hide();
      } else {
        this.uiManage.empty.hide();
        this.uiManage.form.show();
      }
    }
  };
  StreamController.prototype.updateStreams = function (streams) {
    if (!streams) {
      return;
    }
    streams = $.isArray(streams) ? streams : [streams];
    $.each(streams, function (i, stream) {
      this.updateStream(stream);
    }.bind(this));
  };
  StreamController.prototype.updateStream = function (stream) {
    if (!stream) {
      return;
    }
    var streamId = getStreamId(stream);
    var oldStream = this.streamNodes[streamId];
    if (streamId && oldStream) {
      if (stream.name !== oldStream.name || stream.color !== oldStream.color ||
        stream.name !== oldStream._oldName || stream.color !== oldStream._oldColor) {
        var label = '<span class="pins-color" style="background-color: ' +
          stream.color + '"></span>' + stream.name;
        oldStream._node.find('label:first').html(label);
        oldStream.name = stream.name;
        oldStream.color = stream.color;
      }

      if (stream.parentId !== oldStream.parentId || stream.parentId !== oldStream._oldParentId) {
        var $parent = this.findParentNode(stream);
        console.log('DEBUG', $parent, this.findParentNode(oldStream));
        $parent._node.find('.disclosure:first').removeClass('hidden');
        oldStream._node.detach().appendTo($parent._childNode);
        oldStream.parentId = stream.parentId;
      }
      this.streamNodes[streamId] = oldStream;
    }
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
    stream = _.clone(stream);
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
  StreamController.prototype.removeStreams = function (streams) {
    if (!streams) {
      return;
    }
    streams = $.isArray(streams) ? streams : [streams];
    $.each(streams, function (i, stream) {
      this.removeStream(stream);
      if (stream && stream.children && stream.children.length > 0) {
        this.removeStreams(stream.children);
      }
    }.bind(this));
  };
  StreamController.prototype.removeStream = function (stream) {
    if (!stream) {
      return;
    }
    var streamId = getStreamId(stream);
    if (streamId && this.streamNodes[streamId]) {
      this.streamNodes[streamId]._node.find('input').off();
      this.streamNodes[streamId]._node.off();
      this.streamNodes[streamId]._node.remove();
      delete this.streamNodes[streamId];
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
    if (!connections) {
      return;
    }
    connections = $.isArray(connections) ? connections : [connections];
    $.each(connections, function (i, conn) {
      this.addConnection(conn);
    }.bind(this));
  };
  StreamController.prototype.addConnection = function (connection) {
    if (!connection) {
      return;
    }
    connection = _.clone(connection);
    var connId = getConnectionId(connection);
    if (connId && !this.connectionNodes[connId]) {
      connection._connId = connId;
      var $html = this.generateConnectionHtml(connection);
      connection._node = $html;
      connection._childNode = $html.find('ul .panel-body');
      $html.appendTo(this.$streamList);
      this.connectionNodes[connId] = connection;
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
    var label = '<span class="pins-color" style="background-color: ' +
      stream.color + '"></span>' + stream.name;
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
    console.log('DEBUG', 'inputChanged', type, object);
    if (this.options.multiple) {
      var checkedClass = $input.checked ? 'checked' : '';
      object._childNode.find('input').prop('checked', $input.checked).prop('indeterminate', false);
      object._node.find('li').removeClass('indeterminate').addClass(checkedClass);
      if (type === 'stream') {
        var $parent = this.findParentNode(object);
        this.updateInputState($parent);
      }
    } else {
      this.unselectAll();
      $input.checked = true;
      object._node.find('li:first').addClass('checked').removeClass('indeterminate');
    }
    this.$el.trigger('inputChanged');
    this._refreshManageView('itemClicked');
  };
  StreamController.prototype.unselectAll = function ()  {
    this.$streamList.find('input').prop('checked', false);
    this.$streamList.find('li').removeClass('checked indeterminate');
  };
  StreamController.prototype.updateInputState = function (object) {
    if (object) {
      if (object._node.find('.stream-controller-connection').length === 1 &&
        object._childNode.find('input:checked').length === object._childNode.find('input').length) {
        object._node.find('input:first').prop('checked', true).prop('indeterminate', false);
        object._node.find('li:first').addClass('checked').removeClass('indeterminate');
      } else
      if (object._childNode.find('input:checked').length === 0) {
        object._node.find('input:first').prop('checked', false).prop('indeterminate', false);
        object._node.find('li:first').removeClass('checked indeterminate');
      } else {
        object._node.find('input:first').prop('checked', false).prop('indeterminate', true);
        object._node.find('li:first').removeClass('checked').addClass('indeterminate');
      }

      this.updateInputState(this.findParentNode(object));
    }
  };
  StreamController.prototype.setSelectedConnections = function (connections) {
    if (connections) {
      connections = $.isArray(connections) ? connections : [connections];
      this.unselectAll();
      $.each(connections, function (i, conn) {
        var node = this.connectionNodes[getConnectionId(conn)];
        if (node) {
          node._node.find('input').prop('checked', true).prop('indeterminate', false);
          node._node.find('li').addClass('checked').removeClass('indeterminate');
        }
      }.bind(this));
    }
  };
  StreamController.prototype.setSelectedStreams = function (streams) {
    if (streams) {
      streams = $.isArray(streams) ? streams : [streams];
      this.unselectAll();
      $.each(streams, function (i, stream) {
        var node = this.streamNodes[getStreamId(stream)];
        if (node) {
          node._node.find('input').prop('checked', true).prop('indeterminate', false);
          node._node.find('li').addClass('checked').removeClass('indeterminate');
          this.updateInputState(this.findParentNode(node));
        }
      }.bind(this));
    }
  };
})(jQuery, _);
