/* global $ */
var Marionette = require('backbone.marionette');
var Pryv = require('pryv');
var _ = require('underscore');
var UNIQUE_ID = 0;
var MAX_TEXT_CHAR = 140;
module.exports = Marionette.ItemView.extend({

  tagName: 'li',
  className: 'detail-item',
  template: '#template-detailItemView',
  templateHelpers: {
    getPreview: function () {
      var type = this.event.type;
      var result = '<div class="Center-Container is-Table">' +
          '<div class="Table-Cell">' +
          '<div class="Center-Block">';
      if (type.indexOf('picture') === 0) {
        return '';
      } else if (type.indexOf('note') === 0 && typeof(this.event.content) === 'string') {
        var text = this.event.content;
        if (text.length > MAX_TEXT_CHAR) {
          text = text.slice(0, MAX_TEXT_CHAR) + '...';
        }
        result += text;
      } else if (Pryv.eventTypes.extras(type)) {
        result += '<span class="value">' + this.event.content + '</span>' +
            '<span class="unity">' + Pryv.eventTypes.extras(type).symbol + '</span>';
      } else  if (type === 'message/twitter') {
        result += this.event.content.text;
      } else if (type === 'position/wgs84') {
        result += '<span id="' + this.event.id + '" class="fa fa-spinner fa-spin"></span>';
        var url = 'https://nominatim.openstreetmap.org/reverse?format=json&lat=' +
          this.event.content.latitude + '&lon=' +
          this.event.content.longitude + '&zoom=15&addressdetails=0';
        setTimeout(function () {
          $.get(url, function () {
          })
              .done(function (data) {
                if (data.error_message) {
                  $('#' + this.event.id).addClass('bg-danger').text(data.error_message);
                } else {
                  $('#' + this.event.id).text(data.display_name);
                }
              }.bind(this))
              .fail(function () {
                $('#' + this.event.id).addClass('bg-danger').text('Error getting address');
              }.bind(this))
              .always(function () {
                $('#' + this.event.id).removeClass('fa fa-spinner fa-spin');
              }.bind(this));
        }.bind(this), 800);
      } else {
        if (_.isString(this.event.content)) {
          result += this.event.content;
        } else if (_.isNumber(this.event.content)) {
          result += '<span class="value">' + this.event.content + '</span>';
        } else if (_.isObject(this.event.content)) {
          result += JSON.stringify(this.event.content, null, 2);
        } else if (this.event.attachments) {
          var keys = _.keys(this.event.attachments);
          result += '<span class="fa fa-paperclip"></span> ' +
            this.event.attachments[keys[0]].fileName;
        } else {
          result += '<span class="fa fa-question"></span> ' +
           this.event.type;
        }
      }
      result += '</div>' +
          '</div>' +
          '</div>';
      return result;
    },
    getUniqueId: function () {
      UNIQUE_ID++;
      return UNIQUE_ID;
    }
  },
  ui: {
    checkbox: '.checkbox'
  },
  initialize: function () {
    //this.listenTo(this.model, 'change', this.render);
    this.listenTo(this.model, 'change:highlighted', this.highlight);
    this.listenTo(this.model, 'change:checked', this.check);

  },
  check: function () {
    this.ui.checkbox[0].checked = this.model.get('checked');
  },
  highlight: function () {
    if (this.model.get('highlighted')) {
      this.$el.addClass('highlighted');
    } else {
      this.$el.removeClass('highlighted');
    }
  },
  onRender: function () {
    this.check();
    this.highlight();
    if (this.model.get('event').type.indexOf('picture') === 0) {
      this.$el.css(
          {'background': 'url(' + this.model.get('event').getPicturePreview() +
              ') no-repeat center center',
            '-webkit-background-size': 'cover',
            '-moz-background-size': 'cover',
            '-o-background-size': 'cover',
            'background-size': 'cover'
          });
    }
    this.$el.bind('click', function () {
      this.trigger('date:clicked', this.model);
    }.bind(this));
    this.$('input').bind('click', function () {
      this.model.set('checked', this.ui.checkbox[0].checked);
    }.bind(this));
    $(this.$el).find('.Center-Container').dotdotdot({watch: true, wrap: 'letter'});
  }
});