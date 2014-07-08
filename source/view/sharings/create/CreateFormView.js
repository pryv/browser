/* global $ */

var Marionette = require('backbone.marionette');

module.exports = Marionette.ItemView.extend({
  template: '#create-sharings-form-template',
  className: 'create-sharing full-height',
  templateHelpers: function () {
    return {
      getStream: function () {
        return '';
      }.bind(this)
    };
  },
  ui: {
    label: 'label',
    checkbox: 'input[type=checkbox]'
  },
  initialize: function () {
    this.connection = this.options.connection;
    this.streams = this.options.streams;
  },
  onRender: function () {
    this.bindUIElements();

    setTimeout(function () {
      $('body').i18n();
      $('#sharing-stream-list').streamController(
      {
        autoOpen: 1,
        multiple: false,
        streams: this.streams,
        connections: this.connection,
        editMode: 'toggle'
      });
      //$('#sharing-stream-list').streamController('setSelectedStreams', this.streams);
    }.bind(this), 200);
  }
});


