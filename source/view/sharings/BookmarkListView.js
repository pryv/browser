/* global $ */
var Marionette = require('backbone.marionette'),
  ItemView = require('./BookmarkItemView.js'),
  _ = require('underscore');

module.exports = Marionette.CompositeView.extend({
  template: '#template-bookmarkListCompositeView',
  container: '.modal-content',
  itemView: ItemView,
  itemViewContainer: '#bookmark-list',

  initialize: function () {
    this.listenTo(this.collection, 'add remove', this.debounceRender);
    //this.listenTo(this.collection, 'change', this.bindClick);
    $(this.container).append('<h1>Bookmarks</h1><ul id="bookmark-list"></ul>');
  },
  appendHtml: function (collectionView, itemView) {
    $(this.itemViewContainer).append(itemView.el);
  },
  onRender: function () {
  },
  onBeforeClose: function () {
    $(this.container).empty();
    return true;
  },
  debounceRender: _.debounce(function () {
    this.render();
  }, 10)
});
