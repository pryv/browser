var Backbone = require('backbone');

module.exports = Backbone.Model.extend({
  defaults: {
    events: [],
    connectionId: null,
    streamId: null,
    type: null,

    category: null,

    specConf: null
  }

});