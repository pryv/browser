/* global $ */
var Marionette = require('backbone.marionette'),
  ItemView = require('./ItemView.js'),
  _ = require('underscore');

module.exports = Marionette.CompositeView.extend({
  template: '#template-detailListCompositeView',
  container: '.modal-content',
  itemView: ItemView,
  itemViewContainer: '#detail-list',
  checkAll: false,
  events: {
    'click #check-all': 'onCheckAllClick',
    'scroll #detail-list' : '_showMore'
  },
  initialize: function () {
    if ($('.modal-panel-right').length === 0) {
      /* jshint -W101 */
      $(this.container).append(
        '<div class="modal-panel-right"> ' +
        '    <div id="modal-right-content"> ' +
        '        <div id="detail-list"></div> ' +
        '        <div id="filter"> <input type="checkbox" id="check-all"> <span data-i18n="modal.detail.checkAll"></span> ' +
          '      <button id ="trash-selected" type="button" class="btn btn-danger" data-i18n="modal.detail.trashSelected"></button></div>' +
        '    </div> ' +
        '</div>');

    }
    //this.listenTo(this.collection, 'add remove', this.debounceRender);
    //this.listenTo(this.collection, 'change', this.bindClick);
  },
  appendHtml: function (collectionView, itemView) {
    $(this.itemViewContainer).append(itemView.el);
  },
  onRender: function () {
    var $checkAll = $('#check-all');
    this.checkAll = false;
    $checkAll.off();
    $checkAll[0].checked = false;
    $checkAll.bind('click', this.onCheckAllClick.bind(this));
    $('#trash-selected').bind('click', this.onTrashSelectedClick.bind(this));
    $('#detail-list').bind('scroll', this._showMore.bind(this));
  },
  onTrashSelectedClick: function () {
    var i = 0;
    this.collection.each(function (model) {
      if (model.get('checked')) {
        i++;
        model.trash(function () { i--; });
      }
    }.bind(this));
  },
  onCheckAllClick: function () {
    this.checkAll = !this.checkAll;
    this.collection.each(function (model) {
      model.set('checked', this.checkAll);
    }.bind(this));
  },
  debounceRender: _.debounce(function () {
    this.render();
  }, 100),
  _showMore: function () {
    var $detailList = $('#detail-list');
    var height = $detailList.height();
    var scrollHeight = $detailList[0].scrollHeight;
    var scrollTop = $detailList.scrollTop();
    var triggerOffset = 1.15;
    var scrollBarHeight = height * height / scrollHeight;
    var currentScroll = (scrollBarHeight + (scrollTop / (scrollHeight / height))) * triggerOffset;
    // if we are closer than 'margin' to the end of the content, load more books
    if (currentScroll >= height) {
      this.trigger('showMore');
    }
  }
});
