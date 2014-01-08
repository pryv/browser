var Backbone = require('backbone'),
  Model = require('./SharingModel.js');

module.exports = Backbone.Collection.extend({
  url: '#',
  model: Model
});