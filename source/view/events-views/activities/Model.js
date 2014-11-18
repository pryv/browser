/* global $*/
var _ = require('underscore'),
    ActivityView = require('./View.js'),
    CommonModel = require('../common/Model.js'),
    streamUtils = require('../../../utility/streamUtils');

module.exports = CommonModel.implement(
  function (events, params) {
    CommonModel.call(this, events, params);
    this.typeView = ActivityView;
    this.eventDisplayed = null;
    this.modelContent = {};
    this.data = [];
    this.options = {};
    this.totalTime = 0;
    this.updateEachSecond = false;

    this.debounceUpdateTime = _.debounce(this.updateTime.bind(this), 2000);

    this.debounceFullRefresh = _.debounce(this.fullRefresh.bind(this), 30000);
  },
  {
    beforeRefreshModelView: function () {
      this.sumTime();

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
        dimensions: this.computeDimensions(),
        totalTime: this.totalTime
      };

      if (this.updateEachSecond) {
        this.debounceUpdateTime();
        this.debounceFullRefresh();
      }
    },

    computeDimensions: function () {
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
      return {width: chartSizeWidth, height: chartSizeHeight};
    },

    sumTime: function () {
      this.updateEachSecond = false;
      var timeSumByStream = {};

      // group by stream
      _.each(this.events, function (e) {
        if (! e.hasOwnProperty('duration')) { return; }

        if (! timeSumByStream[e.streamId]) {
          timeSumByStream[e.streamId] = {
            stream: e.stream,
            time: 0
          };
        }

        var toAdd = 0;
        if (e.duration !== null) {
          toAdd = e.duration;
        } else {
          this.updateEachSecond = true;
          toAdd = (((new Date()).getTime() / 1000) - e.time);
        }
        timeSumByStream[e.streamId].time += toAdd;
      }.bind(this));

      // Merge childs into parent, such that all are a the same level

      this.data = [];
      for (var s in timeSumByStream) {
        if (timeSumByStream.hasOwnProperty(s)) {
          var stream = timeSumByStream[s].stream;
          var pt = {
            name: stream.name,
            y: timeSumByStream[s].time
          };
          var settings = streamUtils.getChartSettingsForType(stream, 'activity/plain'),
              color = (settings ? settings.color : '') || streamUtils.getColor(stream, false);
          if (color) {
            pt.color = color;
          }
          this.data.push(pt);
        }
      }

      this.totalTime = 0;
      _.each(this.data, function (e) {
        this.totalTime += e.y;
      }.bind(this));
    },

    updateTime: function () {
      if (this.container && $('#' + this.container).length !== 0  && this.updateEachSecond) {
        this.sumTime();
        if (this.modelView) {
          this.modelView.set('totalTime', this.totalTime);
        }
        this.debounceUpdateTime();
      }
    },

    fullRefresh: function () {
      if (this.container && $('#' + this.container).length !== 0 && this.updateEachSecond) {
        this.refresh();
        this.debounceFullRefresh();
      }
    }
  }
);
