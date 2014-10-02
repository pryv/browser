var Backbone = require('backbone'),
    Model = require('./TimeSeriesModel.js');

var TimeSeriesCollection = {
  model: Model
};

TimeSeriesCollection.initialize = function (models, options) {
  this.type = options.type;
};

TimeSeriesCollection.comparator = function () {};

module.exports = Backbone.Collection.extend(TimeSeriesCollection);
