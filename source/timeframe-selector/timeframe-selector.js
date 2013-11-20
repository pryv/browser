/* jshint ignore:start */
var Backbone = require('backbone');
var Modal = require('../scripts/views/modal.js');

/**
 timeViewTpl , 'tpl!../bower_components/browser-timeline/templates/time_view.html'
 customTimeModalTpl, 'tpl!../bower_components/browser-timeline/templates/custom_time_modal.html'
 */

var customTimeModalTpl = '<div id="custom_time_modal" class="modal hide fade"> <div class="modal-header">   <button type="button" class="close" data-dismiss="modal">&times;</button>   <h3>Custom Timeframe</h3> </div> <div class="modal-body">   <form class="form-horizontal center">     <div id="from_ctrl" class="control-group">       <label class="control-label" for="from_selected">From:</label>       <div class="controls">         <input type="text" id="from_selected" class="input-medium">         <span id="from_helper" class="help-block"></span>       </div>     </div>     <div id="to_ctrl" class="control-group">       <label class="control-label" for="to_selected">To:</label>       <div class="controls">         <input type="text" id="to_selected" class="input-medium">         <span id="to_helper" class="help-block"></span>       </div>     </div>   </form> </div> <div class="modal-footer">   <button id="ok_btn" class="btn btn-primary">OK</button>   <a class="btn" data-dismiss="modal">Cancel</a> </div></div>';
var timeViewTpl = '<span id="start-marker-label" class="marker-label">	<span id="start-marker-year"></span>	<span id="start-marker-month"></span>	<span id="start-marker-day"></span>	<span id="start-marker-dash" class="label-dash">-</span>	<span id="start-marker-hour"></span>	<span id="start-marker-dots" class="label-dots">:</span>	<span id="start-marker-minute"></span></span><span id="start-marker-arrow" class="tooltip-arrow"></span><span id="end-marker-label" class="marker-label">	<span id="end-marker-year"></span>	<span id="end-marker-month"></span>	<span id="end-marker-day"></span>	<span id="end-marker-dash" class="label-dash">-</span>	<span id="end-marker-hour"></span>	<span id="end-marker-dots" class="label-dots">:</span>	<span id="end-marker-minute"></span></span><span id="end-marker-arrow" class="tooltip-arrow"></span><span id="focus-marker-label" class="marker-label">	<span id="focus-marker-year"></span>	<span id="focus-marker-month"></span>	<span id="focus-marker-day"></span>	<span id="focus-marker-dash" class="label-dash">-</span>	<span id="focus-marker-hour"></span>	<span id="focus-marker-dots" class="label-dots">:</span>	<span id="focus-marker-minute"></span></span><span id="focus-marker-arrow" class="tooltip-arrow"></span><form class="form center">	<span id="arrow-left" class="nav-arrow prev"></span>	<div id="timeline-menu">		<span id="menu-arrow"></span>		<ul id="menu-items">			<!--<li id="settings" class="menu-item">settings</li>-->			<li id="today" class="menu-item">today</li>			<li id="custom" class="menu-item">custom</li>			<!--<li id="all" class="menu-item">all</li>-->			<li id="year" class="menu-item">year</li>			<li id="month" class="menu-item">month</li>			<li id="day" class="menu-item">day</li>						</ul>	</div>	<div id="timeline-scroll-wrapper">		<div id="timeline-content"></div>	</div>	<span id="arrow-right" class="nav-arrow next"></span></form>';

var _keywords = {
  english: {
    today        : 'today',
    day          : 'day',
    week         : 'week',
    month        : 'month',
    year         : 'year',
    mon_0        : 'JAN',
    mon_1        : 'FEB',
    mon_2        : 'MAR',
    mon_3        : 'APR',
    mon_4        : 'MAY',
    mon_5        : 'JUN',
    mon_6        : 'JUL',
    mon_7        : 'AUG',
    mon_8        : 'SEP',
    mon_9        : 'OCT',
    mon_10       : 'NOV',
    mon_11       : 'DEC',
    day_0		   : 'Sun',
    day_1 	   : 'Mon',
    day_2		   : 'Tue',
    day_3		   : 'Wed',
    day_4		   : 'Thr',
    day_5		   : 'Fri',
    day_6		   : 'Sat'
  },
  french: {
    today        : 'aujourd\'hui',
    day          : 'jour',
    week         : 'semaine',
    month        : 'mois',
    year         : 'ann&eacute;e',
    custom       : 'personnalis&eacute;',
    mon_0        : 'JAN',
    mon_1        : 'FEV',
    mon_2        : 'MAR',
    mon_3        : 'AVR',
    mon_4        : 'MAI',
    mon_5        : 'JUN',
    mon_6        : 'JUL',
    mon_7        : 'AOU',
    mon_8        : 'SEP',
    mon_9        : 'OCT',
    mon_10       : 'NOV',
    mon_11       : 'DEC'
  }
};


