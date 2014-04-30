/* global $ */
var  Marionette = require('backbone.marionette');

module.exports = Marionette.ItemView.extend({
  template: '#tweetView',
  container: null,
  animation: null,
  templateHelpers: {
    getUrl: function () {
      var id = this.content.id,
      screenName = this.content['screen-name'],
      date = new Date(this.time * 1000);
      return '<a href="https://twitter.com/' + screenName + '/status/' + id + '"' +
        'data-datetime="' + date.toISOString() + '">' + date.toLocaleDateString() + '</a>';
    }
  },
  initialize: function () {
    this.listenTo(this.model, 'change:content', this.change);
    this.$el.css('height', '100%');
    this.$el.css('width', '100%');
    this.$el.addClass('animated node');
  },
  change: function () {
    $('#' + this.container).removeClass('animated ' + this.animation);
    this.animation = 'pulse';
    this.render();
  },
  renderView: function (container) {
    this.container = container;
    this.animation = 'bounceIn';
    this.render();
  },
  onRender: function () {
    if (this.container) {
      $('#' + this.container).removeClass('animated fadeIn');
      $('#' + this.container).html(this.el);
      $('#' + this.container).bind('click', function () {
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