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
    console.log('CTOR activity pryv VIEW');

    this.listenTo(this.model, 'change', this.change);
    this.$el.css('height', '100%');
    this.$el.css('width', '100%');
    this.$el.addClass('animated node');

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


      console.log($(this.legendContainer));
      console.log($(this.chartContainer));
      console.log($(this.fullChart));

      var d = this.model.get('dimensions');
      var square =  (d.width < d.height) ? d.width: d.height;
      this.fullChart.css(d);


      if (d.width < d.height) {
        this.legendContainer.css({
          top: 0 + 'px',
          height: d.height - square + 'px',
          width: d.width + 'px'
        });
        this.chartContainer.css({
          top: d.height - square + 'px',
          height: square + 'px',
          width: square + 'px'
        });
      } else {
        this.legendContainer.css({
          left: 0 + 'px',
          height: d.height + 'px',
          width: d.width - square + 'px'
        });
        this.chartContainer.css({
          left: d.width - square + 'px',
          height: square + 'px',
          width: square + 'px'
        });
      }


      $('#' + this.container).bind('click', function () {
        this.trigger('nodeClicked');
      }.bind(this));

      setTimeout(function () {
        this.options.legend.show = false;
        this.options.legend.container = $(this.legendContainer);
        $('#' + this.container).removeClass('animated ' + this.animation);
        console.log('this.options', this.options);
        $.plot(this.chartContainer, this.data, this.options);

      }.bind(this), 1000);
    }
  },
  close: function () {
    this.remove();
  }
});