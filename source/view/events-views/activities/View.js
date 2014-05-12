/* global $ */
var  Marionette = require('backbone.marionette');

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

    this.listenTo(this.model, 'change', this.change);
    this.$el.css('height', '100%');
    this.$el.css('width', '100%');
    this.$el.addClass('animated node');

    this.plot = null;

    this.options = this.model.get('options');
    this.data = this.model.get('data');
  },
  change: function () {
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
        this.plot = $.plot(this.chartContainer, this.data, this.options);
      }.bind(this), 1000);
    }
  },
  close: function () {
    this.remove();
  }
});