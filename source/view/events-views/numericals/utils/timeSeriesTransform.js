var _ = require('underscore');

var tsTransform = module.exports = {};

/**
 * @param {TimeSeriesModel} timeSeriesModel
 * @param {String} autoInterval The dynamically-determined interval to use if interval is "auto"
 * @returns {Object} Object with array props `xCol` and `yCol`
 *                   (the first item of each one is the column header)
 */
tsTransform.transform = function (timeSeriesModel, autoInterval) {
  var interval = timeSeriesModel.get('interval');
  if (interval === 'auto') {
    interval = autoInterval;
  }

  var aggGroupKeyFn = getAggregationGroupKeyFn(interval),
      aggGroupTimeFn = getAggregationGroupTimeFn(interval);

  var aggGroups = getAggregationGroups(timeSeriesModel.get('events'),
                                       aggGroupKeyFn, aggGroupTimeFn);

  switch (timeSeriesModel.get('transform')) {
  case 'sum':
    return applySum(aggGroups);
  case 'average':
    return applyAverage(aggGroups);
  default:
    return applyRaw(timeSeriesModel.get('events'));
  }
};

function getAggregationGroupKeyFn(interval) {
  switch (interval) {
  case 'hourly' :
    return function (d) {
      return d.getFullYear().toString() +  '-' + d.getMonth().toString() +  '-' +
          d.getDate().toString() +  '-' + d.getHours().toString();
    };
  case 'daily' :
    return function (d) {
      return d.getFullYear().toString() +  '-' + d.getMonth().toString() +  '-' +
          d.getDate().toString();
    };
  case 'weekly' :
    return function (d) {
      var msSinceFirstWeekday = d.getDay() * 24 * 3600 * 1000 + d.getHours() * 3600 * 1000;
      var asWeek = new Date(d.getTime() - msSinceFirstWeekday);
      return asWeek.getFullYear().toString() +  '-' + getISO8601Week(asWeek).toString();
    };
  case 'monthly' :
    return function (d) {
      return d.getFullYear().toString() +  '-' + d.getMonth().toString();
    };
  case 'yearly' :
    return function (d) {
      return d.getFullYear().toString();
    };
  default :
    return function (d) {
      return d.getDate().toString();
    };
  }
}

/**
 * @returns {number} the week number of this date.
 */
function getISO8601Week(date) {
  var target = new Date(date.valueOf());
  var dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  var jan4 = new Date(target.getFullYear(), 0, 4);
  var dayDiff = (target - jan4) / 86400000;
  var weekNr = 1 + Math.ceil(dayDiff / 7);
  return weekNr;
}

function getAggregationGroupTimeFn(interval) {
  switch (interval) {
  case 'hourly' :
    return function (d) {
      return (new Date(d.getFullYear(), d.getMonth(), d.getDate(),
          d.getHours(), 0, 0, 0)).getTime();
    };
  case 'daily' :
    return function (d) {
      return (new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)).getTime();
    };
  case 'weekly' :
    return function (d) {
      var msSinceFirstWeekday = d.getDay() * 24 * 3600 * 1000 + d.getHours() * 3600 * 1000;
      var asWeek = new Date(d.getTime() - msSinceFirstWeekday);
      return (new Date(asWeek.getFullYear(), asWeek.getMonth(),
          asWeek.getDate(), 0, 0, 0, 0)).getTime();
    };
  case 'monthly' :
    return function (d) {
      return (new Date(d.getFullYear(), d.getMonth(), 0, 0, 0, 0, 0)).getTime();
    };
  case 'yearly' :
    return function (d) {
      return (new Date(d.getFullYear(), 0, 0, 0, 0, 0, 0)).getTime();
    };
  default :
    return function (d) {
      return d.getTime();
    };
  }
}

function applyRaw(events) {
  return _.map(events, function (e) {
    return {
      id: e.id,
      x: e.time * 1000,
      y: getValue(e)
    };
  });
}

function getAggregationGroups(events, aggGroupKeyFn, aggGroupTimeFn) {
  var mappedEvents = _.map(events, function (e) {
    var d = new Date(e.time * 1000);
    return {
      key: aggGroupKeyFn(d),
      time: +aggGroupTimeFn(d),
      value: getValue(e)
    };
  });
  return _.groupBy(mappedEvents, function (e) {
    return e.key;
  });
}

/*
 in -> {1234: [123, 1234, 345], 145: [1234] ,...}
 out -> [[1234, sum], [145, sum]]
 */
function applySum(aggregationGroups) {
  return _.map(aggregationGroups, function (groupEvents) {
    return {
      id: groupEvents[0].key,
      x: groupEvents[0].time,
      y: computeSum(groupEvents)
    };
  });

  function computeSum(a) {
    return _.reduce(a, function (c, e) {
      return c + e.value;
    }, 0);
  }
}

/*
 in -> {1234: [123, 1234, 345], 145: [1234] ,...}
 out -> [[1234, sum], [145, sum]]
 */
// TODO: cleanup (unused)
//function applyStackedSum(aggregationGroups, result) {
//  var total = 0;
//
//  var groupKeys = [];
//  _.each(aggregationGroups, function (groupEvents, key) {
//    groupKeys.push(key);
//  });
//  groupKeys.sort();
//
//  return _.map(groupKeys, function (key) {
//    return [ aggregationGroups[key][0].time, computeStackedSum(aggregationGroups[key]) ];
//  });
//
//  function computeStackedSum(events) {
//    total += _.reduce(events, function (current, e) {
//      return current + e.value;
//    }, 0);
//    return total;
//  }
//}

/*
 in -> {1234: [123, 1234, 345], 145: [1234] ,...}
 out -> [[1234, avg], [145, avg]]
 */
function applyAverage(aggregationGroups) {
  return _.map(aggregationGroups, function (groupEvents) {
    return {
      id: groupEvents[0].key,
      x: groupEvents[0].time,
      y: computeAverage(groupEvents)
    };
  });

  function computeAverage(a) {
    var sum = _.reduce(a, function (c, e) {
      return c + e.value;
    }, 0);
    return sum / a.length;
  }
}

function getValue(event) {
  return +event.content;
}
