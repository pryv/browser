var _ = require('underscore');

var ChartTransform = module.exports = {};

/**
 * ISO ISO8601 week numbers
 * @returns {number} the week number of this date.
 */
Date.prototype.getISO8601Week = function () {
  var target = new Date(this.valueOf());
  var dayNr = (this.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  var jan4 = new Date(target.getFullYear(), 0, 4);
  var dayDiff = (target - jan4) / 86400000;
  var weekNr = 1 + Math.ceil(dayDiff / 7);
  return weekNr;
};

ChartTransform.transform = function (model) {
  if (!model.get('transform')) {
    return this.default(model.get('events'));
  }

  var mapper = this.getMapFunction(model.get('interval'));
  var dater = this.getDateFunction(model.get('interval'));

  var cut = this.map(model.get('events'), mapper, dater);

  var r = null;
  switch (model.get('transform')) {
  case 'sum':
    r = (!model.get('interval')) ? this.stackedSum(cut) : this.sum(cut);
    break;
  case 'average':
    r = this.avg(cut);
    break;
  default:
    r = this.default(model.get('events'));
    break;
  }
  return r;
};

ChartTransform.default = function (data) {
  return _.map(data, function (e) {
    return [e.time * 1000, +e.content];
  });
};

ChartTransform.map = function (data, mapper, dater) {
  var m = _.map(data, function (e) {
    var d = new Date(e.time * 1000);
    return [mapper(d), +dater(d), +e.content];
  });
  return _.groupBy(m, function (e) {
    return e[0];
  });
};


ChartTransform.getDurationFunction = function (interval) {
  switch (interval) {
  case 'hourly' :
    return function () { return 3600 * 1000; };
  case 'daily' :
    return function () { return 24 * 3600 * 1000; };
  case 'weekly' :
    return function () { return 7 * 24 * 3600 * 1000; };
  case 'monthly' :
    return function (d) { return (new Date(d.getFullYear(), d.getMonth(), 0)).getDate() *
      24 * 3600 * 1000; };
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

ChartTransform.getMapFunction = function (interval) {
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
      return asWeek.getFullYear().toString() +  '-' + asWeek.getISO8601Week().toString();
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
};

ChartTransform.getDateFunction = function (interval) {
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
};


/*
 in -> {1234: [123, 1234, 345], 145: [1234] ,...}
 out -> [[1234, sum], [145, sum]]
 */
ChartTransform.sum = function (data) {
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
};


/*
 in -> {1234: [123, 1234, 345], 145: [1234] ,...}
 out -> [[1234, sum], [145, sum]]
 */
ChartTransform.stackedSum = function (data) {
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
};


/*
 in -> {1234: [123, 1234, 345], 145: [1234] ,...}
 out -> [[1234, avg], [145, avg]]
 */
ChartTransform.avg = function (data) {
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
};


