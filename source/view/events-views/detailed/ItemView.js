var Marionette = require('backbone.marionette');

module.exports = Marionette.ItemView.extend({

  tagName: 'li',
  template: '#template-detailItemView',
  ui: {
    checkbox: '.checkbox'
  },
  initialize: function () {
    this.listenTo(this.model, 'change', this.render);

  },
  onRender: function () {
    this.ui.checkbox[0].checked = this.model.get('checked');
    if (this.model.get('highlighted')) {
      this.$el.addClass('highlighted');
    } else {
      this.$el.removeClass('highlighted');
    }
    this.$('.view').bind('click', function () {
      this.trigger('date:clicked', this.model);
    }.bind(this));
    this.$('input').bind('click', function () {
      this.model.set('checked', this.ui.checkbox[0].checked);
    }.bind(this));
  }
});