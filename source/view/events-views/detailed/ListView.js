/* global $ */
var Marionette = require('backbone.marionette'),
  ItemView = require('./ItemView.js'),
  _ = require('underscore');

module.exports = Marionette.CompositeView.extend({
  template: '#template-detailListCompositeView',
  container: '.modal-content',
  itemView: ItemView,
  itemViewContainer: '#detail-list',
  initialize: function () {
    if ($('.modal-panel-right').length === 0) {
      /* jshint -W101 */
      $(this.container).append('<div class="modal-panel-right">      <div class="modal-header">         <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>        <h4 class="modal-title" id="myModalLabel">Detailed View</h4>     </div>        <div id="modal-right-content">            <ul id="detail-list"></ul>           <div id="detail-div"></div>        </div>    </div>');
    }
    this.listenTo(this.collection, 'add remove', this.debounceRender);
    //this.listenTo(this.collection, 'change', this.bindClick);
  },
  appendHtml: function (collectionView, itemView) {
    $(this.itemViewContainer).append(itemView.el);
  },
  onRender: function () {
  },
  debounceRender: _.debounce(function () {
    this.render();
  }, 10)
});
