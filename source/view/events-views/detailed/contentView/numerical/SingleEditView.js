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
    seriesName: '#detailed-view-chart-series-name',
    selColor: '#detailed-view-chart-color',
    selStyle: '#detailed-view-chart-style',
    selOperation: '#detailed-view-chart-operation',
    selIntervalGroup: '#detailed-view-chart-interval-group',
    selInterval: '#detailed-view-chart-interval',
    butOk: '#detailed-view-chart-ok',
    butCancel: '#detailed-view-chart-cancel'
  },
  chartView: null,
  chartViewModel: null,
  rendered: false,
  collection: null,
  edited: null,
  old: null,
  color: null,
  style: null,
  transform: null,
  interval: null,
  initialize: function () {
    this.listenTo(this.model, 'change:collection', this.prepareCollection.bind(this));
    this.listenTo(this.model, 'change:event', this.highlightEvent.bind(this));
    this.edited = this.model.get('edited');
    this.old = {
      color: this.edited.get('color'),
      style: this.edited.get('style'),
      transform: this.edited.get('transform'),
      interval: this.edited.get('interval')
    };
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
          showLegend: false,
          onClick: false,
          onHover: true,
          onDnD: false,
          editPoint: true,
          enableNavigation: false,
          xaxis: true,
          showNodeCount: false
        });

      this.chartView = new ChartView({model: this.chartViewModel});
      this.ui.selColor.bind('change', this.editorChange.bind(this));
      this.ui.selStyle.bind('change', this.editorChange.bind(this));
      this.ui.selOperation.bind('change', this.editorChange.bind(this));
      this.ui.selInterval.bind('change', this.editorChange.bind(this));
      this.ui.butOk.on('click', function () {
        this.trigger('ready', this.edited);
      }.bind(this));
      this.ui.butCancel.on('click', function () {
        this.edited.set('color', this.old.color);
        this.edited.set('style', this.old.style);
        this.edited.set('transform', this.old.transform);
        this.edited.set('interval', this.old.interval);
        this.trigger('cancel');
      }.bind(this));
    }

    if ($('#detail-chart-container-edit').length !== 0) {
      this.updateEditor();
      if (this.chartView) { this.chartView.unbind(); }
      this.chartView.render();
      this.chartView.on('eventEdit', this.onValueEdited.bind(this));
      this.highlightEvent();
      this.rendered = true;
    }
    $('body').i18n();
  },
  debounceRender: _.debounce(function () {
    if (!this.rendered) {
      if (this.chartView) { this.chartView.unbind(); }
      this.render();
      this.highlightEvent();
      this.chartView.on('eventEdit', this.onValueEdited.bind(this));
    }
  }, 1000),
  onValueEdited: function (event) {
    this.trigger('eventEdit', event);
  },
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

    this.updateEditor();

    if (this.chartView) { this.chartView.unbind(); }
    this.chartView.render();
    this.chartView.on('eventEdit', this.onValueEdited.bind(this));
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
    this.chartView.close();
    this.chartView = null;
    $(this.itemViewContainer).empty();
  },
  updateEditor: function () {
    var i,
        editedModel = this.model.get('edited');

    this.ui.seriesName.html(editedModel.get('seriesLegend'));
    this.ui.selColor.css({'background-color': editedModel.get('color')});

    var colorFound = false,
        options = this.ui.selColor[0].options;
    for (i = 0; i < options.length; ++i) {
      if (options[i].value === editedModel.get('color')) {
        this.ui.selColor[0].selectedIndex = i;
        colorFound = true;
        break;
      }
    }
    if (! colorFound) {
      if (editedModel.get('color')) {
        $(this.ui.selColor).css({
          'background-color': editedModel.get('color')
        });
      }
    }

    options = this.ui.selStyle[0].options;
    for (i = 0; i < options.length; ++i) {
      if (options[i].value === editedModel.get('style')) {
        this.ui.selStyle[0].selectedIndex = i;
        break;
      }
    }

    options = this.ui.selOperation[0].options;
    var transform = editedModel.get('transform');
    for (i = 0; i < options.length; ++i) {
      if (options[i].value === transform) {
        this.ui.selOperation[0].selectedIndex = i;
        break;
      }
    }

    // show/hide interval control depending on transform
    $(this.ui.selIntervalGroup[0]).toggle(transform !== 'none');

    options = this.ui.selInterval[0].options;
    for (i = 0; i < options.length; ++i) {
      if (options[i].value === editedModel.get('interval')) {
        this.ui.selInterval[0].selectedIndex = i;
        break;
      }
    }
  }
});
