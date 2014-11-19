/* global $, Highcharts, moment, pryvBrowser */

var _ = require('underscore'),
    dateTime = require('../../../utility/dateTime'),
    Marionette = require('backbone.marionette'),
    pryv = require('pryv'),
    tsTransform = require('./utils/timeSeriesTransform.js');

var ChartView = {
  template: '#template-chart-container',
  container: null,
  data: null,
  chartSettings: {},
  chart: null,
  chartContainer: null,
  useExtras: null,
  waitExtras: null,
  currentlyEdited: null
};

ChartView.initialize = function () {
  this.listenTo(this.model.get('collection'), 'add', this.render);
  this.listenTo(this.model.get('collection'), 'remove', this.render);
  this.listenTo(this.model, 'change:dimensions', this.resize);
  this.listenTo(this.model, 'change:highlightedTime', this.onDateHighLighted);
  this.container = this.model.get('container');
};

ChartView.resize = function () {
  if (! this.model.get('dimensions')) {
    return;
  }
  if (this.model.get('requiresDim')) {
    $(this.chartContainer).css(this.model.get('dimensions'));
  }
  if (this.chart) {
    this.chart.reflow();
  } else { // TODO: may not be needed
    this.render();
  }
};

ChartView.onRender = function () {
  if (! this.model.get('collection') ||
      this.model.get('collection').length === 0 ||
      ! this.model.get('container')) {
    if (this.model.get('collection').length === 0) {
      $(this.model.get('container')).empty();
    }
    return;
  }

  this.useExtras  = true;
  try {
    if (! pryv.eventTypes.extras('mass/kg')) {
      this.useExtras = false;
    }
  } catch (e) {
    this.useExtras = false;
  }

  this.container = this.model.get('container');

  if (this.model.get('collection').length === 1 &&
      this.model.get('collection').at(0).get('events').length === 1 &&
      this.model.get('singleNumberAsText')) {
    this.singleEventSetup();
  } else {
    this.makeChart();
    this.onDateHighLighted();
  }
};

