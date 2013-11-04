/* global $ */
var  Marionette = require('backbone.marionette');

module.exports = Marionette.ItemView.extend({
  template: '#super-condensed-view',
  container: null,
  initialize: function () {
    this.listenTo(this.model, 'change:datas', this.change);
    this.$el.css('height', '100%');
    this.$el.css('width', '100%');
    this.$el.addClass('animated  bounceIn');
  },
  change: function () {
    this.$el.removeClass('animated bounceIn');
    this.$el.addClass('animated  tada');
    this.render();
  },
  renderView: function (container) {
    this.container = container;
    this.render();
  },
  onRender: function () {
    if (this.container) {
      $('#' + this.container).html(this.el);
    }
  },
  onDateHighLighted : function () {

  },
  close: function () {
    this.remove();
  }
});