/* global $ */
var Marionette = require('backbone.marionette'),
  _ = require('underscore');

module.exports = Marionette.ItemView.extend({
  template: '#template-fusion-graph',
  container: '#modal-left-content-final',

  initialize: function () {
    this.listenTo(this.model, 'change', this.render);
  },

  onRender: function () {
    var myModel = this.model.get('events');
    if (!myModel) {
      return;
    }

    var plotContainer = 'fusion';
    var plotContainerDiv = '<div id="' + plotContainer + '" class="graphContainer"></div>';

    $(this.container).html(plotContainerDiv);

    $('#' + plotContainer).css({
      top: 0,
      left: 0,
      width: '100%',
      height: '100%'
    });

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
    this.plot = $.plot($('#' + plotContainer), plotData, options);

    console.log(this.model);
  },

  resize: function () {
    this.render();
  }

});