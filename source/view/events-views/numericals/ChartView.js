/* global $, c3, moment, pryvBrowser */

var _ = require('underscore'),
    Marionette = require('backbone.marionette'),
    pryv = require('pryv'),
    tsTransform = require('./utils/timeSeriesTransform.js');

var ChartView = {
  template: '#template-chart-container',
  container: null,
  options: null,
  data: null,
  c3settings: {},
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
  this.render();
};

ChartView.onRender = function () {
  if (! this.model.get('collection') ||
      this.model.get('collection').length === 0 ||
      ! this.model.get('container')) {
    if (this.model.get('collection').length === 0) {
      $(this.model.get('container')).empty();
      if (this.model.get('legendContainer')) {
        $(this.model.get('legendContainer')).empty();
      }
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
  var collection = this.model.get('collection');
  this.container = this.model.get('container');

  this.options = {};
  this.c3settings.data = {
    xs: {},
    columns: [],
    axes: {},
    names: {},
    types: {},
    colors: {}
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
      yAxisForType = {},
      yAxesCount = 0;
  collection.each(function (series) {
    series.sortData();
    var c3data = this.c3settings.data,
        seriesData = tsTransform.transform(series, autoSeriesInterval),
        seriesId = series.get('seriesId');

    c3data.columns.push(seriesData.xCol);
    c3data.columns.push(seriesData.yCol);
    c3data.xs[seriesId] = seriesData.xCol[0];

    var eventType = series.get('type'),
        eventSymbol = getEventValueSymbol(eventType,
            this.useExtras ? pryv.eventTypes.extras(eventType) : null);
    eventSymbolsPerDataId[seriesId] = eventSymbol;

    streamNamesPerDataId[seriesId] = series.get('streamName');
    c3data.names[seriesId] = streamNamesPerDataId[seriesId];
    series.set('seriesLegend', streamNamesPerDataId[seriesId] + ' (' + eventSymbol + ')');

    // separate y axis per event type
    var yAxis = yAxisForType[eventType];
    if (! yAxis) {
      yAxesCount++;
      yAxis = 'y' + (yAxesCount > 1 ? yAxesCount : '');
      yAxisForType[eventType] = yAxis;
    }
    c3data.axes[seriesId] = yAxis;

    switch (series.get('style')) {
    case 'point':
      c3data.types[seriesId] = 'scatter';
      break;
    case 'spline':
      c3data.types[seriesId] = 'spline';
      break;
    case 'line':
      c3data.types[seriesId] = 'line';
      //TODO: review this
      //      this.data[seriesIndex].points = { show: (data.length < 2) };
      break;
    // case 'bar':
    default:
      c3data.types[seriesId] = 'bar';
      break;
    }

    if (series.get('color')) {
      c3data.colors[seriesId] = series.get('color');
    }

    eventsCount += seriesData.yCol.length;
  }.bind(this));

  // TODO: adjust ticks density from scale & available space, etc.
  var tickSettings = getTickSettings(timeScale, fromMsTime, toMsTime);
  this.c3settings.axis = {
    x: {
      type: 'timeseries',
      min: fromMsTime,
      max: toMsTime,
      tick: {
        fit: false,
        format: tickSettings.getLabel,
        values: tickSettings.getValues(fromMsTime, toMsTime)
      }
    },
    y: {
      show: yAxesCount === 1
    }
  };
  this.c3settings.tooltip = {
    format: {
      title: getFullTimeLabel,
      value: function (value, ratio, id) {
        return '<strong>' + (+value.toFixed(2)) + '</strong> ' + eventSymbolsPerDataId[id];
      }
    }
  };
  this.c3settings.legend = {show: false};
  // TODO fix: this triggers an issue with model being modified by detailed view
  // (to reproduce: chart in treemap, open details, back, refresh: treemap chart model corrupted)
//  if (this.model.get('enableNavigation')) {
//    this.c3settings.subchart = {show: true};
//  }
  this.c3settings.padding = {
    top: this.model.get('showLegend') ? 25 : 0,
    // TODO: find why svg renders bigger than container element & fix this (shouldn't be needed)
    left: 25
  };

  if (this.model.get('showNodeCount')) {
    $(this.container).append('<span class="aggregated-nbr-events">' + eventsCount + '</span>');
  }
  this.chart = c3.generate(_.extend(this.c3settings, {bindto: this.chartContainer}));

  this.createEventBindings();

  this.makeLegend();
};

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

//TODO: consider extracting time formatting stuff to utility helper

var TickIntervalForScale = {
  day: 'hour',
  week: 'dayOfWeek',
  month: 'week',
  year: 'month',
  custom: null // dynamically determined
};

var TickIntervals = {
  hour: {
    format: 'H',
    momentKey: 'h'
  },
  dayOfWeek: {
    format: 'ddd',
    momentKey: 'd'
  },
  week: {
    format: 'ddd D.M',
    momentKey: 'w'
  },
  month: {
    format: 'MMM',
    momentKey: 'M'
  },
  year: {
    format: 'YYYY',
    momentKey: 'y'
  }
};

var TickSettings = {};
_.each(TickIntervals, function (iValue, iKey) {
  TickSettings[iKey] = {
    getLabel: function (msTime) {
      return moment(msTime).format(iValue.format);
    },
    getValues: function (fromMsTime, toMsTime) {
      var values = [fromMsTime],
          currentM = moment(fromMsTime);
      while (+currentM <= toMsTime) {
        values.push(+currentM);
        currentM.add(1, iValue.momentKey);
      }
      return values;
    }
  };
});

function getTickSettings(timeScale, fromMsTime, toMsTime) {
  var interval = TickIntervalForScale[timeScale];
  if (! interval) {
    // custom scale
    var duration = moment.duration(toMsTime - fromMsTime);
    if (duration.years() >= 2) {
      interval = 'year';
    } else if (duration.months() >= 2) {
      interval = 'month';
    } else if (duration.days() >= 14) {
      interval = 'week';
    } else if (duration.days() >= 2) {
      interval = 'dayOfWeek';
    } else {
      interval = 'hour';
    }
  }
  return TickSettings[interval];
}

function getFullTimeLabel(msTime) {
  return moment(msTime).calendar();
}

ChartView.setUpContainer = function () {
  // Setting up the chart container
  this.chartContainer = this.container + ' .chartContainer';
  $(this.container).html('<div class="chartContainer"></div>');
};

ChartView.getDurationFunction = function (interval) {
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
};

ChartView.makeLegend = function () {
  if (! this.model.get('showLegend')) {
    return;
  }

  var $legend = $('<ul class="legend"/>'),
      actions = this.model.get('legendActions'),
      legendContainer = this._getLegendContainer();

  this.model.get('collection').each(function (series) {
    var $legendItem = $('<li class="legend-item"/>'),
        seriesId = series.get('seriesId');

    $legendItem.attr('data-id', seriesId)
        .css('border-color', this.chart.color(seriesId));
    $legendItem.on('mouseover', function () {
      this.chart.focus(seriesId);
    }.bind(this));
    $legendItem.on('mouseout', function () {
      this.chart.revert();
    }.bind(this));

    var $legendItemText = $('<span class="legend-item-text">' + series.get('seriesLegend') +
        '</span>');
    $legendItem.append($legendItemText);

    if (actions) {
      var chartView = this;

      $legend.addClass('actionable');

      $legendItemText.on('click', function () {
        chartView.chart.toggle(seriesId);
        $(this).parent().toggleClass('disabled');
      });

      _.each(actions, function (action) {
        var $button = $(getLegendActionButtonHTML(action));
        $button.on('click', function () {
          chartView.trigger(action, series);
        });
        $legendItem.append($button);
      }.bind(this));
    }

    $legend.append($legendItem);
  }.bind(this));

  var $legendContainer = $(legendContainer);
  $legendContainer.empty().append($legend);
  //TODO: make that work (causes legend not to show...)
//  $legendContainer.find('.legend-item-text').dotdotdot();
};

function getLegendActionButtonHTML(action) {
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
      'title="' + titles[action] + '"><i class="fa ' + iconClasses[action] + '"></i></a>';
}

ChartView.onDateHighLighted = function (date) {
  if (! date) {
    date = this.model.get('highlightedTime');
  }
  if (! this.chart || ! date) {
    return;
  }

  this.chart.unselect();

  this.model.get('collection').each(function (series) {
    var seriesId = series.get('seriesId'),
//        data = this.chart.data.get(seriesId),
//        dF = this.getDurationFunction(series.get('interval')),
//        distance = null,
        best = 0;

//    for (var i = 0, len = data.length; i < len; i++) {
//      var duration = dF(new Date(data[seriesIndex].data[i][0]));
//      var d1 = Math.abs(date - (data[seriesIndex].data[i][0] / 1000));
//      var d2 = Math.abs(date - ((data[seriesIndex].data[i][0] + duration) / 1000));
//
//      if (distance === null) {
//        best = i;
//        distance = d1 < d2 ? d1 : d2;
//      } else if ((data[seriesIndex].data[i][0] / 1000) <= date &&
//        date <= ((data[seriesIndex].data[i][0] + duration) / 1000)) {
//        best = i;
//        break;
//      } else if (d1 <= distance || d2 <= distance) {
//        best = i;
//        distance = d1 < d2 ? d1 : d2;
//      }
//    }

//    best = data.length === best ? best - 1: best;
    this.chart.select([seriesId], [best]);
  }.bind(this));
};

ChartView.highlightEvent = function (/*event*/) {
  if (! this.chart) {
    return;
  }
  this.chart.unselect();

  // TODO

//  var c = this.model.get('collection');
//  var e = event;
//  var m = null;
//  var cIdx, eIdx;
//  var connectionId = e.connection.id;
//  var streamId = e.streamId;
//  var streamName = e.stream.name;
//
//  for (var it = 0; it < c.length; ++it) {
//    m = c.at(it);
//    if (m) {
//      if (m.get('connectionId') === connectionId &&
//        m.get('streamId') === streamId &&
//        m.get('streamName') === streamName) {
//        break;
//      }
//    }
//  }
//  if (it !== c.length) {
//    cIdx = it;
//  } else {
//    return;
//  }
//
//  var data = this.chart.getData()[it];
//  for (it = 0; it < data.data.length; ++it) {
//    var elem = data.data[it];
//    if (elem[0] === e.time * 1000 && elem[1] === +e.content) {
//      break;
//    }
//  }
//  if (it !== data.data.length) {
//    eIdx = it;
//  } else {
//    return;
//  }
//  this.chart.highlight(cIdx, eIdx);
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
  this.options = null;
  this.c3settings = null;
  this.chart = null;
};

ChartView.createEventBindings = function () {
  var $container = $(this.container);
  $container.unbind();

  $container.bind('resize', function () {
    this.trigger('chart:resize', this.model);
  });

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

  if (this.model.get('showNodeCount')) {
    $container.bind('click',
    function () {
      this.trigger('nodeClicked');
    }.bind(this));
  }
};

/**
 * @private
 */
ChartView._getLegendContainer = function () {
  return this.model.get('legendContainer') || this._getDefaultLegendContainer();
};

var DefaultLegendContainerClass = 'legend-container';
ChartView._getDefaultLegendContainer = function () {
  var $container = $(this.container);
  if (! $('.' + DefaultLegendContainerClass, $container).length) {
    $container.append($('<div class="' + DefaultLegendContainerClass + '"/>'));
  }
  return this.container + ' .' + DefaultLegendContainerClass;
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