ChartView.makeChart = function () {
  var chartView = this,
      collection = this.model.get('collection');
  this.container = this.model.get('container');

  var settings = this.chartSettings = {
    series: [],
    yAxis: []
  };

  this.setUpContainer();

  var timeScale = pryvBrowser.timeView.getScale(),
      timeBounds = pryvBrowser.timeView.getTimeBounds(),
      fromMsTime = timeBounds.from * 1000,
      toMsTime = timeBounds.to * 1000,
      autoSeriesInterval = getAutoSeriesInterval(timeScale, fromMsTime, toMsTime);

  var eventsCount = 0,
      streamNamesPerDataId = {},
      eventSymbolsPerDataId = {},
      yIndexForType = {};
  collection.each(function (seriesModel) {
    seriesModel.sortData();

    var seriesId = getSeriesId(seriesModel.get('streamId'), seriesModel.get('type')),
        eventType = seriesModel.get('type'),
        eventSymbol = getEventValueSymbol(eventType,
            this.useExtras ? pryv.eventTypes.extras(eventType) : null);

    seriesModel.set('seriesId', seriesId);
    eventSymbolsPerDataId[seriesId] = eventSymbol;
    streamNamesPerDataId[seriesId] = seriesModel.get('streamName');
    seriesModel.set('seriesLegend', streamNamesPerDataId[seriesId] + ' (' + eventSymbol + ')');

    // separate y axis per event type
    var yIndex = yIndexForType[eventType];
    if (! yIndex) {
      yIndex = settings.yAxis.push({
        title: {text: null},
        labels: {enabled: false},
        gridLineWidth: 0
      }) - 1;
      yIndexForType[eventType] = yIndex;
    }

    var setInterval = seriesModel.get('interval');
    seriesModel.actualInterval = setInterval !== 'auto' ? setInterval : autoSeriesInterval;
    var series = {
      id: seriesId,
      name: seriesModel.get('seriesLegend'),
      type: getSeriesChartType(seriesModel.get('style')),
      yAxis: yIndex,
      data: tsTransform.transform(seriesModel.get('events'), {
        seriesId: seriesId,
        transform: seriesModel.get('transform'),
        interval: seriesModel.actualInterval
      }),
      tooltip: {valueSuffix: ' ' + eventSymbol}
    };

    if (seriesModel.get('color')) {
      series.color = seriesModel.get('color');
    }

    settings.series.push(series);

    eventsCount += seriesModel.get('events').length;
  }.bind(this));

  settings.plotOptions = {
    column: {
      borderColor: null,
      borderWidth: 1
    },
    series: {
      marker: {
        symbol: 'circle',
        radius: 3,
        lineColor: null,
        lineWidth: 1,
        fillColor: '#FFFFFF',
        states: {
          select: {
            fillColor: null,
            lineColor: null,
            radius: 5
          }
        }
      },
      states: {
        select: {
          color: null,
          borderColor: '#719726'
        }
      }
    }
  };
  var tickSettings = dateTime.getTickSettings(timeScale, fromMsTime, toMsTime);
  settings.xAxis = {
    type: 'datetime',
    min: fromMsTime,
    max: toMsTime,
    tickPositions: tickSettings.getValues(fromMsTime, toMsTime),
    labels: {
      formatter: tickSettings.getLabel
    }
  };
  settings.tooltip = {
    shared: true,
    borderColor: '#BDC3C7',
    shadow: false,
    crosshairs: {
      width: 1,
      color: 'gray',
      dashStyle: 'dot'
    },
    formatter: function () {
      var s = '<strong>' + dateTime.getTimeText(this.x / 1000) + '</strong>';

      _.forEach(this.points, function (pt) {
        s += '<br/> <span style="color:' + pt.series.color + '">\u25CF</span> ' +
            streamNamesPerDataId[pt.series.options.id] +
            ': <strong>' + (+(pt.y).toFixed(2)) + '</strong> ' +
            pt.series.tooltipOptions.valueSuffix;
      }, this);

      return s;
    }
  };
  if (this.model.get('showLegend')) {
    var actions = this.model.get('legendActions');
    settings.legend = {
      verticalAlign: 'top',
      itemStyle: {
        //TODO: see about extracting all styles into a theme (see Highcharts docs)
        fontSize: actions ? '13px' : '10px',
        fontWeight: 'normal'
      },
      useHTML: true,
      labelFormatter: function () {
        var s = this.name;
        if (actions) {
          _.each(actions, function (action) {
            s += ' ' + getLegendActionButtonHTML(this.options.id, action);
          }.bind(this));
        }
        return s;
      }
    };
  } else {
    settings.legend = {enabled: false};
  }
  // TODO fix: this triggers an issue with model being modified by detailed view
  // (to reproduce: chart in treemap, open details, back, refresh: treemap chart model corrupted)
//  if (this.model.get('enableNavigation')) {
//    this.chartSettings.subchart = {show: true};
//  }
  settings.title = {text: ''};
  settings.chart = {
    reflow: false,
    renderTo: $(this.chartContainer)[0],
    style: {
      fontFamily: 'Roboto, Georgia, Arial, sans-serif'
    }
  };
  settings.credits = {enabled: false};

  this.chart = new Highcharts.Chart(settings);

  // event bindings, TODO: review & cleanup

  var $container = $(this.container);
  $container.off();
  if (this.model.get('showNodeCount')) {
    $container.append('<span class="aggregated-nbr-events">' + eventsCount + '</span>');
    // override default Highcharts handlers to let events we need get through
    this.chart.container.onmousedown = null;
    this.chart.container.onclick = function () {
      this.trigger('nodeClicked');
    }.bind(this);
  }

  if (this.model.get('legendActions')) {
    $('.legend-action', $container).on('click', function () {
      var $this = $(this),
          seriesId = $this.data('series-id');
      var seriesModel = collection.find(function (model) {
        return model.get('seriesId') === seriesId;
      });
      chartView.trigger($this.data('action'), seriesModel);
    });
  }

  // TODO review & cleanup

//  if (this.model.get('editPoint')) {
//    $container.bind('plotclick', this.onEdit.bind(this));
//  }
//
//  if (this.model.get('onClick')) {
//    $container.bind('plotclick', this.onClick.bind(this));
//  }
//  if (this.model.get('onHover')) {
//    $container.bind('plothover', this.onHover.bind(this));
//  }

  if (this.model.get('onDnD')) {
    $container.attr('draggable', true);
    $container.bind('dragstart', this.onDragStart.bind(this));
    $container.bind('dragenter', this.onDragEnter.bind(this));
    $container.bind('dragover', this.onDragOver.bind(this));
    $container.bind('dragleave', this.onDragLeave.bind(this));
    $container.bind('drop', this.onDrop.bind(this));
    $container.bind('dragend', this.onDragEnd.bind(this));
  }
};

function getSeriesId(streamId, eventType) {
  return streamId + '_' + eventType.replace('/', '_');
}

var ChartTypePerSeriesStyle = {
  bar: 'column',
  line: 'line',
  spline: 'spline',
  point: 'scatter'
};
function getSeriesChartType(seriesStyle) {
  return ChartTypePerSeriesStyle[seriesStyle] || ChartTypePerSeriesStyle.bar;
}

