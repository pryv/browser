/* global $ */
var  Marionette = require('backbone.marionette'),
  _ = require('underscore');


module.exports = Marionette.ItemView.extend({
  container: null,
  animation: null,
  datas: [],
  date: null,
  plot: null,
  options: null,
  initialize: function () {
    this.listenTo(this.model, 'change:datas', this.initDatas);
    this.listenTo(this.model, 'change:width', this.resize);
    this.listenTo(this.model, 'change:height', this.resize);

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
      yaxes: [ { show: false}, {show: false } ]
    };
    this.initDatas();
  },

  initDatas: function () {
    var i = 0;
    _.each(this.model.get('datas'), function (d) {
      this.datas[i] = [];
      _.each(d, function (elem) {
        this.datas[i].push([elem.time, elem.content]);
      }, this);
    }, this);
    if (this.container) {
      this.renderView(this.container);
    }
  },

  renderView: function (container) {
    this.container = container;
    this.animation = 'bounceIn';
    this.plot = $.plot($('#' + this.container), this.datas, this.options);
    $('#' + this.container).bind('plothover', function (event, pos, item) {
      if (item) {

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
  },

  showTooltip: function (id, clazz, data, top, left) {
    var tooltip = '<div id="' + id + '" class="tooltip ' + clazz + '">' + data + '</div>';
    if ($('#' + id).length === 0) {
      $('#' + this.container).append(tooltip);
      $('#' + id).css({top: top, left: left}).fadeIn(200);
    }
  },

  onDateHighLighted: function (date) {
    console.log('S---------------');
    console.log('Showing date');
    console.log(date);
    this.date = date;
    $('#' + this.container + ' .tooltip.click').remove();
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

      var id = this.container + '-tooltip' + k + '-' + best;
      var coord = this.plot.p2c({ x: series[k].data[best][0], y: series[k].data[best][1]});
      console.log(coord);
      var offset = this.plot.offset();
      console.log(offset);

      this.showTooltip(id, 'click', series[k].data[best][1].toFixed(2), coord.top + 5,
        coord.left + 5);

      this.plot.highlight(k, best);
    }
  },

  resize: function () {
    console.log(this.container, 'resize');
    this.plot.resize();
    this.plot.setupGrid();
    this.plot.draw();
    $('#' + this.container + ' .tooltip').remove();
    this.onDateHighLighted(this.date);
    //$('#' + this.container).text('');
    //this.plot = $.plot($('#' + this.container), this.datas, this.options);
  },

  close: function () {
    $('#' + this.container + ' .tooltip').remove();
    this.remove();
  }
});