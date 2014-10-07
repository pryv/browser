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
      ! this.model.get('container') ||
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
      if (! pryv.eventTypes.extras('mass/kg')) {
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

  this.makeOptions();
  this.setUpContainer();

  var eventsCount = 0,
      eventSymbolsPerDataId = {},
      yAxisForType = {},
      yAxesCount = 0;
  collection.each(function (series) {
    series.sortData();
    var c3data = this.c3settings.data,
        seriesData = tsTransform.transform(series),
        seriesDataId = seriesData.yCol[0];

    c3data.columns.push(seriesData.xCol);
    c3data.columns.push(seriesData.yCol);
    c3data.xs[seriesDataId] = seriesData.xCol[0];

    var eventType = series.get('type'),
        eventSymbol = getEventValueSymbol(eventType,
            this.useExtras ? pryv.eventTypes.extras(eventType) : null);
    eventSymbolsPerDataId[seriesDataId] = eventSymbol;

    c3data.names[seriesDataId] = series.get('streamName') + ' (' + eventSymbol + ')';

    // separate y axis per event type
    var yAxis = yAxisForType[eventType];
    if (! yAxis) {
      yAxesCount++;
      yAxis = 'y' + (yAxesCount > 1 ? yAxesCount : '');
      yAxisForType[eventType] = yAxis;
    }
    c3data.axes[seriesDataId] = yAxis;

    switch (series.get('style')) {
    case 'bar':
      c3data.types[seriesDataId] = 'bar';
      break;
    case 'point':
      c3data.types[seriesDataId] = 'scatter';
      break;
    //case 'line':
    default:
      c3data.types[seriesDataId] = series.get('fitting') ? 'spline' : 'line';
      //TODO: review this
//      this.data[seriesIndex].points = { show: (data.length < 2) };
      break;
    }

    if (series.get('color')) {
      c3data.colors[seriesDataId] = series.get('color');
    }

    eventsCount += seriesData.yCol.length;
  }.bind(this));

  // TODO: adjust ticks density from scale & available space, etc.
  var timeScale = pryvBrowser.timeView.getScale(),
      timeBounds = pryvBrowser.timeView.getTimeBounds(),
      fromMsTime = timeBounds.from * 1000,
      toMsTime = timeBounds.to * 1000,
      tickSettings = getTickSettings(timeScale, fromMsTime, toMsTime);
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
      title: getFullTimeLabel
      // TODO for nicer value display
      // name: function (id) {},
//      value: function (value, ratio, id) {
//        var s = d3.format(eventSymbolsPerDataId[id] + ',.2r')(value);
//        return s;
//      }
    }
  };
  this.c3settings.legend = {
// not supported yet (solution for now: custom legend):  position: 'top'
  };
  // TODO fix: this triggers an issue with model being modified by detailed view
  // (to reproduce: chart in treemap, open details, back, refresh: treemap chart model corrupted)
//  if (this.model.get('enableNavigation')) {
//    this.c3settings.subchart = {show: true};
//  }
    // TODO: find why svg renders bigger than container element & fix this (shouldn't be needed)
  this.c3settings.padding = {
    left: 25
  };

  if (this.model.get('showNodeCount')) {
    $(this.container).append('<span class="aggregated-nbr-events">' + eventsCount + '</span>');
  }
  this.chart = c3.generate(_.extend(this.c3settings, {bindto: this.chartContainer}));

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
};

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

/**
 * Generates the general chart options based on the model
 * TODO: remove or cleanup
 */
