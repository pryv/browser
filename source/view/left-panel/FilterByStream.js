/*global $ */
var Marionette = require('backbone.marionette'),
  _ = require('underscore');

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
  connections: [],
  shushListenerOnce: false, //used to note trigger the render when we click on a checkbox
  initialize: function (options) {
    this.MainModel  = options.MainModel;
    var initListener = setInterval(function () {
      if (this.MainModel.activeFilter) {
        clearInterval(initListener);
        this.MainModel.activeFilter.addEventListener('filteredStreamsChange', function () {
          if (!this.shushListenerOnce) {
            if (!this.MainModel.activeFilter.getStreams()) {
              $('#collapseFilterByStream .panel-body:first')
                .streamController('setSelectedConnections', this.connections);
            } else {
              $('#collapseFilterByStream .panel-body:first')
                .streamController('setSelectedStreams', this.MainModel.activeFilter.getStreams());
            }
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
        this.MainModel.activeFilter.addEventListener('streamLeaveScope', function () {
          if (!this.shushListenerOnce) {
            this.render();
          } else {
            this.shushListenerOnce = false;
          }
        }.bind(this));
        this.MainModel.activeFilter.addEventListener('streamChange', function () {
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
    this.connections = [];
    var streams = [];
    if (!this.MainModel.loggedConnection) {
      return;
    }
    if (this.MainModel.loggedConnection.datastore && this.MainModel.loggedConnection._accessInfo) {
      this.connections.push(this.MainModel.loggedConnection);
      streams = streams.concat(this.MainModel.loggedConnection.datastore.getStreams());
    }
    _.each(this.MainModel.sharingsConnections, function (c) {
      if (c._accessInfo && c.datastore) {
        this.connections.push(c);
        streams = streams.concat(c.datastore.getStreams());
      }
    }.bind(this));
    _.each(this.MainModel.bookmakrsConnections, function (c) {
      if (c._accessInfo && c.datastore) {
        this.connections.push(c);
        streams = streams.concat(c.datastore.getStreams());
      }
    }.bind(this));
    $('#collapseFilterByStream .panel-body:first').off();
    $('#collapseFilterByStream .panel-body:first').streamController(
      {
        autoOpen: 1,
        multiple: true,
        streams: streams,
        connections: this.connections,
        editMode: false
      }
    );
    if (!focusedStreams) {
      $('#collapseFilterByStream .panel-body:first')
        .streamController('setSelectedConnections', this.connections);
    } else {
      $('#collapseFilterByStream .panel-body:first')
        .streamController('setSelectedStreams', focusedStreams);
    }
    $('#collapseFilterByStream .panel-body:first').on('inputChanged', function () {
      this.MainModel.treemap.focusOnStreams($('#collapseFilterByStream .panel-body:first')
        .streamController('getSelectedStreams'));
    }.bind(this));

    this.bindUIElements();
    setTimeout(function () {$('body').i18n(); }, 100);
  }

});


