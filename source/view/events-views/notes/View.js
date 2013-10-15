var  Marionette = require('backbone.marionette');

module.exports = Marionette.ItemView.extend({
  template: '#notesView',
  container: null,
  initialize: function () {
    this.listenTo(this.model, 'change', this.render());
    this.$el.css('height', '100%');
    this.$el.css('width', '100%');
  },

  renderView: function (container) {
    this.container = container;
    this.render();
  },
  onRender: function () {
    this.$el.addClass('animated  bounceIn');

    if (this.container) {
      $('#' + this.container + ' span').append(this.el);
    }
  },
  close: function () {
    this.remove();
  }
});