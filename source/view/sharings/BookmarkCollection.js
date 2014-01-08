var Backbone = require('backbone'),
  Model = require('./BookmarkModel.js');

module.exports = Backbone.Collection.extend({
  url: '#',
  model: Model
});