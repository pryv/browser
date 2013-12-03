var Backbone = require('backbone'),
  Model = require('./../draganddrop/TimeSeriesModel.js');

module.exports = Backbone.Collection.extend({
  model: Model,
  type: null,

  comparator: function () {

  }
});