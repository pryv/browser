var Marionette = require('backbone.marionette');

module.exports = Marionette.CompositeView.extend({
  template: '#template-draganddrop-itemview',
  tagName: 'li',
  ui: {
    selector: '.DnD-legend-button',
    spanText: '.DnD-legend-text'
  },
  state: false,
  templateHelpers: {
    displayName: function () {
      return this.streamName + ' / ' + this.type;
    }
  },
  onRender: function () {
    this.ui.selector.bind('click', function () {
      this.state = true;
      this.trigger('series:click', this.model);
    }.bind(this));
  }
});