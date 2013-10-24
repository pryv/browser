var  Marionette = require('backbone.marionette');

module.exports = Marionette.ItemView.extend({
  template: '#countView',
  container: null,
  rendered: false,
  initialize: function () {
    this.listenTo(this.model, 'change:eventsNbr', this.change);
    this.$el.css('height', '100%');
    this.$el.css('width', '100%');
    this.$el.addClass('animated  fadeIn countView');
  },
  change: function () {
    this.$el.removeClass('animated fadeIn');
    this.$el.addClass('animated  pulse');
    this.render();
  },
  renderView: function (container) {
    if (container !== this.container) {
      this.rendered = false;
    }
    this.container = container;
    this.render();
  },
  onRender: function () {
    if (this.container && !this.rendered) {
      setTimeout(function () {
        $('#' + this.container).append(this.el);
        this.rendered = true;
      }.bind(this), 1000);

    }
  },
  close: function () {
    this.rendered = false;
    this.remove();
  }
});