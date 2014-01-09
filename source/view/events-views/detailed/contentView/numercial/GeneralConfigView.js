/* global $ */
var Marionette = require('backbone.marionette'),
  _ = require('underscore'),
  //Model = require('../../../numericals/TimeSeriesModel.js'),
  ChartModel = require('../../../numericals/ChartModel.js'),
  ChartView = require('../../../numericals/ChartView.js');


module.exports = Marionette.ItemView.extend({
  type: 'Numerical',
  template: '#template-detail-content-numerical-general',
  itemViewContainer: '#detail-content',
  chartView: null,
  rendered: false,
  initialize: function () {
    this.listenTo(this.model, 'change:collection', this.render.bind(this));
    this.listenTo(this.model, 'change:event', this.highlightEvent.bind(this));
  },
  onRender: function () {
    $(this.itemViewContainer).html(this.el);

    if (this.chartView) {
      this.chartView.model.set('collection', this.model.get('collection'));
    } else {
      this.chartView = new ChartView({model:
        new ChartModel({
          container: '#detail-chart-container-general',
          view: null,
          requiresDim: false,
          collection: this.model.get('collection'),
          highlighted: false,
          highlightedTime: null,
          allowPieChart: false,
          dimensions: null,
          legendStyle: 'list', // Legend style: 'list', 'table'
          legendButton: true,  // A button in the legend
          legendButtonContent: ['edit', 'duplicate', 'remove'],
          legendShow: true,     // Show legend or not
          legendContainer: '#legend-container-general', //false or a a selector
          legendExtras: true,   // use extras in the legend
          onClick: false,
          onHover: false,
          onDnD: false,
          allowPan: false,      // Allows navigation through the chart
          allowZoom: false,     // Allows zooming on the chart
          xaxis: true
        })});

      this.chartView.on('remove', function (m) {
        this.trigger('remove', m);
      }.bind(this));

      this.chartView.on('edit', function (m) {
        this.trigger('edit', m);
      }.bind(this));

      this.chartView.on('duplicate', function (m) {
        this.trigger('duplicate', m);
      }.bind(this));
    }

    if ($('#detail-chart-container-general').length !== 0) {
      this.chartView.render();
      this.highlightEvent();
      this.rendered = true;
    }
  },
  /*
  addAttachment: function () {
    var id = 'attachment-' + this.addAttachmentId;
    var html = '<li><input type="file" id="' + id + '"></li>';
    this.addAttachmentId++;
    $(this.addAttachmentContainer).append(html);
    $('#' + id).bind('change', this._onFileAttach.bind(this));
  },
  _onFileAttach : function (e)	{
    var file = new FormData(),
      keys = this.model.get('event').attachments ? _.keys(this.model.get('event').attachments) :
        [e.target.files[0].name];
    e.target.disabled = true;
    file.append(keys[0].split('.')[0], e.target.files[0]);
    this.model.addAttachment(file);
  },
  */

  debounceRender: _.debounce(function () {
    if (!this.rendered) {
      this.render();
      this.highlightEvent();
    }
  }, 1000),

  highlightEvent: function () {
    if (this.chartView && this.model.get('event')) {
      this.chartView.highlightEvent(this.model.get('event'));
    }
  },
  onClose: function () {
    this.chartView.close();
    this.chartView = null;
    $(this.itemViewContainer).empty();
  }
});