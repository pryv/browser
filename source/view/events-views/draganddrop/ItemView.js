/* global $ */

var Marionette = require('backbone.marionette');

module.exports = Marionette.ItemView.extend({

  tagName: 'li',
  template: '#template-draganddrop-itemview',

  templateHelpers: function () {
    return {
      showContent: function () {
        var event = this.model.get('events');
        if (event.length !== 0) {
          return event[0].streamName;
        } else {
          return '';
        }
      }.bind(this)
    };
  },

  initialize: function () {
    //this.bindUIElements();
  },

  onBeforeRender: function () {
    // set up final bits just before rendering the view's `el`
    //console.log('ItemView onBeforeRender');
  },

  onRender: function () {

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