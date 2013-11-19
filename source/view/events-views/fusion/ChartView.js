/* global $ */
var Marionette = require('backbone.marionette'),
  _ = require('underscore');

module.exports = Marionette.ItemView.extend({
  template: '#template-fusion-graph',
  container: null,

  /*
  modelEvents: {
    'change': 'render',
    'change:events': 'render'
  },*/

  initialize: function () {
    this.listenTo(this.model, 'change', this.render);
    this.container = this.model.get('container');
  },

  onRender: function () {

    console.log(this.container, this.model);

    var myModel = this.model.get('events');
    if (!myModel) {
      return;
    }

    // Setting up the chart container
    this.chartContainer = this.container + ' .chartContainer';
    $(this.container).html('<div class="chartContainer"></div>');
    $(this.chartContainer).css({
      top: 0,
      left: 0,
      width: '100%',
      height: '100%'
    });

    //console.log('Chart container', this.chartContainer);

    var dataMapper = function (d) {
      return _.map(d, function (e) {
        return [e.time, e.content];
      });
    };


    var series = [];
    for (var i = 0; i < myModel.length; ++i) {
      series.push({
        data: dataMapper(myModel[i].elements),
        label: myModel.type,
        type: myModel[i].style
      });
    }

    var options = {
      grid: {
        hoverable: true,
        clickable: true,
        borderWidth: 0,
        minBorderMargin: 5
      },
      xaxes: [ { show: false } ],
      yaxes: []
    };

    var plotData = [];
    for (i = 0; i < series.length; ++i) {
      options.yaxes.push({ show: false});
      plotData.push({
        data: series[i].data,
        label: series[i].label,
        yaxis: (i + 1)
      });

      switch (series[i].type) {
      case 0:
        plotData[i].lines = { show: true };
        plotData[i].points = { show: true };
        break;
      case 1:
        plotData[i].bars = { show: true };
        break;
      default:
        plotData[i].lines = { show: true };
        plotData[i].points = { show: true };
        break;
      }
    }
    this.plot = $.plot($(this.chartContainer), plotData, options);
  },

  resize: function () {
    this.render();
  }

});