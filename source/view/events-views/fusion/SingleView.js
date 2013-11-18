/* global $ */
var Marionette = require('backbone.marionette'),
  _ = require('underscore');

module.exports = Marionette.ItemView.extend({
  template: '#template-fusion-graph',
  container: '#modal-left-content-single',

  initialize: function () {
    this.listenTo(this.model, 'change', this.render);
  },

  onRender: function () {
    //console.log('SingleView onRender');
    var myModel = this.model.get('event');
    if (!myModel) {
      return;
    }

    var res = myModel.type.split('/');
    var plotContainer = 'fusion' + myModel.streamId + res[0] + res[1];
    var plotContainerDiv = '<div id="' + plotContainer +
      '" class="graphContainer"></div>';


    $(this.container).html(plotContainerDiv);

    //console.log($('#' + plotContainer));
    $('#' + plotContainer).css({
      top: 0,
      left: 0,
      width: '100%',
      height: '100%'
    });

    var data = myModel.elements;
    //console.log('onreder - data', data);
    var dataMapper = function (d) {
      return _.map(d, function (e) {
        return [e.time, e.content];
      });
    };


    var series = [];
    series.push({
      data: dataMapper(data),
      label: myModel.type,
      type: myModel.style
    });

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
    for (var i = 0; i < series.length; ++i) {
      options.yaxes.push({ show: false});
      plotData.push({
        data: series[i].data,
        label: series[i].label
      });
      // Configuration of the series representation
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


    $(this.container).unbind();
    $(this.container).bind('plotclick', function () {
      //console.log('changeStyle');
      var event = this.model.get('event');
      var style = event.style;

      //console.log('SingleView: Current style', style);
      style++;
      style %= 2;
      event.style = style;
      //console.log('SingleView: New style', style);

      this.model.set('event', event);
      //console.log('SingleView plotclick', this.model);
      this.trigger('chart:clicked', this.model);

      this.render();
    }.bind(this));


  },

  // Changes the style of the graph
  changeStyle: function () {

  }

});