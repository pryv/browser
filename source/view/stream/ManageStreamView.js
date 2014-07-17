/* global $*/
var Marionette = require('backbone.marionette');



// The grid view
module.exports = Marionette.ItemView.extend({
  tagName: 'div',
  template: '',
  connection: null,
  streams: null,
  initialize: function () {
    this.connection = this.options.connection;
    this.streams = this.options.streams;
  },
  onRender: function () {
    $('#manage-stream').streamController({
      connections: this.connections,
      streams: this.streams,
      editMode: true,
      autoOpen: 1
    });
    $('body').i18n();
  }
});

