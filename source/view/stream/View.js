/* global $*/
var Marionette = require('backbone.marionette');



// The grid view
module.exports = Marionette.ItemView.extend({
  tagName: 'div',
  template: '#stream-config-template',
  connection: null,
  streams: null,
  initialize: function () {
    this.stream = this.options.stream;
  },
  onRender: function () {
    $('body').i18n();
  }
});
