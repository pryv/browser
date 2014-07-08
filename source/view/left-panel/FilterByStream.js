/*global $ */
var Marionette = require('backbone.marionette'),
  _ = require('underscore'),
  UNIQUE_ID = 0;

module.exports = Marionette.ItemView.extend({
  template: '#filter-by-stream-template',
  templateHelpers: function () {
    return {
      getStream: function () {
        return '';
      }.bind(this)
    };
  },
  ui: {
    label: 'label',
    checkbox: 'input[type=checkbox]',
    applyBtn: '#filter-by-stream-apply'
  },
  shushListenerOnce: false, //used to note trigger the render when we click on a checkbox
  initialize: function (options) {
    this.MainModel  = options.MainModel;
    var initListener = setInterval(function () {
      if (this.MainModel.activeFilter) {
        clearInterval(initListener);
        this.MainModel.activeFilter.addEventListener('filteredStreamsChange', function () {
          if (!this.shushListenerOnce) {
            $('#collapseFilterByStream .panel-body:first')
              .streamController('setSelectedStreams', this.MainModel.activeFilter.getStreams());
          } else {
            this.shushListenerOnce = false;
          }
        }.bind(this));
        this.MainModel.activeFilter.addEventListener('streamEnterScope', function () {
          if (!this.shushListenerOnce) {
            this.render();
          } else {
            this.shushListenerOnce = false;
          }
        }.bind(this));
      }
    }.bind(this), 100);
  },
  onRender: function () {
    if (!this.MainModel.activeFilter) {
      return;
    }
    var focusedStreams = this.MainModel.activeFilter.getStreams();
    var connections = [], streams = [];
    if (!this.MainModel.loggedConnection) {
      return;
    }
    if (this.MainModel.loggedConnection.datastore && this.MainModel.loggedConnection._accessInfo) {
      connections.push(this.MainModel.loggedConnection);
      streams = streams.concat(this.MainModel.loggedConnection.datastore.getStreams());
    }
    _.each(this.MainModel.sharingsConnections, function (c) {
      if (c._accessInfo && c.datastore) {
        connections.push(c);
        streams = streams.concat(c.datastore.getStreams());
      }
    });
    _.each(this.MainModel.bookmakrsConnections, function (c) {
      if (c._accessInfo && c.datastore) {
        connections.push(c);
        streams = streams.concat(c.datastore.getStreams());
      }
    });
    console.log('DEBUG', focusedStreams);
    $('#collapseFilterByStream .panel-body:first').off();
    $('#collapseFilterByStream .panel-body:first').streamController(
      {
        autoOpen: 1,
        multiple: true,
        streams: streams,
        connections: connections,
        editMode: false
      }
    );
    $('#collapseFilterByStream .panel-body:first')
      .streamController('setSelectedStreams', focusedStreams);
    $('#collapseFilterByStream .panel-body:first').on('inputChanged', function () {
      this.MainModel.treemap.focusOnStreams($('#collapseFilterByStream .panel-body:first')
        .streamController('getSelectedStreams'));
    }.bind(this));

    /*var self = this;
    self.ui.applyBtn.prop('disabled', true);
    self.ui.applyBtn.click(this._applyFilter.bind(this));
    this.ui.label.click(function (e) {
      e.stopPropagation();
      var input = $($(e.currentTarget).parent()).find('input');
      var checked = input.prop('checked');
      input.prop({
        indeterminate: false,
        checked: !checked
      });
      input.trigger('change');
      this.shushListenerOnce = true;
      this._applyFilter();
    }.bind(this));
    this.ui.checkbox.click(function (e) {
      e.stopPropagation();
    });
    this.ui.checkbox.change(function (e, options) {
      var checked = $(e.currentTarget).prop('checked'),
        container = $($(e.currentTarget).parent().parent().attr('data-target'), self.$el);
      self.ui.applyBtn.prop('disabled', false);
      container.find('input[type="checkbox"]').prop({
        indeterminate: false,
        checked: checked
      });
      if (!options || !options.noIndeterminate) {
        self._isChildrenCheck(container.parent().parent());
      }
    });

    this.onFocusStreamChanged(); */
    this.bindUIElements();
    setTimeout(function () {$('body').i18n(); }, 100);
  },
  onFocusStreamChanged: function () {
    var focusedStreams = this.MainModel.activeFilter.getStreams();
    var focusedStreamsIds = [];
    try {
      this.ui.checkbox.prop({
        indeterminate: false,
        checked: false
      });
    } catch (e) {
      return false;
    }

    _.each(focusedStreams, function (stream) {
      focusedStreamsIds.push(stream.connection.serialId + '/' + stream.id);
    });
    var $parent, c, s;
    _.each(this.ui.checkbox, function (checkbox) {
      checkbox = $(checkbox);
      $parent = $(checkbox.parent().parent());
      if ($parent && $parent.attr('data-connection') && $parent.attr('data-stream')) {
        c = this.MainModel.connections.get($parent.attr('data-connection'));
        if (c) {
          s = c.datastore.getStreamById($parent.attr('data-stream'));
          if (s) {
            if (focusedStreamsIds.indexOf(c.serialId + '/' + s.id) !== -1 ||
              focusedStreamsIds.length === 0) {
              checkbox.prop({
                indeterminate: false,
                checked: true
              });
              checkbox.trigger('change', {noIndeterminate: true});
            }
          }
        }
      }
    }.bind(this));
    return true;
  },
  _isChildrenCheck: function ($el) {
    if ($el.attr('id') === 'collapseFilterByStream') {
      return;
    }
    var allChecked = true;
    var allUncheck = true;
    var children  = $($el).find('input[type="checkbox"]');
    for (var i = 0; i < children.length; i++) {
      allChecked = allChecked && $(children[i]).prop('checked');
      allUncheck = allUncheck && !$(children[i]).prop('checked');
    }
    if (allUncheck) {
      $('li[data-target=#' + $el.attr('id') + ']', this.$el).find('input[type="checkbox"]').prop({
        indeterminate: false,
        checked: false
      });
    } else if (!allChecked && !allUncheck) {
      $('li[data-target=#' + $el.attr('id') + ']', this.$el).find('input[type="checkbox"]').prop({
        indeterminate: true,
        checked: false
      });
    }
    this._isChildrenCheck($($($el).parent().parent()));
  },
  _applyFilter: function () {
    var streams = [], $parent, connection, stream;
    this.ui.applyBtn.prop('disabled', true);
    _.each(this.ui.checkbox, function (checkbox) {
      checkbox = $(checkbox);
      if (checkbox.prop('checked')) {
        $parent = $(checkbox.parent().parent());
        if ($parent && $parent.attr('data-connection') && $parent.attr('data-stream')) {
          connection = this.MainModel.connections.get($parent.attr('data-connection'));
          if (connection) {
            stream = connection.datastore.getStreamById($parent.attr('data-stream'));
            if (stream) {
              streams.push(stream);
            }
          }
        }
      }
    }.bind(this));
    this.MainModel.activeFilter.focusOnStreams(streams);
  },
  _getStream: function () {
    var connections = [],
      result = '';
    if (!this.MainModel.loggedConnection) {
      return result;
    }
    if (this.MainModel.loggedConnection.datastore && this.MainModel.loggedConnection._accessInfo) {
      connections.push(this.MainModel.loggedConnection);
    }
    _.each(this.MainModel.sharingsConnections, function (c) {
      if (c._accessInfo) {
        connections.push(c);
      }
    });
    _.each(this.MainModel.bookmakrsConnections, function (c) {
      if (c._accessInfo) {
        connections.push(c);
      }
    });
    _.each(connections, function (c) {
      result += '<li class="stream-tree-summary connection disclosure"' +
        ' data-toggle="collapse" ' +
        'data-target="#collapse' + UNIQUE_ID + '">' +
        '<div class="pryv-checkbox">' +
        '<input type="checkbox" name="filterStream" id="filterStream' + UNIQUE_ID +
        '"><label for="afilterStream' + UNIQUE_ID + '">' +   c.username;
      if (c._accessInfo.name !== 'pryv-browser') {
        result += ' / ' + c._accessInfo.name;
      }
      result += '</label></div></li>';
      result += '<ul id="collapse' + UNIQUE_ID +
        '" class="panel-collapse  collapse in stream-tree-children">' +
        '<div class="panel-body">';
      UNIQUE_ID++;
      result += this._getStreamStructure(c);
      result += '</div></ul>';
    }.bind(this));

    return result;
  },
  _getStreamStructure: function (connection) {
    var rootStreams = connection.datastore.getStreams(),
      result = '';
    for (var i = 0; i < rootStreams.length; i++) {
      if (!rootStreams[i].virtual) {
        result += this._walkStreamStructure(rootStreams[i]);
      }
    }
    return result;
  },
  _walkStreamStructure: function (stream) {
    var disclosure = '';
    if (stream.children.length > 0) {
      disclosure = 'disclosure';
    }
    var result = '<li data-connection="' +
      stream.connection.serialId + '" data-stream="' +
      stream.id + '" class="stream-tree-summary collapsed ' + disclosure +
      '" data-toggle="collapse" ' +
      'data-target="#collapse' + UNIQUE_ID + '">' +
      '<div class="pryv-checkbox">' +
      '<input type="checkbox" name="filterStream" id="filterStream' + UNIQUE_ID +
      '"><label for="afilterStream' + UNIQUE_ID + '">' +
      stream.name + '</label></div></li>';
    result += '<ul id="collapse' + UNIQUE_ID +
      '" class="panel-collapse  collapse stream-tree-children">' +
      '<div class="panel-body">';
    UNIQUE_ID++;
    for (var j = 0; j < stream.children.length; j++) {
      if (!stream.children[j].virtual) {
        result += this._walkStreamStructure(stream.children[j]);
      }

    }
    result += '</div></ul>';
    return result;
  }

});