var SeriesIntervalForScale = {
  day: 'hourly',
  week: 'daily',
  month: 'daily',
  year: 'monthly',
  custom: null // dynamically determined
};

function getAutoSeriesInterval(timeScale, fromMsTime, toMsTime) {
  var interval = SeriesIntervalForScale[timeScale];
  if (! interval) {
    // custom scale
    var duration = moment.duration(toMsTime - fromMsTime);
    if (duration.months() >= 2) {
      interval = 'monthly';
    } else if (duration.days() >= 2) {
      interval = 'daily';
    } else {
      interval = 'hourly';
    }
  }
  return interval;
}

// TODO: extract event type formatting stuff to utility helper

function getEventValueSymbol(eventType, typeExtra) {
  var symbol;
  if (typeExtra) {
    symbol = typeExtra.symbol || typeExtra.name.en;
  }
  if (! symbol) {
    var typeParts = eventType.split('/');
    symbol = typeParts[typeParts.length - 1];
  }
  return symbol;
}

// TODO: see if we actually need this extra element
ChartView.setUpContainer = function () {
  // Setting up the chart container
  this.chartContainer = this.container + ' .chartContainer';
  $(this.container).html('<div class="chartContainer"></div>');
};

function getLegendActionButtonHTML(seriesId, action) {
  var iconClasses = {
    ready: 'fa-check',
    duplicate: 'fa-files-o',
    remove: 'fa-minus',
    edit: 'fa-cog'
  };
  var titles = {
    ready: '',
    duplicate: 'Duplicate',
    remove: 'Remove',
    edit: 'Edit settings'
  };
  return '<a class="legend-action legend-action-' + action + '" href="javascript:;" ' +
      'data-series-id="' + seriesId + '" data-action="' + action + '" ' +
      'title="' + titles[action] + '"><i class="fa ' + iconClasses[action] + '"></i></a>';
}

ChartView.onDateHighLighted = function (highlightedTime) {
  if (! highlightedTime) {
    highlightedTime = this.model.get('highlightedTime');
  }
  if (! this.chart || ! highlightedTime) { return; }

  this._deselectAllPoints();

  this.model.get('collection').each(function (seriesModel) {
    var seriesId = seriesModel.get('seriesId'),
        points = this.chart.get(seriesId).points,
        dF = getDurationFunction(seriesModel.get('interval')),
        distance = null,
        best = 0;

    for (var i = 0, len = points.length; i < len; i++) {
      var ptTime = points[i].x,
          duration = dF(new Date(ptTime)),
          distToStart = Math.abs(highlightedTime - (ptTime / 1000)),
          distToEnd = Math.abs(highlightedTime - ((ptTime + duration) / 1000));

      if (distance === null) {
        best = i;
        distance = distToStart < distToEnd ? distToStart : distToEnd;
      } else if ((ptTime / 1000) <= highlightedTime &&
          highlightedTime <= ((ptTime + duration) / 1000)) {
        best = i;
        break;
      } else if (distToStart <= distance || distToEnd <= distance) {
        best = i;
        distance = distToStart < distToEnd ? distToStart : distToEnd;
      }
    }

    best = points.length === best ? best - 1: best;
    points[best].select(true, true);
  }.bind(this));
};

function getDurationFunction(interval) {
  switch (interval) {
  case 'hourly' :
    return function () { return 3600 * 1000; };
  case 'daily' :
    return function () { return 24 * 3600 * 1000; };
  case 'weekly' :
    return function () { return 7 * 24 * 3600 * 1000; };
  case 'monthly' :
    return function (d) {
      return (new Date(d.getFullYear(), d.getMonth(), 0)).getDate() * 24 * 3600 * 1000;
    };
  case 'yearly' :
    return function (d) {
      return (d.getFullYear() % 4 === 0 &&
      (d.getFullYear() % 100 !== 0 || d.getFullYear() % 400 === 0)) ? 366 :365;
    };
  default :
    return function () {
      return 0;
    };
  }
}

ChartView.highlightEvent = function (event) {
  if (! this.chart) { return; }

  this._deselectAllPoints();

  var pt = this.chart.get(event.id);
  if (! pt) {
    var seriesId = getSeriesId(event.streamId, event.type);
    var seriesModel = this.model.get('collection').find(function (model) {
      return model.get('seriesId') === seriesId;
    });
    var getPtId = tsTransform.getAggregationGroupKeyFn(seriesId, seriesModel.actualInterval);
    pt = this.chart.get(getPtId(new Date(event.time * 1000)));
  }

  pt.select(true);
};

