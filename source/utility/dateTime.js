/* global moment */
var _ = require('underscore');

var dateTime = module.exports = {};

/**
 * Returns human-readable text for the given time.
 *
 * @param {number} unixTime
 * @returns {string}
 */
dateTime.getTimeText = function (unixTime) {
  return moment ?
      moment.unix(unixTime).calendar() : new Date(unixTime * 1000).toLocalDateString();
};

/**
 * Returns human-readable HTML text for the given duration.
 *
 * @param {number} unixDuration
 * @param {object} options `nbValues` (number): max number of date parts to include (default: all),
 *                         `html` (boolean): enable HTML formatting (default: false),
 *                         `separateLines` (boolean): if HTML formatting enabled, adds line breaks
 *                                                    between parts (default: false)
 * @returns {string}
 * @example HTML: "<strong>1</strong> hour <strong>33</strong> minutes"
 */
dateTime.getDurationText = function (unixDuration, options) {
  if (! options) { options = {}; }

  var words = moment.preciseDiff(moment.unix(0), moment.unix(unixDuration))
      .split(' ')
      .splice(0, (options.nbValues || 2) * 2);
  if (options.html) {
    words = words.map(function (s, i) {
      return i % 2 === 0 ?
          '<strong>' + s + '</strong>' : options.separateLines ? s + '<br>' : s;
    });
  }
  return words.join(' ');
};

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
    momentKey: 'h',
    interval: 1000 * 60 * 60
  },
  dayOfWeek: {
    format: 'ddd',
    momentKey: 'd',
    interval: 1000 * 60 * 60 * 24
  },
  week: {
    format: 'ddd D.M',
    momentKey: 'w',
    interval: 1000 * 60 * 60 * 24 * 7
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
      return moment(msTime || this.value).format(iValue.format);
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

/**
 * Returns time series tick settings for the given scale and time frame.
 * The returned object has functions:
 *
 * - `getLabel(msTime)` (argument `msTime` can be replaced by binding the value to `this.value`)
 * - `getValues(fromMsTime, toMsTime)`
 *
 * @param {string} timeScale The scale name (as used in the time selector)
 * @param {number} fromMsTime Start of time frame
 * @param {number} toMsTime End of time frame
 * @returns {object}
 */
dateTime.getTickSettings = function (timeScale, fromMsTime, toMsTime) {
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
};
