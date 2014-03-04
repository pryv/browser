/* global $ */
var Marionette = require('backbone.marionette'),
  _ = require('underscore'),
  //Model = require('../../../numericals/TimeSeriesModel.js'),
  ChartModel = require('../../../numericals/ChartModel.js'),
  ChartView = require('../../../numericals/ChartView.js');


module.exports = Marionette.ItemView.extend({
  type: 'Numerical',
  template: '#template-detail-content-numerical-edit',
  itemViewContainer: '#detail-content',
  ui: {
    selColor: '#detailed-view-chart-color',
    selStyle: '#detailed-view-chart-style',
    selOperation: '#detailed-view-chart-operation',
    selInterval: '#detailed-view-chart-interval',
    butOk: 'detailed-view-chart-ok',
    butCancel: 'detailed-view-chart-cancel'
  },
  chartView: null,
  chartViewModel: null,
  rendered: false,
  collection: null,
  edited: null,
  color: null,
  style: null,
  transform: null,
  interval: null,
  initialize: function () {
    this.listenTo(this.model, 'change:collection', this.prepareCollection.bind(this));
    this.listenTo(this.model, 'change:event', this.highlightEvent.bind(this));
  },
  onRender: function () {
    $(this.itemViewContainer).html(this.el);
    if (this.chartView) {
      this.chartView.model.set('collection', this.collection);
    } else {
      this.prepareCollection();
      this.chartViewModel = new ChartModel({
          container: '#detail-chart-container-edit',
          view: null,
          requiresDim: false,
          collection: this.model.get('collection'),
          highlighted: false,
          highlightedTime: null,
          allowPieChart: false,
          singleNumberAsText: false,
          dimensions: null,
          legendStyle: 'list', // Legend style: 'list', 'table'
          legendButton: true,  // A button in the legend
          legendButtonContent: [],
          legendShow: true,     // Show legend or not
          legendContainer: '#legend-container-edit', //false or a a selector
          legendExtras: true,   // use extras in the legend
          onClick: false,
          onHover: false,
          onDnD: false,
          editPoint: true,
          allowPan: false,      // Allows navigation through the chart
          allowZoom: false,     // Allows zooming on the chart
          xaxis: true,
          showNodeCount: false
        });
      this.ui.selColor.css({'background-color': this.edited.get('color')});
      this.chartView = new ChartView({model: this.chartViewModel});
      this.ui.selColor.bind('change', this.editorChange.bind(this));
      this.ui.selStyle.bind('change', this.editorChange.bind(this));
      this.ui.selOperation.bind('change', this.editorChange.bind(this));
      this.ui.selInterval.bind('change', this.editorChange.bind(this));
      this.ui.butOk.on('click', function () {
        this.trigger('ready', this.edited);
      }.bind(this));
      this.ui.butCancel.on('click', function () {
        this.trigger('cancel');
      }.bind(this));
    }

    if ($('#detail-chart-container-edit').length !== 0) {
      this.updateEditor();
      this.chartView.render();
      this.highlightEvent();
      this.rendered = true;
    }
  },
  debounceRender: _.debounce(function () {
    if (!this.rendered) {
      this.render();
      this.highlightEvent();
    }
  }, 1000),
  editorChange: function () {
    if (this.ui.selColor[0].selectedIndex > -1) {
      this.color = this.ui.selColor[0].options[this.ui.selColor[0].selectedIndex].value;
      this.ui.selColor.css({'background-color': this.color});
    }
    if (this.ui.selStyle[0].selectedIndex > -1) {
      this.style = this.ui.selStyle[0].options[this.ui.selStyle[0].selectedIndex].value;
    }
    if (this.ui.selOperation[0].selectedIndex > -1) {
      this.transform = this.ui.selOperation[0].options[this.ui.selOperation[0].selectedIndex].value;
    }
    if (this.ui.selInterval[0].selectedIndex > -1) {
      this.interval = this.ui.selInterval[0].options[this.ui.selInterval[0].selectedIndex].value;
    }

    this.edited.set('color', this.color);
    this.edited.set('style', this.style);
    this.edited.set('transform', this.transform);
    this.edited.set('interval', this.interval);

    this.chartView.render();
  },
  highlightEvent: function () {
    if (this.chartView && this.model.get('event')) {
      this.chartView.highlightEvent(this.model.get('event'));
    }
  },
  prepareCollection: function () {
    this.edited = this.model.get('edited');
    this.collection = this.model.get('collection');
  },
  onClose: function () {
    this.chartView.close();
    this.chartView = null;
    $(this.itemViewContainer).empty();
  },
  updateEditor: function () {
    var i;
    var options = this.ui.selColor[0].options;
    for (i = 0; i < options.length; ++i) {
      if (options[i].value === this.model.get('edited').get('color')) {
        this.ui.selColor[0].selectedIndex = i;
        break;
      }
    }
    options = this.ui.selStyle[0].options;
    for (i = 0; i < options.length; ++i) {
      if (options[i].value === this.model.get('edited').get('style')) {
        this.ui.selStyle[0].selectedIndex = i;
        break;
      }
    }
    options = this.ui.selOperation[0].options;
    for (i = 0; i < options.length; ++i) {
      if (options[i].value === this.model.get('edited').get('transform')) {
        this.ui.selOperation[0].selectedIndex = i;
        break;
      }
    }
    options = this.ui.selInterval[0].options;
    for (i = 0; i < options.length; ++i) {
      if (options[i].value === this.model.get('edited').get('interval')) {
        this.ui.selInterval[0].selectedIndex = i;
        break;
      }
    }
  }
});