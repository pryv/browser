/* global $ */
var Marionette = require('backbone.marionette'),
  ItemView = require('./ItemView.js'),
  _ = require('underscore');

module.exports = Marionette.CompositeView.extend({
  template: '#template-DnD-ListCompositeView',
  container: '#DnD-right-content-lists',
  itemView: ItemView,
  itemViewContainer: '#detail-div',
  initialize: function () {
    this.listenTo(this.collection, 'add remove', this.debounceRender);
    //this.listenTo(this.collection, 'change', this.bindClick);
  },
  appendHtml: function (collectionView, itemView) {
    $(this.container).append(itemView.el);
  },
  onRender: function () {
    $(this.container).css({'overflow-y': 'scroll'});
  },
  debounceRender: _.debounce(function () {
    this.render();
  }, 10)
});
