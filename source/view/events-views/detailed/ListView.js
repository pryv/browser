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
    'click #select-all': 'onSelectAll',
    'click #select-none': 'onSelectNone',
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
      '    <div id="filter" class="btn-toolbar">' +
      '      <div class="btn-group">' +
      '        <button id="select-all" type="button" class="btn btn-default btn-xs" data-i18n="events.common.actions.all"></button> ' +
      '        <button id="select-none" type="button" class="btn btn-default btn-xs" data-i18n="events.common.actions.none"></button> ' +
      '      </div>' +
      '      <div class="btn-group">' +
      '        <button id="trash-selected" type="button" class="btn btn-danger btn-xs" data-i18n="events.common.actions.deleteSelected"></button>' +
      '      </div>' +
      '    </div>' +
      '  </div>' +
      '</div>');
  }
  //this.listenTo(this.collection, 'add remove', this.debounceRender);
  //this.listenTo(this.collection, 'change', this.bindClick);
};

listView.appendHtml = function (collectionView, itemView) {
  $(this.itemViewContainer).append(itemView.el);
};

listView.onRender = function () {
  $('#select-all').bind('click', this.onSelectAll.bind(this));
  $('#select-none').bind('click', this.onSelectNone.bind(this));
  $('#trash-selected').bind('click', this.onTrashSelectedClick.bind(this));
  $('#detail-list').bind('scroll', this._showMore.bind(this));
};

listView.onTrashSelectedClick = function () {
  var i = 0;
  this.collection.each(function (model) {
    if (model.get('checked')) {
      i++;
      model.trash(function () { i--; });
    }
  }.bind(this));
};

listView.onSelectAll = function () {
  batchSelect.call(this, true);
};

listView.onSelectNone = function () {
  batchSelect.call(this, false);
};

/**
 * @this {ListView}
 */
function batchSelect(selected) {
  this.collection.each(function (model) {
    model.set('checked', selected);
  }.bind(this));
}

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
