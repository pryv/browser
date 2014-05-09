/* global $*/
var _ = require('underscore'),
  ActivityView = require('./View.js'),
  CommonModel = require('../common/Model.js');

module.exports = CommonModel.implement(
  function (events, params) {
    CommonModel.call(this, events, params);
    this.typeView = ActivityView;
    this.eventDisplayed = null;
    this.modelContent = {};

    //console.log('CTOR activity pryv MODEL');
    //console.log('pryv activity MODEL events', this.events);
  },
  {
    beforeRefreshModelView: function () {

      var timeSumByStream = {};

      // group by stream
      _.each(this.events, function (e) {
        if (timeSumByStream[e.streamId]) {
          timeSumByStream[e.streamId].time += e.duration ?
            e.duration : (new Date()).getSeconds() - e.duration;
        } else {
          timeSumByStream[e.streamId] = {
            stream: e.stream,
            time: e.duration ?
              e.duration : (new Date()).getSeconds() - e.duration
          };
        }
      });
      // Merge childs into parent, such that all are a the same level

      //console.log('activities/model.js timeSumByStream', timeSumByStream);

      this.data = [];
      for (var s in timeSumByStream) {
        if (timeSumByStream.hasOwnProperty(s)) {
          this.data.push({label: timeSumByStream[s].stream.name, data: timeSumByStream[s].time});
        }
      }

      //console.log('activities/model.js this.data', this.data);




      this.options = {
        series: {
          pie: {
            show: true,
            innerRadius: 0.15,
            label: {
              show: true,
              radius: 3 / 4,
              formatter: function (label) { return label; },
              background: {
                opacity: 0
              }
            }
          }
        },
        legend: {
          show: false
        }
      };

      this.modelContent = {
        options: this.options,
        data: this.data,
        content: this.eventDisplayed.content,
        description: this.eventDisplayed.description,
        id: this.eventDisplayed.id,
        modified: this.eventDisplayed.modified,
        streamId: this.eventDisplayed.streamId,
        tags: this.eventDisplayed.tags,
        time: this.eventDisplayed.time,
        type: this.eventDisplayed.type,
        eventsNbr: _.size(this.events),
        dimensions: this.computeDimension()
      };
    },
    computeDimension: function () {
      var chartSizeWidth = null;
      var chartSizeHeight = null;

      if (this.width !== null) {
        chartSizeWidth = this.width;
      } else if ($('#' + this.container).length)  {
        chartSizeWidth = $('#' + this.container).width();
      } else if ($('#' + this.container).length)  {
        chartSizeWidth = parseInt($('#' + this.container).prop('style').width.split('px')[0], 0);
      }

      if (this.height !== null) {
        chartSizeHeight = this.height;
      } else if ($('#' + this.container).length)  {
        chartSizeHeight = $('#' + this.container).height();
      } else if ($('#' + this.container).length)  {
        chartSizeHeight = parseInt($('#' + this.container).prop('style').height.split('px')[0], 0);
      }

      //console.log('computeDimensions model', {width: chartSizeWidth, height: chartSizeHeight});

      return {width: chartSizeWidth, height: chartSizeHeight};
    }
  }
);