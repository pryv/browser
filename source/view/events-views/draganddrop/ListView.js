/* global $ */
var Marionette = require('backbone.marionette'),
  ItemView = require('./ItemView.js');

module.exports = Marionette.CollectionView.extend({
  tagName: 'ul',
  itemView: ItemView,

  onRender: function () {
    console.log('$el', this.$el);
    //console.log('other', this.$el.innerHTML);
    console.log('this', this);
    console.log('the length', this.collection.type, this.collection.length);
    //this.$el.remove();
    //this.el = '';

    /*
    if (this.collection.length === 0) {
      this.el = '';
    }*/
  },
  /*
  appendHtml: function (collectionView, itemView, index){
    if (this.el === '') {
      this.el = '<ul></ul>';
      this.$el.html(this.el);
      console.log('adding stuff', this.el, this.$el);
    }
    console.log(this.el);
    if (collectionView.isBuffering) {
      // buffering happens on reset events and initial renders
      // in order to reduce the number of inserts into the
      // document, which are expensive.
      collectionView.elBuffer.appendChild(itemView.el);
    }

    else {
      // If we've already rendered the main collection, just
      // append the new items directly into the element.
      collectionView.$el.append(itemView.el);
    }
  },
*/

  onAfterItemAdded: function () {
    console.log('item added', this.collection.type);
  }


});
