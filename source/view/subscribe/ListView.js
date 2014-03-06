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
    $(this.container).append('<div class="modal-header">  ' +
      '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>' +
      ' <h4 class="modal-title" id="myModalLabel">Add to my Pryv</h4><div class="modal-close">' +
      '</div></div>' +
      '<div id="modal-content">' +
      '<div id="creation-content"><ul id="subscribe-list"></ul></div>' +
      '<div id="creation-footer" class="col-md-12">' +
      '<button class="btn btn-pryv-turquoise" id="add-subscribe">Add ' +
      '<i class="fa fa-spinner fa-spin"></i></button>' +
      '<button id="cancel" class="btn" data-dismiss="modal">Cancel</button>' +
      '</div></div>');
    this.$addButton = $('#add-subscribe');
    $('.fa-spin', this.$addButton).hide();
    this.$addButton.bind('click', this._addSubscribe.bind(this));
  },
  _addSubscribe: function () {
    var subscriptions = [];
    $('.fa-spin', this.$addButton).show();
    this.$addButton.attr('disabled', 'disabled');
    this.collection.each(function (model) {
      if (model.get('checked')) {
        subscriptions.push(model);
      }
    }.bind(this));
    this.trigger('subscription:add', subscriptions);
  },
  onCreateSubscriptionFinished: function (gotError) {
    $('.fa-spin', this.$addButton).hide();
    if (gotError) {
      this.$addButton.removeClass('btn-pryv-turquoise').addClass('btn-danger');
    } else {
      this.trigger('close');
    }
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