ChartView._deselectAllPoints = function () {
  _.forEach(this.chart.getSelectedPoints(), function (pt) { pt.select(false); });
};

ChartView.onClose = function () {
  $('#editPointVal').unbind();
  $('#editPointBut').unbind();
  $('#chart-pt-editor').remove();
  $(this.chartContainer).empty();
  $(this.container).unbind();
  $(this.container).empty();
  this.container = null;
  this.chartContainer = null;
  this.chartSettings = null;
  this.chart = null;
};

/************************
 * Click Functions
 */

ChartView.onClick = function () {
  this.trigger('chart:clicked', this.model);
};

//ChartView.onEdit = function (event, pos, item) {
//  if ($('#chart-pt-editor')) {
//    $('#editPointVal').unbind();
//    $('#editPointBut').unbind();
//    $('#chart-pt-editor').remove();
//  }
//  if (this.model.get('editPoint') && item) {
//    var tc = this.model.get('collection').at(0);
//    if ((tc.get('transform') === 'none' || tc.get('transform') === null) &&
//      (tc.get('interval') === 'none' || tc.get('interval') === null)) {
//      var editedSerie =  this.model.get('collection').at(item.seriesIndex);
//      var allEvents = editedSerie.get('events');
//      var editedEvent = null;
//      for (var i = 0; i < allEvents.length; ++i) {
//        if (allEvents[i].content === item.datapoint[1] &&
//          allEvents[i].time * 1000 === item.datapoint[0]) {
//          editedEvent =  allEvents[i];
//          break;
//        }
//      }
//      this.currentlyEdited = {
//        event: editedEvent,
//        eventId: editedEvent.id,
//        streamId: editedEvent.streamId,
//        value: editedEvent.content,
//        time: editedEvent.time
//      };
//      this.showPointEditor(item.pageY + 5, item.pageX + 5);
//    }
//  }
//};
//
//ChartView.showPointEditor = function (x, y) {
//  $('.modal-content').append(
//    '<div id="chart-pt-editor" class="tooltip has-feedback">' +
//    '  <div class="input-group">' +
//    '    <input type="text" class="form-control" id="editPointVal" placeholder="' +
//      this.currentlyEdited.value + '">' +
//    '      <span id="feedback" class="glyphicon form-control-feedback"></span>' +
//    '    <span class="input-group-btn">' +
//    '      <button class="btn" id="editPointBut" type="button">Ok!</button>' +
//    '    </span>' +
//    '  </div>' +
//    '</div>');
//
//  var os = $('.modal-content').offset();
//  $('#chart-pt-editor').css({
//    color: 'none',
//    'background-color': 'none',
//    width: '20%',
//    top: x - os.top,
//    left: y - os.left
//  }).fadeIn(200);
//
//  $('#editPointVal').bind('input', function () {
//    if ($(this).val().length < 1) {
//      $('#chart-pt-editor').removeClass('has-success');
//      $('#chart-pt-editor').removeClass('has-warning');
//      $('#editPointBut').removeClass('btn-success');
//      $('#editPointBut').removeClass('btn-danger');
//    } else if (isNaN($(this).val())) {
//      $('#chart-pt-editor').removeClass('has-success');
//      $('#chart-pt-editor').addClass('has-warning');
//      $('#editPointBut').removeClass('btn-success');
//      $('#editPointBut').addClass('btn-danger');
//    } else {
//      $('#chart-pt-editor').removeClass('has-warning');
//      $('#chart-pt-editor').addClass('has-success');
//      $('#editPointBut').removeClass('btn-danger');
//      $('#editPointBut').addClass('btn-success');
//    }
//  });
//
//  $('#editPointBut').bind('click', function () {
//    this.currentlyEdited.value = +$('#editPointVal').val();
//    this.currentlyEdited.event.content = this.currentlyEdited.value;
//    if ($('#chart-pt-editor')) {
//      $('#editPointVal').unbind();
//      $('#editPointBut').unbind();
//      $('#chart-pt-editor').remove();
//    }
//    this.trigger('eventEdit', this.currentlyEdited);
//    this.render();
//  }.bind(this));
//};

/************************
 * Drag and Drop Functions
 */

var dndTransferData = null;

/* Called when this object is starts being dragged */
ChartView.onDragStart = function (e) {
  dndTransferData = '{ "nodeId": "' + this.container.substr(1) + '", ' +
    '"streamId": "' + $(this.container).attr('data-streamid') + '", ' +
    '"connectionId": "' + $(this.container).attr('data-connectionid') + '"}';
  e.originalEvent.dataTransfer.setData('text', dndTransferData);
};

