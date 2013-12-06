var Marionette = require('backbone.marionette'),
  ItemView = require('./ItemView.js');

module.exports = Marionette.CollectionView.extend({
  tagName: 'ul',
  itemView: ItemView,
  onAfterItemAdded: function () {
    console.log('item added', this.collection.type);
  }
});
