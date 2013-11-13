var Marionette = require('backbone.marionette');

module.exports = Marionette.ItemView.extend({

  tagName: 'li',
  template: '#template-detailItemView',
  initialize: function () {
    this.listenTo(this.model, 'change', this.render);

  },
  onRender: function () {
    if (this.model.get('highlighted')) {
      this.$el.addClass('highlighted');
    } else {
      this.$el.removeClass('highlighted');
    }
    this.$('.view').bind('click', function () {
      this.trigger('date:clicked', this.model);
    }.bind(this));
  }
});