/* global $, moment*/
var  Marionette = require('backbone.marionette');
var Moment = moment;
module.exports = Marionette.ItemView.extend({
  template: '#activityView',
  container: null,
  animation: null,
  legendContainer: null,
  chartContainer: null,
  fullChart: null,
  options: null,
  data: null,
  initialize: function () {

    //this.listenTo(this.model, 'change', this.change);
    this.listenTo(this.model, 'change:totalTime', this.updateTotalTime);
    this.listenTo(this.model, 'change:dimensions', this.change);
    this.listenTo(this.model, 'change:data', this.change);
    this.$el.css('height', '100%');
    this.$el.css('width', '100%');
    this.$el.addClass('animated node');

    this.plot = null;
    this.options = this.model.get('options');
    this.data = this.model.get('data');
  },
  change: function () {
    this.plot = null;
    this.options = this.model.get('options');
    this.data = this.model.get('data');
    $('#' + this.container).removeClass('animated ' + this.animation);
    this.animation = 'tada';
    this.$el.attr('id', this.model.get('id'));
    this.render();
  },
  renderView: function (container) {
    this.container = container;
    this.animation = 'bounceIn';
    this.render();
  },
  onRender: function () {
    if (this.container) {
      this.legendContainer = '#' + this.container + ' > div > .fullChart > .pieLegendContainer';
      this.chartContainer = '#' + this.container + ' > div > .fullChart > .pieChartContainer';
      this.fullChart = '#' + this.container + '  > div > .fullChart';
      $('#' + this.container).removeClass('animated fadeIn');
      $('#' + this.container).html(this.el);

      var d = this.model.get('dimensions');
      var square =  (d.width < d.height) ? d.width: d.height;
      $(this.fullChart).css(d);

      var cssLegendContainer =  null;
      var cssChartContainer = null;
      if (d.width < d.height) {
        cssLegendContainer = {
          top: 0 + 'px',
          height: d.height - square + 'px',
          width: d.width + 'px'
        };
        cssChartContainer = {
          height: square + 'px',
          width: square + 'px'
        };
      } else {
        cssLegendContainer = {
          left: 0 + 'px',
          height: d.height + 'px',
          width: d.width - square + 'px',
          position: 'absolute'
        };
        cssChartContainer = {
          height: square + 'px',
          width: square + 'px',
          left: d.width - square + 'px',
          float: 'right',
          position: 'absolute'
        };
      }
      $(this.legendContainer).css(cssLegendContainer);
      $(this.chartContainer).css(cssChartContainer);

      $('#' + this.container).bind('click', function () {
        this.trigger('nodeClicked');
      }.bind(this));

      setTimeout(function () {
        this.options.legend = {
          show: true,
          container: $(this.legendContainer)
        };
        if (this.model.get('totalTime') === 0) {
          this.data[0].data = 1;
        }
        try {
          this.plot = $.plot(this.chartContainer, this.data, this.options);
        } catch (e) {
          //console.warn(e);
        }

        setTimeout(this.updateTotalTime.bind(this), 200);
      }.bind(this), 1000);
    }
  },
  close: function () {
    this.remove();
  },
  updateTotalTime: function () {
    var m = Moment.duration(this.model.get('totalTime') * 1000);
    var text =
      (m.years() !== 0 ? m.years() + ' y ' : '') +
      (m.months() !== 0 ? m.months() + ' m <br />' : '') +
      (m.days() !== 0 ? m.days() + ' d ' : '') +
      (m.hours() !== 0 ? m.hours() + ' h <br />' : '') +
      (m.minutes() !== 0 ? m.minutes() + ' min ' : '') +
      (m.seconds() + ' s');

    if ($(this.legendContainer) && $(this.legendContainer + ' > .pie-chart-sum').length !== 0) {
      $(this.legendContainer + ' > .pie-chart-sum')
        .html(text);
    } else {
      $(this.chartContainer).append('<div class="pie-chart-sum-parent Table-Cell">' +
        '<span class="pie-chart-sum Center-Block">' + text + '</span></div>');
    }
  }
});