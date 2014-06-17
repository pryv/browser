/* global $ */
var Marionette = require('backbone.marionette'),
    ItemView = require('./ItemView.js'),
    _ = require('underscore');

var listView = {
  template: '#template-detailListCompositeView',
  container: '.modal-content',
  itemView: ItemView,
  itemViewContainer: '#detail-list',
  events: {
    'scroll #detail-list': '_showMore'
  }
};

listView.initialize = function () {
  if ($('.modal-panel-right').length === 0) {
    /* jshint -W101 */
    $(this.container).append(
      '<div class="modal-panel-right">' +
      '  <div id="modal-right-content">' +
      '    <div id="detail-list"></div>' +
      '  </div>' +
      '</div>');
  }
  //this.listenTo(this.collection, 'add remove', this.debounceRender);
  //this.listenTo(this.collection, 'change', this.bindClick);
};
listView.scrollTo = function () {
  var $detailList = $('#detail-list');
  var listHeight = $detailList.height();
  var $item = $('.detail-item.highlighted');
  var itemHeight = $item.height();
  var itemPosition = $item.position().top;
  if (itemPosition < 0) {
    $detailList.scrollTo($item, 0);
  } else if (itemPosition > listHeight - itemHeight) {
    $detailList.scrollTo($item, 0, {offset: itemHeight - listHeight});
  }
  //$('#detail-list').scrollTo('.detail-item.highlighted');
};
listView.appendHtml = function (collectionView, itemView) {
  $(this.itemViewContainer).append(itemView.el);
};

listView.onRender = function () {
  $('#detail-list').bind('scroll', this._showMore.bind(this));
  this.collection.on('highlightIndex', this.scrollTo.bind(this));
};



listView.debounceRender = _.debounce(function () {
  this.render();
}, 100);

listView._showMore = function () {
  var $detailList = $('#detail-list');
  var height = $detailList.height();
  var scrollHeight = $detailList[0].scrollHeight;
  var scrollTop = $detailList.scrollTop();
  var triggerOffset = 1.25;
  var scrollBarHeight = height * height / scrollHeight;
  var currentScroll = (scrollBarHeight + (scrollTop / (scrollHeight / height))) * triggerOffset;
  // if we are closer than 'margin' to the end of the content, load more books
  if (currentScroll >= height) {
    this.trigger('showMore');
  }
};

module.exports = Marionette.CompositeView.extend(listView);