/* Fires when a dragged element enters this' scope */
ChartView.onDragEnter = function (e) {
  var data = dndTransferData;
  var droppedNodeID = data.nodeId;
  if ($(e.currentTarget).attr('id') !== droppedNodeID) {
    $('.chartContainer', $(e.currentTarget)).not(this.container).addClass('animated shake');
    $('.NumericalsEventsNode  > div').not(this.container).addClass('animated shake');
    setTimeout(function () {
      $('.chartContainer', $(e.currentTarget)).removeClass('animated shake');
      $('.NumericalsEventsNode  > div', $(e.currentTarget)).removeClass('animated shake');
    }, 1000);
  }
};

/* Fires when a dragged element is over this' scope */
ChartView.onDragOver = function (e) {
  e.preventDefault();
};

/* Fires when a dragged element leaves this' scope */
ChartView.onDragLeave = function () {
  var data = dndTransferData;
  var droppedNodeID = data.nodeId;
  $('.chartContainer').not('#' + droppedNodeID + ' .chartContainer').addClass('animated shake');
  $('.NumericalsEventsNode  > div')
    .not('#' + droppedNodeID + ' .chartContainer').addClass('animated shake');
  setTimeout(function () {
    $('.chartContainer').removeClass('animated shake');
    $('.NumericalsEventsNode > div').removeClass('animated shake');
  }, 1000);
};

/* Called when this object is stops being dragged */
ChartView.onDragEnd = function () {};

/* Called when an element is dropped on it */
ChartView.onDrop = function (e) {
  e.stopPropagation();
  e.preventDefault();
  var data = JSON.parse(e.originalEvent.dataTransfer.getData('text'));
  var droppedNodeID = data.nodeId;
  var droppedStreamID = data.streamId;
  var droppedConnectionID = data.connectionId;
  this.trigger('chart:dropped', droppedNodeID, droppedStreamID, droppedConnectionID);
};

ChartView.singleEventSetup = function () {
  var m = this.model.get('collection').at(0);
  if (this.model.get('showNodeCount')) {
    $(this.container).html(
    '<div class="content Center-Container is-Table">' +
    '<div class="Table-Cell">' +
    '<div class="Center-Block">' +
    '<span class="value"> ' +
    m.get('events')[0].content + ' ' +
    '</span><span class="unity">' +
    (this.useExtras ?
      pryv.eventTypes.extras(m.get('events')[0].type).symbol ||
      pryv.eventTypes.extras(m.get('events')[0].type).name.en || '' : m.get('events')[0].type) +
    '</span></div></div></div>');
  }

  $(this.container).unbind();

  $(this.container).bind('resize', function () {
    this.trigger('chart:resize', this.model);
  });

  if (this.model.get('onDnD')) {
    $(this.container).attr('draggable', true);
    $(this.container).bind('dragstart', this.onDragStart.bind(this));
    $(this.container).bind('dragenter', this.onDragEnter.bind(this));
    $(this.container).bind('dragover', this.onDragOver.bind(this));
    $(this.container).bind('dragleave', this.onDragLeave.bind(this));
    $(this.container).bind('drop', this.onDrop.bind(this));
    $(this.container).bind('dragend', this.onDragEnd.bind(this));
  }
  if (this.model.get('showNodeCount')) {
    $(this.container).bind('click',
    function () {
      this.trigger('nodeClicked');
    }.bind(this));
  }
};

module.exports = Marionette.CompositeView.extend(ChartView);

/**
 * Highcharts plugin for setting a lower opacity for other series than the one that is hovered
 * in the legend
 *
 * TODO: separate into its own file
 */
(function (Highcharts) {
  var each = Highcharts.each;

  Highcharts.wrap(Highcharts.Legend.prototype, 'renderItem', function (proceed, item) {
    proceed.call(this, item);

    var isPoint = !!item.series,
        collection = isPoint ? item.series.points : this.chart.series,
        groups = isPoint ? ['graphic'] : ['group', 'markerGroup'],
        element = (this.options.useHTML ? item.legendItem : item.legendGroup).element;

    element.onmouseover = function () {
      each(collection, function (seriesItem) {
        if (seriesItem !== item) {
          each(groups, function (group) {
            seriesItem[group].animate({opacity: 0.25}, {duration: 150});
          });
        }
      });
    };

    element.onmouseout = function () {
      each(collection, function (seriesItem) {
        if (seriesItem !== item) {
          each(groups, function (group) {
            seriesItem[group].animate({opacity: 1}, {duration: 50});
          });
        }
      });
    };
  });
}(Highcharts));
