/* global $ */
var _ = require('underscore');

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

    //console.log('ItemView, the model', this.model);

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

    //this.ui.checkbox.addClass('checked');
    //console.log('checked or not?', this.model.get('selected'));
    this.ui.checkbox.attr('checked', this.model.get('selected'));

    this.ui.divCheckbox.css({
      float: 'left',
      width: '15px',
      position: 'relative',
      'text-align': 'left',
      'margin-left': '3px'
      //'background-color': 'yellow'
    });

    var textBoxWidth = $('.modal-panel-right').width() - 15 - 10 - 12;
    this.ui.divText.css({
      float: 'right',
      width: textBoxWidth,
      position: 'relative'
      //'margin-right': '15px',
      //'background-color': 'red'
    });

    //console.log(this.ui.checkbox);
    //console.log('ItemView onRender');
    var children = this.$el.children();
    //console.log(children);
    if (this.model.get('highlighted')) {
      children.css('background', 'green');
      this.$el.css('background', 'green');
    } else {
      children.css('background', 'yellow');
      this.$el.css('background', 'yellow');
    }
    this.$('.view').bind('click', function () {
      this.trigger('chart:clicked', this.model);
      //console.log('FusionView: ItemView clicked');
    }.bind(this));

    this.ui.checkbox.bind('click', function () {
      if (this.ui.checkbox.is(':checked')) {
        this.model.set('selected', true);
        this.trigger('chart:select', this.model);
        //console.log('FusionView: ItemView checkbox checked');
      } else {
        this.model.set('selected', false);
        this.trigger('chart:unselect', this.model);
        //console.log('FusionView: ItemView checkbox un-checked');
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