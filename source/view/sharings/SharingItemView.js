var Marionette = require('backbone.marionette');

module.exports = Marionette.ItemView.extend({

  tagName: 'tr',
  template: '#template-sharingItemView',
  events: {
    'click .sharing-trash': '_onTrashClick'
  },
  initialize: function () {
    this.listenTo(this.model, 'change', this.render);

  },
  onRender: function () {
  },
  _onTrashClick: function () {
    this.trigger('sharing:delete', this.model);
  }
});