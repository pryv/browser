var Marionette = require('backbone.marionette');
var Pryv = require('pryv');
var UNIQUE_ID = 0;
var MAX_TEXT_CHAR = 140;
module.exports = Marionette.ItemView.extend({

  tagName: 'li',
  className: 'detail-item',
  template: '#template-detailItemView',
  templateHelpers: {
    getPreview: function () {
      var type = this.event.type;
      if (type.indexOf('picture') === 0) {
        return '';
      }
      if (type.indexOf('note') === 0 && typeof(this.event.content) === 'string') {
        var text = this.event.content.trim();
        if (text.length > MAX_TEXT_CHAR) {
          text = text.slice(0, MAX_TEXT_CHAR) + '...';
        }
        return '<div class="Center-Container is-Table">' +
          '<div class="Table-Cell">' +
          '<div class="Center-Block">' +
           text +
          '</div>' +
          '</div>' +
          '</div>';
      }
      if (Pryv.eventTypes.extras(this.event.type)) {
        return '<div class="Center-Container is-Table">' +
          '<div class="Table-Cell">' +
          '<div class="Center-Block">' +
          '<span class="value">' + this.event.content + '</span>' +
          '<span class="unity">' + Pryv.eventTypes.extras(this.event.type).symbol + '</span>' +
          '</div>' +
          '</div>' +
          '</div>';
      }
      return '';
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
  }
});