ChartView.makeOptions = function () {
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
  this.options.series = {curvedLines: {active: true}};
  this.options.xaxes = [ {
    show: (this.model.get('xaxis') && seriesCounts !== 0),
    mode: 'time',
    timeformat: '%e %b %Y %H:%M',
    ticks: this.getExtremeTimes()
  } ];
  this.options.yaxes = [];
  this.options.xaxis = {};

  this.options.legend = {
    labelBoxBorderColor: 'transparent'
  };
  if (this.model.get('legendButton')) {
    var model = this.model;
    this.options.legend.labelFormatter = function (label) {
      var buttons = model.get('legendButtonContent');
      var legend = '<span class="DnD-legend-text">' + label + '</span>';
      for (var i = 0; i < buttons.length; ++i) {
        switch (buttons[i]) {
        case 'ready':
          legend = legend + '<a class="btn btn-default btn-sm DnD-legend-button ' +
            'DnD-legend-button-ready" ' +
            'href="javascript:;"><span class="fa fa-check"></span></a>';
          break;
        case 'duplicate':
          legend = legend + '<a class="btn btn-default btn-sm DnD-legend-button ' +
            'DnD-legend-button-duplicate" ' +
            'href="javascript:;"><span class="fa fa-files-o"></span></a>';
          break;
        case 'remove':
          legend = legend + '<a class="btn btn-default btn-sm DnD-legend-button ' +
            'DnD-legend-button-remove" ' +
            'href="javascript:;"><span class="fa fa-minus"></span></a>';
          break;
        case 'edit':
          legend = legend + '<a class="btn btn-default btn-sm DnD-legend-button ' +
            'DnD-legend-button-edit" ' +
            'href="javascript:;"><span class="fa fa-pencil-square-o"></span></a>';
          break;
        }
      }
      return legend;
    };
  } else {
    this.options.legend.labelFormatter = function (label) {
      var legend = '<span class="DnD-legend-text">' + label + '</span>';
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

  seriesCounts = null;
};

ChartView.setUpContainer = function () {
  // Setting up the chart container
  this.chartContainer = this.container + ' .chartContainer';
  $(this.container).html('<div class="chartContainer"></div>');
};

ChartView.getExtremeTimes = function () {
  var collection = this.model.get('collection');
  var min = Infinity, max = 0;
  collection.each(function (s) {
    var events = s.get('events');
    for (var i = 0, l = events.length; i < l; ++i) {
      min = (events[i].time < min) ? events[i].time : min;
      max = (events[i].time > max) ? events[i].time : max;
    }
  });
  return [min * 1000, max * 1000];
};

ChartView.getExtremeValues = function (data) {
  var e = data;
  var min = Infinity, max = -Infinity;
  for (var i = 0; i < e.length; ++i) {
    min = (e[i][1] < min) ? e[i][1] : min;
    max = (e[i][1] > max) ? e[i][1] : max;
  }
  return [min, max];
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

// TODO: virer les this imbriques
ChartView.rebuildLegend = function (element) {
  var list = $('<ul/>');
  $(element).find('tr').each(function (index) {
    var colorBox = '';
    var buttonBox = '';
    var textBox = '';
    $(this).children().map(function (/*index2*/) {
      if ($(this) && $(this).length > 0) {
        var child = $($(this).get(0));
        if (child.hasClass('legendColorBox')) {
          $('div > div', child).addClass('DnD-legend-color');
          colorBox = $('div > div', child)[0].outerHTML;
        }
        if (child.hasClass('legendLabel')) {
          for (var i = 0; i < child[0].childElementCount; i++) {
            var c = child[0].childNodes[i];
            if ($(c).hasClass('DnD-legend-text')) {
              textBox = $(c)[0].outerHTML;
            } else if ($(c).hasClass('DnD-legend-button')) {
              $('a', $(c)).attr('id', 'series-' + index);
              buttonBox += $(c)[0].outerHTML;
            }
          }
        }
      }
    });
    var toAppend = '';
    if (colorBox) {
      toAppend += colorBox;
    }
    if (textBox) {
      toAppend += textBox;
    }
    if (buttonBox) {
      toAppend += buttonBox;
    }
    list.append('<li>' + toAppend + '</li>');
  });
  $('div', $(element).parent()).remove();
  $(element).replaceWith(list);
};

ChartView.onDateHighLighted = function (date) {
  if (! date) {
    date = this.model.get('highlightedTime');
  }
  if (! this.chart || ! date) {
    return;
  }

  this.chart.unselect();

  //TODO

//  var chartView = this;
//  var data = this.chart.getData();
//
//  this.model.get('collection').each(function (s, i) {
//    var dF = chartView.getDurationFunction(s.get('interval'));
//    var distance = null;
//    var best = 0;
//
//    for (var j = 0; j < data[i].data.length; ++j) {
//      var duration = dF(new Date(data[i].data[j][0]));
//      var d1 = Math.abs(date - (data[i].data[j][0] / 1000));
//      var d2 = Math.abs(date - ((data[i].data[j][0] + duration) / 1000));
//
//      if (distance === null) {
//        best = j;
//        distance = d1 < d2 ? d1 : d2;
//      } else if ((data[i].data[j][0] / 1000) <= date &&
//        date <= ((data[i].data[j][0] + duration) / 1000)) {
//        best = j;
//        break;
//      } else if (d1 <= distance || d2 <= distance) {
//        best = j;
//        distance = d1 < d2 ? d1 : d2;
//      }
//    }
//
//    best = data[i].data.length === best ? best - 1: best;
//    chartView.chart.highlight(i, best);
//  });
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

ChartView.legendButtonBindings = function () {
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
};

ChartView.legendButtonClicked = function (e) {
  var buttonType = e.data.type;
  var index = e.data.index;
  var model = this.model.get('collection').at(index);
  this.trigger(buttonType, model);
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

