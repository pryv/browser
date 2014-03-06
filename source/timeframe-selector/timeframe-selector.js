
/* global $, navigator, window, document */
var Backbone = require('backbone'),
  Modal = require('./modal.js'),
  _ = require('underscore');
/**
 timeViewTpl , 'tpl!../bower_components/browser-timeline/templates/time_view.html'
 customTimeModalTpl, 'tpl!../bower_components/browser-timeline/templates/custom_time_modal.html'
 */
/* jshint -W101 */
var customTimeModalTpl = '<div id="custom_time_modal" class="modal hide fade"> <div class="modal-header">   <button type="button" class="close" data-dismiss="modal">&times;</button>   <h3>Custom Timeframe</h3> </div> <div class="modal-body">   <form class="form-horizontal center">     <div id="from_ctrl" class="control-group">       <label class="control-label" for="from_selected">From:</label>       <div class="controls">         <input type="text" id="from_selected" class="input-medium">         <span id="from_helper" class="help-block"></span>       </div>     </div>     <div id="to_ctrl" class="control-group">       <label class="control-label" for="to_selected">To:</label>       <div class="controls">         <input type="text" id="to_selected" class="input-medium">         <span id="to_helper" class="help-block"></span>       </div>     </div>   </form> </div> <div class="modal-footer">   <button id="ok_btn" class="btn btn-primary">OK</button>   <a class="btn" data-dismiss="modal">Cancel</a> </div></div>';
var timeViewTpl = '<span id="start-marker-label" class="marker-label">	<span id="start-marker-year"></span>	<span id="start-marker-month"></span>	<span id="start-marker-day"></span>	<span id="start-marker-dash" class="label-dash">-</span>	<span id="start-marker-hour"></span>	<span id="start-marker-dots" class="label-dots">:</span>	<span id="start-marker-minute"></span></span><span id="start-marker-arrow" class="tooltip-arrow"></span><span id="end-marker-label" class="marker-label">	<span id="end-marker-year"></span>	<span id="end-marker-month"></span>	<span id="end-marker-day"></span>	<span id="end-marker-dash" class="label-dash">-</span>	<span id="end-marker-hour"></span>	<span id="end-marker-dots" class="label-dots">:</span>	<span id="end-marker-minute"></span></span><span id="end-marker-arrow" class="tooltip-arrow"></span><span id="focus-marker-label" class="marker-label">	<span id="focus-marker-year"></span>	<span id="focus-marker-month"></span>	<span id="focus-marker-day"></span>	<span id="focus-marker-dash" class="label-dash">-</span>	<span id="focus-marker-hour"></span>	<span id="focus-marker-dots" class="label-dots">:</span>	<span id="focus-marker-minute"></span></span><span id="focus-marker-arrow" class="tooltip-arrow"></span><form class="form center">	<span id="arrow-left" class="nav-arrow prev"></span><div id="timeline-scroll-wrapper">		<div id="timeline-content"></div>	</div>	<span id="arrow-right" class="nav-arrow next"></span></form>';

var _keywords = {
  english: {
    today: 'today',
    day: 'day',
    week: 'week',
    month: 'month',
    year: 'year',
    mon_0: 'JAN',
    mon_1: 'FEB',
    mon_2: 'MAR',
    mon_3: 'APR',
    mon_4: 'MAY',
    mon_5: 'JUN',
    mon_6: 'JUL',
    mon_7: 'AUG',
    mon_8: 'SEP',
    mon_9: 'OCT',
    mon_10: 'NOV',
    mon_11: 'DEC',
    day_0: 'Sun',
    day_1: 'Mon',
    day_2: 'Tue',
    day_3: 'Wed',
    day_4: 'Thr',
    day_5: 'Fri',
    day_6: 'Sat'
  },
  french: {
    today: 'aujourd\'hui',
    day: 'jour',
    week: 'semaine',
    month: 'mois',
    year: 'ann&eacute;e',
    custom: 'personnalis&eacute;',
    mon_0: 'JAN',
    mon_1: 'FEV',
    mon_2: 'MAR',
    mon_3: 'AVR',
    mon_4: 'MAI',
    mon_5: 'JUN',
    mon_6: 'JUL',
    mon_7: 'AOU',
    mon_8: 'SEP',
    mon_9: 'OCT',
    mon_10: 'NOV',
    mon_11: 'DEC'
  }
};