var CustomTimeModal = Modal.extend({
  /* Variables */
  modalId: '#custom_time_modal'
  , template: customTimeModalTpl
  , name: 'CustomTimeModal'
  , from: null
  , to: null
  , $from: null
  , $to: null
  /* Events */
  , events: {
    'click #ok_btn' : 'onClickOK'
  }
  /* Methods */
  , initialize: function(){
    console.log(this.name+':initialize');
  }
  , render: function(){
    Modal.prototype.render.call(this);
    $('#timeframe #menu-items').toggle();
    this.$from = this.$('#from_selected');
    this.$to = this.$('#to_selected');
    this.$from.attr('value', this.from.toString()).datetimepicker();
    this.$to.attr('value', this.to.toString()).datetimepicker();
    $('#ui-datepicker-div').addClass('calendar');
    return this;
  }
  , open: function(from, to){
    this.from = from;
    this.to = to;
    this.render();
  }
  , onClickOK: function(){
    //console.log(this.name+':onClickOKBtn');
    var f = this.$from.datepicker('getDate');
    var t = this.$to.datepicker('getDate');
    var ret = false;
    if (f === null ){
      this.$('#from_helper').text('Please provide a valid date.');
      ret = true;
    }
    if (t === null){
      this.$('#from_helper').text('Please provide a valid date.');
      ret = true;
    }
    if (ret) return;

    this.trigger('ok', 'custom', false, this.$from.datepicker('getDate'),
      this.$to.datepicker('getDate'));

    this.close();
    return false;
  }
});

