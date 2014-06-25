/* global $, window */
var  Marionette = require('backbone.marionette'),
    _ = require('underscore');

var getUrl =  function (event) {
  var id = event.content.id,
      screenName = event.content['screen-name'],
      date = new Date(event.time * 1000);
  return '<a href="https://twitter.com/' + screenName + '/status/' + id + '"' +
      'data-datetime="' + date.toISOString() + '">' +
      window.PryvBrowser.getTimeString(event.time) + '</a>';
};
module.exports = Marionette.ItemView.extend({
  template: '#picturesView',
  container: null,
  animation: null,
  currentId: null,
  initialize: function () {
    this.listenTo(this.model, 'change', this.change);
    this.$el.css('height', '100%');
    this.$el.css('width', '100%');
    this.$el.addClass('animated node');

  },
  change: function () {
    if (!this.currentId || this.currentId !== this.model.get('id')) {
      $('#' + this.container).removeClass('animated ' + this.animation);
      this.animation = '';
      this.$el.attr('id', this.model.get('id'));
      this.currentId = this.model.get('id');
    } else {
      this.animation = null;
    }
    this.render();
  },
  renderView: function (container) {
    this.container = container;
    this.animation = 'bounceIn';
    this.currentId = this.model.get('id');
    this.render();
  },
  onRender: function () {
    if (this.container) {
      var $mosaics = $('#' + this.container + ' .mosaic');
      var events = this.model.get('events');
      var displayedIds  = [];
      _.each($mosaics, function (mosaic) {
        displayedIds.push($(mosaic).attr('id'));
      });
      _.each(events, function (event) {
        var index = displayedIds.indexOf(event.id);
        if (index !== -1) {
          $('#' + event.id).css({
            width: event.width,
            height: event.height,
            top: event.top,
            left: event.left
          }).find('.Center-Block').html('<div class="tweet" >' +
                  '<p>' + event.content.text + '</p><p>&mdash;' +
                  '@' + event.content['screen-name'] + '</p><p>' + getUrl(event) +
                  '</p></div>');

          displayedIds[index] = null;
        } else {

          var toAdd = $('<div></div>')
            .addClass('mosaic node content Center-Container is-Table').attr('id', event.id)
            .append(
              '<div class="Table-Cell">' +
              '<div class="Center-Block">' +
              '<div class="tweet" >' +
              '<p>' + event.content.text + '</p><p>&mdash;' +
              '@' + event.content['screen-name'] + '</p><p>' + getUrl(event) +
              '</p></div>' +
              '</div>' +
              '</div>')
            .css({
              'width': event.width,
              'height': event.height,
              'top': event.top,
              'left': event.left,
              'position': 'absolute'
            });
          $('#' + this.container).append(toAdd.fadeIn());
          setTimeout(function () {
            $('#' + event.id).dotdotdot({watch: true});
          }, 800);
        }
      }.bind(this));
      _.each(displayedIds, function (id) {
        if (id) {
          $('#' + id).remove();
        }
      });
      var $eventsNbr = $('#' + this.container + ' .aggregated-nbr-events');
      if ($eventsNbr.length === 0) {
        if (this.model.get('eventsNbr') > 1) {
          $('#' + this.container).append('<span class="aggregated-nbr-events">' +
              this.model.get('eventsNbr') + '</span>');
        }
        $('#' + this.container).bind('click', function () {
          this.trigger('nodeClicked');
        }.bind(this));
      } else {
        $eventsNbr.html(this.model.get('eventsNbr'));
      }




      $('#' + this.container).removeClass('animated fadeIn');

      if (this.animation) {
        $('#' + this.container).addClass('animated ' + this.animation);
        setTimeout(function () {
          $('#' + this.container).removeClass('animated ' + this.animation);
        }.bind(this), 1000);
      }
    }
  },
  close: function () {
    this.remove();
  }
});
