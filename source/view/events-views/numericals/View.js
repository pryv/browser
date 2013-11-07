/* global $ */
var  Marionette = require('backbone.marionette'),
  _ = require('underscore');


module.exports = Marionette.ItemView.extend({
  nodeContainer: null,
  plotContainer: null,
  animation: null,
  //datas: null,
  currentDay: null,
  date: null,
  plot: null,
  options: null,
  series: null,
  width: null,
  height: null,
  typeChanger: null,

  initialize: function () {
    this.listenTo(this.model, 'change:datas', this.initSeries);
    this.listenTo(this.model, 'change:width', this.resize);
    this.listenTo(this.model, 'change:height', this.resize);
    //this.listenTo(this.model, 'change:height', this.resize);
    this.currentDay = [];
    this.date = Infinity;
    this.options = {
      grid: {
        hoverable: true,
        clickable: true,
        borderWidth: 0,
        minBorderMargin: 5
      },
      xaxes: [ { show: false } ],
      yaxes: []
    };
    this.series = [];
    this.typeChanger = 0;
    this.initSeries();
  },

  triggers: {
    'click .graphContainer canvas': 'graphClicked'
  },

  // type = ['lines' -> 0, 'bars' -> 1, 'pies' -> 2];
  initSeries: function () {
    console.log(this.container, 'initSeries');
    var data = this.model.get('datas');

    var dataMapper = function (d) {
      return _.map(d, function (e) {
        return [e.time, e.content];
      });
    };

    //console.log(this.container, ' data ', data);

    // We store the data as an object containing
    // its type and the label and the preformated
    // data for the graph
    this.series = [];
    for (var i = 0; i < data.length; ++i) {
      this.series.push({
          data: dataMapper(data[i]),
          label: data[i][0].type,
          type: 0
        });
    }

    if (this.container) {
      console.log(this.container, 'initSeries - calling render');
      $('#' + this.container).empty();
      $('#' + this.container).unbind();
      this.renderView(this.container);
    }
  },

  renderView: function (container) {
    console.log(this.container, 'irenderView');
    this.container = container;
    this.animation = 'bounceIn';
    this.plotContainer = this.container + '-graph';
    var plotContainerDiv = '<div id="' + this.plotContainer + '" class="graphContainer"></div>';
    this.computeSize();
    $('#' + this.container).unbind();
    if ($('#' + this.plotContainer).length === 0) {
      $('#' + this.container).html(plotContainerDiv);
    } else {
      $('#' + this.plotContainer).empty();
    }

    $('#' + this.plotContainer).css({
      top: 0,
      left: 0,
      width: this.width,
      height: this.height,
      visible: 'hidden'
    });


    // Arranging data such that it can be used with multiple axes
    var plotData = [];
    for (var i = 0; i < this.series.length; ++i) {
      this.options.yaxes.push({ show: false});
      plotData.push({
        data: this.series[i].data,
        label: this.series[i].label,
        yaxis: (i + 1)
      });

      // Configuration of the series representation
      switch (this.series[i].type) {
      case 0:
        plotData[i].lines = { show: true };
        plotData[i].points = { show: true };
        break;
      case 1:
        plotData[i].bars = { show: true };
        break;
      case 2:
        plotData[i].pie = { show: true };
        break;
      default:
        plotData[i].lines = { show: true };
        plotData[i].points = { show: true };
        break;
      }
    }

    // Builds the plot
    this.plot = $.plot($('#' + this.plotContainer), plotData, this.options);


    // Hover signal
    $('#' + this.container).bind('plothover', function (event, pos, item) {
      if (item) {
        var id = this.container + '-tooltip' + item.seriesIndex + '-' + item.dataIndex;
        if (!$('#' + id).length) {
          var labelValue = item.datapoint[1].toFixed(2);
          var clazz = 'hover';
          var coords = this.computeCoordinates(0, item.seriesIndex, item.datapoint[1],
            item.datapoint[0]);
          this.showTooltip(id, clazz, labelValue, coords.top + 10, coords.left + 10);
        }
      } else {
        $('#' + this.container + ' .tooltip.hover').remove();
      }
    }.bind(this));

    $('#' + this.container).bind('plotclick', function () {
      this.changeGraph();
    }.bind(this));


    // Highlighting current date.
    this.onDateHighLighted(this.date);
  },

  computeCoordinates: function (xAxis, yAxis, xPoint, yPoint) {
    var yAxes = this.plot.getYAxes();
    var xAxes = this.plot.getXAxes();
    var coordY = yAxes[yAxis].p2c(xPoint);
    var coordX = xAxes[xAxis].p2c(yPoint);
    return { top: coordY, left: coordX};
  },

  showTooltip: function (id, clazz, data, top, left) {
    if ($('#' + id).length !== 0) {
      return;
    }
    /* TODO:
    * Positioning such that the label doesn't go outside of its container
    * with overflow: visible
    * */
    var tooltip = '<div id="' + id + '" class="tooltip ' + clazz + '">' + data + '</div>';
    //var cHeight = $('#' + this.container).height();
    //var cWidth = $('#' + this.container).width();

    if ($('#' + id).length === 0) {
      $('#' + this.container).append(tooltip);
    }
    $('#' + id).css({top: top, left: left}).fadeIn(1500);
  },

  onDateHighLighted: function (date) {
    /* TODO:
     * Implement point search in log(n)
     * */

    this.date = date;

    //var series = this.plot.getData();
    for (var k = 0; k < this.series.length; k++) {
      var distance = null;
      var best = 0;
      for (var m = 0; m < this.series[k].data.length; m++) {
        if (distance === null || Math.abs(date - this.series[k].data[m][0]) < distance) {
          distance = Math.abs(date - this.series[k].data[m][0]);
          best = m;
        } else { break; }
      }


      var id = this.container + '-tooltip' + k + '-' + best;
      var idOld = this.container + '-tooltip' + k + '-' + this.currentDay[k];
      this.currentDay[k] = best;
      var labelValue = this.series[k].data[best][1].toFixed(2);
      var clazz = 'highlighted';
      var coords = this.computeCoordinates(0, k, this.series[k].data[best][1],
        this.series[k].data[best][0]);

      console.log(coords);

      // remove the old label
      $('#' + idOld).remove();

      // insert the new label
      this.showTooltip(id, clazz, labelValue, coords.top + 10, coords.left + 10);

    }
  },

  computeSize: function () {
    this.width = parseInt($('#' + this.container).prop('style').width.split('px')[0], 0);
    this.height = parseInt($('#' + this.container).prop('style').height.split('px')[0], 0);
  },

  resize: function () {
    if (this.container) {

      $('#' + this.container + ' .tooltip').remove();

      console.log(this.container, 'resize');
      this.computeSize(); /*
      $('#' + this.plotContainer).css({
        width: this.width,
        height: this.height
      });*/

      this.renderView(this.container);
      //this.plot.resize();
     // this.plot.setupGrid();
      //this.plot.draw();
      //this.currentDay = [];
    }
  },

  changeGraph: function () {
    if (this.container) {


      console.log(this.container, 'changeGraph');
      $('#' + this.container).empty('');
      $('#' + this.container).unbind();

      var mod = this.series.length === 1 ? 3 : 2;
      for (var i = 0; i < this.series.length; ++i) {
        this.series[i].type++;
        if (this.series[i].type !== mod) {
          break;
        } else {
          this.series[i].type = 0;
        }
      }

      for (var j = 0; j < this.series.length; ++j) {
        console.log(this.container, this.series[j].type);
      }

      this.renderView(this.container);
    }

  },

  close: function () {
    console.log(this.container, 'close');
    $('#' + this.container).empty('');
    $('#' + this.container).unbind();
  }
});
