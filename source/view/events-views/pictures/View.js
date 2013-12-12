/* global $ */
var  Marionette = require('backbone.marionette');

module.exports = Marionette.ItemView.extend({
  template: '#picturesView',
  container: null,
  animation: null,
  initialize: function () {
    this.listenTo(this.model, 'change', this.change);
    this.$el.css('height', '100%');
    this.$el.css('width', '100%');
    this.$el.addClass('animated node');

  },
  change: function () {
    $('#' + this.container).removeClass('animated ' + this.animation);
    this.animation = 'tada';
    this.$el.attr('id', this.model.get('id'));
    this.render();
  },
  renderView: function (container) {
    this.container = container;
    this.animation = 'bounceIn';
    this.render();
  },
  onRender: function () {
    if (this.container) {
      this.$el.css(
        {'background': 'url(' + this.model.get('picUrl') + ') no-repeat center center',
          '-webkit-background-size': 'cover',
          '-moz-background-size': 'cover',
          '-o-background-size': 'cover',
          'background-size': 'cover'
        });
      $('#' + this.container).removeClass('animated fadeIn');
      $('#' + this.container).html(this.el);
      this.$('.aggregated-nbr-events').bind('click', function () {
        this.trigger('nodeClicked');
      }.bind(this));
      $('#' + this.container).addClass('animated ' + this.animation);
      setTimeout(function () {
        $('#' + this.container).removeClass('animated ' + this.animation);
      }.bind(this), 1000);
    }
  },
  close: function () {
    this.remove();
  }
});