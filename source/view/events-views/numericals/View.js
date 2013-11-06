/* global $ */
var  Marionette = require('backbone.marionette'),
  _ = require('underscore');


module.exports = Marionette.ItemView.extend({
  container: null,
  plotParent: null,
  animation: null,
  datas: null,
  currentDay: null,
  date: null,
  plot: null,
  options: null,
  initialize: function () {
    this.listenTo(this.model, 'change:datas', this.initDatas);
    this.listenTo(this.model, 'change:width', this.resize);
    this.listenTo(this.model, 'change:height', this.resize);
    this.currentDay = [];
    this.datas = this.model.get('datas');
    this.date = Infinity;
    this.options = {
      series: {
        lines: { show: true },
        points: { show: true }
      },
      grid: {
        hoverable: true,
        clickable: true,
        borderWidth: 0,
        minBorderMargin: 5
      },
      xaxes: [ { show: false } ],
      yaxes: []
    };
  },

  initDatas: function () {
    console.log(this.container, 'Data changed');
    //this.close();
    this.datas = this.model.get('datas');
    if (this.container) {
      this.renderView(this.container);
      this.resize();
    }
  },

  renderView: function (container) {
    console.log(this.container, ' rendering');
    this.container = container;
    this.animation = 'bounceIn';

    // some function we need to transform the data set to an array on the fly.
    var dataMapper = function (d) {
      return _.map(d, function (e) {
        return [e.time, e.content];
      });
    };

    // Arranging data such that it can be used with multiple axes
    var data = [];
    for (var i = 0; i < this.datas.length; ++i) {
      this.options.yaxes.push({ show: false});
      data.push({ data: dataMapper(this.datas[i]), label: this.datas[i][0].type, yaxis: (i + 1)  });
    }

    // Builds the plot
    //$('#' + this.container).text('');
    this.plot = $.plot($('#' + this.container), data, this.options);

    // Hover signal
    $('#' + this.container).bind('plothover', function (event, pos, item) {
      if (item) {
        //this.plot.highlight(item.series, item.datapoint);
        //var x = item.datapoint[0].toFixed(2),
        var y = item.datapoint[1].toFixed(2);
        var offset = this.plot.offset();
        var id = this.container + '-tooltip' + item.seriesIndex + '-' + item.dataIndex;

        this.showTooltip(id, 'hover', y, item.pageY - offset.top + 5, item.pageX - offset.left + 5);

        _.map($('#' + this.container + ' .tooltip.hover'), function (elem) {
          if ($(elem).attr('id') !== id) {
            $(elem).remove();
          }
        });
      } else {
        $('#' + this.container + ' .tooltip.hover').remove();
      }
    }.bind(this));

    // Highlighting current date.
    this.onDateHighLighted(this.date);
  },

  computeCoordinates: function (xAxis, yAxis, xPos, yPos) {
    var series = this.plot.getData();
    var yAxes = this.plot.getYAxes();
    var xAxes = this.plot.getXAxes();
    var coordY = yAxes[yAxis].p2c(series[xPos].data[yPos][1]);
    var coordX = xAxes[xAxis].p2c(series[xPos].data[yPos][0]);
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

    $('#' + this.container).append(tooltip);
    $('#' + id).css({top: top, left: left}).fadeIn(200);
  },

  onDateHighLighted: function (date) {
    /* TODO:
     * Implement point search in log(n)
     * */

    this.date = date;

    var series = this.plot.getData();
    for (var k = 0; k < series.length; k++) {
      var distance = null;
      var best = 0;
      for (var m = 0; m < series[k].data.length; m++) {
        if (distance === null || Math.abs(date - series[k].data[m][0]) < distance) {
          distance = Math.abs(date - series[k].data[m][0]);
          best = m;
        } else { break; }
      }

      if (this.currentDay[k] !== best) {
        var id = this.container + '-tooltip' + k + '-' + best;
        var idOld = this.container + '-tooltip' + k + '-' + this.currentDay[k];
        this.currentDay[k] = best;
        var labelValue = series[k].data[best][1].toFixed(2);
        var clazz = 'highlighted';
        var coords = this.computeCoordinates(0, k, k, best);

        // remove the old label
        $('#' + idOld).remove();

        // insert the new label
        this.showTooltip(id, clazz, labelValue, coords.top + 10, coords.left + 10);
      }
    }
  },

  resize: function () {
    //console.log(this.container, 'resize', this.model.get('width'), this.model.get('height'));
    /*
     * On resize, we have to resize the canvas and remove the static label and regenerate them.
     */
    console.log(this.container, 'resize');
    this.plot.resize(this.model.get('width'), this.model.get('height'));
    this.plot.setupGrid();
    this.plot.draw();
    this.currentDay = [];
    $('#' + this.container + ' .highlighted').remove();
    this.onDateHighLighted(this.date);
  },

  close: function () {
    $('#' + this.container).text('');
  }
});
