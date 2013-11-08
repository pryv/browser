/* global $ */
var Marionette = require('backbone.marionette'),
  ItemView = require('./ItemView.js');

module.exports = Marionette.CompositeView.extend({
  template: '#template-detailListCompositeView',
  container: '#modal-right-content',
  itemView: ItemView,
  itemViewContainer: '#detail-list',
  initialize: function () {
    this.listenTo(this.collection, 'all', this.render);
  },
  onRender: function () {
    $(this.container).html(this.el);
  }
});
