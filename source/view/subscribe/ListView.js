/* global $ */
var Marionette = require('backbone.marionette'),
  ItemView = require('./ItemView.js'),
  _ = require('underscore');

module.exports = Marionette.CompositeView.extend({
  template: '#template-subscribeListCompositeView',
  container: '.modal-content',
  itemView: ItemView,
  itemViewContainer: '#subscribe-list',
  $addButton: null,
  initialize: function () {
    this.listenTo(this.collection, 'change', this.debounceRender);
    //this.listenTo(this.collection, 'change', this.bindClick);
    $(this.container).append('<h3>Choose sharing you want to save</h3>' +
      '<ul id="subscribe-list"></ul>' +
      '<button class="btn btn-success" id="add-subscribe">Save</button>'
      );
    this.$addButton = $('#add-subscribe');
    this.$addButton.bind('click', this._addSubscribe.bind(this));
  },
  _addSubscribe: function () {
    var subscriptions = [];
    this.collection.each(function (model) {
      if (model.get('checked')) {
        subscriptions.push(model);
      }
    }.bind(this));
    this.trigger('subscription:add', subscriptions);
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
