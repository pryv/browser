/* global $ */
var Marionette = require('backbone.marionette'),
  _ = require('underscore');

module.exports = Marionette.ItemView.extend({
  template: '#template-fusion-graph',
  container: '#modal-left-content-final',

  initialize: function () {
    this.listenTo(this.model, 'change', this.onModelChange);
  },

  onRender: function () {
    var myModel = this.model.get('events');
    if (!myModel) {
      return;
    }

    var plotContainer = 'fusion';
    var plotContainerDiv = '<div id="' + plotContainer + '" class="graphContainer"></div>';


    $(this.container).html(plotContainerDiv);

    //console.log($('#' + plotContainer));
    $('#' + plotContainer).css({
      top: 0,
      left: 0,
      width: '100%',
      height: '100%'
    });

    var data = myModel.elements;
    //console.log('onredere - data', data);
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

    //console.log('series', series);
    var plotData = [];
    for (i = 0; i < series.length; ++i) {
      options.yaxes.push({ show: false});
      plotData.push({
        data: series[i].data,
        label: series[i].label
      });

      switch (series[i].type) {
        case 0:
          plotData[i].lines = { show: true };
          plotData[i].points = { show: true };
          break;
        case 1:
          plotData[i].bars = { show: true };
          break;
        //case 2:
        //plotData[i].pie = { show: true };
        //break;
        default:
          plotData[i].lines = { show: true };
          plotData[i].points = { show: true };
          break;
      }
    }
    this.plot = $.plot($('#' + plotContainer), plotData, options);
  },

  onModelChange: function () {
    //console.log('Finalview has now: ', this.model.get('events'));
    this.render();
  }

});