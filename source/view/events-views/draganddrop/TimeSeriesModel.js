var Backbone = require('backbone');

module.exports = Backbone.Model.extend({
  defaults: {
    events: [],
    connectionId: null,
    streamId: null,
    streamName: null,
    type: null,

    category: null,

    specConf: null
  }

});