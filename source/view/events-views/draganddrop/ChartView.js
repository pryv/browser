/* global $ */
var Marionette = require('backbone.marionette'),
  Pryv = require('pryv'),
  _ = require('underscore');

module.exports = Marionette.CompositeView.extend({
  template: '#template-chart-container',
  container: null,
  options: null,
  data: null,
  plot: null,
  chartContainer: null,
  useExtras: null,
  waitExtras: null,


  initialize: function () {
    this.listenTo(this.model.get('collection'), 'add', this.render);
    this.listenTo(this.model, 'change:dimensions', this.resize);
    this.container = this.model.get('container');
  },

  onRender: function () {

    if (
      !this.model.get('collection') ||
      !this.model.get('container')) {
      return;
    }

    if (this.model.get('legendExtras')) {
      this.useExtras  = true;
      try {
        Pryv.eventTypes.extras('mass/kg');
      } catch (e) {
        this.useExtras = false;
      }
    }

    this.makePlot();
    this.onDateHighLighted(0);
  },

  makePlot: function () {
    var collection = this.model.get('collection');
    this.container = this.model.get('container');

    this.options = {};
    this.data = [];

    this.makeOptions();
    this.setUpContainer();

    collection.each(function (s) {
      s.sortData();
    });

    var dataMapper = function (d) {
      return _.map(d, function (e) {
        return [e.time * 1000, e.content];
      });
    };

    collection.each(function (s, i) {
      this.addSeries({
        data: dataMapper(s.get('events')),
        label: this.useExtras ? Pryv.eventTypes.extras(s.get('type')).symbol : s.get('type'),
        type: s.get('type'),
        colId: i
      }, i);
    }.bind(this));

    var eventsNbr = 0;
    _.each(this.data, function (d) {
      eventsNbr += d.data.length;
    });
    $(this.container).append('<span class="aggregated-nbr-events">' + eventsNbr + '</span>');


    this.plot = $.plot($(this.chartContainer), this.data, this.options);

    this.createEventBindings();

    // build legend as list
    if (this.model.get('legendStyle') && this.model.get('legendStyle') === 'list') {
      $('.chartContainer > .legend').attr('id', 'DnD-legend');
      this.rebuildLegend(this.container + ' table');
      this.legendButtonBindings();
    }

  },

  resize: function () {
    if (!this.model.get('dimensions')) {
      return;
    }
    this.plot.render();
  },

  /**
   * Generates the general plot options based on the model
   */
  makeOptions: function () {
    var seriesCounts = this.model.get('collection').length;
    this.options = {};
    this.options.grid = {
      hoverable: true,
      clickable: true,
      borderWidth: 0,
      minBorderMargin: 5,
      autoHighlight: true
    };
    this.options.xaxes = [ {
      show: (this.model.get('xaxis') && seriesCounts !== 0),
      mode: 'time',
      timeformat: '%y/%m/%d',
      ticks: this.getExtremeTimes()
    } ];
    this.options.yaxes = [];
    this.options.xaxis = {};


    this.options.legend = {};
    if (this.model.get('legendButton')) {
      this.options.legend.labelFormatter = function (label) {
        return '<a class="DnD-legend-button" href="javascript:;">x</a>' +
          '<span class="DnD-legend-text">' + label + '</span>';
      };
    }
    if (this.model.get('legendShow') && this.model.get('legendShow') === 'size') {
      this.options.legend.show = (this.model.get('dimensions').width >= 80 &&
        this.model.get('dimensions').height >= (19 * seriesCounts) + 15);
    } else if (this.model.get('legendShow')) {
      this.options.legend.show = true;
    } else {
      this.options.legend.show = false;
    }


    // If pan is activated
    if (this.model.get('allowPan')) {
      this.options.pan = {
        interactive: true,
        cursor: 'move',
        frameRate: 20
      };
      this.options.xaxis.panRange = this.getExtremeTimes();
    }

    if (this.model.get('allowZoom')) {
      this.options.zoom = {
        interactive: true,
        trigger: 'dblclick',
        amount: 1.2
      };
    }

    seriesCounts = null;
  },

  getExtremeTimes: function () {
    var collection = this.model.get('collection');
    var min = Infinity, max = 0;
    collection.each(function (s) {
      var events = s.get('events');
      min = (events[events.length - 1].time < min) ? events[events.length - 1].time : min;
      max = (events[0].time > max) ? events[0].time : max;
    });
    return [min * 1000, max * 1000];
  },

  getExtremeValues: function (series) {
    var e = series.data;
    var min = Infinity, max = 0;
    for (var i = 0; i < e.length; ++i) {
      min = (e[i][1] < min) ? e[i][1] : min;
      max = (e[i][1] > max) ? e[i][1] : max;
    }
    return [min, max];
  },

  /**
   * Adds a series to the plot and configures it based on the model.
   * @param series, the series to add (a single one)
   * @param seriesIndex, its index
   */
  addSeries: function (series, seriesIndex) {

    // Configures series
    this.data.push({
      data: series.data,
      label: series.label,
      yaxis: (seriesIndex + 1)
    });

    // Configures the axis
    this.options.yaxes.push({ show: false});


    if (this.model.get('allowPan')) {
      this.options.yaxes[seriesIndex].panRange = this.getExtremeValues(series);
    }
    if (this.model.get('allowZoom')) {
      this.options.yaxes[seriesIndex].zoomRange = [0.001, 1000];
    }

    // Configures the series' style
    switch (series.type) {
    case 0:
      this.data[seriesIndex].lines = { show: true };
      this.data[seriesIndex].points = { show: (series.data.length < 2) };
      break;
    case 1:
      this.data[seriesIndex].bars = { show: true };
      break;
    default:
      this.data[seriesIndex].lines = { show: true };
      this.data[seriesIndex].points = { show: (series.data.length < 2) };
      break;
    }
  },

  setUpContainer: function () {
    // Setting up the chart container
    this.chartContainer = this.container + ' .chartContainer';
    $(this.container).html('<div class="chartContainer"></div>');

    $(this.chartContainer).css({
      top: 0,
      left: 0,
      width: '100%',
      height: '100%'
    });

  },

  // TODO: virer les this imbriques
  rebuildLegend: function (element) {
    var list = $('<ul/>');
    $(element).find('tr').each(function (index) {
      var p = $(this).children().map(function (index2) {
        if (index2 === 0) {
          if ($('div > div', $(this)).length !== 0) {
            $('div > div', $(this)).addClass('DnD-legend-color');
            return $('div > div', $(this))[0].outerHTML;
          }
        }
        if (index2 === 1) {
          if ($('a', $(this)).length !== 0) {
            $('a', $(this)).attr('id', 'series-' + index);
            return $(this).html();
          }
        }
      });
      list.append('<li>' + $.makeArray(p).join('') + '</li>');
    });
    $('div', $(element).parent()).remove();
    $(element).replaceWith(list);
  },

  showTooltip: function (x, y, content) {
    if ($('#chart-tooltip').length === 0) {
      $('body').append('<div id="chart-tooltip" class="tooltip">' + content + '</div>');
    }
    if ($('#chart-tooltip').text() !== content) {
      $('#chart-tooltip').text(content);
    }
    $('#chart-tooltip').css({
      top: x + this.plot.offset().top,
      left: y + this.plot.offset().left
    }).fadeIn(500);
  },

  removeTooltip: function () {
    $('#chart-tooltip').remove();
  },


  onDateHighLighted: function (date) {
    if (!this.plot) {
      return;
    }

    this.plot.unhighlight();
    var data = this.plot.getData();
    for (var k = 0; k < data.length; k++) {
      var distance = null;
      var best = 0;
      for (var m = 0; m < data[k].data.length; m++) {
        if (distance === null || Math.abs(date - data[k].data[m][0] / 1000) < distance) {
          distance = Math.abs(date - data[k].data[m][0] / 1000);
          best = m;
        } else { break; }
      }
      this.plot.highlight(k, best);
    }
  },

  onClose: function () {
    $(this.chartContainer).empty();
    $(this.container).unbind();
    $(this.container).empty();
    this.container = null;
    this.chartContainer = null;
    this.options = null;
    this.data = null;
    this.plot = null;
  },

  createEventBindings: function () {
    $(this.container).unbind();

    $(this.container).bind('resize', function () {
      this.trigger('chart:resize', this.model);
    });

    if (this.model.get('onClick')) {
      $(this.container).bind('plotclick', this.onClick.bind(this));
    }
    if (this.model.get('onHover')) {
      $(this.container).bind('plothover', this.onHover.bind(this));
    }
    if (this.model.get('onDnD')) {
      $(this.container).attr('draggable', true);
      $(this.container).bind('dragstart', this.onDragStart.bind(this));
      $(this.container).bind('dragenter', this.onDragEnter.bind(this));
      $(this.container).bind('dragover', this.onDragOver.bind(this));
      $(this.container).bind('dragleave', this.onDragLeave.bind(this));
      $(this.container).bind('drop', this.onDrop.bind(this));
      $(this.container).bind('dragend', this.onDragEnd.bind(this));
      $(this.container + ' .aggregated-nbr-events').bind('click',
        function () {
          this.trigger('nodeClicked');
        }.bind(this));
    }

    if (this.model.get('allowPan')) {
      $(this.chartContainer).bind('plotpan', this.onPlotPan.bind(this));
    }
    if (this.model.get('allowZoom')) {
      $(this.chartContainer).bind('plotzoom', this.onPlotPan.bind(this));
    }
  },

  legendButtonBindings: function () {
    if (this.model.get('legendButton')) {
      var buttons = $('a', $(this.container));
      var chartView = this;
      buttons.each(function () {
          $(this).bind('click', chartView.seriesButtonClicked.bind(chartView));
        }
      );
    }
  },


  /* ***********************
   * Click and Point hover Functions
   */
  onClick: function () {
    this.trigger('chart:clicked', this.model);
  },

  onHover: function (event, pos, item) {
    if (item) {
      var labelValue = item.datapoint[1].toFixed(2);
      var coords = this.computeCoordinates(0, item.seriesIndex, item.datapoint[1],
        item.datapoint[0]);
      this.showTooltip(coords.top + 5, coords.left + 5, labelValue);
    } else {
      this.removeTooltip();
    }
  },

  computeCoordinates: function (xAxis, yAxis, xPoint, yPoint) {
    var yAxes = this.plot.getYAxes();
    var xAxes = this.plot.getXAxes();
    var coordY = yAxes[yAxis].p2c(xPoint);
    var coordX = xAxes[xAxis].p2c(yPoint);
    return { top: coordY, left: coordX};
  },



  /* ***********************
   * Drag and Drop Functions
   */

  /* Called when this object is starts being dragged */
  onDragStart: function (e) {
    var data = '{ "nodeId": "' + this.container.substr(1) + '", ' +
      '"streamId": "' + $(this.container).attr('data-streamid') + '", ' +
      '"connectionId": "' + $(this.container).attr('data-connectionid') + '"}';
    e.originalEvent.dataTransfer.setData('text', data);
    $('.chartContainer').addClass('animated shake');
  },

  /* Fires when a dragged element enters this' scope */
  onDragEnter: function () {
  },

  /* Fires when a dragged element is over this' scope */
  onDragOver: function (e) {
    e.preventDefault();
  },

  /* Fires when a dragged element leaves this' scope */
  onDragLeave: function () {
  },

  /* Called when this object is stops being dragged */
  onDragEnd: function () {
    $('.chartContainer').removeClass('animated shake');
  },

  /* Called when an element is dropped on it */
  onDrop: function (e) {
    e.stopPropagation();
    e.preventDefault();
    var data = JSON.parse(e.originalEvent.dataTransfer.getData('text'));
    var droppedNodeID = data.nodeId;
    var droppedStreamID = data.streamId;
    var droppedConnectionID = data.connectionId;
    this.trigger('chart:dropped', droppedNodeID, droppedStreamID, droppedConnectionID);
  },

  seriesButtonClicked: function (e) {
    var idx = $(e.target).attr('id').split('-')[1];
    var removed = this.model.get('collection').at(idx);
    this.model.get('collection').remove(removed);
    this.render();
  },

  onPlotPan: function () {
    if (this.model.get('legendShow') &&
      this.model.get('legendStyle') &&
      this.model.get('legendStyle') === 'list') {
      this.rebuildLegend(this.container + ' table');
      this.legendButtonBindings();
    }
  }
});
