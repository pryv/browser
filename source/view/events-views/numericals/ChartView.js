/* global $ */

var _ = require('underscore'),
    Marionette = require('backbone.marionette'),
    pryv = require('pryv'),
    tsTransform = require('./utils/timeSeriesTransform.js');

var DND_TRANSFER_DATA = null;

//TODO: for readability, reorganize code into actual public/private members, properly ordered

module.exports = Marionette.CompositeView.extend({
  template: '#template-chart-container',
  container: null,
  options: null,
  data: null,
  c3settings: {},
  plot: null,
  chartContainer: null,
  useExtras: null,
  waitExtras: null,

  currentlyEdited: null,

  initialize: function () {
    this.listenTo(this.model.get('collection'), 'add', this.render);
    this.listenTo(this.model.get('collection'), 'remove', this.render);
    this.listenTo(this.model, 'change:dimensions', this.resize);
    this.listenTo(this.model, 'change:highlightedTime', this.onDateHighLighted);
    this.container = this.model.get('container');
  },

  onRender: function () {
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
    if (this.model.get('showNodeCount')) {
      $(this.container).append('<span class="aggregated-nbr-events">' + eventsNbr + '</span>');
    }
    try {
      this.plot = $.plot($(this.chartContainer), this.data, this.options);
//      this.chart = c3.generate(_.extend(this.c3settings, {bindto: this.chartContainer}));
    } catch (e) {
      //console.warn(e);
    }

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
    this.setUpPanZoomUI();
  },

  resize: function () {
    if (! this.model.get('dimensions')) {
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

    // If pan is activated
    if (this.model.get('allowPan')) {
      this.options.pan = {
        interactive: collection ? (seriesCounts < 2 ?
          (collection.at(0).get('events').length > 1) : true)  : true,
        cursor: 'move',
        frameRate: 20
      };
      this.options.xaxis.panRange = [
        this.getExtremeTimes()[0] - 100000,
        this.getExtremeTimes()[1] + 100000
      ];
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
      for (var i = 0, l = events.length; i < l; ++i) {
        min = (events[i].time < min) ? events[i].time : min;
        max = (events[i].time > max) ? events[i].time : max;
      }
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
   * @param {TimeSeriesModel} series The series to add (a single one)
   * @param {Number} seriesIndex Its index
   */
  addSeries: function (series, seriesIndex) {
    series.sortData();
    var data = tsTransform.transform(series);
    var label = series.get('streamName') + ' (' +
        (this.useExtras ? pryv.eventTypes.extras(series.get('type')).symbol ||
          pryv.eventTypes.extras(series.get('type')).name.en || '' : series.get('type')) +
        ')';

    // Configures series
    this.data.push({
      data: data,
      label: label,
      yaxis: (seriesIndex + 1)
    });
    this.c3settings.data = {
      // TODO: format data to fit C3
      // - when sum/avg transform: all right (regular timeseries)
      // - when no transform: processing necessary (fill the gaps) to get regular timeseries
    };

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
      if (series.get('fitting')) {
        this.data[seriesIndex].curvedLines = {
          apply: true,
          fit: true
          //fitPointDist: 0.5,
          //curvePointFactor: 4
        };
      }
      this.data[seriesIndex].points = { show: (data.length < 2) };
      break;
    case 'bar':
      this.data[seriesIndex].bars = {
        show: true,
        barWidth : this.getDurationFunction(series.get('interval'))
                       (new Date(2011, 1, 1, 1, 1))
      };
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

  getDurationFunction: function (interval) {
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
    if (! date) {
      date = this.model.get('highlightedTime');
    }
    if (! this.plot || ! date) {
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
    if (! this.plot) {
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
    $('#editPointVal').unbind();
    $('#editPointBut').unbind();
    $('#chart-pt-editor').remove();
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

    if (this.model.get('editPoint')) {
      $(this.container).bind('plotclick', this.onEdit.bind(this));
    }

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
    }

    if (this.model.get('showNodeCount')) {
      $(this.container).bind('click',
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
      var labelTime = item.datapoint[0].toFixed(0);
      var evList = this.model.get('collection').at(item.seriesIndex).get('events');
      var sts = ((evList[evList.length - 1].time - evList[0].time) * 1000) / evList.length;

      var bestFit = this.findNearestPoint(evList, +labelTime);

      if (bestFit.distance < sts) {
        //console.log(bestFit.event.time * 1000, +labelTime);
        var coords = this.computeCoordinates(0, item.seriesIndex, item.datapoint[1],
          item.datapoint[0]);
        this.showTooltip(coords.top - 33, coords.left - 25, bestFit.event.content);
      }
    } else {
      this.removeTooltip();
    }
  },

  findNearestPoint: function (events, time) {
    var distance = Infinity;
    var best = -Infinity;
    for (var i = 0, l = events.length; i < l; ++i) {
      var cTime = events[i].time * 1000;

      if (Math.abs(cTime - time) < distance) {
        distance = Math.abs(cTime - time);
        best = i;
      } else {
        break;
      }
    }
    return {event: events[best], distance: distance};
  },

  onEdit: function (event, pos, item) {
    if ($('#chart-pt-editor')) {
      $('#editPointVal').unbind();
      $('#editPointBut').unbind();
      $('#chart-pt-editor').remove();
    }
    if (this.model.get('editPoint') && item) {
      var tc = this.model.get('collection').at(0);
      if ((tc.get('transform') === 'none' || tc.get('transform') === null) &&
        (tc.get('interval') === 'none' || tc.get('interval') === null)) {
        var editedSerie =  this.model.get('collection').at(item.seriesIndex);
        var allEvents = editedSerie.get('events');
        var editedEvent = null;
        for (var i = 0; i < allEvents.length; ++i) {
          if (allEvents[i].content === item.datapoint[1] &&
            allEvents[i].time * 1000 === item.datapoint[0]) {
            editedEvent =  allEvents[i];
            break;
          }
        }
        this.currentlyEdited = {
          event: editedEvent,
          eventId: editedEvent.id,
          streamId: editedEvent.streamId,
          value: editedEvent.content,
          time: editedEvent.time
        };
        this.showPointEditor(item.pageY + 5, item.pageX + 5);
      }
    }
  },

  showPointEditor: function (x, y) {
    $('.modal-content').append(
      '<div id="chart-pt-editor" class="tooltip has-feedback">' +
      '  <div class="input-group">' +
      '    <input type="text" class="form-control" id="editPointVal" placeholder="' +
        this.currentlyEdited.value + '">' +
      '      <span id="feedback" class="glyphicon form-control-feedback"></span>' +
      '    <span class="input-group-btn">' +
      '      <button class="btn" id="editPointBut" type="button">Ok!</button>' +
      '    </span>' +
      '  </div>' +
      '</div>');

    var os = $('.modal-content').offset();
    $('#chart-pt-editor').css({
      color: 'none',
      'background-color': 'none',
      width: '20%',
      top: x - os.top,
      left: y - os.left
    }).fadeIn(200);

    $('#editPointVal').bind('input', function () {
      if ($(this).val().length < 1) {
        $('#chart-pt-editor').removeClass('has-success');
        $('#chart-pt-editor').removeClass('has-warning');
        $('#editPointBut').removeClass('btn-success');
        $('#editPointBut').removeClass('btn-danger');
      } else if (isNaN($(this).val())) {
        $('#chart-pt-editor').removeClass('has-success');
        $('#chart-pt-editor').addClass('has-warning');
        $('#editPointBut').removeClass('btn-success');
        $('#editPointBut').addClass('btn-danger');
      } else {
        $('#chart-pt-editor').removeClass('has-warning');
        $('#chart-pt-editor').addClass('has-success');
        $('#editPointBut').removeClass('btn-danger');
        $('#editPointBut').addClass('btn-success');
      }
    });

    $('#editPointBut').bind('click', function () {
      this.currentlyEdited.value = +$('#editPointVal').val();
      this.currentlyEdited.event.content = this.currentlyEdited.value;
      if ($('#chart-pt-editor')) {
        $('#editPointVal').unbind();
        $('#editPointBut').unbind();
        $('#chart-pt-editor').remove();
      }
      this.trigger('eventEdit', this.currentlyEdited);
      this.render();
    }.bind(this));

  },

  computeCoordinates: function (xAxis, yAxis, xPoint, yPoint) {
    var yAxes = this.plot.getYAxes();
    var xAxes = this.plot.getXAxes();
    var coordY = yAxes[yAxis].p2c(xPoint);
    var coordX = xAxes[xAxis].p2c(yPoint);
    return { top: coordY, left: coordX};
  },

  setUpPanZoomUI: function () {}, /* function () {
    if (this.model.get('panZoomButton')) {
      $(this.container + ' .chartContainer').prepend($('#chartview-zoompan-ui').html());

      var thePlot = this.plot;
      $('#pan-up').bind('click', function () {
        thePlot.pan({left: 0, top: -10});
      });

      $('#pan-down').bind('click', function () {
        thePlot.pan({left: 0, top: 10});
      });

      $('#pan-left').bind('click', function () {
        thePlot.pan({left: -10, top: 0});
      });

      $('#pan-right').bind('click', function () {
        thePlot.pan({left: 10, top: 0});
      });

      $('#zoom-plus').bind('click', function () {
        thePlot.zoom();
      });

      $('#zoom-minus').bind('click', function () {
        thePlot.zoomOut();
      });
    }
  },*/



  /* ***********************
   * Drag and Drop Functions
   */

  /* Called when this object is starts being dragged */
  onDragStart: function (e) {
    DND_TRANSFER_DATA = '{ "nodeId": "' + this.container.substr(1) + '", ' +
      '"streamId": "' + $(this.container).attr('data-streamid') + '", ' +
      '"connectionId": "' + $(this.container).attr('data-connectionid') + '"}';
    e.originalEvent.dataTransfer.setData('text', DND_TRANSFER_DATA);
  },

  /* Fires when a dragged element enters this' scope */
  onDragEnter: function (e) {
    var data = DND_TRANSFER_DATA;
    var droppedNodeID = data.nodeId;
    if ($(e.currentTarget).attr('id') !== droppedNodeID) {
      $('.chartContainer', $(e.currentTarget)).not(this.container).addClass('animated shake');
      $('.NumericalsEventsNode  > div').not(this.container).addClass('animated shake');
      setTimeout(function () {
        $('.chartContainer', $(e.currentTarget)).removeClass('animated shake');
        $('.NumericalsEventsNode  > div', $(e.currentTarget)).removeClass('animated shake');
      }, 1000);
    }
  },

  /* Fires when a dragged element is over this' scope */
  onDragOver: function (e) {
    e.preventDefault();
  },

  /* Fires when a dragged element leaves this' scope */
  onDragLeave: function () {
    var data = DND_TRANSFER_DATA;
    var droppedNodeID = data.nodeId;
    $('.chartContainer').not('#' + droppedNodeID + ' .chartContainer').addClass('animated shake');
    $('.NumericalsEventsNode  > div')
      .not('#' + droppedNodeID + ' .chartContainer').addClass('animated shake');
    setTimeout(function () {
      $('.chartContainer').removeClass('animated shake');
      $('.NumericalsEventsNode > div').removeClass('animated shake');
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
  },

  singleEventSetup: function () {
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
  }
});
