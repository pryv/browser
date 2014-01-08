var Backbone = require('backbone');

module.exports = Backbone.Model.extend({
  defaults: {
    sharing: null,
    collection: null
  }
});