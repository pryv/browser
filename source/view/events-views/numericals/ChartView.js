/* global $ */
var Marionette = require('backbone.marionette'),
  Pryv = require('pryv'),
  _ = require('underscore'),
  ChartTransform = require('./utils/ChartTransform.js');

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
    _.extend(this, ChartTransform);
    this.listenTo(this.model.get('collection'), 'add', this.render);
    this.listenTo(this.model.get('collection'), 'remove', this.render);
    this.listenTo(this.model, 'change:dimensions', this.resize);
    this.listenTo(this.model, 'change:highlightedTime', this.onDateHighLighted);
    this.container = this.model.get('container');
  },

  onRender: function () {
    if (
      !this.model.get('collection') ||
      this.model.get('collection').length === 0 ||
      !this.model.get('container') ||
      this.model.get('container') === null) {
      if (this.model.get('collection').length === 0) {
        $(this.model.get('container')).empty();
        if (this.model.get('legendContainer')) {
          $(this.model.get('legendContainer')).empty();
        }
      }
      return;
    }


    if (this.model.get('legendExtras')) {
      this.useExtras  = true;
      try {
        if (!Pryv.eventTypes.extras('mass/kg')) {
          this.useExtras = false;
        }
      } catch (e) {
        this.useExtras = false;
      }
    }

    this.container = this.model.get('container');

    if (this.model.get('collection').length === 1 &&
      this.model.get('collection').at(0).get('events').length === 1 &&
      this.model.get('singleNumberAsText')) {
      var m = this.model.get('collection').at(0);
      $(this.container).html('<span class="aggregated-nbr-events">1</span>' +
        '<div class="content Center-Container is-Table">' +
        '<div class="Table-Cell">' +
        '<div class="Center-Block">' +
        '<span class="value"> ' +
        m.get('events')[0].content + ' ' +
        '</span><span class="unity">' +
        (this.useExtras ?
          Pryv.eventTypes.extras(m.get('events')[0].type).symbol : m.get('events')[0].type) +
        '</span></div></div></div>');
      $(this.container + ' .aggregated-nbr-events').bind('click',
        function () {
          this.trigger('nodeClicked');
        }.bind(this));
    } else {
      this.makePlot();
      this.onDateHighLighted();
    }
  },

  makePlot: function () {

    var collection = this.model.get('collection');
    this.container = this.model.get('container');

    this.options = {};
    this.data = [];

    this.makeOptions();
    this.setUpContainer();

    collection.each(function (s, i) {
      this.addSeries(s, i);
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
      if (this.model.get('legendContainer')) {
        this.rebuildLegend(this.model.get('legendContainer') + ' table');
      } else {
        this.rebuildLegend(this.container + ' table');
      }
      this.legendButtonBindings();
    }

  },

  resize: function () {
    if (!this.model.get('dimensions')) {
      return;
    }
    if (this.model.get('requiresDim')) {
      $(this.chartContainer).css(this.model.get('dimensions'));
    }
    this.render();
  },

  /**
   * Generates the general plot options based on the model
   */
  makeOptions: function () {

    var collection = this.model.get('collection');
    var seriesCounts = collection.length;
    this.options = {};
    this.options.shadowSize = 0;
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
      timeformat: '%y/%m/%d %h:%M:%S',
      ticks: this.getExtremeTimes()
    } ];
    this.options.yaxes = [];
    this.options.xaxis = {};


    this.options.legend = {};
    if (this.model.get('legendButton')) {
      var model = this.model;
      this.options.legend.labelFormatter = function (label) {
        var buttons = model.get('legendButtonContent');
        var legend = '<span class="DnD-legend-text">' + label + '</span>';
        for (var i = 0; i < buttons.length; ++i) {
          switch (buttons[i]) {
          case 'ready':
            legend = legend + '<a class="btn btn-primary btn-xs DnD-legend-button-ready" ' +
              'href="javascript:;"><span class="glyphicon glyphicon-ok"></span></a>';
            break;
          case 'duplicate':
            legend = legend + '<a class="btn btn-primary btn-xs DnD-legend-button-duplicate" ' +
              'href="javascript:;"><span class="glyphicon glyphicon-magnet"></span></a>';
            break;
          case 'remove':
            legend = legend + '<a class="btn btn-primary btn-xs DnD-legend-button-remove" ' +
              'href="javascript:;"><span class="glyphicon glyphicon-trash"></span></a>';
            break;
          case 'edit':
            legend = legend + '<a class="btn btn-primary btn-xs DnD-legend-button-edit" ' +
              'href="javascript:;"><span class="glyphicon glyphicon-pencil"></span></a>';
            break;
          }
        }
        return legend;
      };
    }
    if (this.model.get('legendContainer')) {
      this.options.legend.container = this.model.get('legendContainer');
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
        interactive: collection ? (seriesCounts < 2 ?
          (collection.at(0).get('events').length > 1) : true)  : true,
        cursor: 'move',
        frameRate: 20
      };
      this.options.xaxis.panRange = [this.getExtremeTimes()[0] - 100000,
        this.getExtremeTimes()[1] + 100000];
    }

    if (this.model.get('allowZoom')) {
      this.options.zoom = {
        interactive: true,
        trigger: 'dblclick',
        amount: 1.2
      };
    }
    this.options.xaxis.zoomRange = [1000, null];

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

  getExtremeValues: function (data) {
    var e = data;
    var min = Infinity, max = -Infinity;
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

    series.sortData();
    var data = this.transform(series);
    var label = this.useExtras ?
      Pryv.eventTypes.extras(series.get('type')).symbol : series.get('type');

    // Configures series
    this.data.push({
      data: data,
      label: label,
      yaxis: (seriesIndex + 1)
    });

    // Configures the axis
    this.options.yaxes.push({ show: false});

    if (this.model.get('allowPan')) {
      this.options.yaxes[seriesIndex].panRange = data.length > 1 ?
        this.getExtremeValues(data) : false;
    }
    if (this.model.get('allowZoom')) {
      this.options.yaxes[seriesIndex].zoomRange = data.length > 1 ?
        [this.getExtremeTimes()[0] - 100000, this.getExtremeTimes()[1] + 100000] :
        false;
    }

    // Configure the serie's color
    if (series.get('color')) {
      this.data[seriesIndex].color = series.get('color');
    }

    // Configures the series' style
    switch (series.get('style')) {
    case 'line':
      this.data[seriesIndex].lines = { show: true };
      this.data[seriesIndex].points = { show: (data.length < 2) };
      break;
    case 'bar':
      this.data[seriesIndex].bars = { show: true,
                                      barWidth : this.getDurationFunction(series.get('interval'))
                                        (new Date(2011, 1, 1, 1, 1))};
      break;
    case 'point':
      this.data[seriesIndex].points = { show: true };
      break;
    default:
      this.data[seriesIndex].lines = { show: true };
      this.data[seriesIndex].points = { show: (data.length < 2) };
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
    if (!date) {
      date = this.model.get('highlightedTime');
    }
    if (!this.plot || !date) {
      return;
    }

    this.plot.unhighlight();

    var chartView = this;
    var data = this.plot.getData();

    this.model.get('collection').each(function (s, i) {
      var dF = chartView.getDurationFunction(s.get('interval'));
      var distance = null;
      var best = 0;

      for (var j = 0; j < data[i].data.length; ++j) {
        var duration = dF(new Date(data[i].data[j][0]));
        var d1 = Math.abs(date - (data[i].data[j][0] / 1000));
        var d2 = Math.abs(date - ((data[i].data[j][0] + duration) / 1000));

        if (distance === null) {
          best = j;
          distance = d1 < d2 ? d1 : d2;
        } else if ((data[i].data[j][0] / 1000) <= date &&
          date <= ((data[i].data[j][0] + duration) / 1000)) {
          best = j;
          break;
        } else if (d1 <= distance || d2 <= distance) {
          best = j;
          distance = d1 < d2 ? d1 : d2;
        }
      }

      best = data[i].data.length === best ? best - 1: best;
      chartView.plot.highlight(i, best);
    });
  },

  highlightEvent: function (event) {
    // TODO: Support multiple series containing the same event.
    if (!this.plot) {
      return;
    }
    this.plot.unhighlight();
    var c = this.model.get('collection');
    var e = event;
    var m = null;
    var cIdx, eIdx;
    var connectionId = e.connection.id;
    var streamId = e.streamId;
    var streamName = e.stream.name;

    for (var it = 0; it < c.length; ++it) {
      m = c.at(it);
      if (m) {
        if (m.get('connectionId') === connectionId &&
          m.get('streamId') === streamId &&
          m.get('streamName') === streamName) {
          break;
        }
      }
    }
    if (it !== c.length) {
      cIdx = it;
    } else {
      return;
    }

    var data = this.plot.getData()[it];
    for (it = 0; it < data.data.length; ++it) {
      var elem = data.data[it];
      if (elem[0] === e.time * 1000 && elem[1] === +e.content) {
        break;
      }
    }
    if (it !== data.data.length) {
      eIdx = it;
    } else {
      return;
    }
    this.plot.highlight(cIdx, eIdx);
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

      var chartView = this;
      var buttons = null;
      var buttonTypes = this.model.get('legendButtonContent');
      var selector = '';
      var current = null;
      var binder = function (i, e) {
        $(e).on('click', {type: current, index: i},
          chartView.legendButtonClicked.bind(chartView));
      };
      for (var i = 0; i < buttonTypes.length; ++i) {
        current = buttonTypes[i];
        selector = '.DnD-legend-button-' + current;
        if (this.model.get('legendContainer')) {
          buttons = $(selector, $(this.model.get('legendContainer')));
        } else {
          buttons  = $(selector, $(this.container));
        }
        buttons.each(binder);
      }
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
  },

  /* Fires when a dragged element enters this' scope */
  onDragEnter: function (e) {
    var data = JSON.parse(e.originalEvent.dataTransfer.getData('text'));
    var droppedNodeID = data.nodeId;
    if ($(e.currentTarget).attr('id') !== droppedNodeID) {
      $('.chartContainer', $(e.currentTarget)).not(this.container).addClass('animated shake');
      setTimeout(function () {
        $('.chartContainer', $(e.currentTarget)).removeClass('animated shake');
      }, 1000);
    }
  },

  /* Fires when a dragged element is over this' scope */
  onDragOver: function (e) {
    e.preventDefault();
  },

  /* Fires when a dragged element leaves this' scope */
  onDragLeave: function (e) {
    var data = JSON.parse(e.originalEvent.dataTransfer.getData('text'));
    var droppedNodeID = data.nodeId;
    $('.chartContainer').not('#' + droppedNodeID + ' .chartContainer').addClass('animated shake');
    setTimeout(function () {
      $('.chartContainer').removeClass('animated shake');
    }, 1000);
  },

  /* Called when this object is stops being dragged */
  onDragEnd: function () {
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

  legendButtonClicked: function (e) {
    var buttonType = e.data.type;
    var index = e.data.index;
    var model = this.model.get('collection').at(index);
    this.trigger(buttonType, model);
  },

  onPlotPan: function () {
    if (this.model.get('legendShow') &&
      this.model.get('legendStyle') &&
      this.model.get('legendStyle') === 'list') {
      if (this.model.get('legendContainer')) {
        this.rebuildLegend(this.model.get('legendContainer') + ' table');
      } else {
        this.rebuildLegend(this.container + ' table');
      }
      this.legendButtonBindings();
    }
  }
});
