var Marionette = require('backbone.marionette');

module.exports = Marionette.ItemView.extend({
  tagName: 'li',
  template: '#template-detailItemView',
  initialize: function () {
    this.listenTo(this.model, 'change', this.render);
  }
});