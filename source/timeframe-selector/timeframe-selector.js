/* global $, document, i18n, window, moment */
var _ = require('underscore');
module.exports = (function () {
  var CONTAINER = '#timeframeContainer';
  var MARGIN = {
    left: 0,
    right: 0
  };
  var DATE_FORMAT = {
    'day': {
      'selected': 'D.M.YYYY',
      'others': 'D'
    },
    'month': {
      'selected': 'MMM YYYY',
      'others': 'MMM'
    },
    'week': {
      'selected': 'D.M.YYYY',
      'others': 'D.M'
    },
    'year': {
      'selected': 'YYYY',
      'others': 'YYYY'
    },
    'custom': {
      'selected': 'D.M.YYYY LT'
    },
    'all': {
      'selected': 'D.M.YYYY LT'
    }
  };
  var DATE_SIZE = {
    'day': {
      'selected': 150,
      'others': 75
    },
    'month': {
      'selected': 175,
      'others': 100
    },
    'week': {
      'selected': 150,
      'others': 100
    },
    'year': {
      'selected': 175,
      'others': 100
    },
    'custom': {
      'selected': 500
    }
  };
  var _isInit = false;
  var _callbacks;
  var _from;
  var _to;
  var _scale;
  var _highlight;
  var init = function () {
    if (_isInit === true) {
      return;
    }
    _isInit = true;
    moment.lang(i18n.lng());
    _callbacks = {};
    _initTimeFrame();
  };
  var _initHtml = function () {
    $(CONTAINER).html('<div id="timeframe" style="margin-left: ' + MARGIN.left +
        'px; margin-right: ' + MARGIN.right + 'px;"><div id="upperLayout"></div>' +
        '<div id="datesContainer"><div id="dates"></div></div><div id="scales">' +
        '<a href="javascript:void(0)" class="timeScale" data-timeScale="day">Day</a>' +
        '<a href="javascript:void(0)" class="timeScale" data-timeScale="week">Week</a>' +
        '<a href="javascript:void(0)" class="timeScale selected" data-timeScale="month">Month</a>' +
        '<a href="javascript:void(0)" class="timeScale" data-timeScale="year">Year</a>' +
        '</div><div id="custom" class="timeScale" data-timeScale="custom">Custom</div></div>');
    $('#custom').popover({
      html: true,
      placement: 'top',
      content: function () {
        return $('<div>' +

            '<div class="input-group date picker" id="fromPicker">' +
            '<input type="text" class="form-control" placeholder="From"/> ' +
            '<span id="fromButton" class="input-group-addon">' +
            '<span class="fa fa-calendar"></span>' +
            '</span>' +
            '</div>' +
            '<div class="input-group date picker" id="toPicker">' +
            '<input type="text" class="form-control" placeholder="To"/> ' +
            '<span id="toButton" class="input-group-addon">' +
            '<span class="fa fa-calendar"></span>' +
            '</span>' +
            '</div>' +
            '<div id="ok" class="btn btn-default">OK</div>' +
            '</div>').html();
      }
    });
    $('#custom').on('shown.bs.popover', function () {
      var fromDate = moment.unix(_from),
          toDate = moment.unix(_to);
      $(document.body).off('click', '#ok');
      $(document.body).on('click', '#ok', function () {
        fromDate = moment(fromDate);
        toDate = moment(toDate);
        if (fromDate.isValid() && toDate.isValid() && fromDate.unix() <= toDate.unix()) {
          $('#custom').popover('toggle');
          _scale = 'custom';
          setTimeBounds(fromDate, toDate);
          _updateDateScale();
        }
      });
      $(document.body).off('click', '#fromButton');
      $(document.body).on('click', '#fromButton', function () {
        fromDate = moment();
        $('#fromButton').trigger('click');
      });

      $(document.body).off('click', '#fromPicker input');
      $(document.body).on('click', '#fromPicker input', function () {
        fromDate = moment();
        $('#fromButton').trigger('click');
      });
      $(document.body).off('click', '#toButton');
      $(document.body).on('click', '#toButton', function () {
        toDate = moment();
        $('#toButton').trigger('click');
      });

      $(document.body).off('click', '#toPicker');
      $(document.body).on('click', '#toPicker input', function () {
        toDate = moment();
        $('#toButton').trigger('click');
      });
      $('#fromPicker').datetimepicker({
        direction: 'auto',
        language: i18n.lng()
      });
      $('#fromPicker').on('dp.change', function (e) {
        fromDate = e.date;
      });
      $('#toPicker').datetimepicker({
        direction: 'auto',
        language: i18n.lng()
      });
      $('#toPicker').on('dp.change', function (e) {
        toDate = e.date;
      });
      $('#fromPicker').data('DateTimePicker').setDate(fromDate);
      $('#toPicker').data('DateTimePicker').setDate(toDate);
    });
  };
  var _updateDateScale = function () {
    var containerWidth = $(CONTAINER).width();
    var $dates = $('#dates');
    var $datesMargin, $datesWidth;
    moment.lang(i18n.lng());
    if (_scale === 'custom') {
      $('.timeScale').removeClass('selected');
      $('#custom').addClass('selected');
      $datesWidth = DATE_SIZE[_scale].selected;
      $datesMargin = ((containerWidth - MARGIN.left - MARGIN.right) - $datesWidth) / 2;
      $dates.empty();
      $dates.css({
        'width': $datesWidth + 'px',
        'margin-left': $datesMargin + 'px'
      });
      $dates.append('<li class="timeItem selected" style="width: ' +
          DATE_SIZE[_scale].selected + 'px;">' +
          moment.unix(_from).format(DATE_FORMAT[_scale].selected) + ' - ' +
          moment.unix(_to).format(DATE_FORMAT[_scale].selected) + '</li>');
      return;
    }

    var nbrToDisplay = Math.floor((containerWidth - MARGIN.left - MARGIN.right -
        DATE_SIZE[_scale].selected) / (DATE_SIZE[_scale].others * 2));

    $datesWidth = (nbrToDisplay * 4 * DATE_SIZE[_scale].others) + DATE_SIZE[_scale].selected;
    // use margin to center dates
    $datesMargin = -($datesWidth - (containerWidth - MARGIN.left - MARGIN.right)) / 2;
    $dates.empty();
    for (var i = 0; i < nbrToDisplay * 2; i++) {
      $dates.prepend('<li class="timeItem" style="width: ' + DATE_SIZE[_scale].others + 'px;">' +
          moment.unix(_from).subtract(_scale, i + 1).format(DATE_FORMAT[_scale].others) + '</li>');
    }
    $dates.append('<li class="timeItem selected" style="width: ' + DATE_SIZE[_scale].selected +
        'px;">' + moment.unix(_from).format(DATE_FORMAT[_scale].selected) + '</li>');
    for (var j = 0; j < nbrToDisplay * 2; j++) {
      $dates.append('<li class="timeItem" style="width: ' + DATE_SIZE[_scale].others + 'px;">' +
          moment.unix(_from).add(_scale, j + 1).format(DATE_FORMAT[_scale].others) + '</li>');
    }
    $dates.css({
      'width': $datesWidth + 'px',
      'margin-left': $datesMargin + 'px'
    });
    $('.timeItem').click(_changeTime);
  };

  var _changeTime = function () {
    var clickedIndex = $(this).index();
    var totalIndex = $('.timeItem').length;
    var centerIndex = (totalIndex - 1) / 2;
    var diff = centerIndex - clickedIndex;
    if (diff === 0) {
      return;
    }
    var c = centerIndex + 1;
    $('.timeItem:nth-child(' + c + ')').html(moment.unix(_from)
        .format(DATE_FORMAT[_scale].others))
        .css('width', DATE_SIZE[_scale].others).removeClass('selected');
    var $dates = $('#dates');
    if (diff > 0) {
      // add before and remove last
      c = clickedIndex + 1;
      $('.timeItem:nth-child(' + c + ')')
          .html(moment.unix(_from).subtract(_scale, diff).format(DATE_FORMAT[_scale].selected))
          .css('width', DATE_SIZE[_scale].selected).addClass('selected');
      var d = diff + 1;
      $('.timeItem:gt(-' + d + ')').remove();
      for (var i = 0; i < diff; i++) {
        $('<li class="timeItem" style="width: ' + DATE_SIZE[_scale].others + 'px;">' +
            moment.unix(_from).subtract(_scale, totalIndex - centerIndex + i)
                .format(DATE_FORMAT[_scale].others) + '</li>').hide().prependTo('#dates').animate({
          width: 'toggle'
        });
      }
      setTimeBounds(moment.unix(_from)
          .subtract(_scale, diff).startOf(_scale),
          moment.unix(_to).subtract(_scale, diff).endOf(_scale));
    } else {
      // remove before and add last

      c = clickedIndex + 1;
      $('.timeItem:nth-child(' + c + ')').html(moment.unix(_from).add(_scale, -diff)
          .format(DATE_FORMAT[_scale].selected))
          .css('width', DATE_SIZE[_scale].selected).addClass('selected');



      $('.timeItem:lt(' + -diff + ')').animate({
        width: 'toggle'
      }, {
        complete: function () {
          $(this).remove();
        }
      });

      for (var j = 0; j < -diff; j++) {
        $dates.append('<li class="timeItem" style="width: ' +
            DATE_SIZE[_scale].others + 'px;">' +
            moment.unix(_from).add(_scale, totalIndex - centerIndex + j)
                .format(DATE_FORMAT[_scale].others) + '</li>');
      }
      setTimeBounds(moment.unix(_from).add(_scale, -diff)
          .startOf(_scale), moment.unix(_to).add(_scale, -diff).endOf(_scale));
    }
    $('.timeItem').off().click(_changeTime);
  };
  var _changeScale = function () {
    var scale = $(this).attr('data-timeScale');
    if (scale === _scale || scale === 'custom') {
      return;
    }
    $('.timeScale').removeClass('selected');
    $(this).addClass('selected');
    if (scale === 'day') {
      if ((_scale === 'custom') ||
          (moment().unix() >= moment.unix(_from).unix() &&
              moment().unix() <= moment.unix(_to).unix())) {
        setTimeBounds(moment().startOf('day'), moment().endOf('day'));
      } else {
        setTimeBounds(moment.unix(_from).startOf('day'), moment.unix(_from).endOf('day'));
      }
      _scale = 'day';
    } else if (scale === 'week') {
      if ((_scale === 'custom') ||
          (moment().unix() >= moment.unix(_from).unix() &&
              moment().unix() <= moment.unix(_to).unix())) {
        setTimeBounds(moment().startOf('week'), moment().endOf('week'));
      } else {
        setTimeBounds(moment.unix(_from).startOf('week'), moment.unix(_from).endOf('week'));
      }
      _scale = 'week';
    } else if (scale === 'month') {
      if ((_scale === 'custom') ||
          (moment().unix() >= moment.unix(_from).unix() &&
              moment().unix() <= moment.unix(_to).unix())) {
        setTimeBounds(moment().startOf('month'), moment().endOf('month'));
      } else {
        setTimeBounds(moment.unix(_from).startOf('month'), moment.unix(_from).endOf('month'));
      }
      _scale = 'month';
    } else if (scale === 'year') {
      if ((_scale === 'custom') ||
          (moment().unix() >= moment.unix(_from).unix() &&
              moment().unix() <= moment.unix(_to).unix())) {
        setTimeBounds(moment().startOf('year'), moment().endOf('year'));
      } else {
        setTimeBounds(moment.unix(_from).startOf('year'), moment.unix(_from).endOf('year'));
      }
      _scale = 'year';
    }
    _updateDateScale();
  };
  // set time frame to current month and highlight to now
  var _initTimeFrame = function () {
    _scale = 'month';
    setHighlight(moment());
    setTimeBounds(moment().startOf('month'),
        moment().endOf('month'));

    _initHtml();
    _updateDateScale();
    $('.timeScale').click(_changeScale);
    $(window).resize(_updateDateScale);

  };
  var setHighlight = function (time) {
    init();
    if (moment(time).isValid()) {
      _highlight = moment(time).unix();
      trigger('highlightChanged', _highlight);
    } else {
      console.warn('setHilghlight(): invalid argument', time);
    }
  };
  var setTimeBounds = function (from, to) {
    init();
    if (moment(from).isValid() && moment(to).isValid()) {
      _from = moment(from).unix();
      _to = moment(to).unix();
      trigger('timeBoundsChanged', _from, _to);
    } else {
      console.warn('setTimeBounds(): invalid argument', from, to);
    }
  };
  var getTimeBounds  = function () {
    return {from: _from, to: _to};
  };
  var on = function (event, callback) {
    init();
    if (event && typeof (event) === 'string' && callback && typeof (callback) === 'function') {
      if (!_callbacks[event]) {
        _callbacks[event] = [];
      }
      _callbacks[event].push(callback);
    }
  };
  var off = function (event, callback) {
    init();
    if (!event || typeof (event) !== 'string') {
      _callbacks = {};
    } else {
      if (callback && typeof (callback) === 'function' && _callbacks[event]) {
        for (var i = 0; i < _callbacks[event].length; ++i) {
          if (_callbacks[event][i] === callback) {
            _callbacks[event][i] = null;
          }
        }
      } else if (!callback && _callbacks[event]) {
        _callbacks[event] = [];
      }
    }
  };
  var trigger = function () {
    init();
    var event = arguments[0];
    var args = _.toArray(arguments).slice(1);
    if (_callbacks[event]) {
      _callbacks[event].forEach(function (cb) {
        if (cb && typeof (cb) === 'function') {
          cb.apply(null, args);
        }
      });
    }
  };


  var oPublic = {
    init: init,
    setTimeBounds: setTimeBounds,
    getTimeBounds: getTimeBounds,
    setHighlight: setHighlight,
    on: on,
    off: off,
    trigger: trigger
  };
  return oPublic;
})();