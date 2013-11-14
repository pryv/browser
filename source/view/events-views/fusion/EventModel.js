var Backbone = require('backbone');

module.exports = Backbone.Model.extend({
  defaults: {
    content: null,
    description: null,
    id: null,
    streamId: null,
    tags: null,
    time: null,
    type: null,
    trashed: false
  },
  getTimeDifference: function (time) {
    return Math.abs(time - this.get('time'));
  },
  isTrashed: function () {
    return this.get('trashed');
  }
});