var CustomTimeModal = Modal.extend({
  /* Variables */
  modalId: '#custom_time_modal',
  template: customTimeModalTpl,
  name: 'CustomTimeModal',
  from: null,
  to: null,
  $from: null,
  $to: null,
  /* Events */
  events: {
    'click #ok_btn': 'onClickOK'
  },
  /* Methods */
  initialize: function () {
    console.log(this.name + ':initialize');
  },
  render: function () {
    Modal.prototype.render.call(this);
    $('#timeframe #menu-items').toggle();
    this.$from = this.$('#from_selected');
    this.$to = this.$('#to_selected');
    this.$from.attr('value', this.from.toString()).datetimepicker();
    this.$to.attr('value', this.to.toString()).datetimepicker();
    $('#ui-datepicker-div').addClass('calendar');
    return this;
  },
  open: function (from, to) {
    this.from = from;
    this.to = to;
    this.render();
  },
  onClickOK: function () {
    //console.log(this.name+':onClickOKBtn');
    var f = this.$from.datepicker('getDate');
    var t = this.$to.datepicker('getDate');
    var ret = false;
    if (f === null) {
      this.$('#from_helper').text('Please provide a valid date.');
      ret = true;
    }
    if (t === null) {
      this.$('#from_helper').text('Please provide a valid date.');
      ret = true;
    }
    if (ret) {
      return;
    }

    this.trigger('ok', 'custom', false, this.$from.datepicker('getDate'),
      this.$to.datepicker('getDate'));

    this.close();
    return false;
  }
});

