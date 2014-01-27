var Marionette = require('backbone.marionette');

module.exports = Marionette.ItemView.extend({

  tagName: 'li',
  template: '#template-detailItemView',
  templateHelpers: {
    getPreview: function () {
      var type = this.event.type;
      if (type.indexOf('picture') === 0) {
        return '<img src=" ' + this.event.attachmentsUrl + '">';
      }
      return '';
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
    this.$el.bind('click', function () {
      this.trigger('date:clicked', this.model);
    }.bind(this));
    this.$('input').bind('click', function () {
      this.model.set('checked', this.ui.checkbox[0].checked);
    }.bind(this));
  }
});