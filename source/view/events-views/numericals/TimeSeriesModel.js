var Backbone = require('backbone');

// TODO: see for making this a plain constructor instead of a Backbone model for simplicity

var TimeSeriesModel = {
  defaults: {
    events: [],
    connectionId: null,
    streamId: null,
    streamName: null,
    type: null,
    category: null,

    seriesId: null,
    seriesLegend: null,

    color: null,
    style: 'bar',
    transform: 'sum',
    interval: 'auto',

    virtual: null
  }
};

TimeSeriesModel.sortData = function () {
  this.get('events').sort(function (a, b) {
    if (a.time < b.time) { return -1; }
    if (b.time < a.time) { return 1; }
    return 0;
  });
};

module.exports = Backbone.Model.extend(TimeSeriesModel);
