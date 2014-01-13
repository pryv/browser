var Backbone = require('backbone');

module.exports = Backbone.Model.extend({
  defaults: {
    connection: null,
    collection: null,
    checked: true,
    error: null
  }
});