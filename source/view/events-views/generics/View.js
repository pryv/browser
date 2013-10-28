var  Marionette = require('backbone.marionette');

module.exports = Marionette.ItemView.extend({
  template: '#genericsView',
  container: null,
  initialize: function () {
    this.listenTo(this.model, 'change:id', this.change);
    this.$el.css('height', '100%');
    this.$el.css('width', '100%');
  },
  change: function () {
    $('#' + this.container).removeClass('animated bounceIn');
    $('#' + this.container).addClass('animated  tada');
    this.render();
  },
  renderView: function (container) {
    this.container = container;
    this.render();
  },
  onRender: function () {
    if (this.container) {

      $('#' + this.container).removeClass('fadeIn');
      $('#' + this.container).addClass('animated bounceIn');
      $('#' + this.container).html(this.el);
    }
  },
  close: function () {
    this.remove();
  }
});