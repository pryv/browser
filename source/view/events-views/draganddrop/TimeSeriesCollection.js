var Backbone = require('backbone'),
  Model = require('./../draganddrop/TimeSeriesModel.js');

module.exports = Backbone.Collection.extend({
  model: Model,

  initialize: function (models, options) {
    this.type = options.type;
  },

  comparator: function () {

  }
});