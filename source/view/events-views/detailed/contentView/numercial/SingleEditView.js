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
    selInterval: '#detailed-view-chart-interval'
  },
  chartView: null,
  chartViewModel: null,
  rendered: false,
  collection: null,
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
          legendButtonContent: ['ready'],
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
      this.chartView = new ChartView({model: this.chartViewModel});
      this.ui.selColor.bind('change', this.editorChange.bind(this));
      this.ui.selStyle.bind('change', this.editorChange.bind(this));
      this.ui.selOperation.bind('change', this.editorChange.bind(this));
      this.ui.selInterval.bind('change', this.editorChange.bind(this));
      this.chartView.on('ready', function (m) {
        this.trigger('ready', m);
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

    this.collection.at(0).set('color', this.color);
    this.collection.at(0).set('style', this.style);
    this.collection.at(0).set('transform', this.transform);
    this.collection.at(0).set('interval', this.interval);

    this.chartView.render();
  },
  highlightEvent: function () {
    if (this.chartView && this.model.get('event')) {
      this.chartView.highlightEvent(this.model.get('event'));
    }
  },
  prepareCollection: function () {
    this.collection = this.model.get('collection');
  },
  onClose: function () {
    if ($('#chart-tooltip')) {
      $('#chart-tooltip').remove();
    }
    this.chartView.close();
    this.chartView = null;
    $(this.itemViewContainer).empty();
  },
  updateEditor: function () {
    var i;
    var options = this.ui.selColor[0].options;
    for (i = 0; i < options.length; ++i) {
      if (options[i].value === this.model.get('collection').at(0).get('color')) {
        this.ui.selColor[0].selectedIndex = i;
        break;
      }
    }
    options = this.ui.selStyle[0].options;
    for (i = 0; i < options.length; ++i) {
      if (options[i].value === this.model.get('collection').at(0).get('style')) {
        this.ui.selStyle[0].selectedIndex = i;
        break;
      }
    }
    options = this.ui.selOperation[0].options;
    for (i = 0; i < options.length; ++i) {
      if (options[i].value === this.model.get('collection').at(0).get('transform')) {
        this.ui.selOperation[0].selectedIndex = i;
        break;
      }
    }
    options = this.ui.selInterval[0].options;
    for (i = 0; i < options.length; ++i) {
      if (options[i].value === this.model.get('collection').at(0).get('interval')) {
        this.ui.selInterval[0].selectedIndex = i;
        break;
      }
    }
  }
});