module.exports = Backbone.View.extend({
  id: '#timeframe'
  , name: 'TimeView'
  , developmentMode: false
  , frameFrom: null
  , frameTo: null
  , arrowPressLongspeed : 3
  , arrowPressDuration: 1500
  , proportionTimeFrame : 0.6666
  , span: null
  , spanStep : null
  , spanName: null
  , graduation: null
  , numOfGradustions : null
  , graduationStep : 5
  , currentLanguage: 'english'
  , $timeline: null
  , timeframeChanged : false
  , lastHighlightedDate : null
  , intervalLabelWidth : 0
  , focusTimeout : null

  , events: {
    'click #today'    : 'onClickToday'
    , 'click #day'      : 'onClickTimeSpan'
    , 'click #month'    : 'onClickTimeSpan'
    , 'click #year'     : 'onClickTimeSpan'
    , 'click #timeline-menu' : 'onClickMenu'
    , 'click #custom'   : 'onClickCustomTime'
  }
  , modals: {
    customTime: new CustomTimeModal()
  }
  /* Methods. */
  , initialize: function(options){
    if(options && options.developmentMode != null){
      this.developmentMode = options.developmentMode;
    }
    console.log(this.name+':initialize');
    this.modals.customTime.on('ok', this.onClickTimeSpan, this);
    this.bindTouch();
  }
  , render: function(){
    this.setElement(this.id);
    this.$el.html(timeViewTpl);
    this.$timeline = this.$('#timeline-content');
    this.setInitialWidth();

    var longpress = false;
    var self = this;

    var resizeEnded;
    function resizedw(){
      self.setInitialWidth();
      self.triggerFilter($('#start-marker').data('currentDate'), $('#end-marker').data('currentDate'), true);
    }
    $(window).resize(function() {
      resizedw();
    });

    var startTime, endTime;
    if( /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent) ) {
      $(".nav-arrow").bind('touchstart', function() {
        startTime = new Date().getTime();
      }).bind('touchend', function() {
          endTime = new Date().getTime();
          longpress = (endTime - startTime < 500) ? false : true;
          self.onArrowClick($(this), longpress);
        });
    } else {
      $(".nav-arrow").on('click', function () {
        self.onArrowClick($(this), longpress);
      });
      $(".nav-arrow").on('mousedown', function () {
        startTime = new Date().getTime();
      });
      $(".nav-arrow").on('mouseup', function () {
        endTime = new Date().getTime();
        longpress = (endTime - startTime < 500) ? false : true;
      });
    }

    return this;
  }
  , setInitialWidth: function(){
    var visibleWidth = $('#timeframe').width() - 2*($('.nav-arrow').width() + 2*parseInt($('.nav-arrow').css('paddingLeft')) ) - 30 - $('#timeline-menu').outerWidth() - parseInt($('#timeline-menu').css('marginRight'));
    $('#timeline-scroll-wrapper').width(visibleWidth);
    var initialLeftPosition = - visibleWidth;
    this.$timeline.width(3*visibleWidth).css('left', initialLeftPosition + 'px' ).data({'leftPosition' : -visibleWidth, 'initialLeftPosition' : initialLeftPosition});

  }
  , setTimelineDates: function(changes) {
    this.frameFrom = changes.from.getTime();
    this.frameTo  = changes.to.getTime();
  }
  , onFiltersChanged: function(changes){
    if (this.frameFrom ===  changes.from.getTime() ||
      this.frameTo === changes.to.getTime() ) {
      this.timeframeChanged = false;
      return;
    }
    this.setTimelineDates(changes);
    this.fillTimeline();
  }
  , triggerFilter: function(dateFrom, dateTo, windowResized){
    self.frameFrom = dateFrom;
    self.frameTo = dateTo;
    if(this.developmentMode || windowResized){
      var devDateFrom = new Date(dateFrom);
      var devDateTo = new Date(dateTo);
      console.log('devMode - onFiltersChanged - dateFrom:' + devDateFrom.toUTCString() + '....dateTo:'  + devDateTo.toUTCString());
      this.onFiltersChanged({
        from:devDateFrom
        , to:devDateTo
        , span: dateTo - dateFrom
      });
    } else {
      this.trigger('filtersChanged', {
        from: new Date(dateFrom)
        , to: new Date(dateTo)
        , span: dateTo - dateFrom
      });
      this.onFiltersChanged({
        from: new Date(dateFrom)
        , to: new Date(dateTo)
        , span: dateTo - dateFrom
      });
    }
  }
  , triggerHighlight : function(date) {
    if(this.lastHighlightedDate != date && !this.developmentMode){
      this.lastHighlightedDate = date;
      var highlightedDate = new Date(parseInt(date));
      this.trigger('dateHighlighted', highlightedDate);
    }
  }
  , onDateHighlighted : function(param) {
    //console.log('on date high...' + param);
  }
  , getIntervalLabel : function(){
    var startDate = $('#start-marker').data('currentDate');
    var endDate = $('#end-marker').data('currentDate');
    var duration = endDate - startDate;
    var duration_in_sec = parseInt(duration/1000);
    var interval_label = '';

    if(duration < 1000){
      interval_label = duration + ' ms';
    } else if (duration_in_sec < 60){
      interval_label = duration_in_sec + ' sec';
    } else if (duration_in_sec < 60*60){
      var min = Math.floor(duration_in_sec/60);
      var res = duration_in_sec % 60;
      interval_label = min + ' min' + ( min == 1 ? '' : 's') + (res == 0 ? '' : (' ' + res + ' sec'));
    } else if (duration_in_sec < 60*60*24){
      var hrs = Math.floor(duration_in_sec/(60*60));
      var res = parseInt((duration_in_sec % (60*60))/60);
      interval_label = hrs + ' hr' + ( hrs == 1 ? '' : 's') + (res == 0 ? '' : (' ' + res + ' min') + ( res == 1 ? '' : 's'));
    } else if (duration_in_sec < 60*60*24*7){
      var days = Math.floor(duration_in_sec/(60*60*24));
      var res = parseInt((duration_in_sec % (60*60*24))/(60*60));
      interval_label = days + ' day' + ( days == 1 ? '' : 's') + (res == 0 ? '' : (' ' + res + ' hr') + ( res == 1 ? '' : 's'));
    } else if (duration_in_sec < 60*60*24*30){
      var weeks = Math.floor(duration_in_sec/(60*60*24*7));
      var res = parseInt((duration_in_sec % (60*60*24*7))/(60*60*24));
      interval_label = weeks + ' week' + ( weeks == 1 ? '' : 's') + (res == 0 ? '' : (' ' + res + ' day') + ( res == 1 ? '' : 's'));
    } else if (duration_in_sec < 60*60*24*365){
      var months = Math.floor(duration_in_sec/(60*60*24*30));
      var res = parseInt((duration_in_sec % (60*60*24*30))/(60*60*24));
      interval_label = months + ' month' + ( months == 1 ? '' : 's') + (res == 0 ? '' : (' ' + res + ' day') + ( res == 1 ? '' : 's'));
    } else {
      var years = Math.floor(duration_in_sec/(60*60*24*365));
      var res = parseInt((duration_in_sec % (60*60*24*365))/(60*60*24));
      interval_label = years + ' year' + ( years == 1 ? '' : 's');
      if(res <= 30){
        interval_label += (res == 0 ? '' : (' ' + res + ' day'));
      } else {
        res = parseInt(res/30);
        interval_label += (res == 0 ? '' : (' ' + res + ' month'));
      }
      interval_label += res == 1 ? '' : 's';
    }
    $('#frame-interval-label').text(interval_label);
    $('#frame-interval-label-value').text(interval_label);
    this.intervalLabelWidth = $('#frame-interval-label-value').width();
  }
  , fillTimeline : function(){
    this.setSpan();
    this.setMarkers();
    var self = this;
    if (!this.$timeline.hasClass('ui-draggable')){
      this.$timeline.draggable({axis: "x",
        start: function(event, ui) {
          clearTimeout(self.focusTimeout);
          $('#focus-marker-label, #focus-marker-arrow').fadeOut();
        },
        drag: function (event, ui){
          var startPosition = $(this).data('leftPosition');
          var currentLeft = ui.position.left;
          var diff = currentLeft - startPosition;
          var nextStartDate = null, nextEndDate = null, nextFocusDate = null;
          var currentStartDate = new Date($('#start-marker').data('currentDate'));
          var currentEndDate = new Date($('#end-marker').data('currentDate'));
          var currentFocusDate = new Date($('#focus-marker').data('currentDate'));
          if(diff != 0){
            nextStartDate = currentLeft > startPosition ?  new Date(currentStartDate.getTime() - (self.spanStep*self.span)) : new Date(currentStartDate.getTime() + (self.spanStep*self.span));
            nextEndDate = currentLeft > startPosition ?  new Date(currentEndDate.getTime() - (self.spanStep*self.span)) : new Date(currentEndDate.getTime() + (self.spanStep*self.span));
            nextFocusDate = currentLeft > startPosition ?  new Date(currentFocusDate.getTime() - (self.spanStep*self.span)) : new Date(currentFocusDate.getTime() + (self.spanStep*self.span));
            self.getMarkerLabelText(nextStartDate, 'start-marker', true, new Date(self.frameFrom));
            self.getMarkerLabelText(nextEndDate, 'end-marker', true, new Date(self.frameTo));
            $('#start-marker').data('currentDate', nextStartDate.getTime());
            $('#end-marker').data('currentDate', nextEndDate.getTime());
            $('#focus-marker').data('currentDate', nextFocusDate.getTime());
            $(this).data('leftPosition', currentLeft);
          }
        },
        stop: function(event, ui) {
          $('#timeframe .marker-label span.label-fixed').removeClass('label-fixed');
          var initialLeftPosition = $(this).data('initialLeftPosition');
          self.$timeline.css({'left' : initialLeftPosition + 'px'});
          self.timeframeChanged = true;
          self.triggerFilter($('#start-marker').data('currentDate'), $('#end-marker').data('currentDate'));
        }
      });

      $('#selected-frame').draggable({axis: "x", grid: [ this.graduationStep,0 ],
        start: function(event, ui) {
          $(this).css('opacity', 0.4);
          $(this).data('mouseLeft', event.pageX);
          clearTimeout(self.focusTimeout);
          $('#focus-marker-label, #focus-marker-arrow').fadeOut();
        },
        drag: function (event, ui){
          var startPosition = $(this).data('mouseLeft');
          var currentLeft = event.pageX;
          var diff = ui.position.left - $(this).data('leftPosition');
          var nextStartDate = null, nextEndDate = null;
          var currentStartDate = new Date($('#start-marker').data('currentDate'));
          var currentEndDate = new Date($('#end-marker').data('currentDate'));

          nextStartDate = currentLeft < startPosition ?  new Date(currentStartDate.getTime() - (self.spanStep*self.span)) : new Date(currentStartDate.getTime() + (self.spanStep*self.span));
          nextEndDate = currentLeft < startPosition ?  new Date(currentEndDate.getTime() - (self.spanStep*self.span)) : new Date(currentEndDate.getTime() + (self.spanStep*self.span));
          var startMarkerPosition = $('#start-marker').data('leftPosition') + diff;
          $('#start-marker').data({'leftPosition' : startMarkerPosition, 'currentDate' : nextStartDate.getTime() }).css('left', startMarkerPosition);
          self.getMarkerLabelText(nextStartDate, 'start-marker', true, new Date(self.frameFrom));
          $('#start-marker-label').css({ 'left' : (startMarkerPosition - $('#start-marker-label').width()/2 ) + 'px'});
          $('#start-marker-arrow').css({ "left" : ($('#start-marker-arrow').position().left + diff) + 'px'});
          var endMarkerPosition = $('#end-marker').data('leftPosition') + diff;
          $('#end-marker').data({'leftPosition' : endMarkerPosition, 'currentDate' : nextEndDate.getTime() }).css('left', endMarkerPosition);
          self.getMarkerLabelText(nextEndDate, 'end-marker', true, new Date(self.frameTo));
          $('#end-marker-label').css({ 'left' : (endMarkerPosition - $('#start-marker-label').width()/2 ) + 'px'});
          $('#end-marker-arrow').css({ "left" : ($('#end-marker-arrow').position().left + diff) + 'px'});
          $('#frame-interval-label').css({ "left" : ($('#frame-interval-label').position().left + diff)  + 'px'});
          $(this).data({'mouseLeft': currentLeft, 'leftPosition' : ui.position.left});
        },
        stop: function(){
          $(this).css('opacity', 0.7);
          $('#timeframe .marker-label span.label-fixed').removeClass('label-fixed');
          self.triggerFilter($('#start-marker').data('currentDate'), $('#end-marker').data('currentDate'));
        }
      });

      $("#start-marker, #end-marker, #focus-marker, #start-marker-label, #end-marker-label, #focus-marker-label").draggable({axis: "x", grid: [ this.graduationStep,0 ],
        start: function(event,ui){
          ui.helper.css({'zIndex' : 20});
          var markerId = ui.helper.attr('id').replace('-marker', '');
          markerId = markerId.replace('-label', '');
          if(markerId == "focus"){
            clearTimeout(self.focusTimeout);
          } else {
            $('#focus-marker-label, #focus-marker-arrow').fadeIn();
          }
          $('#focus-marker-label, #focus-marker-arrow').fadeIn();
        },
        drag: function(event, ui){
          var markerId = ui.helper.attr('id').replace('-marker', '');
          markerId = markerId.replace('-label', '');
          var siblingsMarkerSuffix = ui.helper.attr('id').indexOf('-label') > -1 ? '-marker' : '-marker-label';
          var currentDate = new Date($('#' + markerId + '-marker').data('currentDate'));
          var left = ui.helper.data('leftPosition');
          var currentLeft = ui.position.left;
          var diff = currentLeft - left;
          var nextDate = null;
          if(diff != 0){
            var numOfSteps = parseInt(Math.abs(currentLeft - left) / self.graduationStep );
            nextDate = diff > 0 ?  new Date(currentDate.getTime() + (numOfSteps*self.spanStep*self.span)) : new Date(currentDate.getTime() - (numOfSteps*self.spanStep*self.span));
            ui.helper.data({'leftPosition':currentLeft});
            $('#' + markerId + '-marker').data({'currentDate': nextDate.getTime()});
          }

          if( nextDate != null){
            var initDate = markerId == 'start' ? self.frameFrom : (markerId == 'end' ? self.frameTo : $('#' + markerId + '-marker').data('initialDate') );
            self.getMarkerLabelText(nextDate, markerId + '-marker', true, new Date(initDate));
          }
          var positionStep = currentLeft - left;
          var markerLeftPosition = ($('#' + markerId + siblingsMarkerSuffix).position().left + positionStep);
          $('#' + markerId + siblingsMarkerSuffix).data({'leftPosition':markerLeftPosition}).css({ 'left' : markerLeftPosition  + 'px', 'zIndex' : 20});
          $('#' + markerId + '-marker-arrow').css({ "left" : ($('#' + markerId + '-marker-arrow').position().left + positionStep) + 'px'});

          if(markerId == 'start' || markerId == 'end'){
            self.getIntervalLabel();
          }
          var frameLeft = $('#selected-frame').position().left;
          var frameWidth = $('#selected-frame').width();

          switch(markerId){
            case "start":
              $('#selected-frame').css({ 'left' : (frameLeft + positionStep) + 'px', 'width' : (frameWidth - positionStep) + 'px'});
              $('#frame-interval-label').css({ "left" : (frameLeft + frameWidth/2 - $('#frame-interval-label').width()/2)  + 'px'});
              break;
            case "end":
              $('#selected-frame').css({ 'left' : frameLeft + 'px', 'width' : (frameWidth + positionStep) + 'px'});
              $('#frame-interval-label').css({ "left" : (frameLeft + frameWidth/2 - $('#frame-interval-label').width()/2)  + 'px'});
              break;
            case "focus":
              self.triggerHighlight(ui.helper.data('currentDate'));
              break;
          }
          if(frameWidth < self.intervalLabelWidth && (markerId == 'start' || markerId == 'end')){
            $('#frame-interval-label').width($('#selected-frame').width());
          } else {
            $('#frame-interval-label').width(self.intervalLabelWidth);
          }
        },
        stop: function(event, ui){
          $('#timeframe .marker-label span.label-fixed').removeClass('label-fixed');
          ui.helper.css({'zIndex' : 15});
          var markerId = ui.helper.attr('id').replace('-marker', '');
          markerId = markerId.replace('-label', '');
          var siblingsMarkerSuffix = ui.helper.attr('id').indexOf('-label') > -1 ? '-marker' : '-marker-label';
          $('#' + markerId + siblingsMarkerSuffix).css({ 'zIndex' : 15});
          if(markerId == "focus"){
            self.focusTimeout = setTimeout("$('#focus-marker-label, #focus-marker-arrow').fadeOut();", 10000 );
          } else {
            self.triggerFilter($('#start-marker').data('currentDate'), $('#end-marker').data('currentDate'));
          }
        }

      });
    }

    var timeline_position = $('#timeline-scroll-wrapper').position();
    var constraint_top = timeline_position.top - 2;
    var constraint_bottom = constraint_top + $('#start-marker').height();

    $("#start-marker").draggable("option", "containment", [timeline_position.left - $('#start-marker').width()/2 + $('#start-marker-bg').width()/2,constraint_top, $('#end-marker').position().left,constraint_bottom] );
    $("#start-marker-label").draggable("option", "containment", [timeline_position.left - $("#start-marker-label").width()/2, $("#start-marker-label").position().top, $('#end-marker-label').position().left,$("#start-marker-label").position().top + $("#start-marker-label").height()] );
    $("#end-marker").draggable("option", "containment", [$('#start-marker').position().left,constraint_top,timeline_position.left + $('#timeline-scroll-wrapper').width() - $('#start-marker').width()/2,constraint_bottom] );
    $("#end-marker-label").draggable("option", "containment", [$('#start-marker-label').position().left,$("#start-marker-label").position().top,timeline_position.left + $('#timeline-scroll-wrapper').width() - $('#end-marker-label').width()/2,$("#start-marker-label").position().top + $("#start-marker-label").height()] );
    $("#focus-marker").draggable("option", "containment", [$('#start-marker').position().left + $('#start-marker').width()/2 - $('#focus-marker').width()/2,$('#focus-marker').position().top,$('#end-marker').position().left + $('#start-marker').width()/2 - $('#focus-marker').width()/2,timeline_position.top + $('#focus-marker').height()]);
    $("#focus-marker-label").draggable("option", "containment", [$('#start-marker-label').position().left,$('#focus-marker-label').position().top,$('#end-marker-label').position().left,$("#focus-marker-label").position().top + $("#focus-marker-label").height()]);
    $('#selected-frame').draggable("option", "containment", [timeline_position.left + $('#start-marker-bg').width()/2,timeline_position.top, timeline_position.left + $('#timeline-scroll-wrapper').width() - $('#selected-frame').width() - $('#start-marker-bg').width()/2,timeline_position.top + $('#start-marker').height()] );
  }
  , setMarkers: function(){
    if($('#timeframe #start-marker').length == 0){
      $("#timeframe").append('<span id="start-marker"><span id="start-marker-bg"></span></span><span id="focus-marker"></span><span id="end-marker"><span id="end-marker-bg"></span></span><span id="selected-frame"></span><span id="frame-interval-label"></span><span id="frame-interval-label-value"></span>');
    }
    var timeframePositionLeft = $('#timeline-scroll-wrapper').position().left;
    var timelineWidth = $('#timeline-scroll-wrapper').width();
    var timelineProportion = this.proportionTimeFrame;
    var timelineStart = (1 - this.proportionTimeFrame)/2;
    var timelineEnd = 1 - timelineStart;

    var startPositionLeft = parseInt(timeframePositionLeft + timelineWidth*timelineStart - $('#start-marker').width()/2);
    $('#start-marker').css({ "left" : startPositionLeft + 'px'});
    $('#start-marker').data({'leftPosition': startPositionLeft, 'currentDate': this.frameFrom});
    $('#start-marker-arrow').css({ "left" : (startPositionLeft + $('#start-marker').width()/2 - 4) + 'px'});
    var startDate = new Date (this.frameFrom);
    this.getMarkerLabelText(startDate, 'start-marker', false);
    var startLabelPositionLeft = parseInt(timeframePositionLeft + timelineWidth*timelineStart - $('#start-marker-label').width()/2) - parseInt($('#start-marker-label').css('paddingLeft'));
    $('#start-marker-label').data({'leftPosition' : startLabelPositionLeft }).css({ "left" : startLabelPositionLeft  + 'px'}).fadeIn();
    var endPositionLeft = parseInt(timeframePositionLeft + timelineWidth*timelineEnd - $('#end-marker').width()/2);
    $('#end-marker').css({ "left" : endPositionLeft + 'px'});
    $('#end-marker').data({'leftPosition': endPositionLeft, 'currentDate': this.frameTo});
    $('#end-marker-arrow').css({ "left" : (endPositionLeft + $('#end-marker').width()/2 - 4) + 'px'});
    var endDate = new Date (this.frameTo);
    this.getMarkerLabelText(endDate, 'end-marker', false);
    var endLabelPositionLeft =  parseInt(timeframePositionLeft + timelineWidth*timelineEnd - $('#end-marker-label').width()/2) - parseInt($('#end-marker-label').css('paddingLeft'));
    $('#end-marker-label').data({'leftPosition': endLabelPositionLeft }).css({ "left" : endLabelPositionLeft + 'px'}).fadeIn();
    var framePositionLeft = parseInt(timeframePositionLeft + timelineWidth*timelineStart);
    $('#selected-frame').data('leftPosition', framePositionLeft);
    $('#selected-frame').css({ "left" : framePositionLeft  + 'px', 'width' : parseInt(timelineWidth*timelineProportion) + 'px'  }).fadeIn();
    var focusPositionLeft = parseInt(framePositionLeft + $('#selected-frame').width()/2 - $('#focus-marker').width()/2);
    $('#focus-marker').css({ "left" : focusPositionLeft + 'px'});
    var focusDate = new Date(this.frameFrom + (this.frameTo - this.frameFrom)/2);
    this.getMarkerLabelText(focusDate, 'focus-marker', false);
    $('#focus-marker').data({'leftPosition': focusPositionLeft, 'currentDate': focusDate.getTime(), 'initialDate' : focusDate.getTime() });
    $('#focus-marker-arrow').css({ "left" : (focusPositionLeft + $('#focus-marker').width()/2 - 4) + 'px'});
    $('#focus-marker-label').css({ "left" : (focusPositionLeft + $('#focus-marker').width()/2 - $('#focus-marker-label').width()/2 - parseInt($('#focus-marker-label').css('paddingLeft')) )+ 'px'});

    this.getIntervalLabel();
    $('#frame-interval-label').css({ "left" : (framePositionLeft + $('#selected-frame').width()/2 - $('#frame-interval-label').width()/2)  + 'px'});
  }
  , getMarkerLabelText: function(date, elementId, setDifference, initialDate){
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
    if(setDifference){
      var initYear = initialDate.getFullYear();
      var initMonth = this.translate('mon_' + initialDate.getMonth());
      var initDay = initialDate.getDate();
      var initHours = initialDate.getHours() < 10 ? '0' + initialDate.getHours() : initialDate.getHours();
      var initMinutes = initialDate.getMinutes() < 10 ? '0' + initialDate.getMinutes() : initialDate.getMinutes();
      if(year != initYear){
        $('#' + elementId + '-year').removeClass('label-fixed');
      } else {
        $('#' + elementId + '-year').addClass('label-fixed');
      }
      if(month != initMonth){
        $('#' + elementId + '-month').removeClass('label-fixed');
      } else {
        $('#' + elementId + '-month').addClass('label-fixed');
      }
      if(day != initDay){
        $('#' + elementId + '-day').removeClass('label-fixed');
      } else {
        $('#' + elementId + '-day').addClass('label-fixed');
      }
      if(hours != initHours){
        $('#' + elementId + '-hour').removeClass('label-fixed');
      } else {
        $('#' + elementId + '-hour').addClass('label-fixed');
      }
      if(minutes != initMinutes){
        $('#' + elementId + '-minute').removeClass('label-fixed');
      } else {
        $('#' + elementId + '-minute').addClass('label-fixed');
      }
      if(hours != initHours && minutes != initMinutes){
        $('#' + elementId + '-dots').removeClass('label-fixed');
      } else {
        $('#' + elementId + '-dots').addClass('label-fixed');
      }
    }
  }
  , startZoom: function(startDate){
    this.triggerFilter(parseInt(startDate), this.frameTo);
  }
  , endZoom: function(endDate){
    this.triggerFilter(this.frameFrom, parseInt(endDate));
  }
  , setSpan: function(){
    var frame_duration = this.frameTo - this.frameFrom;
    var frame_duration_sec = parseInt((frame_duration/1000).toFixed());
    var numOfGraduations = parseInt((this.proportionTimeFrame*$('#timeline-scroll-wrapper').width()/this.graduationStep).toFixed());
    this.spanStep = 1;
    this.span = parseInt((frame_duration/(numOfGraduations*this.spanStep)).toFixed());
  }
  , onClickTimeSpan: function(spanName, updateTimeline, from, to){
    /* Check if we received the spanName or a click event. */
    if (typeof spanName !== 'string'){
      spanName = spanName.target.id;
    }
    this.span = 86400000;
    var focus_date = new Date();

    switch(spanName){
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
        if (this.frameTo < this.frameFrom){
          var temp = new Date(this.frameTo);
          this.frameTo = this.frameFrom;
          this.frameFrom = temp;
        }
        this.span = this.frameTo.getTime() - this.frameFrom.getTime();
        break;
      default:
        break;
    }
    if (updateTimeline){
      /* Force timeline update by faking a span change. */
      this.spanName = '';
    }
    this.triggerFilter(this.frameFrom, this.frameTo);
  }
  , onClickToday: function(){
    var today = new Date();
    var dateFrom = new Date (today.getFullYear(), today.getMonth(), today.getDate());
    today.setDate(today.getDate() + 1);
    var dateTo = new Date (today.getFullYear(), today.getMonth(), today.getDate());
    this.triggerFilter(dateFrom.getTime(), dateTo.getTime());
  }
  , onClickCustomTime: function(){
    this.modals.customTime.open(new Date(this.frameFrom), new Date(this.frameTo));
    return false;
  }
  , onArrowClick: function(arrowElement, isLongClick){
    var isPrevArrow = $(arrowElement).hasClass('prev');
    var gapSpeed = isLongClick ? this.arrowPressLongspeed : 1;

    var self = this;
    clearTimeout(self.focusTimeout);
    $('#focus-marker-label, #focus-marker-arrow').fadeOut();

    this.$timeline.animate({
        left: ( isPrevArrow ? '+=' : '-=' )  + $('#selected-frame').outerWidth() + 'px'
      },
      {
        duration: gapSpeed*self.arrowPressDuration,
        easing: 'easeOutCirc',
        progress: function(now, fx) {
          var nextStartDate = null, nextEndDate = null;
          var currentStartDate = new Date($('#start-marker').data('currentDate'));
          var currentEndDate = new Date($('#end-marker').data('currentDate'));
          var currentFocusDate = new Date($('#focus-marker').data('currentDate'));

          nextStartDate = isPrevArrow ?  new Date(currentStartDate.getTime() - (self.spanStep*self.span)) : new Date(currentStartDate.getTime() + (self.spanStep*self.span));
          nextEndDate = isPrevArrow ?  new Date(currentEndDate.getTime() - (self.spanStep*self.span)) : new Date(currentEndDate.getTime() + (self.spanStep*self.span));
          self.getMarkerLabelText(nextStartDate, 'start-marker', true, new Date(self.frameFrom));
          self.getMarkerLabelText(nextEndDate, 'end-marker', true, new Date(self.frameTo));
          $('#start-marker').data('currentDate', nextStartDate.getTime());
          $('#end-marker').data('currentDate', nextEndDate.getTime());
        },
        done: function(){
          $('#timeframe .marker-label span.label-fixed').removeClass('label-fixed');
          var gap = gapSpeed*(self.frameTo - self.frameFrom);
          var dateFrom = isPrevArrow ? self.frameFrom - gap : self.frameFrom + gap;
          var dateTo = isPrevArrow ? self.frameTo - gap : self.frameTo + gap;
          self.timeframeChanged = true;
          self.triggerFilter(dateFrom, dateTo);
          var dates = {"from": new Date(dateFrom) , "to": new Date(dateTo)};
          self.setTimelineDates(dates, self.graduation);
          self.setMarkers();
          var initialLeftPosition = self.$timeline.data('initialLeftPosition');
          self.$timeline.css({'left' : initialLeftPosition + 'px'});
        }
      });
  }
  , onClickMenu: function(){
    $('#menu-items').toggle();
  }
  , onLanguageChanged: function(language){
    this.currentLanguage = language;
    this.updateLanguage();
  }
  , updateLanguage: function(){
    var keywords = _keywords[this.currentLanguage];
    _.each(keywords, function(value, key){
      this.$('.'+key+'_lang').each(function(){
        var $element = $(this);
        if ($element.attr('value') && $element.attr('value') !== ''){
          $element.attr('value', value);
        }
      }, this);
    }, this);
  }
  , translate: function(keyword){
    return _keywords[this.currentLanguage][keyword];
  }
  , bindTouch: function(){
    // Detect touch support
    $.support.touch = 'ontouchend' in document;
    // Ignore browsers without touch support
    if (!$.support.touch) {
      return;
    }
    var mouseProto = $.ui.mouse.prototype,
      _mouseInit = mouseProto._mouseInit,
      touchHandled;

    function simulateMouseEvent (event, simulatedType) { //use this function to simulate mouse event
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

/* jshint ignore:start */
