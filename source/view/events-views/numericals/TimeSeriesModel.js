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
    seriesName: null,

    color: null,
    style: null,
    transform: null,
    interval: null,
    fitting: null,

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
