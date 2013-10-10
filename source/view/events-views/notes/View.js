var  Marionette = require('backbone.marionette');

module.exports = Marionette.ItemView.extend({
  template: '#notesView',
  initialize: function () {
    this.listenTo(this.model, 'change', this.render);
    this.$el.css('height', '100%');
    this.$el.css('width', '100%');
  },

  renderView: function () {
    this.render();
  },
  onRender: function () {
    this.$el.addClass('animated  bounceIn');
  },
  close: function () {
    this.remove();
  }
});