/* global $ */
var Marionette = require('backbone.marionette'),
  ItemView = require('./SharingItemView.js'),
  _ = require('underscore');

module.exports = Marionette.CompositeView.extend({
  template: '#template-sharingListCompositeView',
  container: '.sharings',
  itemView: ItemView,
  itemViewContainer: '#sharing-list',

  initialize: function () {
    this.listenTo(this.collection, 'add remove', this.debounceRender);
    //this.listenTo(this.collection, 'change', this.bindClick);
    $(this.container).append('<h1>Created slices</h1>' +
    '<table class="table table-striped" >' +
      '<thead><tr><th>Name</th><th>Link</th><th>Share</th><th></th></tr></thead>' +
      '<tbody id="sharing-list"></tbody>' +
    '</table>');
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
