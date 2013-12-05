var Marionette = require('backbone.marionette');

module.exports = Marionette.CompositeView.extend({
  template: '#template-draganddrop-itemview',
  tagName: 'li',
  ui: {
    selector: 'button[type=button]',
    spanText: '.DnD-itemView-text'
  },
  state: false,
  templateHelpers: {
    displayName: function () {
      return this.streamName + ' / ' + this.type;
    }
  },
  onRender: function () {
    console.log('rendering ', this.streamName);
    this.ui.selector.bind('click', function () {
      this.state = true;
      this.trigger('series:click', this.model);
    }.bind(this));
  }
});