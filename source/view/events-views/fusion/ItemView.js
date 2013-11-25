/* global $ */

var Marionette = require('backbone.marionette');

module.exports = Marionette.ItemView.extend({

  tagName: 'div',
  ui: {
    checkbox: 'input[type=checkbox]',
    divCheckbox: '.DnD-itemView-checkbox',
    divText: '.DnD-itemView-text'
  },
  template: '#template-DnD-ItemView',

  templateHelpers: function () {
    return {
      showContent: function () {
        var event = this.model.get('events');
        return event[0].streamName;
      }.bind(this)
    };
  },

  initialize: function () {
    //this.bindUIElements();
    this.listenTo(this.model, 'change', this.render);
  },

  onBeforeRender: function () {
    // set up final bits just before rendering the view's `el`
    //console.log('ItemView onBeforeRender');
  },

  onRender: function () {
    //console.log('ItemView onRender');
    $(this.el).css({
      overflow: 'hidden'
    });

    this.ui.checkbox.attr('checked', this.model.get('selected'));

    var children = this.$el.children();
    if (this.model.get('highlighted')) {
      children.css('background', 'green');
      this.$el.css('background', 'green');
    } else {
      children.css('background', 'yellow');
      this.$el.css('background', 'yellow');
    }
    this.$('.view').bind('click', function () {
      this.trigger('chart:clicked', this.model);
    }.bind(this));

    this.ui.checkbox.bind('click', function () {
      if (this.ui.checkbox.is(':checked')) {
        this.model.set('selected', true);
        this.trigger('chart:select', this.model);
      } else {
        this.model.set('selected', false);
        this.trigger('chart:unselect', this.model);
      }
    }.bind(this));
  },

  onBeforeClose: function () {
    //console.log('ItemView onBeforeClose');
    // manipulate the `el` here. it's already
    // been rendered, and is full of the view's
    // HTML, ready to go.
  },

  onClose: function () {
    //console.log('ItemView onClose');
    // custom closing and cleanup goes here
  }



});