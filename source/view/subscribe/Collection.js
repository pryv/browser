var Backbone = require('backbone'),
  Model = require('./Model.js');

module.exports = Backbone.Collection.extend({
  url: '#',
  model: Model
});