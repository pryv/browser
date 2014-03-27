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
    $(this.container).append('<h5 data-i18n="modal.manageSlices.sharedSlices"></h5>' +
    '<table class="table" >' +
      '<thead><tr><th data-i18n="modal.manageSlices.name">Name</th>' +
      '<th data-i18n="modal.manageSlices.link">Link</th>' +
      '<th data-i18n="modal.manageSlices.share">Share</th><th></th></tr></thead>' +
      '<tbody id="sharing-list"></tbody>' +
    '</table>');
  },
  appendHtml: function (collectionView, itemView) {
    $(this.itemViewContainer).append(itemView.el);
  },
  onRender: function () {
    $('body').i18n();
  },
  onBeforeClose: function () {
    $(this.container).empty();
    return true;
  },
  debounceRender: _.debounce(function () {
    this.render();
  }, 10)
});
