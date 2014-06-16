/* global $, window */
var Marionette = require('backbone.marionette');

module.exports = Marionette.ItemView.extend({
  type: 'Note',
  template: '#template-detail-content-note',
  itemViewContainer: '#detail-content',
  className: 'note-content',
  ui: {
    content: '#edit-content'
  },
  templateHelpers: function () {
    return {
      getContent: function () {
        return window.PryvBrowser.renderNote(this.model.get('event').content);
      }.bind(this)
    };
  },
  initialize: function () {
    this.listenTo(this.model, 'change', this.render);
  },
  onRender: function () {
    $(this.itemViewContainer).html(this.el);
    this.ui.content.bind('keyup input paste', function () {
      this.model.get('event').content = this.ui.content.val();
    }.bind(this));
    $('body').i18n();
  },
});