module.exports = Backbone.View.extend({
  id: '#timeframe',
  name: 'TimeView',
  developmentMode: false,
  frameFrom: null,
  frameTo: null,
  limitFrom: 0,
  limitTo: Infinity,
  labelWidth: 200,
  labelTipWidth: 14,
  markerOffset: 0.05,
  arrowPressLongspeed: 3,
  arrowPressDuration: 1500,
  proportionTimeFrame: 0.6667,
  span: null,
  spanStep: null,
  spanName: null,
  graduation: null,
  numOfGradustions: null,
  graduationStep: 5,
  currentLanguage: 'english',
  $timeline: null,
  timeframeChanged: false,
  lastHighlightedDate: null,
  intervalLabelWidth: 0,
  focusTimeout: null,
  events: {
    'click #today': 'onClickToday',
    'click #day': 'onClickTimeSpan',
    'click #month': 'onClickTimeSpan',
    'click #year': 'onClickTimeSpan',
    'click #all': 'onClickAll',
    'click #timeline-menu': 'onClickMenu',
    'click #frame-interval-label': 'onClickMenu',
    'click #custom': 'onClickCustomTime'
  },
  modals: {
    customTime: new CustomTimeModal()
  },
  /* Methods. */
  initialize: function (options) {
    if (options && options.developmentMode !== null) {
      this.developmentMode = options.developmentMode;
    }
    console.log(this.name + ':initialize');
    this.modals.customTime.on('ok', this.onClickTimeSpan, this);
    this.bindTouch();
  },
  render: function () {
    this.setElement(this.id);
    this.$el.html(timeViewTpl);
    this.$timeline = this.$('#timeline-content');
    this.setInitialWidth();

    var longpress = false;
    var self = this;


    function resizedw() {
      self.setInitialWidth();
      self.triggerFilter(self.frameFrom, self.frameTo, true);
    }

    $(window).resize(_.debounce(function () {
      resizedw();
    }, 100));

    var startTime, endTime;
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent)) {
      $('.nav-arrow').bind('touchstart', function () {
        startTime = new Date().getTime();
      }).bind('touchend', function () {
          endTime = new Date().getTime();
          longpress = (endTime - startTime >= 500);
          self.onArrowClick($(this), longpress);
        });
    } else {
      $('.nav-arrow').on('click', function () {
        self.onArrowClick($(this), longpress);
      });
      $('.nav-arrow').on('mousedown', function () {
        startTime = new Date().getTime();
      });
      $('.nav-arrow').on('mouseup', function () {
        endTime = new Date().getTime();
        longpress = (endTime - startTime >= 500);
      });
    }

    return this;
  },
  setInitialWidth: function () {
    var visibleWidth = $('#timeframe').width();
    /*  var visibleWidth = $('#timeframe').width() - 2 *
    ($('.nav-arrow').width() + 2 * parseInt($('.nav-arrow').css('paddingLeft'), null)) -
      30 - $('#timeline-menu').outerWidth() -
      parseInt($('#timeline-menu').css('marginRight'), null); */
    $('#timeline-scroll-wrapper').width(visibleWidth);
    var initialLeftPosition = -visibleWidth;
    this.$timeline.width(3 * visibleWidth).css('left', initialLeftPosition + 'px').data({
      'leftPosition': -visibleWidth,
      'initialLeftPosition': initialLeftPosition
    });

  },
  setLimit: function (from, to) {
    this.limitFrom = !from ? 0 :
      from > this.limitFrom && this.limitFrom !== 0 ? this.limitFrom : from;
    this.limitTo = !to ? Infinity :
      to < this.limitTo && this.limitTo !== Infinity ? this.limitTo : to;
  },
  _checkLimitDates: function (dateFrom, dateTo) {
    console.log('From:', this.limitFrom, dateFrom, 'To:', this.limitTo, dateTo);
   /*dateFrom = dateFrom < this.limitFrom ? this.limitFrom : dateFrom;
    dateFrom = dateFrom >= this.limitTo ? this.frameFrom : dateFrom;
    dateTo = dateTo > this.limitTo ? this.limitTo : dateTo;
    dateTo = dateTo <= this.limitFrom ? this.frameTo : dateTo; */
    if (dateFrom > dateTo) {
      dateFrom = this.frameFrom;
      dateTo = this.frameTo;
    }
    console.log('After', dateFrom, dateTo);
    return {from: dateFrom, to: dateTo};
  },
  setTimelineDates: function (changes) {
    this.frameFrom = changes.from.getTime();
    this.frameTo = changes.to.getTime();
  },
  onFiltersChanged: function (changes) {
    if (this.frameFrom === changes.from.getTime() &&
      this.frameTo === changes.to.getTime()) {
      this.timeframeChanged = false;
      this.fillTimeline();
      return;
    }
    this.setTimelineDates(changes);
    this.fillTimeline();
  },
  triggerFilter: function (dateFrom, dateTo, windowResized) {
    var dates = this._checkLimitDates(dateFrom, dateTo);
    dateFrom = dates.from;
    dateTo = dates.to;
    if (this.developmentMode || windowResized) {
      var devDateFrom = new Date(dateFrom);
      var devDateTo = new Date(dateTo);
      console.log('devMode - onFiltersChanged - dateFrom:', devDateFrom.toUTCString(),
        'dateTo:', devDateTo.toUTCString());
      this.onFiltersChanged({
        from: devDateFrom,
        to: devDateTo,
        span: dateTo - dateFrom
      });
    } else {
      this.trigger('filtersChanged', {
        from: new Date(dateFrom),
        to: new Date(dateTo),
        span: dateTo - dateFrom
      });
      this.onFiltersChanged({
        from: new Date(dateFrom),
        to: new Date(dateTo),
        span: dateTo - dateFrom
      });
    }
  },
  triggerHighlight: function (date) {
    if (this.lastHighlightedDate !== date && !this.developmentMode) {
      this.lastHighlightedDate = date;
      var highlightedDate = new Date(parseInt(date, null));
      this.trigger('dateHighlighted', highlightedDate);
    }
  },
  // try to fix
  setIntervalLabel: function (from, to) {
    var startDate = from;
    var endDate = to;
    var duration = endDate - startDate;
    var duration_in_sec = parseInt(duration / 1000, null);
    var interval_label = '';
    var res;

    if (duration < 1000) {
      interval_label = duration + ' ms';
    } else if (duration_in_sec < 60) {
      interval_label = duration_in_sec + ' sec';
    } else if (duration_in_sec < 60 * 60) {
      var min = Math.floor(duration_in_sec / 60);
      res = duration_in_sec % 60;
      interval_label = min + ' min' + (min > 1 ? 's' : '') +
        (res === 0 ? '' : (' ' + res + ' sec'));
    } else if (duration_in_sec < 60 * 60 * 24) {
      var hrs = Math.floor(duration_in_sec / (60 * 60));
      res = parseInt((duration_in_sec % (60 * 60)) / 60, null);
      interval_label = hrs + ' hr' + (hrs > 1 ? 's' : '') +
        (res === 0 ? '' : (' ' + res + ' min') + (res > 1 ? 's' : ''));
    } else if (duration_in_sec < 60 * 60 * 24 * 7) {
      var days = Math.floor(duration_in_sec / (60 * 60 * 24));
      res = parseInt((duration_in_sec % (60 * 60 * 24)) / (60 * 60), null);
      interval_label = days + ' day' + (days > 1 ? 's' : '') +
        (res === 0 ? '' : (' ' + res + ' hr') + (res > 1 ? 's' : ''));
    } else if (duration_in_sec < 60 * 60 * 24 * 30) {
      var weeks = Math.floor(duration_in_sec / (60 * 60 * 24 * 7));
      res = parseInt((duration_in_sec % (60 * 60 * 24 * 7)) / (60 * 60 * 24), null);
      interval_label = weeks + ' week' + (weeks > 1 ? 's' : '') +
        (res === 0 ? '' : (' ' + res + ' day') + (res > 1 ? 's' : ''));
    } else if (duration_in_sec < 60 * 60 * 24 * 365) {
      var months = Math.floor(duration_in_sec / (60 * 60 * 24 * 30));
      res = parseInt((duration_in_sec % (60 * 60 * 24 * 30)) / (60 * 60 * 24), null);
      interval_label = months + ' month' + (months > 1 ? 's' : '') +
        (res === 0 ? '' : (' ' + res + ' day') + (res > 1 ? 's' : ''));
    } else {
      var years = Math.floor(duration_in_sec / (60 * 60 * 24 * 365));
      res = parseInt((duration_in_sec % (60 * 60 * 24 * 365)) / (60 * 60 * 24), null);
      interval_label = years + ' year' + (years > 1 ? 's' : '');
      if (res <= 30) {
        interval_label += (res === 0 ? '' : (' ' + res + ' day'));
      } else {
        res = parseInt(res / 30, null);
        interval_label += (res === 0 ? '' : (' ' + res + ' month'));
      }
      interval_label += res > 1 ? 's' : '';
    }
    interval_label = interval_label.toUpperCase();
    $('#frame-interval-label').text(interval_label);
    $('#frame-interval-label-value').text(interval_label);
    this.intervalLabelWidth = $('#frame-interval-label-value').width();
  },
  fillTimeline: function () {
    this.setSpan();
    this.setMarkers();
    var $startMarker = $('#start-marker');
    var $startLabel = $('#start-marker-label');
    var $startArrow = $('#start-marker-arrow');
    var $endMarker = $('#end-marker');
    var $endLabel = $('#end-marker-label');
    var $endArrow = $('#end-marker-arrow');
    var $focusMarker = $('#focus-marker');
    var $focusLabel = $('#focus-marker-label');
    var $focusArrow = $('#focus-marker-arrow');
    var $selectedFrame = $('#selected-frame');
    var $timeline = $('#timeline-scroll-wrapper');
    var self = this;
    if (!this.$timeline.hasClass('ui-draggable')) {

      // Try to fix timelime
      var delta = 0;
      var startedLeft = 0;
      var startedLeftFollow;
      var startedSelectedFrameLeft;
      var startedSelectedFrameWidth;
      var startedFrom = self.frameFrom;
      var startedTo = self.frameTo;
      var currentFrom = self.frameFrom;
      var currentTo = self.frameTo;
      var showFocus = false;

      var calculateDelta = function () {
        return (self.frameTo - self.frameFrom) /
               ($endMarker.data('left') - $startMarker.data('left'));
      };
      delta = calculateDelta();
      var showFocusLabel = function () {
        showFocus = true;
        $focusLabel.fadeIn();
      };
      var hideFocusLabel = _.debounce(function () {
        if (!showFocus) {
          $focusLabel.fadeOut();
        }
      }, 3000);
      var startDragFocus = function (event, ui) {
        startedLeft = ui.position.left;
        startedLeftFollow = null;
      };
      var dragFocus = function ($arrToFollow, event, ui) {
        if ($arrToFollow && !_.isArray($arrToFollow)) {
          $arrToFollow = [$arrToFollow];
        }
        var xDiff = ui.position.left - startedLeft;

        if (isNaN(delta)) {
          delta = calculateDelta();
        }
        if ($arrToFollow) {
          showFocusLabel();
          var i = 0;
          if (!startedLeftFollow) {
            startedLeftFollow = [];
            for (i = 0; i < $arrToFollow.length; i++) {
              startedLeftFollow[i] = $arrToFollow[i].position().left;

            }
          }
          for (i = 0; i < $arrToFollow.length; i++) {
            $arrToFollow[i].css({left: startedLeftFollow[i] + xDiff + 'px'});
          }
        }
        var highlightedTime = self.frameFrom +
            ($focusMarker.position().left -  $startMarker.position().left) *
            delta;
        self.setLabelText($focusLabel, highlightedTime);
        self.triggerHighlight(highlightedTime);
      };
      var stopDragFocus = function () {
        showFocus = false;
        hideFocusLabel();
      };
      var startDragLimit = function (event, ui) {
        delta = calculateDelta();
        startedLeft = ui.position.left;
        startedLeftFollow = null;
        startedSelectedFrameLeft = $selectedFrame.position().left;
        startedSelectedFrameWidth = $selectedFrame.width();
        startedFrom = self.frameFrom;
        startedTo = self.frameTo;
        currentFrom = self.frameFrom;
        currentTo = self.frameTo;
      };
      var stopDragLimit = function () {
        self.triggerFilter(currentFrom, currentTo);
      };
      var dragLimit = function (start, $arrToFollow, $label, event, ui) {
        if ($arrToFollow && !_.isArray($arrToFollow)) {
          $arrToFollow = [$arrToFollow];
        }
        var xDiff = ui.position.left - startedLeft;
        if (isNaN(delta)) {
          delta = calculateDelta();
        }

        var currentTime;
        if (start) {
          currentFrom = currentTime = startedFrom + (xDiff * delta);
          currentFrom = currentTime = currentFrom > currentTo ? currentTo: currentFrom;
        } else {
          currentTo = currentTime = startedTo + (xDiff * delta);
          currentTo = currentTime = currentTo < currentFrom ? currentFrom : currentTo;
        }
        if ($arrToFollow) {
          var i = 0;
          if (!startedLeftFollow) {
            startedLeftFollow = [];
            for (i = 0; i < $arrToFollow.length; i++) {
              startedLeftFollow[i] = $arrToFollow[i].position().left;
            }
          }
          for (i = 0; i < $arrToFollow.length; i++) {
            $arrToFollow[i].css({left: startedLeftFollow[i] + xDiff + 'px'});
          }
        }
        if ($label) {
          self.setLabelText($label, currentTime);
        }
        self.setIntervalLabel(currentFrom, currentTo);

        // update selected frame position and width
        if (start) {
          $selectedFrame.css({
            'left': (startedSelectedFrameLeft + xDiff) + 'px',
            'width': (startedSelectedFrameWidth - xDiff) + 'px'
          });
        } else {
          $selectedFrame.css({
            'left': startedSelectedFrameLeft + 'px',
            'width': (startedSelectedFrameWidth + xDiff) + 'px'
          });
        }
      };
      $startMarker.draggable({axis: 'x', grid: [this.graduationStep, 0],
        start: startDragLimit.bind(self),
        drag: dragLimit.bind(self, true, [$startArrow, $startLabel], $startLabel),
        stop: stopDragLimit.bind(self)
      });
      $startLabel.draggable({axis: 'x', grid: [this.graduationStep, 0],
        start: startDragLimit.bind(self),
        drag: dragLimit.bind(self, true, [$startArrow, $startMarker], $startLabel),
        stop: stopDragLimit.bind(self)
      });
      $endMarker.draggable({axis: 'x', grid: [this.graduationStep, 0],
        start: startDragLimit.bind(self),
        drag: dragLimit.bind(self, false, [$endArrow, $endLabel], $endLabel),
        stop: stopDragLimit.bind(self)
      });
      $endLabel.draggable({axis: 'x', grid: [this.graduationStep, 0],
        start: startDragLimit.bind(self),
        drag: dragLimit.bind(self, false, [$endArrow, $endMarker], $endLabel),
        stop: stopDragLimit.bind(self)
      });
      $focusMarker.draggable({axis: 'x', grid: [this.graduationStep, 0],
        start: startDragFocus.bind(self),
        drag: dragFocus.bind(self, [$focusArrow, $focusLabel]),
        stop: stopDragFocus.bind(self)
      });
      $focusLabel.draggable({axis: 'x', grid: [this.graduationStep, 0],
        start: startDragFocus.bind(self),
        drag: dragFocus.bind(self, [$focusArrow, $focusMarker]),
        stop: stopDragFocus.bind(self)
      });
    }
    var markerWidth = $startMarker.width();
    var leftConstraint =  -$timeline.width() * 0.5;
    var rightConstraint = $timeline.width() * 1.5;
    var startConstraint = $startMarker.data('left') + (markerWidth / 2);
    var endConstraint = $endMarker.data('left') + (markerWidth / 2);
    $startMarker.draggable('option', 'containment',
      [leftConstraint, 0, endConstraint - (markerWidth / 2), 0]);
    $startLabel.draggable('option', 'containment',
      [leftConstraint, 0, endConstraint - (this.labelWidth + this.labelTipWidth), 0]);
    $endMarker.draggable('option', 'containment',
      [startConstraint - (markerWidth / 2), 0, rightConstraint, 0]);
    $endLabel.draggable('option', 'containment',
      [startConstraint + this.labelTipWidth, 0, rightConstraint, 0]);
    $focusMarker.draggable('option', 'containment',
      [startConstraint  - (markerWidth / 2), 0, endConstraint  - (markerWidth / 2), 0]);
    $focusLabel.draggable('option', 'containment',
      [startConstraint - (this.labelWidth / 2), 0, endConstraint - (this.labelWidth / 2), 0]);
  },
  setMarkers: function () {
    if ($('#timeframe #start-marker').length === 0) {
      /*jshint -W101 */
      $('#timeframe').append('<span id="start-marker"><span id="start-marker-bg"></span></span><span id="focus-marker"></span><span id="end-marker"><span id="end-marker-bg"></span></span><span id="selected-frame"><span id="frame-interval-label"></span><div id="timeline-menu"><span id="menu-arrow"></span><ul id="menu-items"><!--<li id="settings" class="menu-item">settings</li>--><li id="today" class="menu-item">today</li><li id="custom" class="menu-item">custom</li><li id="all" class="menu-item">all</li><li id="year" class="menu-item">year</li><li id="month" class="menu-item">month</li><li id="day" class="menu-item">day</li></ul></div></span><span id="frame-interval-label-value"></span>');
    }
    var $startMarker = $('#start-marker');
    var $startLabel = $('#start-marker-label');
    var $startArrow =  $('#start-marker-arrow');
    var $endMarker = $('#end-marker');
    var $endLabel = $('#end-marker-label');
    var $endArrow =  $('#end-marker-arrow');
    var $focusMarker = $('#focus-marker');
    var $focusLabel = $('#focus-marker-label');
    var $focusArrow = $('#focus-marker-arrow');
    var $selectedFrame = $('#selected-frame');
    var $timeline = $('#timeline-scroll-wrapper');

    $startLabel.css('width', this.labelWidth);
    $endLabel.css('width', this.labelWidth);
    $focusLabel.css('width', this.labelWidth);

    var markerWidth = $startMarker.width();
    var focusMarkerWidth = $focusMarker.width();
    var labelWidth = this.labelWidth + this.labelTipWidth;
    var timelineWidth = $timeline.width();

    var startMarkerLeft = (this.markerOffset * timelineWidth) + labelWidth - (markerWidth / 2);
    var endMarkerLeft = timelineWidth - startMarkerLeft - markerWidth;

    var startArrowLeft = startMarkerLeft + (markerWidth / 2) - 4;
    var endArrowLeft = endMarkerLeft + (markerWidth / 2) - 4;

    var startLabelLeft =  (this.markerOffset * timelineWidth);
    var endLabelLeft = timelineWidth - startLabelLeft - this.labelWidth;

    var focusMarkerLeft = (timelineWidth / 2) - (focusMarkerWidth / 2);
    var focusLabelLeft = (timelineWidth / 2) - (this.labelWidth / 2);
    var focusArrowLeft = (timelineWidth / 2) - 4;

    var selectedFrameLeft = startMarkerLeft + (markerWidth / 2);
    var selectedFrameWidth = endMarkerLeft + (markerWidth / 2) - selectedFrameLeft;
    $startMarker.data('left', startMarkerLeft);
    $endMarker.data('left', endMarkerLeft);
    $startMarker.show().animate({'left': startMarkerLeft + 'px'});
    $startLabel.show().animate({'left': startLabelLeft + 'px'});
    $startArrow.show().animate({'left': startArrowLeft + 'px'});
    $endMarker.show().animate({'left': endMarkerLeft + 'px'});
    $endLabel.show().animate({'left': endLabelLeft + 'px'});
    $endArrow.show().animate({'left': endArrowLeft + 'px'});
    $focusMarker.show().animate({'left': focusMarkerLeft + 'px'});
    $focusLabel.animate({'left': focusLabelLeft + 'px'}, function () {
      $focusLabel.css('left', focusLabelLeft + 'px');
    });
    $focusArrow.show().animate({'left': focusArrowLeft + 'px'});
    $selectedFrame.show().animate({'left': selectedFrameLeft, 'width': selectedFrameWidth});
    this.setLabelText($startLabel, this.frameFrom);
    this.setLabelText($endLabel, this.frameTo);
    this.setIntervalLabel(this.frameFrom, this.frameTo);
  },
  setLabelText: function ($label, time) {
    var date = new Date(time);
    var year = date.getFullYear();
    var month = this.translate('mon_' + date.getMonth());
    var day = date.getDate();
    var hours = date.getHours() < 10 ? '0' + date.getHours() : date.getHours();
    var minutes = date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes();
    $label.text(year + ' ' + month + ' ' + day + ' - ' + hours + ':' + minutes);
  },
  getMarkerLabelText: function (date, elementId, setDifference, initialDate) {
    var year = date.getFullYear();
    var month = this.translate('mon_' + date.getMonth());
    var day = date.getDate();
    var hours = date.getHours() < 10 ? '0' + date.getHours() : date.getHours();
    var minutes = date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes();
    $('#' + elementId + '-year').text(year);
    $('#' + elementId + '-month').text(month);
    $('#' + elementId + '-day').text(day);
    $('#' + elementId + '-hour').text(hours);
    $('#' + elementId + '-minute').text(minutes);
    if (setDifference) {
      var initYear = initialDate.getFullYear();
      var initMonth = this.translate('mon_' + initialDate.getMonth());
      var initDay = initialDate.getDate();
      var initHours = initialDate.getHours() < 10 ?
        '0' + initialDate.getHours() :
        initialDate.getHours();
      var initMinutes = initialDate.getMinutes() < 10 ?
        '0' + initialDate.getMinutes() :
        initialDate.getMinutes();
      if (year !== initYear) {
        $('#' + elementId + '-year').removeClass('label-fixed');
      } else {
        $('#' + elementId + '-year').addClass('label-fixed');
      }
      if (month !== initMonth) {
        $('#' + elementId + '-month').removeClass('label-fixed');
      } else {
        $('#' + elementId + '-month').addClass('label-fixed');
      }
      if (day !== initDay) {
        $('#' + elementId + '-day').removeClass('label-fixed');
      } else {
        $('#' + elementId + '-day').addClass('label-fixed');
      }
      if (hours !== initHours) {
        $('#' + elementId + '-hour').removeClass('label-fixed');
      } else {
        $('#' + elementId + '-hour').addClass('label-fixed');
      }
      if (minutes !== initMinutes) {
        $('#' + elementId + '-minute').removeClass('label-fixed');
      } else {
        $('#' + elementId + '-minute').addClass('label-fixed');
      }
      if (hours !== initHours && minutes !== initMinutes) {
        $('#' + elementId + '-dots').removeClass('label-fixed');
      } else {
        $('#' + elementId + '-dots').addClass('label-fixed');
      }
    }
  },
  startZoom: function (startDate) {
    this.triggerFilter(parseInt(startDate, null), this.frameTo);
  },
  endZoom: function (endDate) {
    this.triggerFilter(this.frameFrom, parseInt(endDate, null));
  },
  setSpan: function () {
    var frame_duration = this.frameTo - this.frameFrom;
   // var frame_duration_sec = parseInt((frame_duration / 1000).toFixed(), null);
    var numOfGraduations = parseInt((this.proportionTimeFrame *
      $('#timeline-scroll-wrapper').width() / this.graduationStep).toFixed(), null);
    this.spanStep = 1;
    this.span = parseInt((frame_duration / (numOfGraduations * this.spanStep)).toFixed(), null);
  },
  onClickAll: function () {
    if (this.limitFrom !== 0 && this.limitTo !== Infinity) {
      this.triggerFilter(this.limitFrom, this.limitTo);
    }

  },
  onClickTimeSpan: function (spanName, updateTimeline, from, to) {
    /* Check if we received the spanName or a click event. */
    if (typeof spanName !== 'string') {
      spanName = spanName.target.id;
    }
    this.span = 86400000;
    var focus_date = new Date();

    switch (spanName) {
    case 'day':
      focus_date.setHours(focus_date.getHours() - 12);
      this.frameFrom = new Date(focus_date.getTime()).getTime();
      focus_date.setHours(focus_date.getHours() + 25);
      this.frameTo = new Date(focus_date.getTime()).getTime();
      break;
    case 'month':
      focus_date.setDate(focus_date.getDate() - 15);
      this.frameFrom = new Date(focus_date.getTime()).getTime();
      focus_date.setDate(focus_date.getDate() + 31);
      this.frameTo = new Date(focus_date.getTime()).getTime();
      break;
    case 'year':
      focus_date.setDate(focus_date.getDate() - 182);
      this.frameFrom = new Date(focus_date.getTime()).getTime();
      focus_date.setDate(focus_date.getDate() + 365);
      this.frameTo = new Date(focus_date.getTime()).getTime();
      break;
    case 'custom':
      this.frameFrom = from;
      this.frameTo = to;
      if (this.frameTo < this.frameFrom) {
        var temp = new Date(this.frameTo);
        this.frameTo = this.frameFrom;
        this.frameFrom = temp;
      }
      this.span = this.frameTo.getTime() - this.frameFrom.getTime();
      break;
    default:
      break;
    }
    if (updateTimeline) {
      /* Force timeline update by faking a span change. */
      this.spanName = '';
    }
    this.triggerFilter(this.frameFrom, this.frameTo);
  },
  onClickToday: function () {
    var today = new Date();
    var dateFrom = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    today.setDate(today.getDate() + 1);
    var dateTo = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    this.triggerFilter(dateFrom.getTime(), dateTo.getTime());
  },
  onClickCustomTime: function () {
    this.modals.customTime.open(new Date(this.frameFrom), new Date(this.frameTo));
    return false;
  },
  onArrowClick: function (arrowElement, isLongClick) {
    var isPrevArrow = $(arrowElement).hasClass('prev');
    var gapSpeed = isLongClick ? this.arrowPressLongspeed : 1;

    var self = this;
    clearTimeout(self.focusTimeout);
    $('#focus-marker-label, #focus-marker-arrow').fadeOut();

    this.$timeline.animate({
        left: (isPrevArrow ? '+=' : '-=') + $('#selected-frame').outerWidth() + 'px'
      },
      {
        duration: gapSpeed * self.arrowPressDuration,
        easing: 'easeOutCirc',
        progress: function () {
          var nextStartDate = null, nextEndDate = null;
          var currentStartDate = new Date($('#start-marker').data('currentDate'));
          var currentEndDate = new Date($('#end-marker').data('currentDate'));
         // var currentFocusDate = new Date($('#focus-marker').data('currentDate'));

          nextStartDate = isPrevArrow ?
            new Date(currentStartDate.getTime() - (self.spanStep * self.span)) :
            new Date(currentStartDate.getTime() + (self.spanStep * self.span));
          nextEndDate = isPrevArrow ?
            new Date(currentEndDate.getTime() - (self.spanStep * self.span)) :
            new Date(currentEndDate.getTime() + (self.spanStep * self.span));
          self.getMarkerLabelText(nextStartDate, 'start-marker', true, new Date(self.frameFrom));
          self.getMarkerLabelText(nextEndDate, 'end-marker', true, new Date(self.frameTo));
          $('#start-marker').data('currentDate', nextStartDate.getTime());
          $('#end-marker').data('currentDate', nextEndDate.getTime());
        },
        done: function () {
          $('#timeframe .marker-label span.label-fixed').removeClass('label-fixed');
          var gap = gapSpeed * (self.frameTo - self.frameFrom);
          var dateFrom = isPrevArrow ? self.frameFrom - gap : self.frameFrom + gap;
          var dateTo = isPrevArrow ? self.frameTo - gap : self.frameTo + gap;
          var dates = self._checkLimitDates(dateFrom, dateTo);
          dateTo = dates.to;
          dateFrom = dates.from;
          self.timeframeChanged = true;
          self.triggerFilter(dateFrom, dateTo);
          dates = {'from': new Date(dateFrom), 'to': new Date(dateTo)};
          self.setTimelineDates(dates, self.graduation);
          self.setMarkers();
          var initialLeftPosition = self.$timeline.data('initialLeftPosition');
          self.$timeline.css({'left': initialLeftPosition + 'px'});
        }
      });
  },
  onClickMenu: function () {
    $('#menu-items').toggle();
  },
  onLanguageChanged: function (language) {
    this.currentLanguage = language;
    this.updateLanguage();
  },
  updateLanguage: function () {
    var keywords = _keywords[this.currentLanguage];
    _.each(keywords, function (value, key) {
      this.$('.' + key + '_lang').each(function () {
        var $element = $(this);
        if ($element.attr('value') && $element.attr('value') !== '') {
          $element.attr('value', value);
        }
      }, this);
    }, this);
  },
  translate: function (keyword) {
    return _keywords[this.currentLanguage][keyword];
  },
  bindTouch: function () {
    // Detect touch support
    $.support.touch = 'ontouchend' in document;
    // Ignore browsers without touch support
    if (!$.support.touch) {
      return;
    }
    var mouseProto = $.ui.mouse.prototype,
      _mouseInit = mouseProto._mouseInit,
      touchHandled;

    function simulateMouseEvent(event, simulatedType) { //use this function to simulate mouse event
      // Ignore multi-touch events
      if (event.originalEvent.touches.length > 1) {
        return;
      }
      event.preventDefault(); //use this to prevent scrolling during ui use

      var touch = event.originalEvent.changedTouches[0],
        simulatedEvent = document.createEvent('MouseEvents');
      // Initialize the simulated mouse event using the touch event's coordinates
      simulatedEvent.initMouseEvent(
        simulatedType,    // type
        true,             // bubbles
        true,             // cancelable
        window,           // view
        1,                // detail
        touch.screenX,    // screenX
        touch.screenY,    // screenY
        touch.clientX,    // clientX
        touch.clientY,    // clientY
        false,            // ctrlKey
        false,            // altKey
        false,            // shiftKey
        false,            // metaKey
        0,                // button
        null              // relatedTarget
     );

      // Dispatch the simulated event to the target element
      event.target.dispatchEvent(simulatedEvent);
    }

    mouseProto._touchStart = function (event) {
      var self = this;
      // Ignore the event if another widget is already being handled
      if (touchHandled || !self._mouseCapture(event.originalEvent.changedTouches[0])) {
        return;
      }
      // Set the flag to prevent other widgets from inheriting the touch event
      touchHandled = true;
      // Track movement to determine if interaction was a click
      self._touchMoved = false;
      // Simulate the mouseover event
      simulateMouseEvent(event, 'mouseover');
      // Simulate the mousemove event
      simulateMouseEvent(event, 'mousemove');
      // Simulate the mousedown event
      simulateMouseEvent(event, 'mousedown');
    };

    mouseProto._touchMove = function (event) {
      // Ignore event if not handled
      if (!touchHandled) {
        return;
      }
      // Interaction was not a click
      this._touchMoved = true;
      // Simulate the mousemove event
      simulateMouseEvent(event, 'mousemove');
    };
    mouseProto._touchEnd = function (event) {
      // Ignore event if not handled
      if (!touchHandled) {
        return;
      }
      // Simulate the mouseup event
      simulateMouseEvent(event, 'mouseup');
      // Simulate the mouseout event
      simulateMouseEvent(event, 'mouseout');
      // If the touch interaction did not move, it should trigger a click
      if (!this._touchMoved) {
        // Simulate the click event
        simulateMouseEvent(event, 'click');
      }
      // Unset the flag to allow other widgets to inherit the touch event
      touchHandled = false;
    };
    mouseProto._mouseInit = function () {
      var self = this;
      // Delegate the touch handlers to the widget's element
      self.element
        .on('touchstart', $.proxy(self, '_touchStart'))
        .on('touchmove', $.proxy(self, '_touchMove'))
        .on('touchend', $.proxy(self, '_touchEnd'));

      // Call the original $.ui.mouse init method
      _mouseInit.call(self);
    };
  }
});
