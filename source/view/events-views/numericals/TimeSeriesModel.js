var Backbone = require('backbone');

module.exports = Backbone.Model.extend({
  defaults: {
    events: [],
    connectionId: null,
    streamId: null,
    streamName: null,
    type: null,
    category: null,

    color: null,
    style: null
  },
  sortData: function () {
    this.get('events').sort(function (a, b) {
      if (a.time < b.time) { return 1; }
      if (b.time < a.time) { return -1; }
      return 0;
    });
  }
});