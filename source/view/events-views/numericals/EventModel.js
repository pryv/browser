var Backbone = require('backbone');
module.exports = Backbone.Model.extend({
  defaults: {
    id: null,
    streamId: null,
    streamName: null,
    connectionId: null,
    type: null,
    elements: null,
    trashed: false,
    tags: null,
    style: 0
  },
  setHighlighted: function (highlight) {
    this.set('highlighted', highlight);
  }
});