/* global $ */
var  Marionette = require('backbone.marionette');
var _ = require('underscore');

module.exports = Marionette.ItemView.extend({
  template: '#genericsView',
  container: null,
  animation: null,
  templateHelpers: function () {
    return {
      getContent: function () {
        var event = this.model.get('event');
        if (event.type.split('/')[0] === 'url') {
          return  '<a href="' + event.content + '" target="_blank">' + event.content + '</a>';
        }
        if (_.isString(event.content)) {
          return event.content;
        }
        if (_.isNumber(event.content)) {
          return '<span class="value">' + event.content + '</span>';
        }
        if (_.isObject(event.content)) {
          return JSON.stringify(event.content, null, 2);
        }
        if (event.attachments) {
          var keys = _.keys(event.attachments);
          var href = event.url + '/' + event.attachments[keys[0]].id + '/' +
            event.attachments[keys[0]].fileName + '?readToken=' +
            event.attachments[keys[0]].readToken;
          return '<p><span class="fa fa-paperclip fa-2x"></span> </p>' +
            '<p><a href="' + href + '" target="_blank">' +
            event.attachments[keys[0]].fileName + '</a></p>';
        }
        return '<p><span class="fa fa-2x fa-question"></span></p>' +
          '<p>' + event.type + '</p>';
      }.bind(this)
    };
  },
  initialize: function () {
    this.listenTo(this.model, 'change', this.change);
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
      $('#' + this.container).find('.content').dotdotdot();
    }
  },
  close: function () {
    this.remove();
  }
});