
var _ = require('underscore');

var ChartTransform = module.exports = {};

/*
TODO: special case transform:sum and interval:none continous sum per point
 */

ChartTransform.transform = function (model) {
  var i;

  if (!model.get('transform') || !model.get('interval')) {
    return this.default(model.get('events'));
  }

  switch (model.get('interval')) {
  case 'hourly' :
    i = 3600;
    break;
  case 'daily' :
    i = 24 * 3600;
    break;
  case 'weekly' :
    i = 7 * 24 * 3600;
    break;
  case 'monthly' :
    i = 30 * 7 * 24 * 3600;
    break;
  case 'yearly' :
    i = 365 * 24 * 3600;
    break;
  default :
    return this.default(model.get('events'));
  }

  var cut = this.intervalMapper(model.get('events'), i);

  var r = null;
  switch (model.get('transform')) {
  case 'sum':
    r =  this.sum(cut);
    break;
  case 'average':
    r =  this.avg(cut);
    break;
  default:
    r =  this.default(model.get('events'));
    break;
  }
  return r;
};

ChartTransform.default = function (data) {
  return _.map(data, function (e) {
      return [e.time * 1000, +e.content];
    });
};

ChartTransform.intervalMapper = function (data, i) {
  var m = _.map(data, function (e) {
    return [Math.floor(e.time / i), e.time * 1000, +e.content];
  });

  return _.groupBy(m, function (e) {
    return e[0];
  });
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
      r.push([+a, summer(data[a])]);
    }
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
      r.push([+a, averager(data[a])]);
    }
  }
  return r;
};


