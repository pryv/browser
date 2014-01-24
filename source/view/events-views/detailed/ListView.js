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
    'click #check-all': 'onCheckAllClick'
  },
  initialize: function () {
    if ($('.modal-panel-right').length === 0) {
      /* jshint -W101 */
      $(this.container).append(
        '<div class="modal-panel-right"> ' +
        '    <div id="modal-right-content"> ' +
        '        <ul id="detail-list"></ul> ' +
        '        <div id="filter"> <input type="checkbox" id="check-all"> Check All ' +
          '      <button id ="trash-selected" type="button" class="btn btn-danger">Trash Selected</button></div>' +
        '    </div> ' +
        '</div>');

    }
    this.listenTo(this.collection, 'add remove', this.debounceRender);
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
  },
  onTrashSelectedClick: function () {
    this.collection.each(function (model) {
      if (model.get('checked')) {
        model.trash();
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
  }, 100)
});
