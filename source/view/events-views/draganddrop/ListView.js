var Marionette = require('backbone.marionette'),
  ItemView = require('./ItemView.js');

module.exports = Marionette.CollectionView.extend({
  tagName: 'ul',
  itemView: ItemView,

  onRender: function () {
    if (this.children.length === 0) {
      this.$el.parent().css({visibility: 'hidden'});
    }
  }
});
