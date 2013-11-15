/* global $ */

var Marionette = require('backbone.marionette');

module.exports = Marionette.ItemView.extend({

  tagName: 'div',
  ui: {
    checkbox: 'input[type=checkbox]',
    divCheckbox: '#fusionItemView-checkbox',
    divText: '#fusionItemView-text'
  },
  template: '#template-fusionItemView',
  initialize: function () {
    //this.bindUIElements();
    this.listenTo(this.model, 'change', this.render);

  },

  onBeforeRender: function () {
    // set up final bits just before rendering the view's `el`
    console.log('ItemView onBeforeRender');
  },

  onRender: function () {
    $(this.el).css({
      overflow: 'hidden'
    });

    this.ui.checkbox.addClass('checked');

    this.ui.divCheckbox.css({
      float: 'left',
      width: '15px',
      position: 'relative',
      'text-align': 'left',
      'background-color': 'yellow'
    });

    var textBoxWidth = $('.modal-panel-right').width() - 15 - 10 - 12;
    this.ui.divText.css({
      float: 'right',
      width: textBoxWidth,
      position: 'relative',
      //'margin-right': '15px',
      'background-color': 'red'
    });

    console.log(this.ui.checkbox);
    console.log('ItemView onRender');
    if (this.model.get('highlighted')) {
      this.$el.addClass('highlighted');
    } else {
      this.$el.removeClass('highlighted');
    }
    this.$('.view').bind('click', function () {
      this.trigger('date:clicked', this.model);
    }.bind(this));
  },

  onBeforeClose: function () {
    console.log('ItemView onBeforeClose');
    // manipulate the `el` here. it's already
    // been rendered, and is full of the view's
    // HTML, ready to go.
  },

  onClose: function () {
    console.log('ItemView onClose');
    // custom closing and cleanup goes here
  }
});