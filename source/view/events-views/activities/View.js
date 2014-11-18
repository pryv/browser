/* global $, Highcharts, moment*/
var Marionette = require('backbone.marionette');

var View = {
  template: '#activityView',
  container: null,
  animation: null,
  chartContainer: null,
  options: null,
  data: null
};

View.initialize = function () {
  this.listenTo(this.model, 'change:totalTime', this._updateTotalTime);
  this.listenTo(this.model, 'change:dimensions', this.change);
  this.listenTo(this.model, 'change:data', this.change);
  this.$el.css('height', '100%');
  this.$el.css('width', '100%');
  this.$el.addClass('animated node');

  this.chart = null;
  this.options = this.model.get('options');
  this.data = this.model.get('data');
};

View.change = function () {
  this.chart = null;
  this.options = this.model.get('options');
  this.data = this.model.get('data');
  $('#' + this.container).removeClass('animated ' + this.animation);
  this.animation = 'tada';
  this.$el.attr('id', this.model.get('id'));
  this.render();
};

View.resize = function () {
  if (! this.model.get('dimensions')) {
    return;
  }
  if (this.chart) {
    this.chart.reflow();
    this._updateTotalTime();
  } else { // TODO: may not be needed
    this.render();
  }
};

View.renderView = function (container) {
  this.container = container;
  this.animation = 'bounceIn';
  this.render();
};

View.onRender = function () {
  if (! this.container) { return; }

  var $container = $('#' + this.container);
  $container.removeClass('animated fadeIn');
  $container.html(this.el);

  this.chartContainer = this.container + '-chart';
  $('#' + this.container + ' .chartContainer').attr('id', this.chartContainer);
  this.chartTotalLabel = '#' + this.container + ' .chart-total-label';

  // HACK: delay actual rendering until we get why resizing goes wrong on data changes
  setTimeout(function () {
    var d = this.model.get('dimensions');
    $(this.chartContainer).css(d);

    if (this.model.get('totalTime') === 0) {
      this.data[0].data = 1;
    }

    this.chart = new Highcharts.Chart({
      chart: {
        // transparent to let total duration label show through
        backgroundColor: null,
        reflow: false,
        renderTo: this.chartContainer,
        type: 'pie'
      },
      plotOptions: {
        pie: {
          innerSize: '60%',
          dataLabels: {
            enabled: false
          },
          showInLegend: true
        }
      },
      legend: {
        verticalAlign: 'top',
        itemStyle: {
          fontSize: '10px',
          fontWeight: 'normal'
        }
      },
      tooltip: {
        borderColor: '#BDC3C7',
        shadow: false,
        formatter: function () {
          return '<span style="color:' + this.point.color + '">\u25CF</span> ' + this.point.name +
              '<br>' + getDurationLabel(this.y) + ' (' + (+ (this.percentage).toFixed(2)) + ' %)';
        }
      },
      title: {text: ''},
      series: [{
        data: this.data
      }]
    });
    this._updateTotalTime();

    this.chart.container.onmousedown = null;
    this.chart.container.onclick = function () {
      this.trigger('nodeClicked');
    }.bind(this);
  }.bind(this), 1000);
};

View.close = function () {
  this.remove();
};

View._updateTotalTime = function () {
  if (! this.chart) { return; }

  var textX = this.chart.plotLeft + (this.chart.plotWidth  * 0.5),
      textY = this.chart.plotTop  + (this.chart.plotHeight * 0.5);

  var $label = $(this.chartTotalLabel),
      htmlParts = getDurationLabel(this.model.get('totalTime')).split(' ');
  if (htmlParts.length === 4) {
    // HACK: split line to better fit round space
    htmlParts[1] += '<br>';
  }
  $label.html(htmlParts.join(' '));
  $label.css({
    left: textX - $label.width() * 0.5,
    top: textY - $label.height() * 0.5
  });
};

function getDurationLabel(duration) {
  var s = moment.preciseDiff(moment.unix(0), moment.unix(duration)).split(' ');
  return s.splice(0, 4).map(function (s, i) {
    return i % 2 === 0 ? '<strong>' + s + '</strong>' : s;
  }).join(' ');
}

module.exports = Marionette.ItemView.extend(View);
