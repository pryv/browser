var _ = require('underscore');

var tsTransform = module.exports = {};

tsTransform.transform = function (timeSeriesModel) {
  if (! timeSeriesModel.get('transform')) {
    return applyDefault(timeSeriesModel.get('events'));
  }

  var mapper = getMapFunction(timeSeriesModel.get('interval'));
  var dater = getDateFunction(timeSeriesModel.get('interval'));

  var cut = map(timeSeriesModel.get('events'), mapper, dater);

  var r = null;
  switch (timeSeriesModel.get('transform')) {
  case 'sum':
    r = (!timeSeriesModel.get('interval')) ? applyStackedSum(cut) : applySum(cut);
    break;
  case 'average':
    r = applyAverage(cut);
    break;
  default:
    r = applyDefault(timeSeriesModel.get('events'));
    break;
  }
  return r;
};

function getMapFunction(interval) {
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

function getDateFunction(interval) {
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

function map(data, mapper, dater) {
  var m = _.map(data, function (e) {
    var d = new Date(e.time * 1000);
    return [mapper(d), +dater(d), +e.content];
  });
  return _.groupBy(m, function (e) {
    return e[0];
  });
}

function applyDefault(data) {
  return _.map(data, function (e) {
    return [e.time * 1000, +e.content];
  });
}

/*
 in -> {1234: [123, 1234, 345], 145: [1234] ,...}
 out -> [[1234, sum], [145, sum]]
 */
function applySum(data) {
  var r = [];
  var summer = function (a) {
    return _.reduce(a, function (c, e) {
      return c + e[2];
    }, 0);
  };
  for (var a in data) {
    if (data.hasOwnProperty(a)) {
      r.push([+data[a][0][1], summer(data[a])]);
    }
  }
  return r;
}

/*
 in -> {1234: [123, 1234, 345], 145: [1234] ,...}
 out -> [[1234, sum], [145, sum]]
 */
function applyStackedSum(data) {
  var r = [];
  var previous = 0;

  var summer = function (a) {
    return _.reduce(a, function (c, e) {
      var s = c + e[2] + previous;
      previous = s;
      return s;
    }, 0);
  };

  var keys = [];

  for (var key in data) {
    if (data.hasOwnProperty(key)) {
      keys.push(key);
    }
  }
  keys.sort();

  for (var i = 0; i < keys.length; ++i) {
    r.push([+data[keys[i]][0][1], summer(data[keys[i]])]);
  }
  return r;
}

/*
 in -> {1234: [123, 1234, 345], 145: [1234] ,...}
 out -> [[1234, avg], [145, avg]]
 */
function applyAverage(data) {
  var r = [];
  var averager = function (a) {
    var s = _.reduce(a, function (c, e) {
      return c + e[2];
    }, 0);
    return s / a.length;
  };
  for (var a in data) {
    if (data.hasOwnProperty(a)) {
      r.push([+data[a][0][1], averager(data[a])]);
    }
  }
  return r;
}
