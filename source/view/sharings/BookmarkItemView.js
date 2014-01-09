var Marionette = require('backbone.marionette');

module.exports = Marionette.ItemView.extend({

  tagName: 'tr',
  template: '#template-bookmarkItemView',
  events: {
    'click .bookmark-trash': '_onTrashClick'
  },
  initialize: function () {
    this.listenTo(this.model, 'change', this.render);

  },
  onRender: function () {
  },
  _onTrashClick: function () {
    this.trigger('bookmark:delete', this.model);
  }
});