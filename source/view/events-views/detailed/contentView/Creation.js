/* global $*/
var Marionette = require('backbone.marionette'),
  _ = require('underscore'),
  creationStep = {typeSelect: 'typeSelect', streamSelect: 'streamSelect'},
  validType = ['note/txt', 'picture/attached', 'position/wgs84'];

module.exports = Marionette.ItemView.extend({
  type: 'Creation',
  step: creationStep.typeSelect,
  getTemplate: function () {
    if (this.step === creationStep.typeSelect) {
      return '#template-detail-creation-type';
    } else if (this.step === creationStep.streamSelect) {
      return '#template-detail-creation-stream';
    }
  },
  templateHelpers: function () {
    return {
      getStream: function () {
        return this.getStream();
      }.bind(this)
    };
  },
  itemViewContainer: '#detail-content',
  ui: {
    type: '#type-select',
    stream: 'ul#stream-select'
  },
  initialize: function () {
    this.listenTo(this.model, 'change', this.render);
    this.step = creationStep.typeSelect;
  },
  onRender: function () {
    $(this.itemViewContainer).html(this.el);
    this.ui.type.bind('click', this.onTypeClick.bind(this));
    this.ui.stream.bind('click', this.onStreamClick.bind(this));
  },
  onStreamClick: function (e) {
    var streamSelected = $(e.target).attr('data-stream'),
      connectionSelected = this.connection.get($(e.target).attr('data-connection')),
      event = this.model.get('event');
    event.streamId = streamSelected;
    if (connectionSelected) {
      event.connection = connectionSelected;
      this.trigger('endOfSelection');
    }
    return true;
  },
  onTypeClick: function (e) {
    var typeSelected =  $(e.target).attr('data-type') || $(e.target).parent().attr('data-type'),
        event = this.model.get('event');

    if (validType.indexOf(typeSelected) !== -1) {
      event.type = typeSelected;
      this.step = creationStep.streamSelect;
      this.render();
    }
    return true;
  },
  getStream: function () {
    var result = '<ul id="stream-select">',
      connections  = this.connection._connections;
    _.each(connections, function (c) {
      if (!this._isWritePermission(c)) {
        return;
      }
      result += '<ul>' + c.username + ' / ' + c._accessInfo.name;
      result += this.getStreamStructure(c);
      result += '</ul>';

    }.bind(this));
    return result + '</ul>';
  },
  getStreamStructure: function (connection) {
    var rootStreams = connection.datastore.getStreams(),
      result = '';
    for (var i = 0; i < rootStreams.length; i++) {
      if (this._isWritePermission(connection, rootStreams[i])) {
        result += '<ul>' + this._walkStreamStructure(rootStreams[i]) + '</ul>';
      }
    }
    return result;

  },
  _walkStreamStructure: function (stream) {
    var preSelected = this.connectionId === stream.connection.serialId &&
      this.streamId === stream.id ? 'preSelected-stream' : '';
    var result = '<li class="' + preSelected + '" data-connection="' +
      stream.connection.serialId + '" data-stream="' +
      stream.id + '">' + stream.name + '</li>';
    for (var j = 0; j < stream.children.length; j++) {
      if (this._isWritePermission(stream.connection, stream.children[j])) {
        result += '<ul>' + this._walkStreamStructure(stream.children[j]) + '</ul>';
      }
    }
    return result;
  },
  _isWritePermission: function (connection, streamId) {
    if (!connection._accessInfo) {
      return false;
    }
    if (connection._accessInfo.type === 'personal') {
      return true;
    }
    if (connection._accessInfo.permissions &&
      connection._accessInfo.permissions[0].streamId === '*' &&
      connection._accessInfo.permissions[0].streamId !== 'read') {
      return true;
    }
    if (connection._accessInfo.permissions &&
      connection._accessInfo.permissions[0].streamId === '*' &&
      connection._accessInfo.permissions[0].streamId === 'read') {
      return false;
    }
    if (streamId) {
      return !!_.find(connection._accessInfo.permissions, function (p) {
        return p.streamId === streamId && p.level !== 'read';
      });
    }
    return false;
  }
});