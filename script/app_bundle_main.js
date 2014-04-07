require=(function(e,t,n){function i(n,s){if(!t[n]){if(!e[n]){var o=typeof require=="function"&&require;if(!s&&o)return o(n,!0);if(r)return r(n,!0);throw new Error("Cannot find module '"+n+"'")}var u=t[n]={exports:{}};e[n][0].call(u.exports,function(t){var r=e[n][1][t];return i(r?r:t)},u,u.exports)}return t[n].exports}var r=typeof require=="function"&&require;for(var s=0;s<n.length;s++)i(n[s]);return i})({"SampleApp":[function(require,module,exports){
module.exports=require('3XoGqR');
},{}],"3XoGqR":[function(require,module,exports){
(function(){/*global require, window*/
// ---------- helpers that should be  adapted to BackBone fashion ----------- //

var Model = require('./Model.js');


//----- test -------//
/*jshint -W098 */
exports.main = function (STAGING) {

  var model = new Model(STAGING);
  window.pryvBrowser = model;
};
})()
},{"./Model.js":1}],2:[function(require,module,exports){

var Controller = module.exports = function () {
  this.treeMap = null;
  this.menu = null;
};

Controller.prototype.setTreeMap = function (treemap) {
  this.treeMap = treemap;
};

Controller.prototype.onDragAndDrop =
  function (thisNode, thatNodeId, thatStreamId, thatConnectionId) {
  var thatNode = this.treeMap.getNodeById(thatNodeId, thatStreamId, thatConnectionId);
  console.log('Controller', thatNode);
  //this.showFusionDialog(thatNodeId.data, thatNode.data, function () {}.bind(this));

};

Controller.prototype.showFusionDialog =
  function () {
  console.log('Controller:', 'Show fusion dialog');
};



},{}],3:[function(require,module,exports){

//TODO write all add / remove connection logic

var ConnectionsHandler = module.exports = function (model) {
  this.model = model;
  this._connections = {};
};

/**
 * @param connection
 * @param andInitializeCallBack (optional) if function(error, connection) { } is defined,
 * the handler will try to initialize the connection
 * @returns {string} serialNumber to access this connection
 */
ConnectionsHandler.prototype.add = function (connection, andInitializeCallBack) {

  this._connections[connection.serialId] = connection;

  if (andInitializeCallBack) {
    connection.fetchStructure(function (error/*, accessInfo*/) {
      // TODO correctly deal with this error
      if (error) { console.log(error); }
      andInitializeCallBack(error, connection);
    });
  }

  return connection.serialId;
};

/**
 * get the connection form it's ID
 * @param connectionSerialId
 * @param andInitializeCallBack (optional) if function(error, connection) { } is defined,
 * the handler will try to initialize the connection
 * @returns {Pryv.Connection} the connection that matches this serial
 */
ConnectionsHandler.prototype.get = function (connectionSerialId, andInitializeCallBack) {
  var connection = this._connections[connectionSerialId];
  if (andInitializeCallBack) {
    if (! connection) {
      andInitializeCallBack('Cannot find connection with serialId: ' + connectionSerialId, null);
      return null;
    }
    connection.fetchStructure(function (error/*, accessInfo*/) {
      // TODO correctly deal with this error
      if (error) { console.log(error); }
      andInitializeCallBack(error, connection);
    });
  }
  return connection;
};



},{}],1:[function(require,module,exports){
(function(){/* global $, window, location, i18n */
var MonitorsHandler = require('./model/MonitorsHandler.js'),
  _ = require('underscore'),
  ConnectionsHandler = require('./model/ConnectionsHandler.js'),
  SIGNAL = require('./model/Messages').MonitorsHandler.SIGNAL,
  TreeMap = require('./tree/TreeMap.js'),
  Controller = require('./orchestrator/Controller.js'),
  PanelMenu = require('./view/left-panel/Controller.js'),
  Pryv = require('pryv'),
  TimeLine = require('./timeframe-selector/timeframe-selector.js'),
  PUBLIC_TOKEN = 'public',
  STAGING,
  toShowWhenLoggedIn = ['.logo-sharing', '.logo-add', '.logo-create-sharing', '#logo-toggle-panel',
    '#logo-settings'],
  toShowSubscribe = ['.logo-subscribe', '.logo-to-my-pryv', '#logo-toggle-panel'];
var Model = module.exports = function (staging) {  //setup env with grunt
  STAGING = !!staging;
  window.Pryv = Pryv;
  this.urlUsername = Pryv.utility.getUsernameFromUrl();
  this.urlSharings = Pryv.utility.getSharingsFromUrl();
  if (Pryv.utility.isSignInFromUrl()) {
    $('#login-username').val(this.urlUsername);
    openLogin();
  }
  this.publicConnection = null;
  this.loggedConnection = null;
  this.sharingsConnections = null;
  this.bookmakrsConnections = null;
  this.hideLoggedInElement();


  if (this.urlSharings.length > 0) {
    this.sharingsConnections = [];
    this.urlSharings.forEach(function (token) {
      this.sharingsConnections.push(new Pryv.Connection(
        this.urlUsername, token, {staging: STAGING}));
    }.bind(this));
  } else if (this.urlUsername) {
    this.publicConnection =  new Pryv.Connection(
      this.urlUsername, PUBLIC_TOKEN, {staging: STAGING});
  }
  // create connection handler and filter
  this.onFiltersChanged = function () {
    this.activeFilter.timeFrameLT = [arguments[0].from, arguments[0].to];
  };


  this.onDateHighlighted = _.throttle(function () {
    if (this.treemap) {
      this.treemap.onDateHighLighted(arguments[0].getTime() / 1000);
    }
  }, 100);
  this.initBrowser = function () {
    this.connections = new ConnectionsHandler(this);
    this.activeFilter = new MonitorsHandler(this);
    var batchCount = 0;
    this.activeFilter.addEventListener(SIGNAL.BATCH_BEGIN, function () {
      batchCount++;
      $('#logo-reload').addClass('loading');
    });
    this.activeFilter.addEventListener(SIGNAL.BATCH_DONE, function () {
      batchCount--;
      if (batchCount === 0) {
        $('#logo-reload').removeClass('loading');
      }
    });
    this.timeView = new TimeLine();
    this.timeView.render();
    initTimeAndFilter(this.timeView, this.activeFilter);
    this.timeView.on('filtersChanged', this.onFiltersChanged, this);
    this.timeView.on('dateHighlighted', this.onDateHighlighted, this);
    this.timeView.on('dateMasked', this.onDateMasked, this);

    this.onDateMasked = function () {
      // console.log('onDateMasked', arguments);
    };

    Pryv.eventTypes.loadExtras(function () {});

    // create the TreeMap
    this.controller = new Controller();
    this.treemap = new TreeMap(this);
    this.controller.setTreeMap(this.treemap);


  };
  // ----------------------- //

  // Singin
  //Pryv.Auth.config.registerURL = { host: 'reg.pryv.in', 'ssl': true};

  var settings = {
    appId : 'pryv-browser',
    username: this.urlUsername,
    callbacks : {
      signedIn: this.signedIn.bind(this),
      signedOut: function (connection) {
        this.hideLoggedInElement();
        this.removeConnection(connection);
        this.removeConnections(this.bookmakrsConnections);
        if (this.publicConnection) {
          this.addConnection(this.publicConnection);
        }
        $('#login-button').html('<i class="fa fa-sign-in"></i> ' + i18n.t('nav.signIn'));
        this.loggedConnection = null;
      }.bind(this),
      refused: function (reason) {
        console.log('** REFUSED! ' + reason);
      },
      error: function (code, message) {
        console.log('** ERROR! ' + code + ' ' + message);
      }
    }
  };
  if (this.publicConnection) {
    this.addConnection(this.publicConnection);
  } else if (this.sharingsConnections) {
    this.sharingsConnections.forEach(function (connection) {
      this.addConnection(connection);
    }.bind(this));
  }
  Pryv.Auth.whoAmI(settings);
  $('#logo-toggle-panel').click(function () {
    this.togglePanel(function () {
      $(window).trigger('resize');
    });
  }.bind(this));
  $('#sign-out').click(function () {
    if (this.loggedConnection) {
      Pryv.Auth.trustedLogout();
    }
  }.bind(this));
  $('#login-button').click(function (e) {
    if (this.loggedConnection) {
      $('#login-button').dropdown();
      e.stopPropagation();
      $('#login-dropdown .dropdown-menu').css('opacity', 1);
    } else {
      $('#login-dropdown .dropdown-menu').css('opacity', 0);
      openLogin();
    }
  }.bind(this));
  $('#login-caret').click(closeLogin);
  $('#login form').submit(function (e) {
    e.preventDefault();
    if (this.loggedConnection) {
      console.warn('You are already logged in, please log out');
      return;
    }
    settings.username = $('#login-username').val();
    settings.password = $('#login-password').val();
    Pryv.Auth.login(settings);
  }.bind(this));

};
Model.prototype.signedIn = function (connection) {
  console.log('Successfully signed in', connection);
  this.loggedConnection = connection;
  $('#login-button').html(connection.username + ' <i class="fa fa-chevron-down"></i>');
  if (!this.urlUsername || this.urlUsername === connection.username) {// logged into your page
    this.showLoggedInElement();
    if (this.sharingsConnections && this.sharingsConnections.length === 1 &&
      this.sharingsConnections[0] === this.publicConnection) {
      this.sharingsConnections = null;
    }
    if (!this.sharingsConnections) {
      this.addConnection(connection);
      if (this.publicConnection) {
        this.removeConnection(this.publicConnection);
      }
      connection.bookmarks.get(function (error, result) {
        if (!error) {
          this.bookmakrsConnections = result;
          this.addConnections(this.bookmakrsConnections);
        }
      }.bind(this));
    }
    this.treemap.isOnboarding();
  } else {
    if (!this.sharingsConnections && this.publicConnection) {
      this.sharingsConnections = [];
      this.sharingsConnections.push(this.publicConnection);
    }

    this.showSubscribeElement();
  }
  closeLogin();
};

Model.prototype.addConnection = function (connection) {
  if (!this.treemap) {
    this.initBrowser();
  }
  if (!connection._accessInfo) {
    connection.accessInfo();
  }
  if (!connection._privateProfile) {
    connection.privateProfile();
  }
  var userConnection = this.connections.add(connection),
    batch = this.activeFilter.startBatch('adding connections');
  this.activeFilter.addConnection(userConnection, batch);
  batch.done();
};
Model.prototype.addConnections = function (connections) {
  _.each(connections, function (conn) {
    this.addConnection(conn);
  }.bind(this));
};
Model.prototype.removeConnection = function (connection) {
  this.activeFilter.removeConnections(connection.serialId);
};

Model.prototype.removeConnections = function (connections) {
  _.each(connections, function (conn) {
    this.removeConnection(conn);
  }.bind(this));
};
/**
 * demo utility that set the timeFrame boundaries to the events displayed.
 */
Model.prototype.updateTimeFrameLimits = function () {
  (_.debounce(function () {
    this.activeFilter.stats(false, function (stats) {
      this.timeView.setLimit(stats.timeFrameLT[0] - 3600, stats.timeFrameLT[1] + 3600);
    }.bind(this));
  }.bind(this), 100))();
};



Model.prototype.showLoggedInElement = function () {
  $(toShowWhenLoggedIn.join(',')).show();
};
Model.prototype.showSubscribeElement = function () {
  var home = location.origin.replace(this.urlUsername, this.loggedConnection.username);
  $('.logo-to-my-pryv a').attr('href', home);
  $(toShowSubscribe.join(',')).show();
};

Model.prototype.hideLoggedInElement = function () {
  $(toShowWhenLoggedIn.join(',')).hide();
  $(toShowSubscribe.join(',')).hide();
};
Model.prototype.togglePanel = function (callback) {
  var opened = $('#main-container').data('panel-opened');
  if (opened) {
    this.closePanel(callback);
  } else {
    this.openPanel(callback);
  }
};
Model.prototype.openPanel = function (callback) {
  var $container = $('#main-container');
  this.renderPanel(this);
  $container.addClass('slideRight').data('panel-opened', true);
  if (_.isFunction(callback)) {
    $container.one(
      'transitionend webkitTransitionEnd oTransitionEnd otransitionend MSTransitionEnd',
      function () {
        callback();
      });
  }
};
Model.prototype.closePanel = function (callback) {
  var $container = $('#main-container');
  $container.removeClass('slideRight').data('panel-opened', false);
  if (_.isFunction(callback)) {
    $container.one(
      'transitionend webkitTransitionEnd oTransitionEnd otransitionend MSTransitionEnd',
      function () {
        callback();
      });
  }
};
Model.prototype.renderPanel = function () {
  PanelMenu.render(this);
};
function initTimeAndFilter(timeView, filter) {
  var spanTime = 86400000,
    fromTime = new Date(),
    start = new Date(fromTime.getFullYear(), fromTime.getMonth(), fromTime.getDate());

  fromTime = new Date(start.getTime() - (spanTime * 365));
  var toTime = new Date(start.getTime() + spanTime - 1);
  filter.timeFrameLT = [fromTime, toTime];
  filter.set({
    limit: 50000
  });

  timeView.onFiltersChanged({
    from:     fromTime,
    to:       toTime
  });
}



/*var toggleLogin = function () {
  var $login = $('#login');
  var opened = $login.data('opened');
  if (opened) {
    closeLogin();
  } else {
    openLogin();
  }
}; */
var closeLogin = function () {
  var $login = $('#login');
  var $tree = $('#tree');
  $login.removeClass('animated slideInRight');
  $tree.removeClass('animated slideOutLeft');
  $login.addClass('animated slideOutRight');
  $tree.addClass('animated slideInLeft');
  if (detectIE()) {
    $login.fadeOut('slow', function () {
      $tree.fadeIn('slow');
    });
  }
  $login.data('opened', false);
};
var openLogin = function () {
  var $login = $('#login');
  var $tree = $('#tree');
  $login.css('display', 'block');
  $login.removeClass('animated slideOutRight');
  $tree.removeClass('animated slideInLeft');
  $login.addClass('animated slideInRight');
  $tree.addClass('animated slideOutLeft');
  if (detectIE()) {
    $tree.fadeOut('slow', function () {
      $login.fadeIn('slow');
    });
  }
  $login.data('opened', true);
};
var detectIE = function detectIE() {
  var ua = window.navigator.userAgent;
  var msie = ua.indexOf('MSIE ');
  var trident = ua.indexOf('Trident/');

  if (msie > 0) {
    // IE 10 or older => return version number
    return parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
  }

  if (trident > 0) {
    // IE 11 (or newer) => return version number
    var rv = ua.indexOf('rv:');
    return parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10);
  }

  // other browser
  return false;
};

})()
},{"./model/ConnectionsHandler.js":3,"./model/Messages":8,"./model/MonitorsHandler.js":4,"./orchestrator/Controller.js":2,"./timeframe-selector/timeframe-selector.js":7,"./tree/TreeMap.js":5,"./view/left-panel/Controller.js":6,"pryv":10,"underscore":9}],9:[function(require,module,exports){
(function(){//     Underscore.js 1.5.2
//     http://underscorejs.org
//     (c) 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    concat           = ArrayProto.concat,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.5.2';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, length = obj.length; i < length; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      var keys = _.keys(obj);
      for (var i = 0, length = keys.length; i < length; i++) {
        if (iterator.call(context, obj[keys[i]], keys[i], obj) === breaker) return;
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results.push(iterator.call(context, value, index, list));
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    return _.filter(obj, function(value, index, list) {
      return !iterator.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs, first) {
    if (_.isEmpty(attrs)) return first ? void 0 : [];
    return _[first ? 'find' : 'filter'](obj, function(value) {
      for (var key in attrs) {
        if (attrs[key] !== value[key]) return false;
      }
      return true;
    });
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.where(obj, attrs, true);
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See [WebKit Bug 80797](https://bugs.webkit.org/show_bug.cgi?id=80797)
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity, value: -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed > result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity, value: Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array, using the modern version of the 
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // Sample **n** random values from an array.
  // If **n** is not specified, returns a single random element from the array.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (arguments.length < 2 || guard) {
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    return _.isFunction(value) ? value : function(obj){ return obj[value]; };
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, value, context) {
    var iterator = lookupIterator(value);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, value, context) {
      var result = {};
      var iterator = value == null ? _.identity : lookupIterator(value);
      each(obj, function(value, index) {
        var key = iterator.call(context, value, index, obj);
        behavior(result, key, value);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, key, value) {
    (_.has(result, key) ? result[key] : (result[key] = [])).push(value);
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, key, value) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, key) {
    _.has(result, key) ? result[key]++ : result[key] = 1;
  });

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = iterator == null ? _.identity : lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    return (n == null) || guard ? array[0] : slice.call(array, 0, n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n == null) || guard) {
      return array[array.length - 1];
    } else {
      return slice.call(array, Math.max(array.length - n, 0));
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    if (shallow && _.every(input, _.isArray)) {
      return concat.apply(output, input);
    }
    each(input, function(value) {
      if (_.isArray(value) || _.isArguments(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(_.flatten(arguments, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var length = _.max(_.pluck(arguments, "length").concat(0));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(arguments, '' + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, length = list.length; i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, length = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, length + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < length; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(length);

    while(idx < length) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    var args, bound;
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      ctor.prototype = null;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context.
  _.partial = function(func) {
    var args = slice.call(arguments, 1);
    return function() {
      return func.apply(this, args.concat(slice.call(arguments)));
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) throw new Error("bindAll must be passed function names");
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    options || (options = {});
    var later = function() {
      previous = options.leading === false ? 0 : new Date;
      timeout = null;
      result = func.apply(context, args);
    };
    return function() {
      var now = new Date;
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;
    return function() {
      context = this;
      args = arguments;
      timestamp = new Date();
      var later = function() {
        var last = (new Date()) - timestamp;
        if (last < wait) {
          timeout = setTimeout(later, wait - last);
        } else {
          timeout = null;
          if (!immediate) result = func.apply(context, args);
        }
      };
      var callNow = immediate && !timeout;
      if (!timeout) {
        timeout = setTimeout(later, wait);
      }
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func];
      push.apply(args, arguments);
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = new Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = new Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] === void 0) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Objects with different constructors are not equivalent, but `Object`s
    // from different frames are.
    var aCtor = a.constructor, bCtor = b.constructor;
    if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                             _.isFunction(bCtor) && (bCtor instanceof bCtor))) {
      return false;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(Math.max(0, n));
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return void 0;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

}).call(this);

})()
},{}],10:[function(require,module,exports){
module.exports = {
  // TODO: fix singleton (see with me [sgoumaz] if needed)
  Auth: require('./auth/Auth.js'),
  Connection: require('./Connection.js'),
  Event: require('./Event.js'),
  Stream: require('./Stream.js'),
  Filter: require('./Filter.js'),

  eventTypes: require('./eventTypes.js'),
  utility: require('./utility/utility.js'),
  MESSAGES: {
    MONITOR: require('./Monitor.js').Messages
  }
};

},{"./Connection.js":17,"./Event.js":12,"./Filter.js":13,"./Monitor.js":16,"./Stream.js":14,"./auth/Auth.js":11,"./eventTypes.js":15,"./utility/utility.js":18}],4:[function(require,module,exports){

var _ = require('underscore');
var Filter = require('pryv').Filter;
var Pryv = require('pryv');
var MSGs = require('./Messages').MonitorsHandler;


/**
 * Handle multiple monitors and map Pryv.Filter properties
 * @type {Function}
 */
var MonitorsHandler = module.exports = function (model, batchSetKeyValues) {
  Pryv.utility.SignalEmitter.extend(this, MSGs.SIGNAL, 'MonitorsHandler');
  this.model = model;
  this._monitors = {}; // serialIds / monitor
  this.rootFilter = new Filter();
  this.connectionToRemove = [];
  if (batchSetKeyValues) {
    this.set(batchSetKeyValues);
  }
};



// ----------------------------- Generic Event fire ------------------ //

MonitorsHandler.prototype._eventsEnterScope = function (reason, events, batch) {
  if (events.length === 0) { return; }
  this._fireEvent(MSGs.SIGNAL.EVENT_SCOPE_ENTER, {reason: reason, events: events}, batch);
};

MonitorsHandler.prototype._eventsLeaveScope = function (reason, events, batch) {
  if (events.length === 0) { return; }
  this._fireEvent(MSGs.SIGNAL.EVENT_SCOPE_LEAVE, {reason: reason, events: events}, batch);
};

MonitorsHandler.prototype._eventsChange = function (reason, events, batch) {
  if (events.length === 0) { return; }
  this._fireEvent(MSGs.SIGNAL.EVENT_CHANGE, {reason: reason, events: events}, batch);
};
MonitorsHandler.prototype._streamsEnterScope = function (reason, streams, batch) {
  if (streams.length === 0) { return; }
  this._fireEvent(MSGs.SIGNAL.STREAM_SCOPE_ENTER, {reason: reason, streams: streams}, batch);
};

MonitorsHandler.prototype._streamsLeaveScope = function (reason, streams, batch) {
  if (streams.length === 0) { return; }
  this._fireEvent(MSGs.SIGNAL.STREAM_SCOPE_LEAVE, {reason: reason, streams: streams}, batch);
};

MonitorsHandler.prototype._streamsChange = function (reason, streams, batch) {
  if (streams.length === 0) { return; }
  this._fireEvent(MSGs.SIGNAL.STREAM_CHANGE, {reason: reason, streams: streams}, batch);
};

// ----------------------------- Events from monitors ------------------ //

MonitorsHandler.prototype._onMonitorEventChange = function (changes, batchId, batch) {
  var myBatch = this.startBatch('eventChange', batch);
  this._eventsEnterScope(MSGs.REASON.REMOTELY, changes.created, myBatch);
  this._eventsLeaveScope(MSGs.REASON.REMOTELY, changes.trashed, myBatch);
  this._eventsChange(MSGs.REASON.REMOTELY, changes.modified, myBatch);
  myBatch.done();
};
MonitorsHandler.prototype._onMonitorStreamChange = function (changes) {
  this._streamsEnterScope(MSGs.REASON.REMOTELY, changes.created);
  this._streamsLeaveScope(MSGs.REASON.REMOTELY, changes.trashed);
  this._streamsChange(MSGs.REASON.REMOTELY, changes.modified);
};

MonitorsHandler.prototype._onMonitorFilterChange = function (changes, batchId, batch) {
  var myBatch = this.startBatch('filterChange', batch);
  this._eventsEnterScope(changes.filterInfos.signal, changes.enter, myBatch);
  this._eventsLeaveScope(changes.filterInfos.signal, changes.leave, myBatch);
  myBatch.done();
};


// ----------------------------- CONNECTIONS -------------------------- //


/**
 * get all events that match this filter
 */
MonitorsHandler.prototype.addConnection = function (connectionSerialId, batch) {
  var batchWaitForMe = batch ?
    batch.waitForMeToFinish('addConnection ' + connectionSerialId) : null;
  if (_.has(this._monitors, connectionSerialId)) {
    console.log('Warning MonitorsHandler.addConnection, already activated: ' + connectionSerialId);
    return;
  }
  var connection = this.model.connections.get(connectionSerialId);
  if (! connection) { // TODO error management
    console.log('MonitorsHandler.addConnection cannot find connection: ' + connectionSerialId);
    return;
  }

  // be sure localstorage is activated
  connection.fetchStructure(function (useLocalStorageError) {
    console.log('fetchStructure', arguments);
    if (useLocalStorageError) {
      console.error('failed activating localStorage for ' + connection.id);
      if (batchWaitForMe) { batchWaitForMe.done(); }
      return;
    }
    var connectionIndex = this.connectionToRemove.indexOf(connection.serialId);
    if (connectionIndex !== -1) {
      this.connectionToRemove[connectionIndex] = null;
      if (batchWaitForMe) { batchWaitForMe.done(); }
      return;
    }
    var filterSettings = _.omit(this.rootFilter.getData(), 'streams'); //copy everything but Streams
    var specificFilter = new Filter(filterSettings);
    specificFilter._xerialId =  'F' + connection.serialId;

    var monitor = connection.monitor(specificFilter);
    this._monitors[connectionSerialId] = monitor;

    // ----- add listeners
    function onMonitorOnLoad(events) {
      this._eventsEnterScope(MSGs.REASON.EVENT_SCOPE_ENTER_ADD_CONNECTION, events, batch);
      if (batchWaitForMe) { batchWaitForMe.done(); } // called only once at load
    }
    monitor.addEventListener('started', onMonitorOnLoad.bind(this));

    monitor.addEventListener('eventsChanged', this._onMonitorEventChange.bind(this));
    monitor.addEventListener('streamsChanged', this._onMonitorStreamChange.bind(this));
    monitor.addEventListener('filterChanged', this._onMonitorFilterChange.bind(this));

    monitor.start(function (error) {
      console.log('monitor started ' + error);
    });
  }.bind(this));
};


/**
 * remove a connection from the list
 */
MonitorsHandler.prototype.removeConnections = function (connectionSerialId, batch) {
  var myBatch = this.startBatch('removeConnections', batch);
  if (! _.isArray(connectionSerialId)) { connectionSerialId = [connectionSerialId];  }
  _.each(connectionSerialId, function (connectionId) {

    var monitor = this._monitors[connectionId];
    if (! monitor) {
      if (this.connectionToRemove.indexOf(connectionId) === -1) {
        this.connectionToRemove.push(connectionId);
      }
      myBatch.done();
      return;
    }

   // this.focusOnStreams([]);
    var self = this;
    var maxCloseTry = 100;
    var closeMonitor = function () {
      if (monitor.getEvents().length > 0) {
        self._eventsLeaveScope(MSGs.REASON.EVENT_SCOPE_LEAVE_REMOVE_CONNECTION,
          monitor.getEvents(), myBatch);
        delete self._monitors[connectionId];
        monitor.destroy();
        myBatch.done();
      } else if (maxCloseTry > 0) {
        maxCloseTry--;
        _.delay(closeMonitor, 100);
      }
    };
    closeMonitor();

  }.bind(this));


};

/**
 * focus on those connections....
 * Technically we set all monitors Filters to []
 */
MonitorsHandler.prototype.focusOnConnections = function (connections) {

  // un-focus
  if (connections === null) {   // same than focusOnConnections
    return this.focusOnStreams(null, batch);
  }

  if (! _.isArray(connections)) { connections = [connections];  }
  // create an array of connectionsIds
  var connectionsIds = [];
  _.each(connections, function (connection) { connectionsIds.push(connection.id); });


  var batch = this.startBatch('focusOnConnections');
  this._eachMonitor(function (monitor) {
    if (connectionsIds.indexOf(monitor.connection.id) < 0) {
      monitor.filter.set({'streamsIds': []}, batch); // shush the connection
    }
  });
  batch.done();
};






/**
 * get all events actually matching this filter
 */
MonitorsHandler.prototype.triggerForAllCurrentEvents = function (trigger) {
  this._eachMonitor(function (monitor) {
    trigger(MSGs.SIGNAL.EVENT_SCOPE_ENTER,
      {reason: MSGs.REASON.EVENT_SCOPE_ENTER_ADD_CONNECTION,
        events: monitor.getEvents()});
  });
};

// --------- Utils -----

/** execute for each filter **/
MonitorsHandler.prototype._eachMonitor = function (callback) {
  _.each(this._monitors, callback.bind(this));
};

// --------- Filter manipulations -----------------//

// # Streams

/**
 * get the actual streams in the filter;
 * @returns {Array}
 */
MonitorsHandler.prototype.getStreams = function () {
  var result = [];
  this._eachMonitor(function (monitor) {
    _.each(monitor.filter.streamsIds, function (streamId) {
      result.push(monitor.connection.datastore.getStreamById(streamId));
    });
  });
  return result;
};




/**
 * focus on those streams;
 */
MonitorsHandler.prototype.focusOnStreams = function (streams) {

  // un-focus
  if (streams === null) {
    var batchU = this.startBatch('un-focusOnStream');
    this._eachMonitor(function (monitor) {  // clear all
      monitor.filter.set({'streamsIds' : null}, batchU);
    });
    batchU.done();
    return 1;
  }


  if (! _.isArray(streams)) { streams = [streams];  }
  // --- order the streams by connection
  // (note that streams not in current connection pool will be ignored without warning)
  var streamsByConnection = {};
  _.each(streams, function (stream) {
    if (! _.has(streamsByConnection, stream.connection.serialId)) {
      streamsByConnection[stream.connection.serialId] = [];
    }
    streamsByConnection[stream.connection.serialId].push(stream.id);
  });




  var batch = this.startBatch('focusOnStream');
  this._eachMonitor(function (monitor, key) {  // clear all
    if (_.has(streamsByConnection, key)) {
      monitor.filter.set({'streamsIds': streamsByConnection[key]}, batch);
    } else {
      monitor.filter.set({'streamsIds': []}, batch); // shush the connection
    }
  });
  batch.done();
};

// # Bind filter properties to rootFilter
Object.defineProperty(MonitorsHandler.prototype, 'timeFrameLT', {
  set: function (newValue) {
    var to = newValue[0] ? newValue[0].getTime() / 1000 : null;
    var from = newValue[1] ? newValue[1].getTime() / 1000 : null;
    this.timeFrameST = [to, from];
  }
});

_.each(['timeFrameST', 'limit'],  function (prop) {
  Object.defineProperty(MonitorsHandler.prototype, prop, {
    get: function () {
      return this.rootFilter[prop];
    },
    set: function (newValue) {
      this.rootFilter[prop] = newValue;
      this._eachMonitor(function (monitor) {
        monitor.filter[prop] = newValue;
      });
    }
  });
});

// -- use this to bind function of filters
_.each(['set'],  function (func) {
  MonitorsHandler.prototype[func] = function () {
    var myargs = arguments;
    this._eachMonitor(function (monitor) {
      monitor.filter[func].apply(monitor.filter, myargs);
    });
    return this.rootFilter[func].apply(this.rootFilter, myargs);
  };
});




// ............ CLEANUP OR REUSE ................................  //


// ----------------------------- EVENTS --------------------------- //

/**
 * return informations on events
 */
MonitorsHandler.prototype.stats = function (force, callback) {
  var result = {
    timeFrameLT : [null, null]
  };
  var monitorNbr = _.size(this._monitors);
  this._eachMonitor(function (monitor) {
    monitor.stats(force, function (timeLimits) {
      var tf = timeLimits.timeFrameLT;
      if (! result.timeFrameLT[0] || tf[0] < result.timeFrameLT[0]) {
        result.timeFrameLT[0] = tf[0];
      }
      if (! result.timeFrameLT[1] || tf[1] > result.timeFrameLT[1]) {
        result.timeFrameLT[1] = tf[1];
      }
      monitorNbr--;
      if (monitorNbr === 0 && _.isFunction(callback)) {
        callback(result);
      }
    });
  });
};
},{"./Messages":8,"pryv":10,"underscore":9}],5:[function(require,module,exports){
(function(){
/* global $, window, location */
var RootNode = require('./RootNode.js'),
  SIGNAL = require('../model/Messages').MonitorsHandler.SIGNAL,
  _ = require('underscore'),
  DetailView = require('../view/events-views/detailed/Controller.js'),
  SharingView = require('../view/sharings/Controller.js'),
  CreateEventView = require('../view/create/Controller.js'),
  CreateSharingView = require('../view/sharings/create/Controller.js'),
  SubscribeView = require('../view/subscribe/Controller.js'),
  SettingsView = require('../view/settings/Controller.js'),
  FusionDialog = require('../view/events-views/draganddrop/Controller.js'),
  OnboardingView = require('../view/onboarding/View.js'),
  VirtualNode = require('./VirtualNode.js'),
  Pryv = require('pryv');
var MARGIN_TOP = 40;
var MARGIN_RIGHT = 40;
var MARGIN_BOTTOM = 60;
var MARGIN_LEFT = 40;
var IGNORE_TRASHED_EVENT  = true;
var IGNORE_PARAM_CHANGED = false;
var TreeMap = module.exports = function (model) {
  this.model = model;
  this.dialog = null;
  this.detailedView = null;
  this.sharingView = null;
  this.subscribeView = null;
  this.settingsView = null;
  this.createSharingView = null;
  this.createEventView = null;
  this.focusedStreams = null;
  this.trashedEvents = {};
  this.events = {};
  var $tree = $('#tree');
  this.root = new RootNode(this, $tree.width() - MARGIN_LEFT - MARGIN_RIGHT,
    $tree.height() - MARGIN_BOTTOM - MARGIN_TOP);
  this.root.x =  MARGIN_LEFT;
  this.root.y =  MARGIN_TOP;


  $('#logo-reload').click(function (e) {
    e.preventDefault();
    if (this.model.sharingsConnections &&
      this.model.urlUsername === this.model.loggedConnection.username) {
      this.model.removeConnections(this.model.sharingsConnections);
      this.model.sharingsConnections = null;
      this.model.loggedConnection.bookmarks.get(function (error, result) {
        if (!error) {
          this.model.bookmarksConnections = result;
          this.model.addConnections(this.model.bookmarksConnections);
        }
      }.bind(this));
      this.model.addConnection(this.model.loggedConnection);
    } else {
      this.focusOnStreams(null);
    }
  }.bind(this));
  $('.logo-add').click(function (e) {
    e.preventDefault();
    var $modal =  $('#pryv-modal').on('hidden.bs.modal', function () {
      this.closeCreateEventView();
    }.bind(this));
    this.showCreateEventView($modal, this.model.connections,
      this.getFocusedStreams(), e.currentTarget);
  }.bind(this));
  $('.logo-sharing').click(function (e) {
    e.preventDefault();
    var $modal =  $('#pryv-modal').on('hidden.bs.modal', function () {
      this.closeSharingView();
    }.bind(this));
    this.showSharingView($modal, this.model.loggedConnection, e.currentTarget);
  }.bind(this));
  $('.logo-settings').click(function (e) {
    e.preventDefault();
    var $modal =  $('#pryv-modal').on('hidden.bs.modal', function () {
      this.closeSettingsView();
    }.bind(this));
    this.showSettingsView($modal, this.model.loggedConnection, e.currentTarget);
  }.bind(this));
  $('.logo-subscribe').click(function (e) {
    e.preventDefault();
    var $modal =  $('#pryv-modal').on('hidden.bs.modal', function () {
      this.closeSubscribeView();
    }.bind(this));
    this.showSubscribeView($modal, this.model.loggedConnection, this.model.sharingsConnections,
      e.currentTarget);
  }.bind(this));
  $('.logo-create-sharing').click(function (e) {
    e.preventDefault();
    var $modal =  $('#pryv-modal').on('hidden.bs.modal', function () {
      this.closeCreateSharingView();
    }.bind(this));
    var streams = [], streamsId = [],
      loggedUsername = this.model.loggedConnection.username;
    this.model.activeFilter.getStreams().forEach(function (stream) {
      if (stream.connection.username === loggedUsername) {
        if (streamsId.indexOf((stream.parentId)) === -1) {
          streams.push({id: stream.id, name: stream.name, children: stream.children});
        }
        streamsId.push(stream.id);
      }
    });
    if (streams.length === 0) {
      this.model.loggedConnection.datastore.getStreams().forEach(function (stream) {
        if (streamsId.indexOf((stream.parentId)) === -1) {
          streams.push({id: stream.id, name: stream.name, children: stream.children});
        }
        streamsId.push(stream.id);
      });
    }
    if (streams.length !== 0) {
      this.showCreateSharingView($modal, this.model.loggedConnection, streams,
        this.model.activeFilter.timeFrameST, e.currentTarget);
    }
  }.bind(this));
  this._onIgnoreParamChanged = function () {
    IGNORE_PARAM_CHANGED = false;
    if (IGNORE_TRASHED_EVENT) {
      var e = [];
      _.each(this.events, function (event) {
        if (event.trashed) {
          e.push(event);
          this.trashedEvents[event.id] = event;
        }
      }.bind(this));
      this.eventLeaveScope({events: e});
    } else {
      this.eventEnterScope({events: this.trashedEvents});
      this.trashedEvents = {};
    }
  };
  //window.PryvBrowser = _.extend({}, window.PryvBrowser);
  var refreshTree = window.PryvBrowser.refresh = _.throttle(function () {
    var start = new Date().getTime();
    if (IGNORE_PARAM_CHANGED) {
      this._onIgnoreParamChanged();
    }
    this.root._generateChildrenTreemap(0,
      0,
      this.root.width,
      this.root.height,
      true);
    this.root._refreshViewModel(true);
    this.root.renderView(true);
    this.model.updateTimeFrameLimits();
    var end = new Date().getTime();
    var time = end - start;
    console.log('refreshTree execution:', time);
  }.bind(this), 10);

  $(window).resize(_.debounce(function () {
    var $tree = $('#tree');
    this.root.width = $tree.width() - MARGIN_LEFT - MARGIN_RIGHT -
      ($tree.position().left || 0) - ($tree.position().right || 0);
    this.root.height = $tree.height() - MARGIN_BOTTOM - MARGIN_TOP;
    this.root.x =  MARGIN_LEFT;
    this.root.y =  MARGIN_TOP;
    this.root._createView();
    this.root._generateChildrenTreemap(0,
      0,
      this.root.width,
      this.root.height,
      true);
    this.root._refreshViewModel(true);
    this.root.renderView(true);
  }.bind(this), 100));


  //----------- init the model with all events --------//
  this.eventEnterScope = function (content) {
    console.log('eventEnter', content);
    var start = new Date().getTime();
    _.each(content.events, function (event) {
      if (!event.streamId) {
        return;
      }
      if (!IGNORE_TRASHED_EVENT || !event.trashed) {
        this.events[event.id] = event;
        this.root.eventEnterScope(event, content.reason, function () {});
      } else {
        this.trashedEvents[event.id] = event;
      }
    }, this);
    this.root._createView();
    var end = new Date().getTime();
    var time = end - start;
    console.log('eventEnter execution:', time);
    refreshTree();
  }.bind(this);

  this.streamEnterScope = function (content) {
    var start = new Date().getTime();
    _.each(content.streams, function (stream) {
      this.root.streamEnterScope(stream, content.reason, function () {});
    }, this);
    this.root._createView();
    var end = new Date().getTime();
    var time = end - start;
    console.log('eventEnter execution:', time);
    refreshTree();
  }.bind(this);

  this.eventLeaveScope = function (content) {
    console.log('eventLeave', content);
    var start = new Date().getTime();
    _.each(content.events, function (event) {
      this.root.eventLeaveScope(event, content.reason, function () {});
    }, this);
    var end = new Date().getTime();
    var time = end - start;
    console.log('eventLeave execution:', time);
    refreshTree();
  }.bind(this);

  this.eventChange = function (content) {
    var start = new Date().getTime();
    _.each(content.events, function (event) {
      if (!IGNORE_TRASHED_EVENT || !event.trashed) {
        this.root.eventChange(event, content.reason, function () {});
      } else {
        this.trashedEvents[event.id] = event;
        this.root.eventLeaveScope(event, content.reason, function () {});
      }
    }, this);
    var end = new Date().getTime();
    var time = end - start;
    console.log('eventChange execution:', time);
    refreshTree();
  }.bind(this);

  this.model.activeFilter.triggerForAllCurrentEvents(this.eventEnterScope);
  //--------- register the TreeMap event Listener ----------//
  this.model.activeFilter.addEventListener(SIGNAL.EVENT_SCOPE_ENTER,
    this.eventEnterScope);
  this.model.activeFilter.addEventListener(SIGNAL.EVENT_SCOPE_LEAVE,
    this.eventLeaveScope);
  this.model.activeFilter.addEventListener(SIGNAL.EVENT_CHANGE,
    this.eventChange);
  this.model.activeFilter.addEventListener(SIGNAL.STREAM_SCOPE_ENTER,
    this.streamEnterScope);
};
TreeMap.prototype.isOnboarding = function () {
  this.model.loggedConnection.streams.get({state: 'all'}, function (error, result) {
    if (!error && result.length === 0 &&
      this.model.urlUsername === this.model.loggedConnection.username) {
      this.showOnboarding();
    }
  }.bind(this));
};
TreeMap.prototype.focusOnConnections = function (connection) {
  this.model.activeFilter.focusOnConnections(connection);
  this.setFocusedStreams(null);
};

TreeMap.prototype.focusOnStreams = function (stream) {
  this.model.activeFilter.focusOnStreams(stream);
  this.setFocusedStreams(stream);
};
TreeMap.prototype.setFocusedStreams = function (stream) {
  this.focusedStreams = stream;
};
TreeMap.prototype.getFocusedStreams = function () {
  return this.model.activeFilter.getStreams();
};
TreeMap.prototype.onDateHighLighted = function (time) {
  if (this.root) {
    this.root.onDateHighLighted(time);
  }
};

TreeMap.prototype.destroy = function () {
  this.model.activeFilter.removeEventListener(SIGNAL.EVENT_SCOPE_ENTER,
    this.eventEnterScope);
  this.model.activeFilter.removeEventListener(SIGNAL.EVENT_SCOPE_LEAVE,
    this.eventLeaveScope);
  this.model.activeFilter.removeEventListener(SIGNAL.EVENT_CHANGE,
    this.eventChange);
};


/** The treemap's utility functions **/

/**
 * Search for the node matching the arguments and returns it.
 * @param nodeId the unique id in the DOM of the node
 * @param streamId  the unique id of the stream associated with the node
 * @param connectionId the unique id of the connection associated with the node
 * @returns {find|*} returns the uniquely identifiable by the passed arguments
 */
TreeMap.prototype.getNodeById = function (nodeId, streamId, connectionId) {
  var node = this.root;
  node = node.connectionNodes[connectionId];
  if (node === 'undefined') {
    throw new Error('RootNode: can\'t find path to requested event by connection' +
      connectionId);
  }
  node = node.streamNodes[streamId];
  if (node === 'undefined') {
    throw new Error('RootNode: can\'t find path to requested event by stream' +
      connectionId + streamId);
  }
  var that = _.find(node.getChildren(), function (node) { return node.uniqueId === nodeId; });

  if (node === 'undefined') {
    throw new Error('RootNode: can\'t find path to requested event by nodeId' +
      connectionId + ' ' + streamId + ' ' + nodeId);
  }
  return that;
};


/**
 * Sets up all the controlling to aggregate two nodes.
 * @param node1 the first node
 * @param node2 the second node
 */
TreeMap.prototype.requestAggregationOfNodes = function (node1, node2) {
  var events = { };
  var attrname = null;
  for (attrname in node1.events) {
    if (node1.events.hasOwnProperty(attrname)) {
      events[attrname] = node1.events[attrname];
    }
  }
  for (attrname in node2.events) {
    if (node2.events.hasOwnProperty(attrname)) {
      events[attrname] = node2.events[attrname];
    }
  }
  this.dialog = new FusionDialog($('#pryv-modal').on('hidden.bs.modal', function () {
    if (this.dialog) {
      this.dialog.close();
      this.dialog = null;
    }
  }.bind(this)), events, this);
  this.dialog.show();
};

TreeMap.prototype.getFiltersFromNode = function (node) {
  var streams = [];
  var u = {}, s;
  for (var attribute in node.events) {
    if (node.events.hasOwnProperty(attribute)) {
      s = {stream: node.events[attribute].stream, type: node.events[attribute].type};
      if (!u.hasOwnProperty(s.streamId)) {
        u[s.streamId] = {};
        if (!u[s.streamId].hasOwnProperty(s.type)) {
          u[s.streamId][s.type] = 1;
          streams.push(s);
        }
      }
    }
  }
  return s;
};

//======== MODALS VIEW ========\\
TreeMap.prototype.closeViews = function () {
  this.closeSharingView();
  this.closeCreateSharingView();
  this.closeDetailedView();
  this.closeCreateEventView();
  this.closeSettingsView();
  this.closeSubscribeView();
};
//======== Detailed View ========\\
TreeMap.prototype.initDetailedView = function ($modal, events, highlightedTime, target) {
  if (!this.hasDetailedView()) {
    this.detailedView = new DetailView($modal, this.model.connections, target);
    this.addEventsDetailedView(events);
    this.showDetailedView();
    this.highlightDateDetailedView(highlightedTime);
  }
};

TreeMap.prototype.hasDetailedView = function () {
  return typeof this.detailedView !== 'undefined' && this.detailedView !== null;
};
TreeMap.prototype.showDetailedView = function () {
  this.closeViews();
  if (this.hasDetailedView()) {
    this.detailedView.show();
  }
};
TreeMap.prototype.closeDetailedView = function () {
  if (this.hasDetailedView()) {
    this.detailedView.close();
    this.detailedView = null;
  }
};
TreeMap.prototype.addEventsDetailedView = function (events) {
  if (this.hasDetailedView()) {
    this.detailedView.addEvents(events);
  }
};
TreeMap.prototype.deleteEventDetailedView = function (event) {
  if (this.hasDetailedView()) {
    this.detailedView.deleteEvent(event);
  }
};
TreeMap.prototype.updateEventDetailedView = function (event) {
  if (this.hasDetailedView()) {
    this.detailedView.updateEvent(event);
  }
};
TreeMap.prototype.highlightDateDetailedView = function (time) {
  if (this.hasDetailedView()) {
    this.detailedView.highlightDate(time);
  }
};
/*=================================*/
//======= CREATE EVENT VIEW ======\\
TreeMap.prototype.hasCreateEventView = function () {
  return typeof this.createEventView !== 'undefined' && this.createEventView !== null;
};
TreeMap.prototype.showCreateEventView = function ($modal, connection, focusedStream, target) {
  this.closeViews();
  if ($modal && connection && !this.hasCreateEventView()) {
    this.createEventView = new CreateEventView($modal, connection, focusedStream, target);
    this.createEventView.show();
  }
};
TreeMap.prototype.closeCreateEventView = function () {
  if (this.hasCreateEventView()) {
    this.createEventView.close();
    this.createEventView = null;
  }
};
/*=================================*/
//========== SHARING VIEW =========\\
TreeMap.prototype.hasSharingView = function () {
  return typeof this.sharingView !== 'undefined' && this.sharingView !== null;
};
TreeMap.prototype.showSharingView = function ($modal, connection, target) {
  this.closeViews();
  if ($modal && connection) {
    this.sharingView = new SharingView($modal, connection, target);
    this.sharingView.show();
  }
};
TreeMap.prototype.closeSharingView = function () {
  if (this.hasSharingView()) {
    this.sharingView.close();
    this.sharingView = null;
  }
};
/*=================================*/
//========== SETTINGS VIEW =========\\
TreeMap.prototype.hasSettingsView = function () {
  return typeof this.settingsView !== 'undefined' && this.settingsView !== null;
};
TreeMap.prototype.showSettingsView = function ($modal, connection, target) {
  this.closeViews();
  if ($modal && connection) {
    this.settingsView = new SettingsView($modal, connection, target);
    this.settingsView.show();
  }
};
TreeMap.prototype.closeSettingsView = function () {
  if (this.hasSettingsView()) {
    this.settingsView.close();
    this.settingsView = null;
  }
};
/*=================================*/
//========== CREATE SHARING VIEW =========\\
TreeMap.prototype.hasCreateSharingView = function () {
  return typeof this.createSharingView !== 'undefined' && this.createSharingView !== null;
};
TreeMap.prototype.showCreateSharingView = function ($modal, connection, timeFilter, streams,
                                                    target) {
  this.closeViews();
  if ($modal && timeFilter && streams) {
    this.createSharingView = new CreateSharingView($modal, connection, timeFilter, streams, target);
    this.createSharingView.show();
  }
};
TreeMap.prototype.closeCreateSharingView = function () {
  if (this.hasCreateSharingView()) {
    this.createSharingView.close();
    this.createSharingView = null;
  }
};
/*=================================*/
//========== SUBSCRIBE VIEW =========\\
TreeMap.prototype.hasSubscribeView = function () {
  return typeof this.subscribeView !== 'undefined' && this.subscribeView !== null;
};
TreeMap.prototype.showSubscribeView = function ($modal, loggedConnection, sharingsConnections,
                                                target) {
  this.closeViews();
  if ($modal && loggedConnection) {
    this.subscribeView = new SubscribeView($modal, loggedConnection, sharingsConnections, target);
    this.subscribeView.show();
  }
};
TreeMap.prototype.closeSubscribeView = function () {
  if (this.hasSubscribeView()) {
    this.subscribeView.close();
    this.subscribeView = null;
  }
};
/*=================================*/
//========== ONBOARDING VIEW =========\\
TreeMap.prototype.showOnboarding = function () {
  this.model.hideLoggedInElement();
  var view = new OnboardingView();
  view.connection = this.model.loggedConnection;
  view.render();
  view.on('done', function () {
    $('#logo-add').click();
    $('#tree').empty();
    this.createEventView.view.on('close', function () {
      if (location) {
        location.reload();
      }
    });
  }.bind(this));
};

/*=================================*/
/* jshint -W098 */

/**
 * Creates a virtual node from a certain number of events.
 * @param eventsNodes is an array of events nodes you want to aggregate permanently.
 */
TreeMap.prototype.createVirtualNode = function (filters, name) {
  var streams = [];
  var f = [];
  for (var i = 0, n = filters.length; i < n; ++i) {
    streams.push(filters[i].stream);
    f.push({streamId: filters[i].stream.id, type: filters[i].type});
  }
  var parent = this.getFirstCommonParent(_.uniq(streams));
  console.log('parent', parent);

  var vn = new VirtualNode(parent, name);
  vn.addFilters(f);
  if (parent instanceof Pryv.Connection) {
    console.log('Setting new Virtual node in connection', parent, 'with filters', f);
  } else if (parent instanceof Pryv.Stream) {
    console.log('Setting new Virtual node in stream', parent, 'with filters', f);
  }
};

TreeMap.prototype.getFirstCommonParent = function (eventsNodes) {

  /* TODO:
   * create the node, don't remove the already existing
   * make sure the update follows at both places
   */

  // Depth first search for goal, starting from parent
  var hasChild = function (parent, goal) {
    var found = false;
    if (parent.id === goal.id) {
      found = true;
    } else if (parent.children.length !== 0) {
      _.each(parent.children, function (c) {
        found = found || hasChild(c, goal);
      });
    }
    return found;
  };


  // returns common parent of start and goal
  var matchChild = function (start, goal) {
    var found = false;
    var depth = start;
    while (found === false) {
      found = hasChild(depth, goal);
      if (!found) {
        if (depth.parent) {
          depth = depth.parent;
        } else {
          return depth.connection;
        }
      }
    }
    return depth;
  };


  // start contains the common parent of all arguments in the end.
  var start = eventsNodes[0];
  console.log(start);
  for (var i = 1, n = eventsNodes.length; i < n; ++i) {
    start = matchChild(start, eventsNodes[i]);
  }
  return start;
};


/**
 * Remove a existing virtual node.
 * @param node the virtual node you want to remove
 */
TreeMap.prototype.removeVirtualNode = function (node) {
  /* TODO:
   * just remove the indicated node
   */
};

try {
  Object.defineProperty(window.PryvBrowser, 'hideTrashedEvents', {
    set: function (value) {
      value = !!value;
      if (_.isBoolean(value)) {
        this.customConfig = true;
        IGNORE_TRASHED_EVENT = value;
        IGNORE_PARAM_CHANGED = true;
        if (_.isFunction(this.refresh)) {
          this.refresh();
        }
      }
    },
    get: function () {
      return IGNORE_TRASHED_EVENT;
    }
  });
} catch (err) {
  console.warn('cannot define window.PryvBrowser');
}

})()
},{"../model/Messages":8,"../view/create/Controller.js":21,"../view/events-views/detailed/Controller.js":20,"../view/events-views/draganddrop/Controller.js":26,"../view/onboarding/View.js":27,"../view/settings/Controller.js":24,"../view/sharings/Controller.js":25,"../view/sharings/create/Controller.js":22,"../view/subscribe/Controller.js":23,"./RootNode.js":19,"./VirtualNode.js":28,"pryv":10,"underscore":9}],7:[function(require,module,exports){
(function(){
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

})()
},{"./modal.js":29,"backbone":30,"underscore":9}],8:[function(require,module,exports){

var Messages = module.exports = { };

var SignalEmitter = require('pryv').utility.SignalEmitter;
Messages.MonitorsHandler = {
  UNREGISTER_LISTENER : SignalEmitter.Messages.UNREGISTER_LISTENER,
  SIGNAL : {
    /** called when a batch of changes is expected, content: <batchId> unique**/
    BATCH_BEGIN : SignalEmitter.Messages.BATCH_BEGIN,
    /** called when a batch of changes is done, content: <batchId> unique**/
    BATCH_DONE : SignalEmitter.Messages.BATCH_DONE,

    /** called when some streams are hidden, content: Array of Stream**/
    STREAM_HIDE : 'hideStream',
    STREAM_SHOW : 'hideShow',
    /** called when events Enter Scope, content: {reason: one of .., content: array of Event }**/
    EVENT_SCOPE_ENTER : 'eventEnterScope',
    STREAM_SCOPE_ENTER : 'streamEnterScope',
    EVENT_SCOPE_LEAVE : 'eventLeaveScope',
    STREAM_SCOPE_LEAVE : 'streamLeaveScope',
    EVENT_CHANGE : 'eventChange',
    STREAM_CHANGE : 'streamChange'
  },
  REASON : {
    EVENT_SCOPE_ENTER_ADD_CONNECTION : 'connectionAdded',
    EVENT_SCOPE_LEAVE_REMOVE_CONNECTION : 'connectionRemoved',
    REMOTELY : 'remotely',
    // may happend when several refresh requests overlaps
    FORCE : 'forced',

    FILTER_STREAMS_CHANGED : 'streamsChanged'
  }
};
},{"pryv":10}],6:[function(require,module,exports){
(function(){/* global $ */
var Marionette = require('backbone.marionette'),
  FilterByStreamView = require('./FilterByStream.js'),
  _ = require('underscore');

var Layout = Marionette.Layout.extend({
  template: '#left-panel-template',

  regions: {
    filterByStream: '#filter-by-stream'
  },
  initialize: function () {
    this.$el =  $('.menu-panel');
  }
});
var Controller = module.exports  = {};

var view = null,
  filterByStreamView = null,
  connectionsNumber = {
    logged: 0,
    sharings: 0,
    bookmarks: 0,
    public: 0
  };
Controller.render = function (MainModel) {
  if (!view || !filterByStreamView) {
    if (!view) {
      view = new Layout();
      view.render();
    }
    if (!filterByStreamView) {
      filterByStreamView = new FilterByStreamView({MainModel: MainModel});
      view.filterByStream.show(filterByStreamView);
    }
  } else if (view && filterByStreamView && isConnectionsNumberChange(MainModel)) {
    view.render();
    view.filterByStream.show(filterByStreamView);
  } else if (view && filterByStreamView) {
    if (!filterByStreamView.onFocusStreamChanged()) {
      view.filterByStream.show(filterByStreamView);
    }
  }



};

var isConnectionsNumberChange = function (MainModel) {
  // hack: need to have an onStream change and onConnection change;
  var logged = 0;
  if (MainModel.loggedConnection.datastore) {
    logged = _.size(MainModel.loggedConnection.datastore.getStreams());
  }
  var pub = 0;
  if (MainModel.publicConnection.datastore) {
    pub = _.size(MainModel.publicConnection.datastore.getStreams());
  }
  var sharings = 0;
  _.each(MainModel.sharingsConnections, function (connection) {
    if (connection.datastore) {
      sharings += _.size(connection.datastore.getStreams());
    }
  });
  var bookmarks = 0;
  _.each(MainModel.bookmakrsConnections, function (connection) {
    if (connection.datastore) {
      bookmarks += _.size(connection.datastore.getStreams());
    }
  });
  var res = !(connectionsNumber.logged === logged &&
    connectionsNumber.public === pub &&
    connectionsNumber.sharings === sharings &&
    connectionsNumber.bookmarks === bookmarks
    );
  connectionsNumber.logged = logged;
  connectionsNumber.public = pub;
  connectionsNumber.sharings = sharings;
  connectionsNumber.bookmarks = bookmarks;
  return res;
};

})()
},{"./FilterByStream.js":31,"backbone.marionette":32,"underscore":9}],11:[function(require,module,exports){
var utility = require('../utility/utility.js');

module.exports =  utility.isBrowser() ?
    require('./Auth-browser.js') : require('./Auth-node.js');

},{"../utility/utility.js":18,"./Auth-browser.js":33,"./Auth-node.js":34}],15:[function(require,module,exports){

var utility = require('./utility/utility');
var eventTypes = module.exports = { };

// staging cloudfront https://d1kp76srklnnah.cloudfront.net/dist/data-types/event-extras.json
// staging direct https://sw.pryv.li/dist/data-types/event-extras.json

var HOSTNAME = 'd1kp76srklnnah.cloudfront.net';
var PATH = '/dist/data-types/';


/**
 * @private
 * @param fileName
 * @param callback
 */
function _getFile(fileName, callback) {
  utility.request({
    method : 'GET',
    host : HOSTNAME,
    path : PATH + fileName,
    port : 443,
    ssl : true,
    withoutCredentials: true,
    success : function (result) { callback(null, result); },
    error : function (error) { callback(error, null); }
  });
}

/**
 * @link http://api.pryv.com/event-typez.html#about-json-file
 * @param {eventTypes~contentCallback} callback
 */
eventTypes.loadHierarchical = function (callback) {
  var myCallback = function (error, result) {
    this._hierarchical = result;
    callback(error, result);
  };
  _getFile('hierarchical.json', myCallback.bind(this));
};

eventTypes.hierarchical = function () {
  if (!this._hierarchical) {
    throw new Error('Call eventTypes.loadHierarchical, before accessing hierarchical');
  }
  return this._hierarchical;
};



/**
 * @link http://api.pryv.com/event-typez.html#about-json-file
 * @param {eventTypes~contentCallback} callback
 */

eventTypes.loadFlat = function (callback) {
  var myCallback = function (error, result) {
    this._flat = result;
    callback(error, result);
  };
  _getFile('flat.json', myCallback.bind(this));
};


eventTypes.flat = function (eventType) {
  if (!this._flat) {
    throw new Error('Call eventTypes.loadFlat, before accessing flat');
  }
  return this._flat.types[eventType];
};

/**
 * @link http://api.pryv.com/event-typez.html#about-json-file
 * @param {eventTypes~contentCallback} callback
 */
eventTypes.loadExtras = function (callback) {
  var myCallback = function (error, result) {
    this._extras = result;
    callback(error, result);
  };
  _getFile('extras.json', myCallback.bind(this));
};

eventTypes.extras = function (eventType) {
  if (!this._extras) {
    throw new Error('Call eventTypes.loadExtras, before accessing extras');
  }
  var type = eventType.split('/');
  if (this._extras.extras[type[0]] && this._extras.extras[type[0]].formats[type[1]]) {
    return this._extras.extras[type[0]].formats[type[1]];
  }
  return null;
};


/**
 * Called with the result of the request
 * @callback eventTypes~contentCallback
 * @param {Object} error - eventual error
 * @param {Object} result - jSonEncoded result
 */

},{"./utility/utility":18}],35:[function(require,module,exports){
var apiPathPrivateProfile = '/profile/private';
var apiPathPublicProfile = '/profile/app';


/**
 * @class Profile
 @link http://api.pryv.com/reference.html#methods-app-profile
 * @param {Connection} connection
 * @constructor
 */
function Profile(connection) {
  this.connection = connection;
  this.timeLimits = null;
}



/**
 * @param {String | null} key
 * @param {Connection~requestCallback} callback - handles the response
 */
Profile.prototype._get = function (path, key, callback) {

  function myCallBack(error, result) {
    console.warn(result);
    result = result.profile || null;
    if (key !== null && result) {
      result = result[key];
    }
    callback(error, result);
  }
  this.connection.request('GET', path, myCallBack);
};
Profile.prototype.getPrivate = function (key, callback) {
  this._get(apiPathPrivateProfile, key, callback);
};
Profile.prototype.getPublic = function (key, callback) {
  this._get(apiPathPublicProfile, key, callback);
};


/**
 * @example
 * // set x=25 and delete y
 * conn.profile.set({x : 25, y : null}, function(error) { console.log('done'); });
 *
 * @param {Object} keyValuePairs
 * @param {Connection~requestCallback} callback - handles the response
 */
Profile.prototype._set = function (path, keyValuePairs, callback) {
  this.connection.request('PUT', path, callback, keyValuePairs);
};
Profile.prototype.setPrivate = function (key, callback) {
  this._set(apiPathPrivateProfile, key, callback);
};
Profile.prototype.setPublic = function (key, callback) {
  this._set(apiPathPublicProfile, key, callback);
};

Profile.prototype.getTimeLimits = function (force, callback) {
  if (!force && this.timeLimits) {
    if (callback && typeof(callback) === 'function') {
      callback(this.timeLimits);
    }
  } else {
    var i = 2;
    this.timeLimits = {
      timeFrameST : [],
      timeFrameLT : []
    };
    this.connection.events.get({
      toTime: 9900000000,
      fromTime: 0,
      limit: 1,
      sortAscending: false,
      state: 'all'
    }, function (error, events) {
      if (!error && events) {
        this.timeLimits.timeFrameST[1] = events[0].time;
        this.timeLimits.timeFrameLT[1] = events[0].timeLT;
      }
      i--;
      if (i === 0) {
        if (callback && typeof(callback) === 'function') {
          callback(this.timeLimits);
        }
      }
    }.bind(this));
    this.connection.events.get({
      toTime: 9900000000,
      fromTime: 0,
      limit: 1,
      sortAscending: true,
      state: 'all'
    }, function (error, events) {
      if (!error && events) {
        this.timeLimits.timeFrameST[0] = events[0].time;
        this.timeLimits.timeFrameLT[0] = events[0].timeLT;
      }
      i--;
      if (i === 0) {
        if (callback && typeof(callback) === 'function') {
          callback(this.timeLimits);
        }
      }
    }.bind(this));
  }
};
module.exports = Profile;
},{}],36:[function(require,module,exports){
var apiPathAccount = '/account';

function Account(connection) {
  this.connection = connection;
}

Account.prototype.changePassword = function (oldPassword, newPassword, callback) {
  this.connection.request('POST', apiPathAccount + '/change-password', function (err) {
    if (typeof(callback) === 'function') {
      callback(err);
    }
  }, {'oldPassword': oldPassword, 'newPassword': newPassword});
};

module.exports = Account;
},{}],37:[function(require,module,exports){
exports.Errors = {
  API_UNREACHEABLE : 'API_UNREACHEABLE',
  INVALID_RESULT_CODE : 'INVALID_RESULT_CODE'
};

exports.Api = {
  Headers : {
    ServerTime : 'server-time',
    ApiVersion : 'api-version'
  }
};
},{}],34:[function(require,module,exports){

module.exports = {};
},{}],19:[function(require,module,exports){
var TreeNode = require('./TreeNode'),
    ConnectionNode = require('./ConnectionNode'),
    _ = require('underscore');

var CONNECTION_MARGIN = 30;
/**
 * Holder for Connection Nodes.
 * @type {*}
 */
module.exports = TreeNode.implement(
  function (treemap, w, h) {
    TreeNode.call(this, treemap, null);
    if (w === null || h === null) {
      throw new Error('You must set width and height of the root node');
    }
    this.connectionNodes = {}; // Connections indexed by their token .. other index solution welcome
    this.width = w;
    this.height = h;
    this.margin = CONNECTION_MARGIN;
    this.offset = 0;
  },

  {
    className: 'RootNode',
    eventLeaveCount: 0,

    getChildren: function () {
      return _.values(this.connectionNodes);
    },

    eventEnterScope: function (event, reason, callback) {
      var connectionNode = this.connectionNodes[event.connection.id];
      if (typeof connectionNode !== 'undefined') {
        return connectionNode.eventEnterScope(event, reason, callback);
      }
      // we create a new connection Node
      connectionNode = new ConnectionNode(this, event.connection);
      this.connectionNodes[event.connection.id] = connectionNode;
      connectionNode.initStructure(null, function (error) {
        if (error) {
          return callback('RootNode.eventEnterScope Failed to init ConnectionNode - ' + error);
        }
        connectionNode.eventEnterScope(event, reason, callback);
      });
    },
    streamEnterScope: function (stream, reason, callback) {
      var connectionNode = this.connectionNodes[stream.connection.id];
      if (typeof connectionNode !== 'undefined') {
        return connectionNode.streamEnterScope(stream, reason, callback);
      }
      // we create a new connection Node
      connectionNode = new ConnectionNode(this, stream.connection);
      this.connectionNodes[stream.connection.id] = connectionNode;
      connectionNode.streamEnterScope(stream, reason, callback);
    },

    eventLeaveScope: function (event, reason, callback) {
      var node = this.connectionNodes[event.connection.id];
      if (node === 'undefined') {
        throw new Error('RootNode: can\'t find path to remove event' + event.id);
      }
      node.eventLeaveScope(event, reason, callback);

    },

    eventChange: function (event, reason, callback) {
      var node = this.connectionNodes[event.connection.id];
      if (node === 'undefined') {
        throw new Error('RootNode: can\'t find path to change event' + event.id);
      }
      node.eventChange(event, reason, callback);
    },

    getEventNode: function (nodeId, streamId, connectionId) {
      var node = null;
      node = this.connectionNodes[connectionId];
      if (node === 'undefined') {
        throw new Error('RootNode: can\'t find path to requested event by connection' +
          connectionId);
      }
      node = node.streamNodes[streamId];
      if (node === 'undefined') {
        throw new Error('RootNode: can\'t find path to requested event by stream' +
          connectionId + streamId);
      }
      var that = _.find(node.getChildren(), function (node) { return node.uniqueId === nodeId; });

      if (node === 'undefined') {
        throw new Error('RootNode: can\'t find path to requested event by nodeId' +
          connectionId + ' ' + streamId + ' ' + nodeId);
      }

      return that;
    }
  });


},{"./ConnectionNode":39,"./TreeNode":38,"underscore":9}],40:[function(require,module,exports){
/**
 * Common regexps
 * TODO: fix naming to "commonRegexps", "Username" and "Email" (they are constants)
 */
module.exports = {
  username :  /^([a-zA-Z0-9])(([a-zA-Z0-9\-]){3,21})([a-zA-Z0-9])$/,
  email : /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/
};

},{}],28:[function(require,module,exports){
var Pryv = require('pryv');
var _ = require('underscore');


/* Definition of a virtual node attached to a stream as its child
 *  stream: <streamId>, // the node where it's attached to
 *  name: <my name>,    // the name of that virtual node
 *  filters: [          // an array of filter/setting pairs contained in this virtual node
 *    { filter: f1,
 *      settings:             // settings of that filter, such as color,
 *        [{ color: 'green', // style, ... (especially for charts)
 *        style: 'bar',
 *         ... }, {}]
 *    },
 *    { filter: f2, settings: {...}},
 *    ...
 *   ]
 *   Note:
 *   The filters are ofa special kind. Each filter concerns exactly one type.
 *   The settings override the stream/type pair's default one. Numerical data
 *   would contain style (line, bar, ..), color, transform.
 */

var KEY = 'browser:virtualnode';
var SERIAL = 0;
var VirtualNode = module.exports = function VirtualNode(node, name) {
  this._node = node;
  this._name = name;
  this.id = 'vn_' + SERIAL;
  SERIAL++;

  this._createIfNotExist();
  this._emptyData();
};

VirtualNode.prototype._emptyData = function () {
  if (this._node instanceof Pryv.Connection) {
    this._node.privateProfile()[KEY] = [];
  } else if (this._node instanceof Pryv.Stream) {
    this._node.clientData[KEY] = [];
  }
  this._pushChanges();
};

VirtualNode.prototype._integrity = function () {
  if (!this._node) {
    throw new Error('_integrity: Node does not exists');
  }
};

VirtualNode.prototype._createIfNotExist = function () {
  var data = null;
  if (this._node instanceof Pryv.Connection) {
    data = this._node.privateProfile();
  } else if (this._node instanceof Pryv.Stream) {
    data = this._node.clientData;
  }

  if (!data[KEY]) {
    data[KEY] = [];
  }
  data = data[KEY];

  var found = false;
  for (var i = 0; i < data.length; ++i) {
    if (data[i].name === this._name) {
      found = true;
      break;
    }
  }
  if (!found) {
    data.push({name: this._name, filters: []});
  }
};

VirtualNode.prototype._getDataPointer = function () {
  var data = null;
  if (this._node instanceof Pryv.Connection) {
    data = this._node.privateProfile()[KEY];
  } else if (this._node instanceof Pryv.Stream) {
    data = this._node.clientData[KEY];
  }
  return data;
};

VirtualNode.prototype._pushChanges = function () {
  this._integrity();
  var changes = null;
  if (this._node instanceof Pryv.Connection) {
    changes = {'browser:virtualnode': this._getDataPointer()};
    console.log('Pushing these changes in privateProfile', changes);
    this._node.profile.setPrivate(changes, function (error, result) {
      console.log('privateProfile for', KEY, 'has been pushed:', error, result);
    });
  } else if  (this._node instanceof Pryv.Stream) {
    changes = {id: this._node.id, clientData: this._node.clientData};
    console.log('Pushing these changes in clientData', changes);
    this._node.connection.streams._updateWithData(changes, function (error, result) {
      console.log('clientData for', KEY, 'has been pushed:', error, result);
    });
  }
};

Object.defineProperty(VirtualNode.prototype, 'filters', {
  get: function () {
    var d = this._getDataPointer();
    for (var i = 0; i < d.length; ++i) {
      if (d[i].name === this._name) {
        return d[i].filters;
      }
    }
    return [];
  },
  set: function (filters) {
    var d = this._getDataPointer();
    for (var i = 0; i < d.length; ++i) {
      if (d[i].name === this._name) {
        d[i].filters = filters;
        this._pushChanges();
        break;
      }
    }
  }
});


Object.defineProperty(VirtualNode.prototype, 'name', {
  get: function () {
    return this._name;
  },
  set: function (name) {
    var d = this._getDataPointer();
    for (var i = 0; i < d.length; ++i) {
      if (d[i].name === this._name) {
        d[i].name = name;
        this._name = name;
        this._pushChanges();
        break;
      }
    }
  }
});

Object.defineProperty(VirtualNode.prototype, 'parent', {
  get: function () {
    return this._node;
  },
  set: function () {
    throw new Error('Virtual nodes having connection as parent not supported.');
  }
});

VirtualNode.prototype.addFilters = function (filter) {
  this._integrity();
  var d = this._getDataPointer();
  if (filter && filter.length !== 0) {
    var found = false;
    filter = (filter instanceof Array) ? filter : [filter];
    for (var i = 0, n = d.length; i < n; ++i) {
      if (d[i].name === this._name) {
        found = true;
        break;
      }
    }

    if (found) {
      if (!d[i].filters) {
        d[i].filters = [filter];
      } else {
        for (var j = 0; j < filter.length; ++j) {
          d[i].filters.push(filter[j]);
        }
      }
    } else {
      d.push({name: this._name, filters: filter});
    }
    this._pushChanges();
  }
};





/*
 * Static testing and accessing functions
 */


/**
 * Extracts and creates an interface between the node and its virtual nodes
 * @param node the node, can be a stream or a connection
 * @returns {*}
 */
VirtualNode.getNodes = function (node) {
  var vn = [];
  var data = null;
  if (node instanceof Pryv.Connection) {
    data = node.privateProfile()[KEY];
    if (!data) {
      return vn;
    }
  } else if (node instanceof Pryv.Stream) {
    if (node.clientData && node.clientData[KEY]) {
      data = node.clientData[KEY];
    } else {
      return vn;
    }
  }
  _.each(data, function (e) {
    if (e.name) {
      vn.push(new VirtualNode(node, e.name));
    }
  });
  return vn;
};


/**
 * Checks if node has virtual children.
 * @param node a connection or stream
 * @returns {*}
 */
VirtualNode.nodeHas = function (node) {
  if (node instanceof Pryv.Connection) {
    var pp = node.privateProfile();
    return (pp[KEY] ? true : false);
  } else if (node instanceof Pryv.Stream) {
    return (node.clientData) && (node.clientData[KEY]) &&
      (node.clientData[KEY].length !== 0);
  } else {
    return false;
  }
};

},{"pryv":10,"underscore":9}],29:[function(require,module,exports){

var Backbone = require('backbone');

module.exports = Backbone.View.extend({
  /* Variables */
  id: '#modal',
  $modal: null,
  /* Methods */
  render: function () {
    this.setElement(this.id);
    this.$el.html(this.template());
    this.$modal = this.$(this.modalId).modal();
    this.delegateEvents();
    return this;
  },
  close: function () {
    this.undelegateEvents();
    this.$modal.modal('hide');
  }
});


},{"backbone":30}],41:[function(require,module,exports){

/* Definition of a virtual node attached to a stream as its child
 *  stream: <streamId>, // the node where it's attached to
 *  name: <my name>,    // the name of that virtual node
 *  filters: [          // an array of filter/setting pairs contained in this virtual node
 *    { filter: f1,
 *      settings:             // settings of that filter, such as color,
 *        [{ color: 'green', // style, ... (especially for charts)
 *        style: 'bar',
 *         ... }, {}]
 *    },
 *    { filter: f2, settings: {...}},
 *    ...
 *   ]
 *   Note:
 *   The filters are ofa special kind. Each filter concerns exactly one type.
 *   The settings override the stream/type pair's default one. Numerical data
 *   would contain style (line, bar, ..), color, transform.
 */



var Settings = module.exports = function Setting(stream, type, virtualNode, offset) {
  this._stream = stream;
  this._type = type;
  this._virtualNode = virtualNode;

  this._offset = offset ? offset : 0;
  this._cnt = offset ? offset : 0;

  this._ptr = null;

  this._createIfNotExist();
  //this._emptyData();
};


Settings.prototype._createIfNotExist = function () {
  if (this._virtualNode) {
    var found = false;
    for (var i = 0; i < this._virtualNode.filters.length; ++i) {
      if (this._virtualNode.filters[i].streamId === this._stream.id &&
        this._virtualNode.filters[i].type === this._type) {
        if (this._cnt === 0) {
          found = true;
          break;
        } else {
          this._cnt--;
        }
      }
    }
    if (found) {
      if (!this._virtualNode.filters[i].settings) {
        this._virtualNode.filters[i].settings = {};
      }
      this._ptr = this._virtualNode.filters[i].settings;
    }
  } else {
    if (!this._stream.clientData) {
      this._stream.clientData = {};
    }
    if (!this._stream.clientData['pryv-browser:charts']) {
      this._stream.clientData['pryv-browser:charts'] = {};
    }
    if (!this._stream.clientData['pryv-browser:charts'][this._type]) {
      this._stream.clientData['pryv-browser:charts'][this._type] = {settings: {}};
    }
    this._ptr = this._stream.clientData['pryv-browser:charts'][this._type].settings;
  }
};


Settings.prototype._emptyData = function () {
  if (!this._virtualNode) {
    var changes = {id: this._stream.id, clientData: {'pryv-browser:charts': {}} };
    this._stream.connection.streams._updateWithData(changes, function (error, result) {
      console.log('clientData for has been pushed:', error, result);
    });
  }
};



Settings.prototype._pushChanges = function () {
  var changes = null;
  if (this._virtualNode) {
    changes = {'browser:virtualnode': this._virtualNode._getDataPointer()};
    console.log('Pushing these changes in privateProfile', changes);
    this._stream.connection.profile.setPrivate(changes, function (error, result) {
      console.log('privateProfile for', 'browser:virtualnode', 'has been pushed:', error, result);
    });
  } else {
    changes = {id: this._stream.id, clientData: this._stream.clientData};
    console.log('Pushing these changes in clientData', changes);
    this._stream.connection.streams._updateWithData(changes, function (error, result) {
      console.log('clientData for has been pushed:', error, result);
    });
  }

};


Settings.prototype.set = function (key, value) {
  this._ptr[key] = value;
  this._pushChanges();
};

Settings.prototype.get = function (key) {
  return this._ptr[key];
};

},{}],13:[function(require,module,exports){
var _ = require('underscore'),
    SignalEmitter = require('./utility/SignalEmitter.js');

/**
 * @constructor
 */
var Filter = module.exports = function Filter(settings) {
  SignalEmitter.extend(this, Messages, 'Filter');

  this._settings = _.extend({
    //TODO: set default values
    streams: null, //ids
    tags: null,
    fromTime: null,  // serverTime
    toTime: null,  // serverTime
    limit: null,
    skip: null,
    types: null,
    modifiedSince: null,
    state: null
  }, settings);
};

var Messages = Filter.Messages = {
  /**
   * generic change event called on any change
   * content: {filter, signal, content}
   **/
  ON_CHANGE : 'changed',
  /**
   * called on streams changes
   * content: streams
   */
  STREAMS_CHANGE : 'streamsChanged',

  /*
   * called on date changes
   * content: streams
   */
  DATE_CHANGE : 'timeFrameChanged'
};

// TODO
// redundant with get
function _normalizeTimeFrameST(filterData) {
  var result = [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY];
  if (filterData.fromTime || filterData.fromTime === 0) {
    result[0] = filterData.fromTime;
  }
  if (filterData.toTime || filterData.toTime === 0) {
    result[1] = filterData.toTime;
  }
  return result;
}



/**
 * check if this event is in this filter
 */
Filter.prototype.matchEvent = function (event) {
  if (event.time > this.toTimeSTNormalized) { return 0; }
  if (event.time < this.fromTimeSTNormalized) { return 0; }


  if (this._settings.streams && this._settings.streams.indexOf(event.streamId) < 0) {
    var found = false;
    event.stream.ancestors.forEach(function (ancestor) {
      if (this._settings.streams.indexOf(ancestor.id) >= 0) {
        found = true;
      }
    }.bind(this));
    if (!found) {
      return 0;
    }
  }



  // TODO complete test
  return 1;
};

/**
 * Compare this filter with data form anothe filter
 * @param {Object} filterDataTest data got with filter.getData
 * @returns keymap \{ timeFrame : -1, 0 , 1 \}
 * (1 = more than test, -1 = less data than test, 0 == no changes)
 */
Filter.prototype.compareToFilterData = function (filterDataTest) {
  var result = { timeFrame : 0, streams : 0 };


  // timeFrame
  var myTimeFrameST = [this.fromTimeSTNormalized, this.toTimeSTNormalized];
  var testTimeFrameST = _normalizeTimeFrameST(filterDataTest);
  console.log(myTimeFrameST);
  console.log(testTimeFrameST);

  if (myTimeFrameST[0] < testTimeFrameST[0]) {
    result.timeFrame = 1;
  } else if (myTimeFrameST[0] > testTimeFrameST[0]) {
    result.timeFrame = -1;
  }
  if (result.timeFrame <= 0) {
    if (myTimeFrameST[1] > testTimeFrameST[1]) {
      result.timeFrame = 1;
    } else  if (myTimeFrameST[1] < testTimeFrameST[1]) {
      result.timeFrame = -1;
    }
  }

  // streams
  //TODO look if this processing can be optimized

  var nullStream = 0;
  if (! this._settings.streams) {
    if (filterDataTest.streams) {
      result.streams = 1;
    }
    nullStream = 1;
  }
  if (! filterDataTest.streams) {
    if (this._settings.streams) {
      result.streams = -1;
    }
    nullStream = 1;
  }

  if (! nullStream) {
    var notinTest = _.difference(this._settings.streams, filterDataTest.streams);
    if (notinTest.length > 0) {
      result.streams = 1;
    } else {
      var notinLocal = _.difference(filterDataTest.streams, this._settings.streams);
      if (notinLocal.length > 0) {
        result.streams = -1;
      }
    }
  }

  return result;
};

/**
 * Create a clone of this filter and changes some properties
 * @param properties
 * @returns pryv.Filter
 */
Filter.prototype.cloneWithDelta = function (properties) {
  var newProps = _.clone(this._settings);
  _.extend(newProps, properties);
  return new Filter(newProps);
};

/**
 *
 * @param ignoreNulls (optional) boolean
 * @param withDelta (optional) apply this differences on the datar
 * @returns {*}
 */
Filter.prototype.getData = function (ignoreNulls, withDelta) {
  ignoreNulls = ignoreNulls || false;
  var result = _.clone(this._settings);
  if (withDelta)  {
    _.extend(result, withDelta);
  }
  _.each(_.keys(result), function (key) {
    if (result[key] === null) { delete result[key]; }
  });
  return result;
};

Filter.prototype._fireFilterChange = function (signal, content, batch) {
  // generic
  this._fireEvent(Messages.ON_CHANGE, {filter: this, signal: signal, content: content}, batch);
  // specific
  this._fireEvent(signal, content, batch);
};

/**
 * Change several values of the filter in batch.. this wil group all events behind a batch id
 * @param keyValueMap
 * @param batch
 */
Filter.prototype.set = function (keyValueMap, batch) {
  batch = this.startBatch('set', batch);

  _.each(keyValueMap, function (value, key) {
    this._setValue(key, value, batch);
  }.bind(this));

  batch.done();
};

/**
 * Internal that take in charge of changing values
 * @param keyValueMap
 * @param batch
 * @private
 */
Filter.prototype._setValue = function (key, newValue, batch) {
  var waitForMe = batch ? batch.waitForMeToFinish() : null;

  if (key === 'limit') {
    this._settings.limit = newValue;

    // TODO handle changes
    return;
  }


  if (key === 'timeFrameST') {
    if (! _.isArray(newValue) || newValue.length !== 2) {
      throw new Error('Filter.timeFrameST is an Array of two timestamps [fromTime, toTime]');
    }
    if (this._settings.fromTime !== newValue[0] || this._settings.toTime !== newValue[1]) {
      this._settings.fromTime = newValue[0];
      this._settings.toTime = newValue[1];
      this._fireFilterChange(Messages.DATE_CHANGE, this.timeFrameST, batch);
    }
    if (waitForMe) { waitForMe.done(); }
    return;
  }

  if (key === 'streamsIds') {

    if (newValue === null || typeof newValue === 'undefined') {
      if (this._settings.streams === null) {

        return;
      }
    } else if (! _.isArray(newValue)) {
      newValue = [newValue];
    }

    // TODO check that this stream is valid
    this._settings.streams = newValue;
    this._fireFilterChange(Messages.STREAMS_CHANGE, this.streams, batch);
    if (waitForMe) { waitForMe.done(); }
    return;
  }

  if (waitForMe) { waitForMe.done(); }
  throw new Error('Filter has no property : ' + key);
};

/**
 * get toTime, return Number.POSITIVE_INFINITY if null
 */
Object.defineProperty(Filter.prototype, 'toTimeSTNormalized', {
  get: function () {
    if (this._settings.toTime || this._settings.toTime === 0) {
      return this._settings.toTime;
    }
    return Number.POSITIVE_INFINITY;
  }
});

/**
 * get toTime, return Number.POSITIVE_INFINITY if null
 */
Object.defineProperty(Filter.prototype, 'fromTimeSTNormalized', {
  get: function () {
    if (this._settings.fromTime || this._settings.fromTime === 0) {
      return this._settings.fromTime;
    }
    return Number.NEGATIVE_INFINITY;
  }
});



/**
 * timeFrameChange ..  [fromTime, toTime]
 * setting them to "null" => ALL
 */
Object.defineProperty(Filter.prototype, 'timeFrameST', {
  get: function () {
    return [this._settings.toTime, this._settings.fromTime];
  },
  set: function (newValue) {
    this._setValue('timeFrameST', newValue);
    return this.timeFrameST;
  }
});


/**
 * StreamIds ..
 * setting them to "null" => ALL and to "[]" => NONE
 */
Object.defineProperty(Filter.prototype, 'streamsIds', {
  get: function () {
    return this._settings.streams;
  },
  set: function (newValue) {
    this._setValue('streamsIds', newValue);
    return this._settings.streams;
  }
});




//TODO: remove or rewrite (name & functionality unclear)
Filter.prototype.focusedOnSingleStream = function () {
  if (_.isArray(this._settings.streams) && this._settings.streams.length === 1) {
    return this._settings.streams[0];
  }
  return null;
};

/**
 * An pryv Filter or an object corresponding at what we can get with Filter.getData().
 * @typedef {(Filter|Object)} FilterLike
 * @property {String[]} [streams]
 * @property {String[]} [tags]
 * @property {number} [fromTime] -- serverTime
 * @property {number} [toTime] -- serverTime
 * @property {number} [modifiedSince] -- serverTime
 * @property {number} [limit] -- response to 'n' events
 * @property {number} [skip] -- skip the first 'n' events of he response
 */


},{"./utility/SignalEmitter.js":42,"underscore":43}],12:[function(require,module,exports){

var _ = require('underscore');

var RW_PROPERTIES =
  ['streamId', 'time', 'duration', 'type', 'content', 'tags', 'description',
    'clientData', 'state', 'modified'];



/**
 *
 * @type {Function}
 * @constructor
 */
var Event = module.exports = function Event(connection, data) {
  if (! connection) {
    throw new Error('Cannot create connection less events');
  }

  var result = null;
  if (connection.datastore && data.id) {
    result = connection.datastore.getEventById(data.id);
  }

  if (! result) {
    result = this;
    result.connection = connection;
    result.serialId = this.connection.serialId + '>E' + this.connection._eventSerialCounter++;
    if (result.connection.datastore) {
      result.connection.datastore.addEvent(result);
    }
  }
  _.extend(result, data);
  return result;
};

/**
 * get Json object ready to be posted on the API
 */
Event.prototype.getData = function () {
  var data = {};
  _.each(RW_PROPERTIES, function (key) { // only set non null values
    if (_.has(this, key)) { data[key] = this[key]; }
  }.bind(this));
  return data;
};
/**
 *
 * @param {Connection~requestCallback} callback
 */
Event.prototype.update = function (callback) {
  this.connection.events.update(this, callback);
};
/**
 *
 * @param {Connection~requestCallback} callback
 */
Event.prototype.addAttachment = function (file, callback) {
  this.connection.events.addAttachment(this.id, file, callback);
};
/**
 *
 * @param {Connection~requestCallback} callback
 */
Event.prototype.removeAttachment = function (fileName, callback) {
  this.connection.events.removeAttachment(this.id, fileName, callback);
};
/**
 * TODO create an attachment Class that contains such logic
 * @param {attachment} attachment
 */
Event.prototype.attachmentUrl = function (attachment) {
  var url =  this.connection.settings.ssl ? 'https://' : 'http://';
  url += this.connection.username + '.' + this.connection.settings.domain + '/events/' +
    this.id + '/' + attachment.id + '?readToken=' + attachment.readToken;
  return url;
};
/**
 *
 * @param {Connection~requestCallback} callback
 */
Event.prototype.trash = function (callback) {
  this.connection.events.trash(this, callback);
};
Event.prototype.getPicturePreview = function (width, height) {
  width = width ? '&w=' + width : '';
  height = height ? '&h=' + height : '';
  var url = this.connection.settings.ssl ? 'https://' : 'http://';
  url += this.connection.username + '.' + this.connection.settings.domain + ':3443/events/' +
    this.id + '?auth=' + this.connection.auth + width + height;
  return url;
};
Object.defineProperty(Event.prototype, 'timeLT', {
  get: function () {
    return this.connection.getLocalTime(this.time);
  },
  set: function (newValue) {
    this.time = this.connection.getServerTime(newValue);
  }
});




Object.defineProperty(Event.prototype, 'stream', {
  get: function () {
    if (! this.connection.datastore) {
      throw new Error('call connection.fetchStructure before to get automatic stream mapping.' +
        ' Or use StreamId');
    }
    return this.connection.streams.getById(this.streamId);
  },
  set: function () { throw new Error('Event.stream property is read only'); }
});

Object.defineProperty(Event.prototype, 'url', {
  get: function () {
    var url = this.connection.settings.ssl ? 'https://' : 'http://';
    url += this.connection.username + '.' + this.connection.settings.domain + '/events/' + this.id;
    return url;
  },
  set: function () { throw new Error('Event.url property is read only'); }
});


/**
 * An newly created Event (no id, not synched with API)
 * or an object with sufficient properties to be considered as an Event.
 * @typedef {(Event|Object)} NewEventLike
 * @property {String} streamId
 * @property {String} type
 * @property {number} [time]
 */

},{"underscore":43}],14:[function(require,module,exports){

var _ = require('underscore');

var Stream = module.exports = function Stream(connection, data) {
  this.connection = connection;

  this.serialId = this.connection.serialId + '>S' + this.connection._streamSerialCounter++;
  /** those are only used when no datastore **/
  this._parent = null;
  this.parentId = null;
  this._children = [];
  _.extend(this, data);
};

/**
 * Set or erase clientData properties
 * @example // set x=25 and delete y
 * stream.setClientData({x : 25, y : null}, function(error) { console.log('done'); });
 *
 * @param {Object} keyValueMap
 * @param {Connection~requestCallback} callback
 */
Stream.prototype.setClientData = function (keyValueMap, callback) {
  return this.connection.streams.setClientData(this, keyValueMap, callback);
};

Object.defineProperty(Stream.prototype, 'parent', {
  get: function () {

    if (! this.parentId) { return null; }
    if (! this.connection.datastore) { // we use this._parent and this._children
      return this._parent;
    }

    return this.connection.datastore.getStreamById(this.parentId);
  },
  set: function () { throw new Error('Stream.children property is read only'); }
});

Object.defineProperty(Stream.prototype, 'children', {
  get: function () {
    if (! this.connection.datastore) { // we use this._parent and this._children
      return this._children;
    }
    var children = [];
    _.each(this.childrenIds, function (childrenId) {
      var child = this.connection.datastore.getStreamById(childrenId);
      children.push(child);
    }.bind(this));
    return children;
  }
});

// TODO write test
Object.defineProperty(Stream.prototype, 'ancestors', {
  get: function () {
    if (! this.parentId || this.parent === null) { return []; }
    var result = this.parent.ancestors;
    result.push(this.parent);
    return result;
  },
  set: function () { throw new Error('Stream.ancestors property is read only'); }
});







},{"underscore":43}],17:[function(require,module,exports){
var _ = require('underscore'),
    utility = require('./utility/utility.js'),
    ConnectionEvents = require('./connection/ConnectionEvents.js'),
    ConnectionStreams = require('./connection/ConnectionStreams.js'),
    ConnectionProfile = require('./connection/ConnectionProfile.js'),
    ConnectionBookmarks = require('./connection/ConnectionBookmarks.js'),
    ConnectionAccesses = require('./connection/ConnectionAccesses.js'),
    ConnectionMonitors = require('./connection/ConnectionMonitors.js'),
    ConnectionAccount = require('./connection/ConnectionAccount.js'),
    CC = require('./connection/ConnectionConstants.js'),
    Datastore = require('./Datastore.js');

/**
 * @class Connection
 * Create an instance of Connection to Pryv API.
 * The connection will be opened on
 * http[s]://&lt;username>.&lt;domain>:&lt;port>/&lt;extraPath>?auth=&lt;auth>
 *
 * @example
 * // create a connection for the user 'perkikiki' with the token 'TTZycvBTiq'
 * var conn = new pryv.Connection('perkikiki', 'TTZycvBTiq');
 *
 * @constructor
 * @this {Connection}
 * @param {string} username
 * @param {string} auth - the authorization token for this username
 * @param {Object} [settings]
 * @param {boolean} [settings.staging = false] use Pryv's staging servers
 * @param {number} [settings.port = 443]
 * @param {string} [settings.domain = 'pryv.io'] change the domain. use "settings.staging = true" to
 * activate 'pryv.in' staging domain.
 * @param {boolean} [settings.ssl = true] Use ssl (https) or no
 * @param {string} [settings.extraPath = ''] append to the connections. Must start with a '/'
 */
var Connection = module.exports = function Connection() {
  var settings;
  if (!arguments[0] || typeof arguments[0] === 'string') {
    console.warn('new Connection(username, auth, settings) is deprecated.',
      'Please use new Connection(settings)', arguments);
    this.username = arguments[0];
    this.auth = arguments[1];
    settings = arguments[2];
  } else {
    settings = arguments[0];
    this.username = settings.username;
    this.auth = settings.auth;
    if (settings.url) {
      this.username = utility.getUsernameFromUrl(settings.url);
      settings.port = utility.getPortFromUrl(settings.url) || 443;
      settings.extraPath = utility.getPathFromUrl(settings.url);
      settings.ssl = utility.isUrlSsl(settings.url);
      settings.staging = utility.testIfStagingFromUrl(settings.url);
    }
  }
  this._serialId = Connection._serialCounter++;

  this.settings = _.extend({
    port: 443,
    ssl: true,
    domain: 'pryv.io',
    extraPath: '',
    staging: false
  }, settings);
  this.settings.domain = settings.domain ? settings.domain :
    settings.staging ? 'pryv.in' : 'pryv.io';


  this.serverInfos = {
    // nowLocalTime - nowServerTime
    deltaTime: null,
    apiVersion: null,
    lastSeenLT: null
  };

  this._accessInfo = null;
  this._privateProfile = null;

  this._streamSerialCounter = 0;
  this._eventSerialCounter = 0;

  /**
   * Manipulate events for this connection
   * @type {ConnectionEvents}
   */
  this.events = new ConnectionEvents(this);
  /**
   * Manipulate streams for this connection
   * @type {ConnectionStreams}
   */
  this.streams = new ConnectionStreams(this);
  /**
  * Manipulate app profile for this connection
  * @type {ConnectionProfile}
  */
  this.profile = new ConnectionProfile(this);
  /**
  * Manipulate bookmarks for this connection
  * @type {ConnectionProfile}
  */
  this.bookmarks = new ConnectionBookmarks(this, Connection);
  /**
  * Manipulate accesses for this connection
  * @type {ConnectionProfile}
  */
  this.accesses = new ConnectionAccesses(this);
  /**
   * Manipulate this connection monitors
   */
  this.monitors = new ConnectionMonitors(this);

  this.account = new ConnectionAccount(this);
  this.datastore = null;

};

Connection._serialCounter = 0;


/**
 * In order to access some properties such as event.stream and get a {Stream} object, you
 * need to fetch the structure at least once. For now, there is now way to be sure that the
 * structure is up to date. Soon we will implement an optional parameter "keepItUpToDate", that
 * will do that for you.
 *
 * TODO implements "keepItUpToDate" logic.
 * @param {Streams~getCallback} callback - array of "root" Streams
 * @returns {Connection} this
 */
Connection.prototype.fetchStructure = function (callback /*, keepItUpToDate*/) {
  if (this.datastore) { return this.datastore.init(callback); }
  this.datastore = new Datastore(this);
  this.accessInfo(function (error) {
    if (error) { return callback(error); }
    this.datastore.init(callback);
  }.bind(this));
  return this;
};

/**
 * Get access information related this connection. This is also the best way to test
 * that the combination username/token is valid.
 * @param {Connection~accessInfoCallback} callback
 * @returns {Connection} this
 */
Connection.prototype.accessInfo = function (callback) {
  if (this._accessInfo) { return this._accessInfo; }
  var url = '/access-info';
  this.request('GET', url, function (error, result) {
    if (! error) {
      this._accessInfo = result;
    }
    if (typeof(callback) === 'function') {
      return callback(error, result);
    }
  }.bind(this));
  return this;
};

/**
 * Get the private profile related this connection.
 * @param {Connection~privateProfileCallback} callback
 * @returns {Connection} this
 */
Connection.prototype.privateProfile = function (callback) {
  if (this._privateProfile) { return this._privateProfile; }
  this.profile.getPrivate(null, function (error, result) {
    if (result && result.message) {
      error = result;
    }
    if (! error) {
      this._privateProfile = result;
    }
    if (typeof(callback) === 'function') {
      return callback(error, result);
    }
  }.bind(this));
  return this;
};

/**
 * Translate this timestamp (server dimension) to local system dimension
 * This could have been named to "translate2LocalTime"
 * @param {number} serverTime timestamp  (server dimension)
 * @returns {number} timestamp (local dimension) same time space as (new Date()).getTime();
 */
Connection.prototype.getLocalTime = function (serverTime) {
  return (serverTime + this.serverInfos.deltaTime) * 1000;
};

/**
 * Translate this timestamp (local system dimension) to server dimension
 * This could have been named to "translate2ServerTime"
 * @param {number} localTime timestamp  (local dimension) same time space as (new Date()).getTime();
 * @returns {number} timestamp (server dimension)
 */
Connection.prototype.getServerTime = function (localTime) {
  if (typeof localTime === 'undefined') { localTime = new Date().getTime(); }
  return (localTime / 1000) - this.serverInfos.deltaTime;
};


// ------------- monitor this connection --------//

/**
 * Start monitoring this Connection. Any change that occurs on the connection (add, delete, change)
 * will trigger an event. Changes to the filter will also trigger events if they have an impact on
 * the monitored data.
 * @param {Filter} filter - changes to this filter will be monitored.
 * @returns {Monitor}
 */
Connection.prototype.monitor = function (filter) {
  return this.monitors.create(filter);
};

// ------------- start / stop Monitoring is called by Monitor constructor / destructor -----//



/**
 * Do a direct request to Pryv's API.
 * Even if exposed there must be an abstraction for every API call in this library.
 * @param {string} method - GET | POST | PUT | DELETE
 * @param {string} path - to resource, starting with '/' like '/events'
 * @param {Connection~requestCallback} callback
 * @param {Object} jsonData - data to POST or PUT
 */
Connection.prototype.request = function (method, path, callback, jsonData, isFile,
                                         progressCallback) {


  if (! callback || ! _.isFunction(callback)) {
    throw new Error('request\'s callback must be a function');
  }
  var headers =  { 'authorization': this.auth };
  var withoutCredentials = false;
  var payload = JSON.stringify({});
  if (jsonData && !isFile) {
    payload = JSON.stringify(jsonData);
    headers['Content-Type'] = 'application/json; charset=utf-8';
  }
  if (isFile) {
    payload = jsonData;
    headers['Content-Type'] = 'multipart/form-data';
    headers['X-Requested-With'] = 'XMLHttpRequest';
    withoutCredentials = true;
  }

  var request = utility.request({
    method : method,
    host : domainOfConnection(this),
    port : this.settings.port,
    ssl : this.settings.ssl,
    path : this.settings.extraPath + path,
    headers : headers,
    payload : payload,
    progressCallback: progressCallback,
    //TODO: decide what callback convention to use (Node or jQuery)
    success : onSuccess.bind(this),
    error : onError.bind(this),
    withoutCredentials: withoutCredentials
  });

  /**
   * @this {Connection}
   */
  function onSuccess(result, resultInfo) {
    var error = null;

    var apiVersion = resultInfo.headers['API-Version'] || 
      resultInfo.headers[CC.Api.Headers.ApiVersion];

    // test if API is reached or if we headed into something else
    if (! apiVersion) {
      error = {
        id : CC.Errors.API_UNREACHEABLE,
        message: 'Cannot find API-Version',
        details: 'Response code: ' + resultInfo.code +
          ' Headers: ' + JSON.stringify(resultInfo.headers)
      };
    } else if (result.message) {  // API < 0.6
      error = result.message;
    } else
    if (result.error) { // API 0.7
      error = result.error;
    } else {
      this.serverInfos.lastSeenLT = (new Date()).getTime();
      this.serverInfos.apiVersion = apiVersion || this.serverInfos.apiVersion;
      if (_.has(resultInfo.headers, CC.Api.Headers.ServerTime)) {
        this.serverInfos.deltaTime = (this.serverInfos.lastSeenLT / 1000) -
          resultInfo.headers[CC.Api.Headers.ServerTime];
      }
    }
    callback(error, result, resultInfo);
  }

  function onError(error, resultInfo) {
    var errorTemp = {
      id : CC.Errors.API_UNREACHEABLE,
      message: 'Error on request ',
      details: 'ERROR: ' + error
    };
    callback(errorTemp, null, resultInfo);
  }
  return request;
};



/**
 * @property {string} Connection.id an unique id that contains all needed information to access
 * this Pryv data source. http[s]://<username>.<domain>:<port>[/extraPath]/?auth=<auth token>
 */
Object.defineProperty(Connection.prototype, 'id', {
  get: function () {
    var id = this.settings.ssl ? 'https://' : 'http://';
    id += domainOfConnection(this) + ':' +
      this.settings.port + this.settings.extraPath + '/?auth=' + this.auth;
    return id;
  },
  set: function () { throw new Error('ConnectionNode.id property is read only'); }
});

/**
 * @property {string} Connection.displayId an id easily readable <username>:<access name>
 */
Object.defineProperty(Connection.prototype, 'displayId', {
  get: function () {
    if (! this._accessInfo) {
      throw new Error('connection must have been initialized to use displayId. ' +
        ' You can call accessInfo() for this');
    }
    var id = this.username + ':' + this._accessInfo.name;
    return id;
  },
  set: function () { throw new Error('Connection.displayId property is read only'); }
});

/**
 * @property {String} Connection.serialId A locally-unique id for the connection; can also be
 *                                        used as a client-side id
 */
Object.defineProperty(Connection.prototype, 'serialId', {
  get: function () { return 'C' + this._serialId; }
});
/**
 * Called with the desired Streams as result.
 * @callback Connection~accessInfoCallback
 * @param {Object} error - eventual error
 * @param {AccessInfo} result
 */

/**
 * @typedef AccessInfo
 * @see http://api.pryv.com/reference.html#data-structure-access
 */

/**
 * Called with the result of the request
 * @callback Connection~requestCallback
 * @param {Object} error - eventual error
 * @param {Object} result - jSonEncoded result
 * @param {Object} resultInfo
 * @param {Number} resultInfo.code - HTTP result code
 * @param {Object} resultInfo.headers - HTTP result headers by key
 */


// --------- private utils

function domainOfConnection(connection) {
  if (connection.settings.url) {
    return utility.getHostFromUrl(connection.settings.url);
  } else {
    var host = connection.settings.domain;
    return connection.username ? connection.username + '.' + host : host;
  }
}
},{"./Datastore.js":49,"./connection/ConnectionAccesses.js":47,"./connection/ConnectionAccount.js":36,"./connection/ConnectionBookmarks.js":46,"./connection/ConnectionConstants.js":37,"./connection/ConnectionEvents.js":44,"./connection/ConnectionMonitors.js":48,"./connection/ConnectionProfile.js":35,"./connection/ConnectionStreams.js":45,"./utility/utility.js":18,"underscore":43}],16:[function(require,module,exports){
var _ = require('underscore'),
  SignalEmitter = require('./utility/SignalEmitter.js'),
  Filter = require('./Filter.js');


var EXTRA_ALL_EVENTS = {state : 'all', modifiedSince : -100000000 };

/**
 * Monitoring
 * @type {Function}
 * @constructor
 */
function Monitor(connection, filter) {
  SignalEmitter.extend(this, Messages, 'Monitor');
  this.connection = connection;
  this.id = 'M' + Monitor.serial++;

  this.filter = filter;

  this._lastUsedFilterData = filter.getData();

  if (this.filter.state) {
    throw new Error('Monitors only work for default state, not trashed or all');
  }

  this.filter.addEventListener(Filter.Messages.ON_CHANGE, this._onFilterChange.bind(this));
  this._events = null;

}

Monitor.serial = 0;

var Messages = Monitor.Messages = {
  /** content: events **/
  ON_LOAD : 'started',
  /** content: error **/
  ON_ERROR : 'error',
  /** content: { enter: [], leave: [], change } **/
  ON_EVENT_CHANGE : 'eventsChanged',
  /** content: streams **/
  ON_STRUCTURE_CHANGE : 'streamsChanged',
  /** content: ? **/
  ON_FILTER_CHANGE : 'filterChanged'
};

// ----------- prototype  public ------------//

Monitor.prototype.start = function (done) {
  done = done || function () {};

  this.lastSynchedST = -1000000000000;
  this._initEvents();

  //TODO move this logic to ConnectionMonitors ??
  this.connection.monitors._monitors[this.id] = this;
  this.connection.monitors._startMonitoring(done);
};


Monitor.prototype.destroy = function () {
  //TODO move this logic to ConnectionMonitors ??
  delete this.connection.monitors._monitors[this.id];
  if (_.keys(this.connection.monitors._monitors).length === 0) {
    this.connection.monitors._stopMonitoring();
  }
};

Monitor.prototype.getEvents = function () {
  if (! this._events || ! this._events.active) {return []; }
  return _.toArray(this._events.active);
};

// ------------ private ----------//

// ----------- iOSocket ------//
Monitor.prototype._onIoConnect = function () {
  console.log('Monitor onConnect');
};
Monitor.prototype._onIoError = function (error) {
  console.log('Monitor _onIoError' + error);
};
Monitor.prototype._onIoEventsChanged = function () {
  this._connectionEventsGetChanges(Messages.ON_EVENT_CHANGE);
};
Monitor.prototype._onIoStreamsChanged = function () {
  console.log('SOCKETIO', '_onIoStreamsChanged');
  this._connectionStreamsGetChanges(Messages.ON_STRUCTURE_CHANGE);
};



// -----------  filter changes ----------- //


Monitor.prototype._saveLastUsedFilter = function () {
  this._lastUsedFilterData = this.filter.getData();
};


Monitor.prototype._onFilterChange = function (signal, batchId, batch) {
  var changes = this.filter.compareToFilterData(this._lastUsedFilterData);

  var processLocalyOnly = 0;
  var foundsignal = 0;
  if (signal.signal === Filter.Messages.DATE_CHANGE) {  // only load events if date is wider
    foundsignal = 1;
    console.log('** DATE CHANGE ', changes.timeFrame);
    if (changes.timeFrame === 0) {
      return;
    }
    if (changes.timeFrame < 0) {  // new timeFrame contains more data
      processLocalyOnly = 1;
    }

  }

  if (signal.signal === Filter.Messages.STREAMS_CHANGE) {
    foundsignal = 1;
    console.log('** STREAMS_CHANGE', changes.streams);
    if (changes.streams === 0) {
      return;
    }
    if (changes.streams < 0) {  // new timeFrame contains more data
      processLocalyOnly = 1;
    }
  }


  if (! foundsignal) {
    throw new Error('Signal not found :' + signal.signal);
  }

  this._saveLastUsedFilter();



  if (processLocalyOnly) {
    this._refilterLocaly(Messages.ON_FILTER_CHANGE, {filterInfos: signal}, batch);
  } else {
    this._connectionEventsGetAllAndCompare(Messages.ON_FILTER_CHANGE, {filterInfos: signal}, batch);
  }
};

// ----------- internal ----------------- //

/**
 * Process events locally
 */
Monitor.prototype._refilterLocaly = function (signal, extracontent, batch) {

  var result = { enter : [], leave : [] };
  _.extend(result, extracontent); // pass extracontent to receivers
  _.each(_.clone(this._events.active), function (event) {
    if (! this.filter.matchEvent(event)) {
      result.leave.push(event);
      delete this._events.active[event.id];
    }
  }.bind(this));
  this._fireEvent(signal, result, batch);
};


Monitor.prototype._initEvents = function () {
  this.lastSynchedST = this.connection.getServerTime();
  this._events = { active : {}};
  this.connection.events.get(this.filter.getData(true, EXTRA_ALL_EVENTS),
    function (error, events) {
      if (error) { this._fireEvent(Messages.ON_ERROR, error); }
      _.each(events, function (event) {
        this._events.active[event.id] = event;
      }.bind(this));
      this._fireEvent(Messages.ON_LOAD, events);
    }.bind(this));
};


Monitor.prototype._connectionEventsGetChanges = function (signal) {
  var options = { modifiedSince : this.lastSynchedST, state : 'all'};
  this.lastSynchedST = this.connection.getServerTime();

  var result = { created : [], trashed : [], modified: []};

  this.connection.events.get(this.filter.getData(true, options),
    function (error, events) {
      if (error) {
        this._fireEvent(Messages.ON_ERROR, error);
      }

      _.each(events, function (event) {
        if (this._events.active[event.id]) {
          if (event.trashed) { // trashed
            result.trashed.push(event);
            delete this._events.active[event.id];
          } else {
            result.modified.push(event);
          }
        } else {
          result.created.push(event);
        }
      }.bind(this));

      this._fireEvent(signal, result);
    }.bind(this));
};

Monitor.prototype._connectionStreamsGetChanges = function (signal) {
  var streams = {};
  var created = [], modified = [], trashed = [];
  var streamCompare = function (streamA, streamB) {
    var sA = _.pick(streamA, ['id', 'name', 'parentId', 'singleActivity', 'clientData', 'trashed']);
    var sB = _.pick(streamB, ['id', 'name', 'parentId', 'singleActivity', 'clientData', 'trashed']);
    return _.isEqual(sA, sB);
  };
  var getFlatTree = function (stream) {
    streams[stream.id] = stream;
    _.each(stream.children, function (child) {
      getFlatTree(child);
    });
  };
  var checkChangedStatus = function (stream) {

    if (!streams[stream.id]) {
      created.push(stream);
    } else if (!streamCompare(streams[stream.id], stream)) {
      if (streams[stream.id].trashed !== stream.trashed) {
        if (!stream.trashed) {
          created.push(stream);
        } else {
          trashed.push(stream);
        }
      } else {
        modified.push(stream);
      }
    }
    _.each(stream.children, function (child) {
      checkChangedStatus(child);
    });
  };
  _.each(this.connection.datastore.getStreams(), function (rootStream) {
    getFlatTree(rootStream);
  });
  this.connection.fetchStructure(function (error, result) {
    _.each(result, function (rootStream) {
      checkChangedStatus(rootStream);
    });
    this._fireEvent(signal, { created : created, trashed : trashed, modified: modified});
  }.bind(this));
};
Monitor.prototype._connectionEventsGetAllAndCompare = function (signal, extracontent, batch) {
  this.lastSynchedST = this.connection.getServerTime();



  var result = { enter : [] };
  _.extend(result, extracontent); // pass extracontent to receivers

  var toremove = _.clone(this._events.active);

  this.connection.events.get(this.filter.getData(true, EXTRA_ALL_EVENTS),
    function (error, events) {
      if (error) { this._fireEvent(Messages.ON_ERROR, error); }
      _.each(events, function (event) {
        if (this._events.active[event.id]) {  // already known event we don't care
          delete toremove[event.id];
        } else {
          this._events.active[event.id] = event;
          result.enter.push(event);
        }
      }.bind(this));
      _.each(_.keys(toremove), function (streamid) {
        delete this._events.active[streamid]; // cleanup not found streams
      }.bind(this));
      result.leave = _.values(toremove); // unmatched events are to be removed
      this._fireEvent(signal, result, batch);
    }.bind(this));

};


/**
 * return informations on events
 */
Monitor.prototype.stats = function (force, callback) {
  this.connection.profile.getTimeLimits(force, callback);
};

module.exports = Monitor;



},{"./Filter.js":13,"./utility/SignalEmitter.js":42,"underscore":43}],23:[function(require,module,exports){
(function(){/* global $ */
var _ = require('underscore'),
  Collection = require('./Collection.js'),
  Model = require('./Model.js'),
  ListView = require('./ListView.js');
var Controller = module.exports = function ($modal, loggedConnection, sharingsConnections, target) {
  this.loggedConnection = loggedConnection;
  this.collection =  new Collection();
  this.listView = null;
  this.$modal = $modal;
  this.target = target;
  this.container = '.modal-content';
  console.log(sharingsConnections);
  this.addSharings(sharingsConnections);
};

_.extend(Controller.prototype, {
  show: function () {
    this.$modal.modal({currentTarget: this.target});
    $(this.container).empty().hide();
    setTimeout(function () {
      $(this.container).fadeIn();
    }.bind(this), 500);
    if (!this.listView) {
      this.listView = new ListView({
        collection: this.collection
      });
      this.listView.on('subscription:add', this._createSubscription.bind(this));
      this.listView.on('close', this.close.bind(this));
    }
    this.listView.render();
  },
  close: function () {
    this.listView.close();
    if (this.collection) {
      this.collection.reset();
      this.collection = null;
    }
    $('#pryv-modal').hide().removeClass('in').attr('aria-hidden', 'true');
    $('.modal-backdrop').remove();
  },
  addSharings: function (sharings) {
    if (!Array.isArray(sharings)) {
      sharings = [sharings];
    }
    sharings.forEach(function (sharing) {
      console.log(sharing);
      sharing.url = sharing.id.replace(/\?auth.*$/, '')
        .replace(/\.in/, '.li')
        .replace(/\.io/, '.me');
      sharing.url += '#/sharings/' + sharing.auth;
      var m = new Model({
        connection: sharing
      });
      this.collection.add(m);
    }.bind(this));
  },
  _createSubscription: function (subscriptions) {
    var subNumber = subscriptions.length;
    var gotError = false;
    subscriptions.forEach(function (model) {
      var connection = model.get('connection');
      if (!connection.name || connection.name.length === 0) {
        connection.name = connection._accessInfo.name;
      }
      if (connection.name && connection.auth && connection.url) {
        this.loggedConnection.bookmarks.create(
          {url: connection.url, accessToken: connection.auth, name: connection.name},
          function (error) {
            console.log('create done');
            if (error) {
              gotError = true;
            }
            model.set('error', error);
            model.set('created', !error);
            subNumber--;
            if (subNumber === 0) {
              this.listView.onCreateSubscriptionFinished(gotError);
            }

          }.bind(this));
      }
    }.bind(this));
  }
});
})()
},{"./Collection.js":51,"./ListView.js":52,"./Model.js":50,"underscore":9}],21:[function(require,module,exports){
(function(){/* global $ */
var _ = require('underscore'),
  View = require('./View.js'),
  Model = require('./EventModel.js'),
  _ = require('underscore');

var Controller = module.exports = function ($modal, connection, focusedStream, target) {
  this.connection = connection;
  this.focusedStream = _.size(focusedStream) !== 1 ? null : focusedStream[0];
  this.$modal = $modal;
  this.target = target;
  this.container = '.modal-content';
  this.view = null;
  this.newEvent = null;
};
_.extend(Controller.prototype, {
  show: function () {
    this.newEvent = new Model({event: this._defaultEvent()});
    this.$modal.modal({currentTarget: this.target});
    $(this.container).empty().hide();
    setTimeout(function () {
      $(this.container).fadeIn();
    }.bind(this), 500);
    $(this.container).append('<div class="modal-header">  ' +
      '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">' +
      '&times;</button> ' +
      '<h4 class="modal-title" id="myModalLabel" ' +
      'data-i18n="modal.addEvent.header.add-event"></h4>' +
      '<div class="modal-close"></div> ' +
      '</div>' +
      '<div id="modal-content"></div>');
    this.view = new View({model: this.newEvent});
    this.view.connection = this.connection;
    this.view.focusedStream = this.focusedStream;
    this.view.render();
    this.view.on('close', this.close.bind(this));
    $('body').i18n();
  },
  close: function () {
    this.newEvent = null;
    if (this.view) {
      this.view.close();
      this.view = null;
      $(this.container).empty();
      $('#pryv-modal').hide().removeClass('in').attr('aria-hidden', 'true');
      $('.modal-backdrop').remove();
      this.$modal.trigger('hidden.bs.modal');
    }

  },
  _defaultEvent: function () {
    var result = {};
    result.time = new Date().getTime() / 1000;
    result.tags = [];
    result.content = null;
    result.desctiption = '';
    return result;
  }
});
})()
},{"./EventModel.js":54,"./View.js":53,"underscore":9}],24:[function(require,module,exports){
(function(){/* global $ */
var Marionette = require('backbone.marionette'),
  NavView = require('./NavView.js'),
  PasswordView = require('./PasswordView.js'),
  _ = require('underscore');

var Layout = Marionette.Layout.extend({
  template: '#settings-modal-template',

  regions: {
    nav: '#settings-nav',
    password: '#settings-password'
  },
  initialize: function () {
    this.$el =  $('.modal-content');
  }
});
var Controller = module.exports  = function ($modal, connection, target) {
  this.connection = connection;
  this.$modal = $modal;
  this.target = target;
  this.view  = null;
  this.nav = null;
  this.password = null;
  this.currentRegion = '';


};
_.extend(Controller.prototype, {
  show: function () {
    this.$modal.modal({currentTarget: this.target});
    setTimeout(function () {
      $('.modal-content').fadeIn();
    }.bind(this), 500);
    this.view = new Layout();
    this.view.on('close', this.close.bind(this));
    this.nav = new NavView();
    this.password = new PasswordView({connection: this.connection});
    this.view.render();
    this.view.nav.show(this.nav);
    this._showRegion('password');
    this.nav.activeRegion('password');
    this.nav.on('showRegion', this._showRegion.bind(this));
  },
  close: function () {
    if (this.view) {
      this.view = null;
      $('.modal-content').empty();
      $('#pryv-modal').hide().removeClass('in').attr('aria-hidden', 'true');
      $('.modal-backdrop').remove();
      this.$modal.trigger('hidden.bs.modal');
    }
  },
  _showRegion: function (region) {
    var regionView;
    if (region && this.view && region !== this.currentRegion) {
      switch (region) {
        case 'password':
          regionView = this.password;
          break;
        default:
          break;
      }
      if (region) {
        this.currentRegion = region;
        this.password.close();
        this.view[region].show(regionView);
      }
    }
  }
});

})()
},{"./NavView.js":55,"./PasswordView.js":56,"backbone.marionette":32,"underscore":9}],25:[function(require,module,exports){
(function(){/* global $ */
var _ = require('underscore'),
  SharingCollection = require('./SharingCollection.js'),
  SharingModel = require('./SharingModel.js'),
  SharingListView = require('./SharingListView.js'),
  BookmarkCollection = require('./BookmarkCollection.js'),
  BookmarkModel = require('./BookmarkModel.js'),
  BookmarkListView = require('./BookmarkListView.js'),
  Pryv = require('pryv');
var Controller = module.exports = function ($modal, connection, target) {
  this.sharings = {};
  this.connection = connection;
  this.sharingCollection =  new SharingCollection();
  this.sharingListView = null;
  this.bookmarkCollection =  new BookmarkCollection();
  this.bookmarkListView = null;
  this.$modal = $modal;
  this.target = target;
  $('.modal-content').empty();
  $('.modal-content').prepend('<div class="modal-header">  ' +
    '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">' +
    '&times;</button> ' +
    '<h4 class="modal-title" id="myModalLabel" data-i18n="modal.manageSlices.header"></h4>' +
    '<div class="modal-close"></div> ' +
    '</div><div id="modal-content"><div id="creation-content">' +
    '<div class="sharings container"></div></div>' +
    '<div id="creation-footer" class="col-md-12">' +
    '<button id="ok" class="btn btn-pryv-turquoise" ' +
    'data-dismiss="modal" data-i18n="button.ok"></button>' +
    '</div></div>');
  $('body').i18n();
  this.container = '.sharings';

};

_.extend(Controller.prototype, {
  show: function () {
    this.$modal.modal({currentTarget: this.target});
    $('.modal-content').hide();
    setTimeout(function () {
      $('.modal-content').fadeIn();
    }.bind(this), 500);
    if (!this.sharingListView) {
      this.sharingListView = new SharingListView({
        collection: this.sharingCollection
      });
    }
    if (!this.bookmarkListView) {
      this.bookmarkListView = new BookmarkListView({
        collection: this.bookmarkCollection
      });
      this.bookmarkListView.on('bookmark:add', this._createBookmark.bind(this));
      this.bookmarkListView.on('itemview:bookmark:delete', this._onDeleteBookmarkClick.bind(this));
      this.sharingListView.on('itemview:sharing:delete', this._onDeleteSharingClick.bind(this));
      this.sharingListView.on('itemview:sharing:update', this._onUpdateSharingClick.bind(this));
    }
    this.sharingListView.render();
    this.bookmarkListView.render();
    this.connection.accesses.get(function (error, result) {
      if (error) {
        console.error('GET ACCESSES:', error);
      } else {
        this.addSharings(result, this.connection);
      }
    }.bind(this));
    this.connection.bookmarks.get(function (error, result) {
      if (error) {
        console.error('GET ACCESSES:', error);
      } else {
        this.addBookmarks(result);
      }
    }.bind(this));
  },
  close: function () {
    this.sharingListView.close();
    this.sharingCollection.reset();
    $(this.container).remove();
    $('.modal-content').empty();
    this.sharingCollection = null;
    this.sharings = {};
  },
  addSharings: function (sharings, connection) {
    if (!Array.isArray(sharings)) {
      sharings = [sharings];
    }
    sharings.forEach(function (sharing) {
      if (sharing.type === 'shared') {
        var url = connection.id.replace(/\?auth.*$/, '');
        url = url.replace(/\.in/, '.li');
        url = url.replace(/\.io/, '.me');
        url += '#/sharings/' + sharing.token;
        sharing.url = url;
        var m = new SharingModel({
          sharing: sharing
        });
        this.sharingCollection.add(m);
      }
    }.bind(this));
  },
  addBookmarks: function (bookmarks) {
    console.log('addBookmarks', bookmarks);
    if (!Array.isArray(bookmarks)) {
      bookmarks = [bookmarks];
    }
    bookmarks.forEach(function (bookmark) {
      var url = bookmark.settings.url;
      url = url.replace(/\.in/, '.li');
      url = url.replace(/\.io/, '.me');
      bookmark.settings.url = url;
      var m = new BookmarkModel({
        bookmark: bookmark
      });
      this.bookmarkCollection.add(m);
    }.bind(this));
  },
  _createBookmark: function (url, auth, name) {
    if (url && auth && name) {
      var conn = new Pryv.Connection({url: url, auth: auth});
      conn.accessInfo(function (error) {
        if (!error) {
          console.log('Bookmark exist!');
          this.connection.bookmarks.create({url: url, accessToken: auth, name: name},
          function (error, result) {
            if (!error && result) {
              this.addBookmarks(result);
            }
            if (error) {
              console.error('Bookmarks creation error:', error);
            }
            this.bookmarkListView.endAddBookmark(error);
          }.bind(this));
        } else {
          this.bookmarkListView.endAddBookmark(error);
          console.warn('Bookmark dont exist', url, auth);
        }
      }.bind(this));
    }
  },
  _onDeleteBookmarkClick: function (e, bookmarkModel) {
    this.connection.bookmarks.delete(bookmarkModel.get('bookmark').settings.bookmarkId,
    function (error) {
      if (!error) {
        this.bookmarkCollection.remove(bookmarkModel);
      } else {
        console.warn(error);
      }
    }.bind(this));
  },
  _onDeleteSharingClick: function (e, sharingModel) {
    this.connection.accesses.delete(sharingModel.get('sharing').id,
    function (error) {
      if (!error) {
        this.sharingCollection.remove(sharingModel);
      } else {
        console.warn(error);
      }
    }.bind(this));
  },
  _onUpdateSharingClick: function (e, view) {
    this.connection.accesses.update(view.model.get('sharing'), view.endUpdateSharing.bind(view));
  }
});
})()
},{"./BookmarkCollection.js":62,"./BookmarkListView.js":58,"./BookmarkModel.js":61,"./SharingCollection.js":59,"./SharingListView.js":60,"./SharingModel.js":57,"pryv":10,"underscore":9}],27:[function(require,module,exports){
(function(){/* global $ */
var  Marionette = require('backbone.marionette');
/* TODO This a the view for each node, with dynamic animation
 we can't re-render on change because animation would no be done
 If the model is a event Node we must include a new typed view
 */
module.exports = Marionette.ItemView.extend({
  template: '#onboardingView',
  container: '#tree',
  connection: null,
  onRender: function () {
    $(this.container).html(this.$el);
    $('#onboarding-form').submit(function (e) {
      e.preventDefault();
      $('#onboarding-form .fa-spin').show();
      var streamName = $('#onboarding-input-name').val().trim();
      if (streamName && streamName.length > 0 && this.connection) {
        this.connection.streams.create({name: streamName}, function (error) {
          $('#onboarding-form .fa-spin').hide();
          if (!error) {
            this.trigger('done');
          }
        }.bind(this));
      }
    }.bind(this));
    $('body').i18n();
  }
});
})()
},{"backbone.marionette":32}],31:[function(require,module,exports){
(function(){/*global $ */
var Marionette = require('backbone.marionette'),
  _ = require('underscore'),
  UNIQUE_ID = 0;

module.exports = Marionette.ItemView.extend({
  template: '#filter-by-stream-template',
  templateHelpers: function () {
    return {
      getStream: function () {
        return this._getStream();
      }.bind(this)
    };
  },
  ui: {
    checkbox: 'input[type=checkbox]',
    applyBtn: '#filter-by-stream-apply'
  },
  initialize: function (options) {
    this.MainModel  = options.MainModel;
  },
  onRender: function () {
    var self = this;
    self.ui.applyBtn.prop('disabled', true);
    self.ui.applyBtn.click(this._applyFilter.bind(this));
    this.ui.checkbox.click(function (e) {
      e.stopPropagation();
    });
    this.ui.checkbox.change(function (e) {
      var checked = $(e.currentTarget).prop('checked'),
        container = $($(e.currentTarget).parent().parent().attr('data-target'), self.$el);
      self.ui.applyBtn.prop('disabled', false);
      container.find('input[type="checkbox"]').prop({
        indeterminate: false,
        checked: checked
      });
      self._isChildrenCheck(container.parent().parent());
    });
    this.bindUIElements();
    this.onFocusStreamChanged();
    setTimeout(function () {$('body').i18n(); }, 100);
  },
  onFocusStreamChanged: function () {
    var focusedStreams = this.MainModel.activeFilter.getStreams();
    var focusedStreamsIds = [];
    try {
      this.ui.checkbox.prop({
        indeterminate: false,
        checked: false
      });
    } catch (e) {
      return false;
    }

    _.each(focusedStreams, function (stream) {
      focusedStreamsIds.push(stream.connection.serialId + '/' + stream.id);
    });
    var $parent, c, s;
    _.each(this.ui.checkbox, function (checkbox) {
      checkbox = $(checkbox);
      $parent = $(checkbox.parent().parent());
      if ($parent && $parent.attr('data-connection') && $parent.attr('data-stream')) {
        c = this.MainModel.connections.get($parent.attr('data-connection'));
        if (c) {
          s = c.datastore.getStreamById($parent.attr('data-stream'));
          if (s) {
            if (focusedStreamsIds.indexOf(c.serialId + '/' + s.id) !== -1 ||
              focusedStreamsIds.length === 0) {
              checkbox.prop({
                indeterminate: false,
                checked: true
              });
              checkbox.trigger('change');
            }
          }
        }
      }
    }.bind(this));
    return true;
  },
  _isChildrenCheck: function ($el) {
    if ($el.attr('id') === 'collapseFilterByStream') {
      return;
    }
    var allChecked = true;
    var allUncheck = true;
    var children  = $($el).find('input[type="checkbox"]');
    for (var i = 0; i < children.length; i++) {
      allChecked = allChecked && $(children[i]).prop('checked');
      allUncheck = allUncheck && !$(children[i]).prop('checked');
    }
    if (allChecked || allUncheck) {
      $('li[data-target=#' + $el.attr('id') + ']', this.$el).find('input[type="checkbox"]').prop({
        indeterminate: false,
        checked: allChecked
      });
    } else {
      $('li[data-target=#' + $el.attr('id') + ']', this.$el).find('input[type="checkbox"]').prop({
        indeterminate: true,
        checked: false
      });
    }
    this._isChildrenCheck($($($el).parent().parent()));
  },
  _applyFilter: function () {
    var streams = [], $parent, connection, stream;
    this.ui.applyBtn.prop('disabled', true);
    _.each(this.ui.checkbox, function (checkbox) {
      checkbox = $(checkbox);
      if (checkbox.prop('checked')) {
        $parent = $(checkbox.parent().parent());
        if ($parent && $parent.attr('data-connection') && $parent.attr('data-stream')) {
          connection = this.MainModel.connections.get($parent.attr('data-connection'));
          if (connection) {
            stream = connection.datastore.getStreamById($parent.attr('data-stream'));
            if (stream) {
              streams.push(stream);
            }
          }
        }
      }
    }.bind(this));
    this.MainModel.activeFilter.focusOnStreams(streams);
  },
  _getStream: function () {
    var connections = [],
      result = '';
    if (!this.MainModel.loggedConnection) {
      return result;
    }
    if (this.MainModel.loggedConnection.datastore && this.MainModel.loggedConnection._accessInfo) {
      connections.push(this.MainModel.loggedConnection);
    }
    _.each(this.MainModel.sharingsConnections, function (c) {
      if (c._accessInfo) {
        connections.push(c);
      }
    });
    _.each(this.MainModel.bookmakrsConnections, function (c) {
      if (c._accessInfo) {
        connections.push(c);
      }
    });
    _.each(connections, function (c) {
      result += '<li class="stream-tree-summary connection" data-toggle="collapse" ' +
        'data-target="#collapse' + UNIQUE_ID + '">' +
        '<div class="pryv-checkbox">' +
        '<input type="checkbox" name="filterStream" id="filterStream' + UNIQUE_ID +
        '"><label for="filterStream' + UNIQUE_ID + '">' +   c.username;
      if (c._accessInfo.name !== 'pryv-browser') {
        result += ' / ' + c._accessInfo.name;
      }
      result += '</label></div></li>';
      result += '<ul id="collapse' + UNIQUE_ID +
        '" class="panel-collapse  collapse in stream-tree-children">' +
        '<div class="panel-body">';
      UNIQUE_ID++;
      result += this._getStreamStructure(c);
      result += '</div></ul>';
    }.bind(this));

    return result;
  },
  _getStreamStructure: function (connection) {
    var rootStreams = connection.datastore.getStreams(),
      result = '';
    for (var i = 0; i < rootStreams.length; i++) {
      if (!rootStreams[i].virtual) {
        result += this._walkStreamStructure(rootStreams[i]);
      }
    }
    return result;
  },
  _walkStreamStructure: function (stream) {

    var result = '<li data-connection="' +
      stream.connection.serialId + '" data-stream="' +
      stream.id + '" class="stream-tree-summary" data-toggle="collapse" ' +
      'data-target="#collapse' + UNIQUE_ID + '">' +
      '<div class="pryv-checkbox">' +
      '<input type="checkbox" name="filterStream" id="filterStream' + UNIQUE_ID +
      '"><label for="filterStream' + UNIQUE_ID + '">' +
      stream.name + '</label></div></li>';
    result += '<ul id="collapse' + UNIQUE_ID +
      '" class="panel-collapse  collapse stream-tree-children">' +
      '<div class="panel-body">';
    UNIQUE_ID++;
    for (var j = 0; j < stream.children.length; j++) {
      if (!stream.children[j].virtual) {
        result += this._walkStreamStructure(stream.children[j]);
      }

    }
    result += '</div></ul>';
    return result;
  }

});



})()
},{"backbone.marionette":32,"underscore":9}],63:[function(require,module,exports){
(function(){/* global document, navigator */
/* jshint -W101*/

/**
 * Browser-only utils
 */
var utility = module.exports = {};


/**
 * Test if hostname is a *.rec.la or pryv.li if yes. it assumes that the client
 * runs on a staging version
 */
utility.testIfStagingFromUrl = function (url) {
  var location;
  if (url) {
    location = document.createElement('a');
    location.href = url;
  } else {
    location = document.location;
  }
  return utility.endsWith(location.hostname, 'pryv.li') ||
         utility.endsWith(location.hostname, 'pryv.in') ||
         utility.endsWith(location.hostname, 'rec.la');
};

utility.getUsernameFromUrl = function (url) {
  var location;
  if (url) {
    location = document.createElement('a');
    location.href = url;
  } else {
    location = document.location;
  }
  var hostname = location.hostname.split('.'),
    recIndex = hostname.indexOf('rec'),
    pryvIndex = hostname.indexOf('pryv');
  if (recIndex <= 0 && pryvIndex <= 0) {
    console.warn('getUsernameFromUrl:', 'unknown hostname:', hostname);
    return null;
  }
  var usernameIndex = pryvIndex > 0 ? pryvIndex - 1: recIndex - 1;
  if (hostname[usernameIndex].match(utility.regex.username)) {
    return hostname[usernameIndex];
  } else {
    console.warn('getUsernameFromUrl:', 'invalid username:', hostname[usernameIndex]);
    return null;
  }
};

utility.getSharingsFromUrl = function (url) {
  var username = utility.getUsernameFromUrl(url);
  if (!username) {
    return [];
  }
  var location;
  if (url) {
    location = document.createElement('a');
    location.href = url;
  } else {
    location = document.location;
  }
  var path = location.hash.split('/'),
    sharingsIndex = path.indexOf('sharings');
  if (sharingsIndex !== -1) {
    return path.splice(sharingsIndex + 1).filter(function (el) { return el.length > 0; });
  } else {
    return [];
  }
};
utility.isSignInFromUrl = function (url) {
  var username = utility.getUsernameFromUrl(url);
  if (!username) {
    return false;
  }
  var location;
  if (url) {
    location = document.createElement('a');
    location.href = url;
  } else {
    location = document.location;
  }
  var path = location.hash.toLowerCase().split('/'),
    signinIndex = path.indexOf('signin');
  return signinIndex !== -1;

};
utility.getParamsFromUrl = function (url) {
  var location;
  if (url) {
    location = document.createElement('a');
    location.href = url;
  } else {
    location = document.location;
  }
  var str = location.search;
  var objURL = {};
  str.replace(new RegExp('([^?=&]+)(=([^&]*))?', 'g'), function ($0, $1, $2, $3) {
    objURL[$1] = $3;
  });
  return objURL;
};
utility.getPathFromUrl = function (url) {
  var location;
  if (url) {
    location = document.createElement('a');
    location.href = url;
  } else {
    location = document.location;
  }
  return location.pathname === '/' ? '' : location.pathname;
};
utility.getHostFromUrl = function (url) {
  var location;
  if (url) {
    location = document.createElement('a');
    location.href = url;
  } else {
    location = document.location;
  }
  return location.hostname;
};
utility.getPortFromUrl = function (url) {
  var location;
  if (url) {
    location = document.createElement('a');
    location.href = url;
  } else {
    location = document.location;
  }
  return location.port === '' ? null : location.port;
};
utility.isUrlSsl = function (url) {
  var location;
  if (url) {
    location = document.createElement('a');
    location.href = url;
  } else {
    location = document.location;
  }
  return location.protocol === 'https:';
};

/**
 *  return true if browser is seen as a mobile or tablet
 *  list grabbed from https://github.com/codefuze/js-mobile-tablet-redirect/blob/master/mobile-redirect.js
 */
utility.browserIsMobileOrTablet = function () {
  return (/iphone|ipod|android|blackberry|opera mini|opera mobi|skyfire|maemo|windows phone|palm|iemobile|symbian|symbianos|fennec|ipad|android 3|sch-i800|playbook|tablet|kindle|gt-p1000|sgh-t849|shw-m180s|a510|a511|a100|dell streak|silk/i.test(navigator.userAgent.toLowerCase()));
};

/**
 * Method to get the preferred language, either from desiredLanguage or from the browser settings
 * @method getPreferredLanguage
 * @param {Array} supportedLanguages an array of supported languages encoded on 2characters
 * @param {String} desiredLanguage (optional) get this language if supported
 */
utility.getPreferredLanguage = function (supportedLanguages, desiredLanguage) {
  if (desiredLanguage) {
    if (supportedLanguages.indexOf(desiredLanguage) >= 0) { return desiredLanguage; }
  }
  var lct = null;
  if (navigator.language) {
    lct = navigator.language.toLowerCase().substring(0, 2);
  } else if (navigator.userLanguage) {
    lct = navigator.userLanguage.toLowerCase().substring(0, 2);
  } else if (navigator.userAgent.indexOf('[') !== -1) {
    var start = navigator.userAgent.indexOf('[');
    var end = navigator.userAgent.indexOf(']');
    lct = navigator.userAgent.substring(start + 1, end).toLowerCase();
  }
  if (desiredLanguage) {
    if (lct.indexOf(desiredLanguage) >= 0) { return lct; }
  }

  return supportedLanguages[0];
};


/**
 * //TODO check if it's robust
 * Method to check the browser supports CSS3.
 * @method supportCSS3
 * @return boolean
 */
utility.supportCSS3 = function ()  {
  var stub = document.createElement('div'),
    testProperty = 'textShadow';

  if (testProperty in stub.style) { return true; }

  testProperty = testProperty.replace(/^[a-z]/, function (val) {
    return val.toUpperCase();
  });

  return false;
};

/**
 * Method to load external files like javascript and stylesheet. this version
 * of method only support to file types - js|javascript and css|stylesheet.
 *
 * @method loadExternalFiles
 * @param {String} filename
 * @param {String} type 'js' or 'css'
 */
utility.loadExternalFiles = function (filename, type)  {
  var tag = null;

  type = type.toLowerCase();

  if (type === 'js' || type === 'javascript') {
    tag = document.createElement('script');
    tag.setAttribute('type', 'text/javascript');
    tag.setAttribute('src', filename);
  } else if (type === 'css' || type === 'stylesheet')  {
    tag = document.createElement('link');
    tag.setAttribute('rel', 'stylesheet');
    tag.setAttribute('type', 'text/css');
    tag.setAttribute('href', filename);
  }

  if (tag !== null || tag !== undefined) {
    document.getElementsByTagName('head')[0].appendChild(tag);
  }
};

utility.docCookies = require('./docCookies');

utility.domReady = require('./domReady');

utility.request = require('./request-browser');

})()
},{"./docCookies":64,"./domReady":66,"./request-browser":65}],67:[function(require,module,exports){
/**
 * Browser-only utils
 */
var utility = module.exports = {};

utility.request = require('./request-node');

},{"./request-node":68}],43:[function(require,module,exports){
(function(){//     Underscore.js 1.5.2
//     http://underscorejs.org
//     (c) 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    concat           = ArrayProto.concat,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.5.2';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, length = obj.length; i < length; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      var keys = _.keys(obj);
      for (var i = 0, length = keys.length; i < length; i++) {
        if (iterator.call(context, obj[keys[i]], keys[i], obj) === breaker) return;
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results.push(iterator.call(context, value, index, list));
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    return _.filter(obj, function(value, index, list) {
      return !iterator.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs, first) {
    if (_.isEmpty(attrs)) return first ? void 0 : [];
    return _[first ? 'find' : 'filter'](obj, function(value) {
      for (var key in attrs) {
        if (attrs[key] !== value[key]) return false;
      }
      return true;
    });
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.where(obj, attrs, true);
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See [WebKit Bug 80797](https://bugs.webkit.org/show_bug.cgi?id=80797)
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity, value: -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed > result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity, value: Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array, using the modern version of the 
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // Sample **n** random values from an array.
  // If **n** is not specified, returns a single random element from the array.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (arguments.length < 2 || guard) {
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    return _.isFunction(value) ? value : function(obj){ return obj[value]; };
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, value, context) {
    var iterator = lookupIterator(value);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, value, context) {
      var result = {};
      var iterator = value == null ? _.identity : lookupIterator(value);
      each(obj, function(value, index) {
        var key = iterator.call(context, value, index, obj);
        behavior(result, key, value);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, key, value) {
    (_.has(result, key) ? result[key] : (result[key] = [])).push(value);
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, key, value) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, key) {
    _.has(result, key) ? result[key]++ : result[key] = 1;
  });

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = iterator == null ? _.identity : lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    return (n == null) || guard ? array[0] : slice.call(array, 0, n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n == null) || guard) {
      return array[array.length - 1];
    } else {
      return slice.call(array, Math.max(array.length - n, 0));
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    if (shallow && _.every(input, _.isArray)) {
      return concat.apply(output, input);
    }
    each(input, function(value) {
      if (_.isArray(value) || _.isArguments(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(_.flatten(arguments, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var length = _.max(_.pluck(arguments, "length").concat(0));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(arguments, '' + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, length = list.length; i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, length = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, length + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < length; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(length);

    while(idx < length) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    var args, bound;
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      ctor.prototype = null;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context.
  _.partial = function(func) {
    var args = slice.call(arguments, 1);
    return function() {
      return func.apply(this, args.concat(slice.call(arguments)));
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) throw new Error("bindAll must be passed function names");
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    options || (options = {});
    var later = function() {
      previous = options.leading === false ? 0 : new Date;
      timeout = null;
      result = func.apply(context, args);
    };
    return function() {
      var now = new Date;
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;
    return function() {
      context = this;
      args = arguments;
      timestamp = new Date();
      var later = function() {
        var last = (new Date()) - timestamp;
        if (last < wait) {
          timeout = setTimeout(later, wait - last);
        } else {
          timeout = null;
          if (!immediate) result = func.apply(context, args);
        }
      };
      var callNow = immediate && !timeout;
      if (!timeout) {
        timeout = setTimeout(later, wait);
      }
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func];
      push.apply(args, arguments);
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = new Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = new Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] === void 0) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Objects with different constructors are not equivalent, but `Object`s
    // from different frames are.
    var aCtor = a.constructor, bCtor = b.constructor;
    if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                             _.isFunction(bCtor) && (bCtor instanceof bCtor))) {
      return false;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(Math.max(0, n));
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return void 0;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

}).call(this);

})()
},{}],64:[function(require,module,exports){
/* jshint ignore:start */

/*\
 |*|
 |*|  :: cookies.js ::
 |*|
 |*|  A complete cookies reader/writer framework with full unicode support.
 |*|
 |*|  https://developer.mozilla.org/en-US/docs/DOM/document.cookie
 |*|
 |*|  Syntaxes:
 |*|
 |*|  * docCookies.setItem(name, value[, end[, path[, domain[, secure]]]])
 |*|  * docCookies.getItem(name)
 |*|  * docCookies.removeItem(name[, path])
 |*|  * docCookies.hasItem(name)
 |*|  * docCookies.keys()
 |*|
 \*/
module.exports = {
  getItem: function (sKey) {
    if (!sKey || !this.hasItem(sKey)) { return null; }
    return unescape(document.cookie.replace(new RegExp("(?:^|.*;\\s*)" +
        escape(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*((?:[^;](?!;))*[^;]?).*"), "$1"));
  },
  setItem: function (sKey, sValue, vEnd, sPath, sDomain, bSecure) {
    if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) { return; }
    var sExpires = "";
    if (vEnd) {
      switch (vEnd.constructor) {
        case Number:
          sExpires = vEnd === Infinity ?
              "; expires=Tue, 19 Jan 2038 03:14:07 GMT" : "; max-age=" + vEnd;
          break;
        case String:
          sExpires = "; expires=" + vEnd;
          break;
        case Date:
          sExpires = "; expires=" + vEnd.toGMTString();
          break;
      }
    }
    document.cookie = escape(sKey) + "=" + escape(sValue) + sExpires + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "") + (bSecure ? "; secure" : "");
  },
  removeItem: function (sKey, sPath) {
    if (!sKey || !this.hasItem(sKey)) { return; }
    document.cookie = escape(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT" + (sPath ? "; path=" + sPath : "");
  },
  hasItem: function (sKey) {
    return (new RegExp("(?:^|;\\s*)" + escape(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie);
  },
  keys: /* optional method: you can safely remove it! */ function () {
    var aKeys = document.cookie.replace(/((?:^|\s*;)[^\=]+)(?=;|$)|^\s*|\s*(?:\=[^;]*)?(?:\1|$)/g, "").split(/\s*(?:\=[^;]*)?;\s*/);
    for (var nIdx = 0; nIdx < aKeys.length; nIdx++) { aKeys[nIdx] = unescape(aKeys[nIdx]); }
    return aKeys;
  }
};

},{}],65:[function(require,module,exports){
/**
 *
 * @param {Object} pack json with
 * @param {Object} [pack.type = 'POST'] : 'GET/DELETE/POST/PUT'
 * @param {String} pack.host : fully qualified host name
 * @param {Number} pack.port : port to use
 * @param {String} pack.path : the request PATH
 * @param {Object} [pack.headers] : key / value map of headers
 * @param {Object} [pack.params] : the payload -- only with POST/PUT
 * @param {String} [pack.parseResult = 'json'] : 'text' for no parsing
 * @param {Function} pack.success : function (result, resultInfo)
 * @param {Function} pack.error : function (error, resultInfo)
 * @param {String} [pack.info] : a text
 * @param {Boolean} [pack.async = true]
 * @param {Number} [pack.expectedStatus] : http result code
 * @param {Boolean} [pack.ssl = true]
 * @param {Boolean} [pack.withoutCredentials = false]
 */
module.exports = function (pack)  {
  pack.info = pack.info || '';
  var parseResult = pack.parseResult || 'json';

  if (!pack.hasOwnProperty('async')) {
    pack.async = true;
  }

  // ------------ request TYPE
  pack.method = pack.method || 'POST';
  // method override test
  if (false && pack.method === 'DELETE') {
    pack.method = 'POST';
    pack.params =  pack.params || {};
    pack.params._method = 'DELETE';
  }

  // ------------- request HEADERS


  pack.headers = pack.headers || {};

  if (pack.method === 'POST' || pack.method === 'PUT') {// add json headers is POST or PUT

    if (pack.headers['Content-Type'] === 'multipart/form-data') {
      delete pack.headers['Content-Type'];
    } else {
      pack.headers['Content-Type'] =
          pack.headers['Content-Type'] || 'application/json; charset=utf-8';
    }

    //if (pack.method === 'POST') {
    if (pack.params) {
      pack.params = JSON.stringify(pack.params);
    } else {
      pack.params = pack.payload || {};
    }
  }



  // -------------- error
  pack.error = pack.error || function (error) {
    throw new Error(JSON.stringify(error, function (key, value) {
      if (value === null) { return; }
      if (value === '') { return; }
      return value;
    }, 2));
  };

  var detail = pack.info + ', req: ' + pack.method + ' ' + pack.url;

  // --------------- request
  var xhr = _initXHR(),
      httpMode = pack.ssl ? 'https://' : 'http://',
      url = httpMode + pack.host + pack.path;
  xhr.open(pack.method, url, pack.async);
  xhr.withCredentials = pack.withoutCredentials ? false : true;


  xhr.onreadystatechange = function () {
    detail += ' xhrstatus:' + xhr.statusText;
    if (xhr.readyState === 0) {
      pack.error({
        message: 'pryvXHRCall unsent',
        detail: detail,
        id: 'INTERNAL_ERROR',
        xhr: xhr
      });
    } else if (xhr.readyState === 4) {
      var result = null;

      if (parseResult === 'json') {
        var response = xhr.responseText;
        response = response.trim() === '' ? '{}' : response;
        try { result = JSON.parse(response); } catch (e) {
          return pack.error({
            message: 'Data is not JSON',
            detail: xhr.responseText + '\n' + detail,
            id: 'RESULT_NOT_JSON',
            xhr: xhr
          });
        }
      }
      var resultInfo = {
        xhr : xhr,
        code : xhr.status,
        headers : parseResponseHeaders(xhr.getAllResponseHeaders())
      };

      pack.success(result, resultInfo);
    }
  };
  if (pack.progressCallback && typeof(pack.progressCallback) === 'function') {
    xhr.upload.addEventListener('progress', function (e) {
      return pack.progressCallback(e);
    }, false);
  }
  for (var key in pack.headers) {
    if (pack.headers.hasOwnProperty(key)) {
      xhr.setRequestHeader(key, pack.headers[key]);
    }
  }

  //--- sending the request
  try {
    xhr.send(pack.params);
  } catch (e) {
    return pack.error({
      message: 'pryvXHRCall unsent',
      detail: detail,
      id: 'INTERNAL_ERROR',
      error: e,
      xhr: xhr
    });
  }
  return xhr;
};

/**
 * Method to initialize XMLHttpRequest.
 * @method _initXHR
 * @access private
 * @return object
 */
/* jshint -W117 */
var _initXHR = function () {
  var XHR = null;

  try { XHR = new XMLHttpRequest(); }
  catch (e) {
    try { XHR = new ActiveXObject('Msxml2.XMLHTTP'); }
    catch (e2) {
      try { XHR = new ActiveXObject('Microsoft.XMLHTTP'); }
      catch (e3) {
        console.log('XMLHttpRequest implementation not found.');
      }
      console.log('XMLHttpRequest implementation not found.');
    }
    console.log('XMLHttpRequest implementation not found.');
  }
  return XHR;
};


/**
 * XmlHttpRequest's getAllResponseHeaders() method returns a string of response
 * headers according to the format described here:
 * http://www.w3.org/TR/XMLHttpRequest/#the-getallresponseheaders-method
 * This method parses that string into a user-friendly key/value pair object.
 */
function parseResponseHeaders(headerStr) {
  var headers = {};
  if (!headerStr) {
    return headers;
  }
  var headerPairs = headerStr.split('\u000d\u000a');
  for (var i = 0; i < headerPairs.length; i++) {
    var headerPair = headerPairs[i];
    // Can't use split() here because it does the wrong thing
    // if the header value has the string ": " in it.
    var index = headerPair.indexOf('\u003a\u0020');
    if (index > 0) {
      var key = headerPair.substring(0, index).toLowerCase();
      var val = headerPair.substring(index + 2);
      headers[key] = val;
    }
  }
  return headers;
}

},{}],66:[function(require,module,exports){
/* jshint ignore:start */

/*!
 * domready (c) Dustin Diaz 2012 - License MIT
 */
module.exports = function (ready) {


  var fns = [], fn, f = false,
      doc = document,
      testEl = doc.documentElement,
      hack = testEl.doScroll,
      domContentLoaded = 'DOMContentLoaded',
      addEventListener = 'addEventListener',
      onreadystatechange = 'onreadystatechange',
      readyState = 'readyState',
      loaded = /^loade|c/.test(doc[readyState]);

  function flush(f) {
    loaded = 1;
    while (f = fns.shift()) {
      f()
    }
  }

  doc[addEventListener] && doc[addEventListener](domContentLoaded, fn = function () {
    doc.removeEventListener(domContentLoaded, fn, f);
    flush();
  }, f);


  hack && doc.attachEvent(onreadystatechange, fn = function () {
    if (/^c/.test(doc[readyState])) {
      doc.detachEvent(onreadystatechange, fn);
      flush();
    }
  });

  return (ready = hack ?
      function (fn) {
        self != top ?
            loaded ? fn() : fns.push(fn) :
            function () {
              console.log("on dom ready 2");
              try {
                testEl.doScroll('left')
              } catch (e) {
                return setTimeout(function() { ready(fn) }, 50)
              }
              fn()
            }()
      } :
      function (fn) {
        loaded ? fn() : fns.push(fn)
      })
}();

},{}],68:[function(require,module,exports){
//TODO align with XHR error

//TODO: sort out the callback convention

/**
 *
 * @param {Object} pack json with
 * @param {Object} [pack.type = 'POST'] : 'GET/DELETE/POST/PUT'
 * @param {String} pack.host : fully qualified host name
 * @param {Number} pack.port : port to use
 * @param {String} pack.path : the request PATH
 * @param {Object} [pack.headers] : key / value map of headers
 * @param {Object} [pack.params] : the payload -- only with POST/PUT
 * @param {String} [pack.parseResult = 'json'] : 'text' for no parsing
 * @param {Function} pack.success : function (result, resultInfo)
 * @param {Function} pack.error : function (error, resultInfo)
 * @param {String} [pack.info] : a text
 * @param {Boolean} [pack.async = true]
 * @param {Number} [pack.expectedStatus] : http result code
 * @param {Boolean} [pack.ssl = true]
 */
module.exports = function (pack)  {
  if (pack.payload) {
    pack.headers['Content-Length'] = pack.payload.length;
  }


  var httpOptions = {
    host: pack.host,
    port: pack.port,
    path: pack.path,
    method: pack.method,
    rejectUnauthorized: false,
    headers : pack.headers
  };

  var parseResult = pack.parseResult || 'json';
  var httpMode = pack.ssl ? 'https' : 'http';
  var http = require(httpMode);



  var detail = 'Request: ' + httpOptions.method + ' ' +
      httpMode + '://' + httpOptions.host + ':' + httpOptions.port + '' + httpOptions.path;




  var onError = function (reason) {
    return pack.error(reason + '\n' + detail, null);
  };


  var req = http.request(httpOptions, function (res) {
    var bodyarr = [];
    res.on('data', function (chunk) {  bodyarr.push(chunk); });
    res.on('end', function () {
      var resultInfo = {
        code : res.statusCode,
        headers : res.headers
      };
      var result = null;
      if (parseResult === 'json') {
        try {
          result = JSON.parse(bodyarr.join(''));
        } catch (error) {
          return onError('request failed to parse JSON in response' +
              bodyarr.join('')
          );
        }
      }
      return pack.success(result, resultInfo);
    });

  }).on('error', function (e) {
        return onError('Error: ' + e.message);
      });


  req.on('socket', function (socket) {
    socket.setTimeout(5000);
    socket.on('timeout', function () {
      req.abort();
      return pack.error('Timeout');
    });
  });

  if (pack.payload) { req.write(pack.payload); }
  req.end();

  return req;
};

},{}],30:[function(require,module,exports){
(function(){//     Backbone.js 1.0.0

//     (c) 2010-2013 Jeremy Ashkenas, DocumentCloud Inc.
//     Backbone may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://backbonejs.org

(function(){

  // Initial Setup
  // -------------

  // Save a reference to the global object (`window` in the browser, `exports`
  // on the server).
  var root = this;

  // Save the previous value of the `Backbone` variable, so that it can be
  // restored later on, if `noConflict` is used.
  var previousBackbone = root.Backbone;

  // Create local references to array methods we'll want to use later.
  var array = [];
  var push = array.push;
  var slice = array.slice;
  var splice = array.splice;

  // The top-level namespace. All public Backbone classes and modules will
  // be attached to this. Exported for both the browser and the server.
  var Backbone;
  if (typeof exports !== 'undefined') {
    Backbone = exports;
  } else {
    Backbone = root.Backbone = {};
  }

  // Current version of the library. Keep in sync with `package.json`.
  Backbone.VERSION = '1.0.0';

  // Require Underscore, if we're on the server, and it's not already present.
  var _ = root._;
  if (!_ && (typeof require !== 'undefined')) _ = require('underscore');

  // For Backbone's purposes, jQuery, Zepto, Ender, or My Library (kidding) owns
  // the `$` variable.
  Backbone.$ = root.jQuery || root.Zepto || root.ender || root.$;

  // Runs Backbone.js in *noConflict* mode, returning the `Backbone` variable
  // to its previous owner. Returns a reference to this Backbone object.
  Backbone.noConflict = function() {
    root.Backbone = previousBackbone;
    return this;
  };

  // Turn on `emulateHTTP` to support legacy HTTP servers. Setting this option
  // will fake `"PUT"` and `"DELETE"` requests via the `_method` parameter and
  // set a `X-Http-Method-Override` header.
  Backbone.emulateHTTP = false;

  // Turn on `emulateJSON` to support legacy servers that can't deal with direct
  // `application/json` requests ... will encode the body as
  // `application/x-www-form-urlencoded` instead and will send the model in a
  // form param named `model`.
  Backbone.emulateJSON = false;

  // Backbone.Events
  // ---------------

  // A module that can be mixed in to *any object* in order to provide it with
  // custom events. You may bind with `on` or remove with `off` callback
  // functions to an event; `trigger`-ing an event fires all callbacks in
  // succession.
  //
  //     var object = {};
  //     _.extend(object, Backbone.Events);
  //     object.on('expand', function(){ alert('expanded'); });
  //     object.trigger('expand');
  //
  var Events = Backbone.Events = {

    // Bind an event to a `callback` function. Passing `"all"` will bind
    // the callback to all events fired.
    on: function(name, callback, context) {
      if (!eventsApi(this, 'on', name, [callback, context]) || !callback) return this;
      this._events || (this._events = {});
      var events = this._events[name] || (this._events[name] = []);
      events.push({callback: callback, context: context, ctx: context || this});
      return this;
    },

    // Bind an event to only be triggered a single time. After the first time
    // the callback is invoked, it will be removed.
    once: function(name, callback, context) {
      if (!eventsApi(this, 'once', name, [callback, context]) || !callback) return this;
      var self = this;
      var once = _.once(function() {
        self.off(name, once);
        callback.apply(this, arguments);
      });
      once._callback = callback;
      return this.on(name, once, context);
    },

    // Remove one or many callbacks. If `context` is null, removes all
    // callbacks with that function. If `callback` is null, removes all
    // callbacks for the event. If `name` is null, removes all bound
    // callbacks for all events.
    off: function(name, callback, context) {
      var retain, ev, events, names, i, l, j, k;
      if (!this._events || !eventsApi(this, 'off', name, [callback, context])) return this;
      if (!name && !callback && !context) {
        this._events = {};
        return this;
      }

      names = name ? [name] : _.keys(this._events);
      for (i = 0, l = names.length; i < l; i++) {
        name = names[i];
        if (events = this._events[name]) {
          this._events[name] = retain = [];
          if (callback || context) {
            for (j = 0, k = events.length; j < k; j++) {
              ev = events[j];
              if ((callback && callback !== ev.callback && callback !== ev.callback._callback) ||
                  (context && context !== ev.context)) {
                retain.push(ev);
              }
            }
          }
          if (!retain.length) delete this._events[name];
        }
      }

      return this;
    },

    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    trigger: function(name) {
      if (!this._events) return this;
      var args = slice.call(arguments, 1);
      if (!eventsApi(this, 'trigger', name, args)) return this;
      var events = this._events[name];
      var allEvents = this._events.all;
      if (events) triggerEvents(events, args);
      if (allEvents) triggerEvents(allEvents, arguments);
      return this;
    },

    // Tell this object to stop listening to either specific events ... or
    // to every object it's currently listening to.
    stopListening: function(obj, name, callback) {
      var listeners = this._listeners;
      if (!listeners) return this;
      var deleteListener = !name && !callback;
      if (typeof name === 'object') callback = this;
      if (obj) (listeners = {})[obj._listenerId] = obj;
      for (var id in listeners) {
        listeners[id].off(name, callback, this);
        if (deleteListener) delete this._listeners[id];
      }
      return this;
    }

  };

  // Regular expression used to split event strings.
  var eventSplitter = /\s+/;

  // Implement fancy features of the Events API such as multiple event
  // names `"change blur"` and jQuery-style event maps `{change: action}`
  // in terms of the existing API.
  var eventsApi = function(obj, action, name, rest) {
    if (!name) return true;

    // Handle event maps.
    if (typeof name === 'object') {
      for (var key in name) {
        obj[action].apply(obj, [key, name[key]].concat(rest));
      }
      return false;
    }

    // Handle space separated event names.
    if (eventSplitter.test(name)) {
      var names = name.split(eventSplitter);
      for (var i = 0, l = names.length; i < l; i++) {
        obj[action].apply(obj, [names[i]].concat(rest));
      }
      return false;
    }

    return true;
  };

  // A difficult-to-believe, but optimized internal dispatch function for
  // triggering events. Tries to keep the usual cases speedy (most internal
  // Backbone events have 3 arguments).
  var triggerEvents = function(events, args) {
    var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2];
    switch (args.length) {
      case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx); return;
      case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1); return;
      case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2); return;
      case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); return;
      default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args);
    }
  };

  var listenMethods = {listenTo: 'on', listenToOnce: 'once'};

  // Inversion-of-control versions of `on` and `once`. Tell *this* object to
  // listen to an event in another object ... keeping track of what it's
  // listening to.
  _.each(listenMethods, function(implementation, method) {
    Events[method] = function(obj, name, callback) {
      var listeners = this._listeners || (this._listeners = {});
      var id = obj._listenerId || (obj._listenerId = _.uniqueId('l'));
      listeners[id] = obj;
      if (typeof name === 'object') callback = this;
      obj[implementation](name, callback, this);
      return this;
    };
  });

  // Aliases for backwards compatibility.
  Events.bind   = Events.on;
  Events.unbind = Events.off;

  // Allow the `Backbone` object to serve as a global event bus, for folks who
  // want global "pubsub" in a convenient place.
  _.extend(Backbone, Events);

  // Backbone.Model
  // --------------

  // Backbone **Models** are the basic data object in the framework --
  // frequently representing a row in a table in a database on your server.
  // A discrete chunk of data and a bunch of useful, related methods for
  // performing computations and transformations on that data.

  // Create a new model with the specified attributes. A client id (`cid`)
  // is automatically generated and assigned for you.
  var Model = Backbone.Model = function(attributes, options) {
    var defaults;
    var attrs = attributes || {};
    options || (options = {});
    this.cid = _.uniqueId('c');
    this.attributes = {};
    _.extend(this, _.pick(options, modelOptions));
    if (options.parse) attrs = this.parse(attrs, options) || {};
    if (defaults = _.result(this, 'defaults')) {
      attrs = _.defaults({}, attrs, defaults);
    }
    this.set(attrs, options);
    this.changed = {};
    this.initialize.apply(this, arguments);
  };

  // A list of options to be attached directly to the model, if provided.
  var modelOptions = ['url', 'urlRoot', 'collection'];

  // Attach all inheritable methods to the Model prototype.
  _.extend(Model.prototype, Events, {

    // A hash of attributes whose current and previous value differ.
    changed: null,

    // The value returned during the last failed validation.
    validationError: null,

    // The default name for the JSON `id` attribute is `"id"`. MongoDB and
    // CouchDB users may want to set this to `"_id"`.
    idAttribute: 'id',

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Return a copy of the model's `attributes` object.
    toJSON: function(options) {
      return _.clone(this.attributes);
    },

    // Proxy `Backbone.sync` by default -- but override this if you need
    // custom syncing semantics for *this* particular model.
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Get the value of an attribute.
    get: function(attr) {
      return this.attributes[attr];
    },

    // Get the HTML-escaped value of an attribute.
    escape: function(attr) {
      return _.escape(this.get(attr));
    },

    // Returns `true` if the attribute contains a value that is not null
    // or undefined.
    has: function(attr) {
      return this.get(attr) != null;
    },

    // Set a hash of model attributes on the object, firing `"change"`. This is
    // the core primitive operation of a model, updating the data and notifying
    // anyone who needs to know about the change in state. The heart of the beast.
    set: function(key, val, options) {
      var attr, attrs, unset, changes, silent, changing, prev, current;
      if (key == null) return this;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      options || (options = {});

      // Run validation.
      if (!this._validate(attrs, options)) return false;

      // Extract attributes and options.
      unset           = options.unset;
      silent          = options.silent;
      changes         = [];
      changing        = this._changing;
      this._changing  = true;

      if (!changing) {
        this._previousAttributes = _.clone(this.attributes);
        this.changed = {};
      }
      current = this.attributes, prev = this._previousAttributes;

      // Check for changes of `id`.
      if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];

      // For each `set` attribute, update or delete the current value.
      for (attr in attrs) {
        val = attrs[attr];
        if (!_.isEqual(current[attr], val)) changes.push(attr);
        if (!_.isEqual(prev[attr], val)) {
          this.changed[attr] = val;
        } else {
          delete this.changed[attr];
        }
        unset ? delete current[attr] : current[attr] = val;
      }

      // Trigger all relevant attribute changes.
      if (!silent) {
        if (changes.length) this._pending = true;
        for (var i = 0, l = changes.length; i < l; i++) {
          this.trigger('change:' + changes[i], this, current[changes[i]], options);
        }
      }

      // You might be wondering why there's a `while` loop here. Changes can
      // be recursively nested within `"change"` events.
      if (changing) return this;
      if (!silent) {
        while (this._pending) {
          this._pending = false;
          this.trigger('change', this, options);
        }
      }
      this._pending = false;
      this._changing = false;
      return this;
    },

    // Remove an attribute from the model, firing `"change"`. `unset` is a noop
    // if the attribute doesn't exist.
    unset: function(attr, options) {
      return this.set(attr, void 0, _.extend({}, options, {unset: true}));
    },

    // Clear all attributes on the model, firing `"change"`.
    clear: function(options) {
      var attrs = {};
      for (var key in this.attributes) attrs[key] = void 0;
      return this.set(attrs, _.extend({}, options, {unset: true}));
    },

    // Determine if the model has changed since the last `"change"` event.
    // If you specify an attribute name, determine if that attribute has changed.
    hasChanged: function(attr) {
      if (attr == null) return !_.isEmpty(this.changed);
      return _.has(this.changed, attr);
    },

    // Return an object containing all the attributes that have changed, or
    // false if there are no changed attributes. Useful for determining what
    // parts of a view need to be updated and/or what attributes need to be
    // persisted to the server. Unset attributes will be set to undefined.
    // You can also pass an attributes object to diff against the model,
    // determining if there *would be* a change.
    changedAttributes: function(diff) {
      if (!diff) return this.hasChanged() ? _.clone(this.changed) : false;
      var val, changed = false;
      var old = this._changing ? this._previousAttributes : this.attributes;
      for (var attr in diff) {
        if (_.isEqual(old[attr], (val = diff[attr]))) continue;
        (changed || (changed = {}))[attr] = val;
      }
      return changed;
    },

    // Get the previous value of an attribute, recorded at the time the last
    // `"change"` event was fired.
    previous: function(attr) {
      if (attr == null || !this._previousAttributes) return null;
      return this._previousAttributes[attr];
    },

    // Get all of the attributes of the model at the time of the previous
    // `"change"` event.
    previousAttributes: function() {
      return _.clone(this._previousAttributes);
    },

    // Fetch the model from the server. If the server's representation of the
    // model differs from its current attributes, they will be overridden,
    // triggering a `"change"` event.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === void 0) options.parse = true;
      var model = this;
      var success = options.success;
      options.success = function(resp) {
        if (!model.set(model.parse(resp, options), options)) return false;
        if (success) success(model, resp, options);
        model.trigger('sync', model, resp, options);
      };
      wrapError(this, options);
      return this.sync('read', this, options);
    },

    // Set a hash of model attributes, and sync the model to the server.
    // If the server returns an attributes hash that differs, the model's
    // state will be `set` again.
    save: function(key, val, options) {
      var attrs, method, xhr, attributes = this.attributes;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (key == null || typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      // If we're not waiting and attributes exist, save acts as `set(attr).save(null, opts)`.
      if (attrs && (!options || !options.wait) && !this.set(attrs, options)) return false;

      options = _.extend({validate: true}, options);

      // Do not persist invalid models.
      if (!this._validate(attrs, options)) return false;

      // Set temporary attributes if `{wait: true}`.
      if (attrs && options.wait) {
        this.attributes = _.extend({}, attributes, attrs);
      }

      // After a successful server-side save, the client is (optionally)
      // updated with the server-side state.
      if (options.parse === void 0) options.parse = true;
      var model = this;
      var success = options.success;
      options.success = function(resp) {
        // Ensure attributes are restored during synchronous saves.
        model.attributes = attributes;
        var serverAttrs = model.parse(resp, options);
        if (options.wait) serverAttrs = _.extend(attrs || {}, serverAttrs);
        if (_.isObject(serverAttrs) && !model.set(serverAttrs, options)) {
          return false;
        }
        if (success) success(model, resp, options);
        model.trigger('sync', model, resp, options);
      };
      wrapError(this, options);

      method = this.isNew() ? 'create' : (options.patch ? 'patch' : 'update');
      if (method === 'patch') options.attrs = attrs;
      xhr = this.sync(method, this, options);

      // Restore attributes.
      if (attrs && options.wait) this.attributes = attributes;

      return xhr;
    },

    // Destroy this model on the server if it was already persisted.
    // Optimistically removes the model from its collection, if it has one.
    // If `wait: true` is passed, waits for the server to respond before removal.
    destroy: function(options) {
      options = options ? _.clone(options) : {};
      var model = this;
      var success = options.success;

      var destroy = function() {
        model.trigger('destroy', model, model.collection, options);
      };

      options.success = function(resp) {
        if (options.wait || model.isNew()) destroy();
        if (success) success(model, resp, options);
        if (!model.isNew()) model.trigger('sync', model, resp, options);
      };

      if (this.isNew()) {
        options.success();
        return false;
      }
      wrapError(this, options);

      var xhr = this.sync('delete', this, options);
      if (!options.wait) destroy();
      return xhr;
    },

    // Default URL for the model's representation on the server -- if you're
    // using Backbone's restful methods, override this to change the endpoint
    // that will be called.
    url: function() {
      var base = _.result(this, 'urlRoot') || _.result(this.collection, 'url') || urlError();
      if (this.isNew()) return base;
      return base + (base.charAt(base.length - 1) === '/' ? '' : '/') + encodeURIComponent(this.id);
    },

    // **parse** converts a response into the hash of attributes to be `set` on
    // the model. The default implementation is just to pass the response along.
    parse: function(resp, options) {
      return resp;
    },

    // Create a new model with identical attributes to this one.
    clone: function() {
      return new this.constructor(this.attributes);
    },

    // A model is new if it has never been saved to the server, and lacks an id.
    isNew: function() {
      return this.id == null;
    },

    // Check if the model is currently in a valid state.
    isValid: function(options) {
      return this._validate({}, _.extend(options || {}, { validate: true }));
    },

    // Run validation against the next complete set of model attributes,
    // returning `true` if all is well. Otherwise, fire an `"invalid"` event.
    _validate: function(attrs, options) {
      if (!options.validate || !this.validate) return true;
      attrs = _.extend({}, this.attributes, attrs);
      var error = this.validationError = this.validate(attrs, options) || null;
      if (!error) return true;
      this.trigger('invalid', this, error, _.extend(options || {}, {validationError: error}));
      return false;
    }

  });

  // Underscore methods that we want to implement on the Model.
  var modelMethods = ['keys', 'values', 'pairs', 'invert', 'pick', 'omit'];

  // Mix in each Underscore method as a proxy to `Model#attributes`.
  _.each(modelMethods, function(method) {
    Model.prototype[method] = function() {
      var args = slice.call(arguments);
      args.unshift(this.attributes);
      return _[method].apply(_, args);
    };
  });

  // Backbone.Collection
  // -------------------

  // If models tend to represent a single row of data, a Backbone Collection is
  // more analagous to a table full of data ... or a small slice or page of that
  // table, or a collection of rows that belong together for a particular reason
  // -- all of the messages in this particular folder, all of the documents
  // belonging to this particular author, and so on. Collections maintain
  // indexes of their models, both in order, and for lookup by `id`.

  // Create a new **Collection**, perhaps to contain a specific type of `model`.
  // If a `comparator` is specified, the Collection will maintain
  // its models in sort order, as they're added and removed.
  var Collection = Backbone.Collection = function(models, options) {
    options || (options = {});
    if (options.url) this.url = options.url;
    if (options.model) this.model = options.model;
    if (options.comparator !== void 0) this.comparator = options.comparator;
    this._reset();
    this.initialize.apply(this, arguments);
    if (models) this.reset(models, _.extend({silent: true}, options));
  };

  // Default options for `Collection#set`.
  var setOptions = {add: true, remove: true, merge: true};
  var addOptions = {add: true, merge: false, remove: false};

  // Define the Collection's inheritable methods.
  _.extend(Collection.prototype, Events, {

    // The default model for a collection is just a **Backbone.Model**.
    // This should be overridden in most cases.
    model: Model,

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // The JSON representation of a Collection is an array of the
    // models' attributes.
    toJSON: function(options) {
      return this.map(function(model){ return model.toJSON(options); });
    },

    // Proxy `Backbone.sync` by default.
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Add a model, or list of models to the set.
    add: function(models, options) {
      return this.set(models, _.defaults(options || {}, addOptions));
    },

    // Remove a model, or a list of models from the set.
    remove: function(models, options) {
      models = _.isArray(models) ? models.slice() : [models];
      options || (options = {});
      var i, l, index, model;
      for (i = 0, l = models.length; i < l; i++) {
        model = this.get(models[i]);
        if (!model) continue;
        delete this._byId[model.id];
        delete this._byId[model.cid];
        index = this.indexOf(model);
        this.models.splice(index, 1);
        this.length--;
        if (!options.silent) {
          options.index = index;
          model.trigger('remove', model, this, options);
        }
        this._removeReference(model);
      }
      return this;
    },

    // Update a collection by `set`-ing a new list of models, adding new ones,
    // removing models that are no longer present, and merging models that
    // already exist in the collection, as necessary. Similar to **Model#set**,
    // the core operation for updating the data contained by the collection.
    set: function(models, options) {
      options = _.defaults(options || {}, setOptions);
      if (options.parse) models = this.parse(models, options);
      if (!_.isArray(models)) models = models ? [models] : [];
      var i, l, model, attrs, existing, sort;
      var at = options.at;
      var sortable = this.comparator && (at == null) && options.sort !== false;
      var sortAttr = _.isString(this.comparator) ? this.comparator : null;
      var toAdd = [], toRemove = [], modelMap = {};

      // Turn bare objects into model references, and prevent invalid models
      // from being added.
      for (i = 0, l = models.length; i < l; i++) {
        if (!(model = this._prepareModel(models[i], options))) continue;

        // If a duplicate is found, prevent it from being added and
        // optionally merge it into the existing model.
        if (existing = this.get(model)) {
          if (options.remove) modelMap[existing.cid] = true;
          if (options.merge) {
            existing.set(model.attributes, options);
            if (sortable && !sort && existing.hasChanged(sortAttr)) sort = true;
          }

        // This is a new model, push it to the `toAdd` list.
        } else if (options.add) {
          toAdd.push(model);

          // Listen to added models' events, and index models for lookup by
          // `id` and by `cid`.
          model.on('all', this._onModelEvent, this);
          this._byId[model.cid] = model;
          if (model.id != null) this._byId[model.id] = model;
        }
      }

      // Remove nonexistent models if appropriate.
      if (options.remove) {
        for (i = 0, l = this.length; i < l; ++i) {
          if (!modelMap[(model = this.models[i]).cid]) toRemove.push(model);
        }
        if (toRemove.length) this.remove(toRemove, options);
      }

      // See if sorting is needed, update `length` and splice in new models.
      if (toAdd.length) {
        if (sortable) sort = true;
        this.length += toAdd.length;
        if (at != null) {
          splice.apply(this.models, [at, 0].concat(toAdd));
        } else {
          push.apply(this.models, toAdd);
        }
      }

      // Silently sort the collection if appropriate.
      if (sort) this.sort({silent: true});

      if (options.silent) return this;

      // Trigger `add` events.
      for (i = 0, l = toAdd.length; i < l; i++) {
        (model = toAdd[i]).trigger('add', model, this, options);
      }

      // Trigger `sort` if the collection was sorted.
      if (sort) this.trigger('sort', this, options);
      return this;
    },

    // When you have more items than you want to add or remove individually,
    // you can reset the entire set with a new list of models, without firing
    // any granular `add` or `remove` events. Fires `reset` when finished.
    // Useful for bulk operations and optimizations.
    reset: function(models, options) {
      options || (options = {});
      for (var i = 0, l = this.models.length; i < l; i++) {
        this._removeReference(this.models[i]);
      }
      options.previousModels = this.models;
      this._reset();
      this.add(models, _.extend({silent: true}, options));
      if (!options.silent) this.trigger('reset', this, options);
      return this;
    },

    // Add a model to the end of the collection.
    push: function(model, options) {
      model = this._prepareModel(model, options);
      this.add(model, _.extend({at: this.length}, options));
      return model;
    },

    // Remove a model from the end of the collection.
    pop: function(options) {
      var model = this.at(this.length - 1);
      this.remove(model, options);
      return model;
    },

    // Add a model to the beginning of the collection.
    unshift: function(model, options) {
      model = this._prepareModel(model, options);
      this.add(model, _.extend({at: 0}, options));
      return model;
    },

    // Remove a model from the beginning of the collection.
    shift: function(options) {
      var model = this.at(0);
      this.remove(model, options);
      return model;
    },

    // Slice out a sub-array of models from the collection.
    slice: function(begin, end) {
      return this.models.slice(begin, end);
    },

    // Get a model from the set by id.
    get: function(obj) {
      if (obj == null) return void 0;
      return this._byId[obj.id != null ? obj.id : obj.cid || obj];
    },

    // Get the model at the given index.
    at: function(index) {
      return this.models[index];
    },

    // Return models with matching attributes. Useful for simple cases of
    // `filter`.
    where: function(attrs, first) {
      if (_.isEmpty(attrs)) return first ? void 0 : [];
      return this[first ? 'find' : 'filter'](function(model) {
        for (var key in attrs) {
          if (attrs[key] !== model.get(key)) return false;
        }
        return true;
      });
    },

    // Return the first model with matching attributes. Useful for simple cases
    // of `find`.
    findWhere: function(attrs) {
      return this.where(attrs, true);
    },

    // Force the collection to re-sort itself. You don't need to call this under
    // normal circumstances, as the set will maintain sort order as each item
    // is added.
    sort: function(options) {
      if (!this.comparator) throw new Error('Cannot sort a set without a comparator');
      options || (options = {});

      // Run sort based on type of `comparator`.
      if (_.isString(this.comparator) || this.comparator.length === 1) {
        this.models = this.sortBy(this.comparator, this);
      } else {
        this.models.sort(_.bind(this.comparator, this));
      }

      if (!options.silent) this.trigger('sort', this, options);
      return this;
    },

    // Figure out the smallest index at which a model should be inserted so as
    // to maintain order.
    sortedIndex: function(model, value, context) {
      value || (value = this.comparator);
      var iterator = _.isFunction(value) ? value : function(model) {
        return model.get(value);
      };
      return _.sortedIndex(this.models, model, iterator, context);
    },

    // Pluck an attribute from each model in the collection.
    pluck: function(attr) {
      return _.invoke(this.models, 'get', attr);
    },

    // Fetch the default set of models for this collection, resetting the
    // collection when they arrive. If `reset: true` is passed, the response
    // data will be passed through the `reset` method instead of `set`.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === void 0) options.parse = true;
      var success = options.success;
      var collection = this;
      options.success = function(resp) {
        var method = options.reset ? 'reset' : 'set';
        collection[method](resp, options);
        if (success) success(collection, resp, options);
        collection.trigger('sync', collection, resp, options);
      };
      wrapError(this, options);
      return this.sync('read', this, options);
    },

    // Create a new instance of a model in this collection. Add the model to the
    // collection immediately, unless `wait: true` is passed, in which case we
    // wait for the server to agree.
    create: function(model, options) {
      options = options ? _.clone(options) : {};
      if (!(model = this._prepareModel(model, options))) return false;
      if (!options.wait) this.add(model, options);
      var collection = this;
      var success = options.success;
      options.success = function(resp) {
        if (options.wait) collection.add(model, options);
        if (success) success(model, resp, options);
      };
      model.save(null, options);
      return model;
    },

    // **parse** converts a response into a list of models to be added to the
    // collection. The default implementation is just to pass it through.
    parse: function(resp, options) {
      return resp;
    },

    // Create a new collection with an identical list of models as this one.
    clone: function() {
      return new this.constructor(this.models);
    },

    // Private method to reset all internal state. Called when the collection
    // is first initialized or reset.
    _reset: function() {
      this.length = 0;
      this.models = [];
      this._byId  = {};
    },

    // Prepare a hash of attributes (or other model) to be added to this
    // collection.
    _prepareModel: function(attrs, options) {
      if (attrs instanceof Model) {
        if (!attrs.collection) attrs.collection = this;
        return attrs;
      }
      options || (options = {});
      options.collection = this;
      var model = new this.model(attrs, options);
      if (!model._validate(attrs, options)) {
        this.trigger('invalid', this, attrs, options);
        return false;
      }
      return model;
    },

    // Internal method to sever a model's ties to a collection.
    _removeReference: function(model) {
      if (this === model.collection) delete model.collection;
      model.off('all', this._onModelEvent, this);
    },

    // Internal method called every time a model in the set fires an event.
    // Sets need to update their indexes when models change ids. All other
    // events simply proxy through. "add" and "remove" events that originate
    // in other collections are ignored.
    _onModelEvent: function(event, model, collection, options) {
      if ((event === 'add' || event === 'remove') && collection !== this) return;
      if (event === 'destroy') this.remove(model, options);
      if (model && event === 'change:' + model.idAttribute) {
        delete this._byId[model.previous(model.idAttribute)];
        if (model.id != null) this._byId[model.id] = model;
      }
      this.trigger.apply(this, arguments);
    }

  });

  // Underscore methods that we want to implement on the Collection.
  // 90% of the core usefulness of Backbone Collections is actually implemented
  // right here:
  var methods = ['forEach', 'each', 'map', 'collect', 'reduce', 'foldl',
    'inject', 'reduceRight', 'foldr', 'find', 'detect', 'filter', 'select',
    'reject', 'every', 'all', 'some', 'any', 'include', 'contains', 'invoke',
    'max', 'min', 'toArray', 'size', 'first', 'head', 'take', 'initial', 'rest',
    'tail', 'drop', 'last', 'without', 'indexOf', 'shuffle', 'lastIndexOf',
    'isEmpty', 'chain'];

  // Mix in each Underscore method as a proxy to `Collection#models`.
  _.each(methods, function(method) {
    Collection.prototype[method] = function() {
      var args = slice.call(arguments);
      args.unshift(this.models);
      return _[method].apply(_, args);
    };
  });

  // Underscore methods that take a property name as an argument.
  var attributeMethods = ['groupBy', 'countBy', 'sortBy'];

  // Use attributes instead of properties.
  _.each(attributeMethods, function(method) {
    Collection.prototype[method] = function(value, context) {
      var iterator = _.isFunction(value) ? value : function(model) {
        return model.get(value);
      };
      return _[method](this.models, iterator, context);
    };
  });

  // Backbone.View
  // -------------

  // Backbone Views are almost more convention than they are actual code. A View
  // is simply a JavaScript object that represents a logical chunk of UI in the
  // DOM. This might be a single item, an entire list, a sidebar or panel, or
  // even the surrounding frame which wraps your whole app. Defining a chunk of
  // UI as a **View** allows you to define your DOM events declaratively, without
  // having to worry about render order ... and makes it easy for the view to
  // react to specific changes in the state of your models.

  // Creating a Backbone.View creates its initial element outside of the DOM,
  // if an existing element is not provided...
  var View = Backbone.View = function(options) {
    this.cid = _.uniqueId('view');
    this._configure(options || {});
    this._ensureElement();
    this.initialize.apply(this, arguments);
    this.delegateEvents();
  };

  // Cached regex to split keys for `delegate`.
  var delegateEventSplitter = /^(\S+)\s*(.*)$/;

  // List of view options to be merged as properties.
  var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events'];

  // Set up all inheritable **Backbone.View** properties and methods.
  _.extend(View.prototype, Events, {

    // The default `tagName` of a View's element is `"div"`.
    tagName: 'div',

    // jQuery delegate for element lookup, scoped to DOM elements within the
    // current view. This should be prefered to global lookups where possible.
    $: function(selector) {
      return this.$el.find(selector);
    },

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // **render** is the core function that your view should override, in order
    // to populate its element (`this.el`), with the appropriate HTML. The
    // convention is for **render** to always return `this`.
    render: function() {
      return this;
    },

    // Remove this view by taking the element out of the DOM, and removing any
    // applicable Backbone.Events listeners.
    remove: function() {
      this.$el.remove();
      this.stopListening();
      return this;
    },

    // Change the view's element (`this.el` property), including event
    // re-delegation.
    setElement: function(element, delegate) {
      if (this.$el) this.undelegateEvents();
      this.$el = element instanceof Backbone.$ ? element : Backbone.$(element);
      this.el = this.$el[0];
      if (delegate !== false) this.delegateEvents();
      return this;
    },

    // Set callbacks, where `this.events` is a hash of
    //
    // *{"event selector": "callback"}*
    //
    //     {
    //       'mousedown .title':  'edit',
    //       'click .button':     'save'
    //       'click .open':       function(e) { ... }
    //     }
    //
    // pairs. Callbacks will be bound to the view, with `this` set properly.
    // Uses event delegation for efficiency.
    // Omitting the selector binds the event to `this.el`.
    // This only works for delegate-able events: not `focus`, `blur`, and
    // not `change`, `submit`, and `reset` in Internet Explorer.
    delegateEvents: function(events) {
      if (!(events || (events = _.result(this, 'events')))) return this;
      this.undelegateEvents();
      for (var key in events) {
        var method = events[key];
        if (!_.isFunction(method)) method = this[events[key]];
        if (!method) continue;

        var match = key.match(delegateEventSplitter);
        var eventName = match[1], selector = match[2];
        method = _.bind(method, this);
        eventName += '.delegateEvents' + this.cid;
        if (selector === '') {
          this.$el.on(eventName, method);
        } else {
          this.$el.on(eventName, selector, method);
        }
      }
      return this;
    },

    // Clears all callbacks previously bound to the view with `delegateEvents`.
    // You usually don't need to use this, but may wish to if you have multiple
    // Backbone views attached to the same DOM element.
    undelegateEvents: function() {
      this.$el.off('.delegateEvents' + this.cid);
      return this;
    },

    // Performs the initial configuration of a View with a set of options.
    // Keys with special meaning *(e.g. model, collection, id, className)* are
    // attached directly to the view.  See `viewOptions` for an exhaustive
    // list.
    _configure: function(options) {
      if (this.options) options = _.extend({}, _.result(this, 'options'), options);
      _.extend(this, _.pick(options, viewOptions));
      this.options = options;
    },

    // Ensure that the View has a DOM element to render into.
    // If `this.el` is a string, pass it through `$()`, take the first
    // matching element, and re-assign it to `el`. Otherwise, create
    // an element from the `id`, `className` and `tagName` properties.
    _ensureElement: function() {
      if (!this.el) {
        var attrs = _.extend({}, _.result(this, 'attributes'));
        if (this.id) attrs.id = _.result(this, 'id');
        if (this.className) attrs['class'] = _.result(this, 'className');
        var $el = Backbone.$('<' + _.result(this, 'tagName') + '>').attr(attrs);
        this.setElement($el, false);
      } else {
        this.setElement(_.result(this, 'el'), false);
      }
    }

  });

  // Backbone.sync
  // -------------

  // Override this function to change the manner in which Backbone persists
  // models to the server. You will be passed the type of request, and the
  // model in question. By default, makes a RESTful Ajax request
  // to the model's `url()`. Some possible customizations could be:
  //
  // * Use `setTimeout` to batch rapid-fire updates into a single request.
  // * Send up the models as XML instead of JSON.
  // * Persist models via WebSockets instead of Ajax.
  //
  // Turn on `Backbone.emulateHTTP` in order to send `PUT` and `DELETE` requests
  // as `POST`, with a `_method` parameter containing the true HTTP method,
  // as well as all requests with the body as `application/x-www-form-urlencoded`
  // instead of `application/json` with the model in a param named `model`.
  // Useful when interfacing with server-side languages like **PHP** that make
  // it difficult to read the body of `PUT` requests.
  Backbone.sync = function(method, model, options) {
    var type = methodMap[method];

    // Default options, unless specified.
    _.defaults(options || (options = {}), {
      emulateHTTP: Backbone.emulateHTTP,
      emulateJSON: Backbone.emulateJSON
    });

    // Default JSON-request options.
    var params = {type: type, dataType: 'json'};

    // Ensure that we have a URL.
    if (!options.url) {
      params.url = _.result(model, 'url') || urlError();
    }

    // Ensure that we have the appropriate request data.
    if (options.data == null && model && (method === 'create' || method === 'update' || method === 'patch')) {
      params.contentType = 'application/json';
      params.data = JSON.stringify(options.attrs || model.toJSON(options));
    }

    // For older servers, emulate JSON by encoding the request into an HTML-form.
    if (options.emulateJSON) {
      params.contentType = 'application/x-www-form-urlencoded';
      params.data = params.data ? {model: params.data} : {};
    }

    // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
    // And an `X-HTTP-Method-Override` header.
    if (options.emulateHTTP && (type === 'PUT' || type === 'DELETE' || type === 'PATCH')) {
      params.type = 'POST';
      if (options.emulateJSON) params.data._method = type;
      var beforeSend = options.beforeSend;
      options.beforeSend = function(xhr) {
        xhr.setRequestHeader('X-HTTP-Method-Override', type);
        if (beforeSend) return beforeSend.apply(this, arguments);
      };
    }

    // Don't process data on a non-GET request.
    if (params.type !== 'GET' && !options.emulateJSON) {
      params.processData = false;
    }

    // If we're sending a `PATCH` request, and we're in an old Internet Explorer
    // that still has ActiveX enabled by default, override jQuery to use that
    // for XHR instead. Remove this line when jQuery supports `PATCH` on IE8.
    if (params.type === 'PATCH' && window.ActiveXObject &&
          !(window.external && window.external.msActiveXFilteringEnabled)) {
      params.xhr = function() {
        return new ActiveXObject("Microsoft.XMLHTTP");
      };
    }

    // Make the request, allowing the user to override any Ajax options.
    var xhr = options.xhr = Backbone.ajax(_.extend(params, options));
    model.trigger('request', model, xhr, options);
    return xhr;
  };

  // Map from CRUD to HTTP for our default `Backbone.sync` implementation.
  var methodMap = {
    'create': 'POST',
    'update': 'PUT',
    'patch':  'PATCH',
    'delete': 'DELETE',
    'read':   'GET'
  };

  // Set the default implementation of `Backbone.ajax` to proxy through to `$`.
  // Override this if you'd like to use a different library.
  Backbone.ajax = function() {
    return Backbone.$.ajax.apply(Backbone.$, arguments);
  };

  // Backbone.Router
  // ---------------

  // Routers map faux-URLs to actions, and fire events when routes are
  // matched. Creating a new one sets its `routes` hash, if not set statically.
  var Router = Backbone.Router = function(options) {
    options || (options = {});
    if (options.routes) this.routes = options.routes;
    this._bindRoutes();
    this.initialize.apply(this, arguments);
  };

  // Cached regular expressions for matching named param parts and splatted
  // parts of route strings.
  var optionalParam = /\((.*?)\)/g;
  var namedParam    = /(\(\?)?:\w+/g;
  var splatParam    = /\*\w+/g;
  var escapeRegExp  = /[\-{}\[\]+?.,\\\^$|#\s]/g;

  // Set up all inheritable **Backbone.Router** properties and methods.
  _.extend(Router.prototype, Events, {

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Manually bind a single named route to a callback. For example:
    //
    //     this.route('search/:query/p:num', 'search', function(query, num) {
    //       ...
    //     });
    //
    route: function(route, name, callback) {
      if (!_.isRegExp(route)) route = this._routeToRegExp(route);
      if (_.isFunction(name)) {
        callback = name;
        name = '';
      }
      if (!callback) callback = this[name];
      var router = this;
      Backbone.history.route(route, function(fragment) {
        var args = router._extractParameters(route, fragment);
        callback && callback.apply(router, args);
        router.trigger.apply(router, ['route:' + name].concat(args));
        router.trigger('route', name, args);
        Backbone.history.trigger('route', router, name, args);
      });
      return this;
    },

    // Simple proxy to `Backbone.history` to save a fragment into the history.
    navigate: function(fragment, options) {
      Backbone.history.navigate(fragment, options);
      return this;
    },

    // Bind all defined routes to `Backbone.history`. We have to reverse the
    // order of the routes here to support behavior where the most general
    // routes can be defined at the bottom of the route map.
    _bindRoutes: function() {
      if (!this.routes) return;
      this.routes = _.result(this, 'routes');
      var route, routes = _.keys(this.routes);
      while ((route = routes.pop()) != null) {
        this.route(route, this.routes[route]);
      }
    },

    // Convert a route string into a regular expression, suitable for matching
    // against the current location hash.
    _routeToRegExp: function(route) {
      route = route.replace(escapeRegExp, '\\$&')
                   .replace(optionalParam, '(?:$1)?')
                   .replace(namedParam, function(match, optional){
                     return optional ? match : '([^\/]+)';
                   })
                   .replace(splatParam, '(.*?)');
      return new RegExp('^' + route + '$');
    },

    // Given a route, and a URL fragment that it matches, return the array of
    // extracted decoded parameters. Empty or unmatched parameters will be
    // treated as `null` to normalize cross-browser behavior.
    _extractParameters: function(route, fragment) {
      var params = route.exec(fragment).slice(1);
      return _.map(params, function(param) {
        return param ? decodeURIComponent(param) : null;
      });
    }

  });

  // Backbone.History
  // ----------------

  // Handles cross-browser history management, based on either
  // [pushState](http://diveintohtml5.info/history.html) and real URLs, or
  // [onhashchange](https://developer.mozilla.org/en-US/docs/DOM/window.onhashchange)
  // and URL fragments. If the browser supports neither (old IE, natch),
  // falls back to polling.
  var History = Backbone.History = function() {
    this.handlers = [];
    _.bindAll(this, 'checkUrl');

    // Ensure that `History` can be used outside of the browser.
    if (typeof window !== 'undefined') {
      this.location = window.location;
      this.history = window.history;
    }
  };

  // Cached regex for stripping a leading hash/slash and trailing space.
  var routeStripper = /^[#\/]|\s+$/g;

  // Cached regex for stripping leading and trailing slashes.
  var rootStripper = /^\/+|\/+$/g;

  // Cached regex for detecting MSIE.
  var isExplorer = /msie [\w.]+/;

  // Cached regex for removing a trailing slash.
  var trailingSlash = /\/$/;

  // Has the history handling already been started?
  History.started = false;

  // Set up all inheritable **Backbone.History** properties and methods.
  _.extend(History.prototype, Events, {

    // The default interval to poll for hash changes, if necessary, is
    // twenty times a second.
    interval: 50,

    // Gets the true hash value. Cannot use location.hash directly due to bug
    // in Firefox where location.hash will always be decoded.
    getHash: function(window) {
      var match = (window || this).location.href.match(/#(.*)$/);
      return match ? match[1] : '';
    },

    // Get the cross-browser normalized URL fragment, either from the URL,
    // the hash, or the override.
    getFragment: function(fragment, forcePushState) {
      if (fragment == null) {
        if (this._hasPushState || !this._wantsHashChange || forcePushState) {
          fragment = this.location.pathname;
          var root = this.root.replace(trailingSlash, '');
          if (!fragment.indexOf(root)) fragment = fragment.substr(root.length);
        } else {
          fragment = this.getHash();
        }
      }
      return fragment.replace(routeStripper, '');
    },

    // Start the hash change handling, returning `true` if the current URL matches
    // an existing route, and `false` otherwise.
    start: function(options) {
      if (History.started) throw new Error("Backbone.history has already been started");
      History.started = true;

      // Figure out the initial configuration. Do we need an iframe?
      // Is pushState desired ... is it available?
      this.options          = _.extend({}, {root: '/'}, this.options, options);
      this.root             = this.options.root;
      this._wantsHashChange = this.options.hashChange !== false;
      this._wantsPushState  = !!this.options.pushState;
      this._hasPushState    = !!(this.options.pushState && this.history && this.history.pushState);
      var fragment          = this.getFragment();
      var docMode           = document.documentMode;
      var oldIE             = (isExplorer.exec(navigator.userAgent.toLowerCase()) && (!docMode || docMode <= 7));

      // Normalize root to always include a leading and trailing slash.
      this.root = ('/' + this.root + '/').replace(rootStripper, '/');

      if (oldIE && this._wantsHashChange) {
        this.iframe = Backbone.$('<iframe src="javascript:0" tabindex="-1" />').hide().appendTo('body')[0].contentWindow;
        this.navigate(fragment);
      }

      // Depending on whether we're using pushState or hashes, and whether
      // 'onhashchange' is supported, determine how we check the URL state.
      if (this._hasPushState) {
        Backbone.$(window).on('popstate', this.checkUrl);
      } else if (this._wantsHashChange && ('onhashchange' in window) && !oldIE) {
        Backbone.$(window).on('hashchange', this.checkUrl);
      } else if (this._wantsHashChange) {
        this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
      }

      // Determine if we need to change the base url, for a pushState link
      // opened by a non-pushState browser.
      this.fragment = fragment;
      var loc = this.location;
      var atRoot = loc.pathname.replace(/[^\/]$/, '$&/') === this.root;

      // If we've started off with a route from a `pushState`-enabled browser,
      // but we're currently in a browser that doesn't support it...
      if (this._wantsHashChange && this._wantsPushState && !this._hasPushState && !atRoot) {
        this.fragment = this.getFragment(null, true);
        this.location.replace(this.root + this.location.search + '#' + this.fragment);
        // Return immediately as browser will do redirect to new url
        return true;

      // Or if we've started out with a hash-based route, but we're currently
      // in a browser where it could be `pushState`-based instead...
      } else if (this._wantsPushState && this._hasPushState && atRoot && loc.hash) {
        this.fragment = this.getHash().replace(routeStripper, '');
        this.history.replaceState({}, document.title, this.root + this.fragment + loc.search);
      }

      if (!this.options.silent) return this.loadUrl();
    },

    // Disable Backbone.history, perhaps temporarily. Not useful in a real app,
    // but possibly useful for unit testing Routers.
    stop: function() {
      Backbone.$(window).off('popstate', this.checkUrl).off('hashchange', this.checkUrl);
      clearInterval(this._checkUrlInterval);
      History.started = false;
    },

    // Add a route to be tested when the fragment changes. Routes added later
    // may override previous routes.
    route: function(route, callback) {
      this.handlers.unshift({route: route, callback: callback});
    },

    // Checks the current URL to see if it has changed, and if it has,
    // calls `loadUrl`, normalizing across the hidden iframe.
    checkUrl: function(e) {
      var current = this.getFragment();
      if (current === this.fragment && this.iframe) {
        current = this.getFragment(this.getHash(this.iframe));
      }
      if (current === this.fragment) return false;
      if (this.iframe) this.navigate(current);
      this.loadUrl() || this.loadUrl(this.getHash());
    },

    // Attempt to load the current URL fragment. If a route succeeds with a
    // match, returns `true`. If no defined routes matches the fragment,
    // returns `false`.
    loadUrl: function(fragmentOverride) {
      var fragment = this.fragment = this.getFragment(fragmentOverride);
      var matched = _.any(this.handlers, function(handler) {
        if (handler.route.test(fragment)) {
          handler.callback(fragment);
          return true;
        }
      });
      return matched;
    },

    // Save a fragment into the hash history, or replace the URL state if the
    // 'replace' option is passed. You are responsible for properly URL-encoding
    // the fragment in advance.
    //
    // The options object can contain `trigger: true` if you wish to have the
    // route callback be fired (not usually desirable), or `replace: true`, if
    // you wish to modify the current URL without adding an entry to the history.
    navigate: function(fragment, options) {
      if (!History.started) return false;
      if (!options || options === true) options = {trigger: options};
      fragment = this.getFragment(fragment || '');
      if (this.fragment === fragment) return;
      this.fragment = fragment;
      var url = this.root + fragment;

      // If pushState is available, we use it to set the fragment as a real URL.
      if (this._hasPushState) {
        this.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);

      // If hash changes haven't been explicitly disabled, update the hash
      // fragment to store history.
      } else if (this._wantsHashChange) {
        this._updateHash(this.location, fragment, options.replace);
        if (this.iframe && (fragment !== this.getFragment(this.getHash(this.iframe)))) {
          // Opening and closing the iframe tricks IE7 and earlier to push a
          // history entry on hash-tag change.  When replace is true, we don't
          // want this.
          if(!options.replace) this.iframe.document.open().close();
          this._updateHash(this.iframe.location, fragment, options.replace);
        }

      // If you've told us that you explicitly don't want fallback hashchange-
      // based history, then `navigate` becomes a page refresh.
      } else {
        return this.location.assign(url);
      }
      if (options.trigger) this.loadUrl(fragment);
    },

    // Update the hash location, either replacing the current entry, or adding
    // a new one to the browser history.
    _updateHash: function(location, fragment, replace) {
      if (replace) {
        var href = location.href.replace(/(javascript:|#).*$/, '');
        location.replace(href + '#' + fragment);
      } else {
        // Some browsers require that `hash` contains a leading #.
        location.hash = '#' + fragment;
      }
    }

  });

  // Create the default Backbone.history.
  Backbone.history = new History;

  // Helpers
  // -------

  // Helper function to correctly set up the prototype chain, for subclasses.
  // Similar to `goog.inherits`, but uses a hash of prototype properties and
  // class properties to be extended.
  var extend = function(protoProps, staticProps) {
    var parent = this;
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && _.has(protoProps, 'constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ return parent.apply(this, arguments); };
    }

    // Add static properties to the constructor function, if supplied.
    _.extend(child, parent, staticProps);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    var Surrogate = function(){ this.constructor = child; };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate;

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) _.extend(child.prototype, protoProps);

    // Set a convenience property in case the parent's prototype is needed
    // later.
    child.__super__ = parent.prototype;

    return child;
  };

  // Set up inheritance for the model, collection, router, view and history.
  Model.extend = Collection.extend = Router.extend = View.extend = History.extend = extend;

  // Throw an error when a URL is needed, and none is supplied.
  var urlError = function() {
    throw new Error('A "url" property or function must be specified');
  };

  // Wrap an optional error callback with a fallback error event.
  var wrapError = function (model, options) {
    var error = options.error;
    options.error = function(resp) {
      if (error) error(model, resp, options);
      model.trigger('error', model, resp, options);
    };
  };

}).call(this);

})()
},{"underscore":9}],38:[function(require,module,exports){
(function(){/* global $, window */
var _ = require('underscore'),
  NodeView = require('../view/NodeView.js'),
  Backbone = require('backbone'),
  TreemapUtil = require('../utility/treemap.js');

/**
 * The model for all Nodes
 * @param parent
 * @constructor
 */
var DEFAULT_OFFSET = 18;
var DEFAULT_MARGIN = 2;
var DEFAULT_MIN_WIDTH = 550;
var DEFAULT_MIN_HEIGHT = 500;
var MAIN_CONTAINER_ID = 'tree';
var TreeNode = module.exports = function (treemap, parent) {
  //Init all the instance variables
  this.treeMap = treemap;
  this.parent = parent;
  this.uniqueId = _.uniqueId('node_');
  this.width = null;
  this.height = null;
  this.x = 0;
  this.y = 0;
  this.aggregated = false;
  this.view = null;
  this.model = null;
  this.offset = DEFAULT_OFFSET;
  this.margin = DEFAULT_MARGIN;
  this.minWidth = this.parent ? this.parent.minWidth : DEFAULT_MIN_WIDTH;
  this.minHeight = this.parent ? this.parent.minHeight : DEFAULT_MIN_HEIGHT;
};


TreeNode.implement = function (constructor, members) {
  var newImplementation = constructor;

  if (typeof Object.create === 'undefined') {
    Object.create = function (prototype) {
      function C() { }
      C.prototype = prototype;
      return new C();
    };
  }
  newImplementation.prototype = Object.create(this.prototype);
  _.extend(newImplementation.prototype, members);
  newImplementation.implement = this.implement;
  return newImplementation;
};

_.extend(TreeNode.prototype, {
  className: 'TreeNode',
  /** TreeNode parent or null if rootNode **/

  //---------- view management ------------//

  _createView: function () {
    if (this.getWeight() === 0) {
      return;
    }
    if (!this.view && typeof(document) !== 'undefined') {
      this._refreshViewModel(false);
      this.view = new NodeView({model: this.model});
    }
    if (this.getChildren()) {
      _.each(this.getChildren(), function (child) {
        child._createView();
      });
    }
  },
  _closeView: function (recursive) {
    if (recursive) {
      _.each(this.getChildren(), function (child) {
        child._closeView(recursive);
      });
    }
    if (this.view) {
      this.view.close();
      this.view = null;
    }
  },
  /**
   * Generate the size and position of each child of this node
   * @param x
   * @param y
   * @param width
   * @param height
   * @param recursive
   * @private
   */
  _generateChildrenTreemap: function (x, y, width, height, recursive) {
    if (window.PryvBrowser && window.PryvBrowser.customConfig) {
      this.minWidth = DEFAULT_MIN_WIDTH > 0 && DEFAULT_MIN_WIDTH <= 1 ?
        DEFAULT_MIN_WIDTH * $(window).width() : DEFAULT_MIN_WIDTH;
      this.minHeight = DEFAULT_MIN_HEIGHT > 0 && DEFAULT_MIN_HEIGHT <= 1 ?
        DEFAULT_MIN_HEIGHT * $(window).height() : DEFAULT_MIN_HEIGHT;
    }
    if (this.getWeight() === 0) {
      return;
    }
    if (this._needToAggregate() && !this.aggregated) {
      this._aggregate();
    }
    if (!this._needToAggregate() && this.aggregated) {
      this._desaggregate();
    }
    var children = this.getChildren();
    if (children) {
      // we need to normalize child weights by the parent weight
      var weight = this.getWeight();
      _.each(children, function (child) {
        child.normalizedWeight = (child.getWeight() / weight);
      }, this);

      // we squarify all the children passing a container dimension and position
      // no recursion needed
      var squarified =  TreemapUtil.squarify({
        x: x,
        y: y + this.offset,
        width: width,
        height: height - this.offset
      }, children);
      _.each(children, function (child) {
        var w = squarified[child.uniqueId].width,
            h = squarified[child.uniqueId].height;
        child.x = squarified[child.uniqueId].x;
        child.y = squarified[child.uniqueId].y;
        child.width = w;
        child.height = h;
        if (w !== this.width) {
          child.width -= this.margin / 2;
        }
        if (h !== this.height - this.offset) {
          child.height -= this.margin / 2;
        }
        if (child.x !== 0 && child.x + w !== this.width) {
          child.width -= this.margin / 2;
        }
        if (child.y !== this.offset && child.y + h !== this.height) {
          child.height -= this.margin / 2;
        }
        if (child.x !== 0) { child.x += this.margin / 2; }
        if (child.y !== this.offset) { child.y += this.margin / 2; }
      }, this);

      _.each(children, function (child) {
        if (recursive) {
          child._generateChildrenTreemap(0, 0, child.width, child.height, true);
        }
      }, this);
    }
  },
  _needToAggregate: function () {
    this.aggregated = false;
    return this.aggregated;
  },
  _aggregate: function () {
    return;
  },
  _desaggregate: function () {
    return;
  },
  /** Render or close the view if needed
   For more performance we need to render or close views once all processing are done
   i.e: when eventLeaveScope is trigged and a eventsNode becomes empty if we close it right away
   it result with a unpleasant visual with div disappears randomly.
   So we need to close all the view at the same time.
   */
  renderView: function (recurcive) {
    /** If the node has no events to display (getWeight = 0) we close it **/
    if (this.getWeight() === 0) {
      this.aggregated = false; // Reset the aggregation to false;
      if (this.eventView) {
        this.eventView.close();
        this.eventView = null;
      }
      if (this.view) {
        this.view.close();
        this.view = null;
      }
    } else {
      // Test is the view is not already displayed and the view is not null
      if ($('#' + this.uniqueId).length === 0 && this.view) {
        this.view.renderView();
        // event listenner for focus on stream when clicked on it
        // i.e display only this stream when clicked on it
        this.view.on('headerClicked', function () {
          if (this.stream) {
            this.treeMap.focusOnStreams(this.stream);
          }
          else if (this.connection) {
            this.treeMap.focusOnConnections(this.connection);
          }
        }, this);
      }
    }
    if (recurcive) {
      _.each(this.getChildren(), function (child) {
        child.renderView(true);
      });
    }
  },
  /**
   * Refresh the model of the view and create it if there is no
   * If the model change this will automatically update the view thanks to backbone
   * @param recursive
   * @private
   */
  _refreshViewModel: function (recursive) {
    if (!this.model) {
      var BasicModel = Backbone.Model.extend({ });
      this.model = new BasicModel({
        containerId: this.parent ? this.parent.uniqueId : MAIN_CONTAINER_ID,
        id: this.uniqueId,
        className: this.className,
        width: this.width,
        height: this.height,
        x: this.x,
        y: this.y,
        depth: this.depth,
        weight: this.getWeight(),
        content: this.events || this.stream || this.connection,
        eventView: this.eventView
      });
    } else {
      // TODO For now empty nodes (i.e streams) are not displayed
      // but we'll need to display them to create event, drag drop ...
      /*if (this.getWeight() === 0) {
       if (this.model) {
       this.model.set('width', 0);
       this.model.set('height', 0);
       }
       return;
       } */
      this.model.set('containerId', this.parent ? this.parent.uniqueId : MAIN_CONTAINER_ID);
      this.model.set('id', this.uniqueId);
      this.model.set('name', this.className);
      this.model.set('width', this.width);
      this.model.set('height', this.height);
      this.model.set('x', this.x);
      this.model.set('y', this.y);
      this.model.set('depth', this.depth);
      this.model.set('weight', this.getWeight());
      if (this.eventView) {
        this.eventView.refresh({
          width: this.width,
          height: this.height
        });
      }
    }
    if (recursive && this.getChildren()) {
      _.each(this.getChildren(), function (child) {
        child._refreshViewModel(true);
      });
    }
  },



  //-------------- Tree Browsing -------------------//

  /**
   * @return TreeNode parent or null if root
   */
  getParent: function () {
    return this.parent;
  },

  /**
   * @return Array of TreeNode or null if leaf
   */
  getChildren: function () {
    throw new Error(this.className + ': getChildren must be implemented');
  },


  /**
   * Return the total weight (in TreeMap referential) of this node and it's children
   * This should be overwritten by Leaf nodes
   * @return Number
   */
  getWeight: function () {
    if (this.getChildren() === null) {
      throw new Error(this.className + ': Leafs must overwrite getWeight');
    }
    var weight = 0;
    this.getChildren().forEach(function (child) {
      weight += child.getWeight();
    });
    return weight;
  },



  //----------- event management ------------//
  onDateHighLighted: function (time) {
    _.each(this.getChildren(), function (child) {
      child.onDateHighLighted(time);
    });
  },
  /**
   * Add an Event to the Tree
   * @param event Event
   * @return TreeNode the node in charge of this event. To be handled directly,
   * next event addition or renderView() call can modify structure, and change
   * the owner of this Event. This is designed for animation. .. add event then
   * call returnedNode.currentWarpingDOMObject()
   */
  eventEnterScope: function () {
    throw new Error(this.className + ': eventEnterScope must be implemented');
  },

  /**
   * the Event changed from the Tree
   * @param event Event or eventId .. to be discussed
   */
  eventChange: function () {
    throw new Error(this.className + ': eventChange must be implemented');
  },

  /**
   * Event removed
   * @parma eventChange
   */
  eventLeaveScope: function () {
    throw new Error(this.className + ': eventLeaveScope must be implemented');
  },
  //----------- debug ------------//
  _debugTree : function () {
    var me = {
      className : this.className,
      weight : this.getWeight()
    };
    if (this.getChildren()) {
      me.children = [];
      _.each(this.getChildren(), function (child) {
        me.children.push(child._debugTree());
      });
    }
    return me;
  }
});

try {
  window.PryvBrowser = _.extend({}, window.PryvBrowser);
  Object.defineProperty(window.PryvBrowser, 'minWidth', {
    set: function (value) {
      value = +value;
      if (_.isFinite(value)) {
        this.customConfig = true;
        DEFAULT_MIN_WIDTH = value;
        if (_.isFunction(this.refresh)) {
          this.refresh();
        }
      }
    },
    get: function () {
      if (DEFAULT_MIN_WIDTH > 0 && DEFAULT_MIN_WIDTH <= 1) {
        return 'ratio: ' + DEFAULT_MIN_WIDTH + ' absolute: ' +
          DEFAULT_MIN_WIDTH * $(window).width();
      } else {
        return 'absolute: ' + DEFAULT_MIN_WIDTH;
      }
    }
  });
  Object.defineProperty(window.PryvBrowser, 'minHeight', {
    set: function (value) {
      value = +value;
      if (_.isFinite(value)) {
        this.customConfig = true;
        DEFAULT_MIN_HEIGHT = value;
        if (_.isFunction(this.refresh)) {
          this.refresh();
        }
      }
    },
    get: function () {
      if (DEFAULT_MIN_HEIGHT > 0 && DEFAULT_MIN_HEIGHT <= 1) {
        return 'ratio: ' + DEFAULT_MIN_HEIGHT + ' absolute: ' +
          DEFAULT_MIN_HEIGHT * $(window).height();
      } else {
        return 'absolute: ' + DEFAULT_MIN_HEIGHT;
      }
    }
  });
} catch (err) {
  console.warn('cannot define window.PryvBrowser');
}

})()
},{"../utility/treemap.js":70,"../view/NodeView.js":69,"backbone":30,"underscore":9}],20:[function(require,module,exports){
(function(){/* global $, window */
var _ = require('underscore'),
  Collection = require('./EventCollection.js'),
  Model = require('./EventModel.js'),
  ListView = require('./ListView.js'),
  CommonView = require('./CommonView.js'),
  GenericContentView = require('./contentView/Generic.js'),
  TweetContentView = require('./contentView/Tweet.js'),
  NoteContentView = require('./contentView/Note.js'),
  NumericalContentView = require('./contentView/numercial/Controller.js'),
  PictureContentView = require('./contentView/Picture.js'),
  PositionContentView = require('./contentView/Position.js'),
  CreationView = require('./contentView/Creation.js');
var EVENTS_PER_SCROLL = 20;
var Controller = module.exports = function ($modal, connections, target) {
  this.events = {};
  this.eventsToAdd = [];
  this.eventsToAddToListView = [];
  this.connection = connections;
  this.newEvent = null;
  this.collection =  new Collection();
  this.listViewcollection =  new Collection();
  this.highlightedDate = null;
  this.listView = null;
  this.commonView = null;
  this.contentView = null;
  this.$modal = $modal;
  this.target = target;
  this.container = '.modal-content';
  var once = true;
  this.debounceAdd = _.debounce(function () {
    this.collection.add(this.eventsToAdd, {sort: false});
    this.collection.sort();
    this.eventsToAddToListView = _.sortBy(this.eventsToAddToListView, function (model) {
      return -model.get('event').time;
    });
    this.listViewcollection.add(this.eventsToAddToListView.splice(0, EVENTS_PER_SCROLL),
      {sort: false});
    this.eventsToAdd = [];
    if (once && this.highlightedDate) {
      this.highlightDate(this.highlightedDate);
      once = false;
    }
  }.bind(this), 100);
  $(window).resize(this.resizeModal);
};

_.extend(Controller.prototype, {
  show: function () {
    this.$modal.modal({currentTarget: this.target});
    $(this.container).empty().hide();
    setTimeout(function () {
      $(this.container).fadeIn();
    }.bind(this), 500);
    if (!this.listView) {
      this.commonView = new CommonView({model: new Model({})});
      this.listView = new ListView({
        collection: this.listViewcollection
      });
      this.listView.on('showMore', this.debounceAdd.bind(this));
      this.listView.on('itemview:date:clicked', function (evt) {
        this.collection.setCurrentElement(evt.model);
        this.listViewcollection.setCurrentElement(evt.model);
        this.updateSingleView(this.collection.getCurrentElement());
      }.bind(this));
    }
    /*jshint -W101 */
    $(this.container).append('<div class="modal-header">  ' +
      '        <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button> ' +
      '        <h4 class="modal-title" id="myModalLabel" data-i18n="modal.detail.header"></h4>' +
      '        <div class="modal-close"></div> ' +
      '    </div>      ' +
      '<div class="modal-panel-left"><div id="modal-left-content"><div id="detail-content"></div><div id="detail-common"></div></div></div>');
    this.listView.render();
    if (!_.isEmpty(this.events)) {
      this.commonView.render();
    }
    this.resizeModal();
    $(this.$modal).keydown(function (e) {
      if ($('.editing').length !== 0) {
        return true;
      }
      var LEFT_KEY = 37;
      var UP_KEY = 38;
      var RIGHT_KEY = 39;
      var DOWN_KEY = 40;
      if (e.which === LEFT_KEY || e.which === UP_KEY) {
        this.updateSingleView(this.collection.prev().getCurrentElement());
        this.updateSingleView(this.listViewcollection.prev().getCurrentElement());
        return false;
      }
      if (e.which === RIGHT_KEY || e.which === DOWN_KEY) {
        this.updateSingleView(this.collection.next().getCurrentElement());
        this.updateSingleView(this.listViewcollection.next().getCurrentElement());
        return false;
      }
    }.bind(this));
    $('body').i18n();
  },
  close: function () {
    if (this.commonView) {this.commonView.close(); }
    if (this.contentView) {this.contentView.close(); }
    $(this.container).empty();
    if (this.collection) {this.collection.reset(); }
    this.collection = null;
    if (this.listViewcollection) {this.listViewcollection.reset(); }
    this.listViewcollection = null;
    this.events = {};
    $(this.$modal).unbind('keydown');
  },
  getEventById: function (event) {
    return this.collection.getEventById(event.id);
  },
  addEvents: function (event) {
    if (!event) {
      return;
    }
    if (event.streamId) {
      //we have only one event so we put it on a each for the next each
      event = [event];
    }
    if (!this.collection) {
      this.collection = new Collection();
    }
    if (!this.listViewcollection) {
      this.listViewcollection = new Collection();
    }
    _.each(event, function (e) {
      var m = new Model({
        event: e
      });
      this.events[e.id] = e;
      this.eventsToAdd.push(m);
      this.eventsToAddToListView.push(m);
    }, this);
    this.debounceAdd();
  },
  deleteEvent: function (event) {
    delete this.events[event.id];
    var toDelete = this.getEventById(event);
    if (toDelete) {
      toDelete.destroy();
    }
  },
  updateEvent: function (event) {
    this.events[event.id] = event;
    var toUpdate = this.getEventById(event);
    if (toUpdate) {
      toUpdate.set('event', event);
      this.collection.sort();
      this.listViewcollection.sort();
    }
  },
  highlightDate: function (time) {
    this.highlightedDate = time;
    var model = this.collection.highlightEvent(time);
    this.listViewcollection.highlightEvent(time);
    this.updateSingleView(model);

  },
  updateSingleView: function (model) {
    if (model) {
      if (model.get('event').type !== 'Creation') {
        this.commonView.model.set('event', model.get('event'));
      }
      var newContentView = this._getContentView(model);
      if (this.contentView === null || this.contentView.type !== newContentView.type) {
        if (this.contentView !== null) {
          this.contentView.close();
          this.contentView.off();
        }
        this.contentView = new newContentView.view({model: new Model({collection:
          this.collection, virtual: this.virtual})});
        this.contentView.on('previous', function () {
          this.updateSingleView(this.collection.prev().getCurrentElement());
          this.listViewcollection.prev();
        }.bind(this));
        this.contentView.on('next', function () {
          this.updateSingleView(this.collection.next().getCurrentElement());
          this.listViewcollection.next();
        }.bind(this));
        if (newContentView.type === 'Creation') {
          $('.modal-panel-right').hide();
          this.contentView.connection = this.connection;
          this.commonView.close();
          var currentElement = this.collection.getCurrentElement();
          if (currentElement) {
            // The creation view was called while a detailed view is open
            // we preset the stream;
            this.contentView.streamId = currentElement.get('event').streamId;
            this.contentView.connectionId = currentElement.get('event').connection.serialId;
          }
          this.contentView.on('endOfSelection', function () {
            $('.modal-panel-right').show();
            this.addEvents(this.newEvent.get('event'));
            this.commonView.model.set('event', this.newEvent.get('event'));
            this.commonView.model.set('collection', this.collection);
            this.commonView.render();
            this.updateSingleView(this.newEvent);
          }.bind(this));
        }
        this.contentView.render();
      }
      this.contentView.model.set('event', model.get('event'));
      this.contentView.model.set('collection', this.collection);
    }
  },
  createNewEvent: function () {
    this.newEvent = new Model({event: this._defaultEvent()});
    this.updateSingleView(this.newEvent);
  },
  _defaultEvent: function () {
    var result = {};
    result.type = 'Creation';
    result.time = new Date().getTime() / 1000;
    result.tags = [];
    result.content = null;
    result.desctiption = '';
    return result;
  },
  _getContentView: function (model) {
    var eventType = model.get('event').type;
    if (eventType === 'note/txt' || eventType === 'note/text') {
      return {type: 'Note', view: NoteContentView};
    } else if (eventType === 'picture/attached') {
      return {type: 'Picture', view: PictureContentView};
    } else if (eventType === 'position/wgs84') {
      return {type: 'Position', view: PositionContentView};
    } else if (eventType === 'message/twitter') {
      return {type: 'Tweet', view: TweetContentView};
    } else if (eventType === 'Creation') {
      return {type: 'Creation', view: CreationView};
    } else if (this.eventIsNumerical(eventType)) {
      return {type: 'Numerical', view: NumericalContentView};
    } else {
      return {type: 'Generic', view: GenericContentView};
    }
  },
  resizeModal: _.debounce(function () {
    $('.modal-panel-left').css({
      width: $('.modal-content').width() - $('.modal-panel-right').width()
    });
  }.bind(this), 1000),
  eventIsNumerical: function (e) {
    var eventTypeClass = e.split('/')[0];
    return (
      eventTypeClass === 'money' ||
        eventTypeClass === 'absorbed-dose' ||
        eventTypeClass === 'absorbed-dose-equivalent' ||
        eventTypeClass === 'absorbed-dose-rate' ||
        eventTypeClass === 'absorbed-dose-rate' ||
        eventTypeClass === 'area' ||
        eventTypeClass === 'capacitance' ||
        eventTypeClass === 'catalytic-activity' ||
        eventTypeClass === 'count' ||
        eventTypeClass === 'data-quantity' ||
        eventTypeClass === 'density' ||
        eventTypeClass === 'dynamic-viscosity' ||
        eventTypeClass === 'electric-charge' ||
        eventTypeClass === 'electric-charge-line-density' ||
        eventTypeClass === 'electric-current' ||
        eventTypeClass === 'electrical-conductivity' ||
        eventTypeClass === 'electromotive-force' ||
        eventTypeClass === 'energy' ||
        eventTypeClass === 'force' ||
        eventTypeClass === 'length' ||
        eventTypeClass === 'luminous-intensity' ||
        eventTypeClass === 'mass' ||
        eventTypeClass === 'mol' ||
        eventTypeClass === 'power' ||
        eventTypeClass === 'pressure' ||
        eventTypeClass === 'speed' ||
        eventTypeClass === 'temperature' ||
        eventTypeClass === 'volume'
      );
  }
});
})()
},{"./CommonView.js":72,"./EventCollection.js":71,"./EventModel.js":78,"./ListView.js":73,"./contentView/Creation.js":81,"./contentView/Generic.js":74,"./contentView/Note.js":75,"./contentView/Picture.js":79,"./contentView/Position.js":80,"./contentView/Tweet.js":76,"./contentView/numercial/Controller.js":77,"underscore":9}],39:[function(require,module,exports){

var _ = require('underscore');
var TreeNode = require('./TreeNode');
var StreamNode = require('./StreamNode');
var VirtualNode = require('./VirtualNode.js');
var Pryv = require('pryv');

var STREAM_MARGIN = 20;
var SERIAL = 0;
var STREAM_COLORS = ['#1abc9c', '#2ecc71', '#3498db', '#9b59b6',
  '#34495e', '#f1c40f', '#e74c3c', '#e67e22', '#95a5a6'];
/**
 * Always call intStructure after creating a new ConnectionNode
 * @type {*}
 */
var ConnectionNode = module.exports = TreeNode.implement(
  function (parentnode, connection) {
    TreeNode.call(this, parentnode.treeMap, parentnode);
    this.connection = connection;
    this.streamNodes = {};
    this.virtNodeWaiting = {};
    this.waitForStream = {};
    this.waitForParentStream = {};
    this.margin = STREAM_MARGIN;
    this.uniqueId = 'node_connection_' + SERIAL;
    SERIAL++;
  }, {
    className: 'ConnectionNode',

    // ---------------------------------- //


    /**
     * Build Structure
     * @param callback
     * @param options
     */
    initStructure: function (options, callback) {

      options = options || {};
      this.streamNodes = {};


      /* Set color to root stream is none and connection is mine (i.e type=personal) */
      var usedColor = [];
      if (this.connection.accessInfo().type && this.connection.accessInfo().type === 'personal') {
        this.connection.streams.walkTree(options, function (stream) {
          if (!stream.parentId && stream.clientData && stream.clientData['pryv-browser:bgColor']) {
            usedColor.push(stream.clientData['pryv-browser:bgColor']);
          }
        });
        var freeColors = _.difference(STREAM_COLORS, usedColor);
        if (freeColors.length === 0) {
          freeColors = STREAM_COLORS;
        }
        this.connection.streams.walkTree(options, function (stream) {
          if (!stream.parentId &&
            (!stream.clientData || !stream.clientData['pryv-browser:bgColor'])) {
            if (!stream.clientData) {
              stream.clientData = {};
            }
            stream.clientData['pryv-browser:bgColor'] = freeColors.shift();
            this.connection.streams._updateWithData({id: stream.id, clientData: stream.clientData},
              console.log);
            if (freeColors.length === 0) {
              freeColors = _.difference(STREAM_COLORS, usedColor);
              if (freeColors.length === 0) {
                freeColors = STREAM_COLORS;
              }
            }
          }
        }.bind(this));
      }

      if (VirtualNode.nodeHas(this.connection)) {
        var vn = VirtualNode.getNodes(this.connection);
        console.log('Checking connection\'s virtual nodes', vn);

        // for each virtual node of stream
        _.each(vn, function (virtualNode) {
          // set the redirections to the children
          _.each(virtualNode.filters, function (s) {
            this.addRedirections(s.streamId, virtualNode.id, s.type);
          }.bind(this));

          this.createVirtualStreamNode(this, null, virtualNode.id, virtualNode.name, virtualNode);
        }.bind(this));
      }



      this.connection.streams.walkTree(options,
        function (stream) {  // eachNode
          var parentNode = this;
          if (stream.parent) {   // if not parent, this connection node is the parent
            parentNode = this.streamNodes[stream.parent.id];
          }
          stream.isVirtual = false;
          this.streamNodes[stream.id] = new StreamNode(this, parentNode, stream);
          if (VirtualNode.nodeHas(stream)) {
            var vn = VirtualNode.getNodes(stream);
            // for each virtual node of stream
            _.each(vn, function (virtualNode) {
              // set the redirections to the children
              _.each(virtualNode.filters, function (s) {
                this.addRedirections(s.streamId, virtualNode.id, s.type);
              }.bind(this));

              this.createVirtualStreamNode(this.streamNodes[stream.id],
                stream, virtualNode.id, virtualNode.name, virtualNode);
            }.bind(this));
          }
          // check for event redirection for the current stream
          this.setRedirections(stream.id);
        }.bind(this),
        function (error) {   // done
          if (error) { error = 'ConnectionNode failed to init structure - ' + error; }
          callback(error);
        });

    },

    /**
     * Advertise a structure change event
     * @param options {state : all, default}
     * @param callback
     */

    /*jshint -W098 */
    structureChange: function (callback, options) {

      // - load streamTree from connection
      // - create nodes
      // - redistribute events (if needed)
      // when implemented review "eventEnterScope" which creates the actual structure

      // warnings
      // - there is no list of events directly accessible.
      // Maybe this could be asked to the rootNode

      // possible optimization
      // - calculate the changes and rebuild only what's needed :)
      // - this would need cleverer StreamNodes

      console.log('Warning: Implement ConnectionNode.structureChange');
      callback();
    },

// ---------- Node -------------  //

    getChildren: function () {
      var children = [];
      _.each(this.streamNodes, function (node) {
        if (node.getParent() === this) { children.push(node); }
      }, this);
      return children;
    },


    eventEnterScope: function (event, reason, callback) {
      var node =  this.streamNodes[event.stream.id]; // do we already know this stream?
      if (typeof node === 'undefined') {
        if (!this.waitForStream[event.stream.id]) {
          this.waitForStream[event.stream.id] = [];
        }
        this.waitForStream[event.stream.id].push(event);
        if (typeof(callback) === 'function') {
          return callback();
        } else {
          return null;
        }
      }
      node.eventEnterScope(event, reason, callback);
    },
    streamEnterScope: function (stream, reason, callback) {
      if (this.streamNodes[stream.id]) {
        if (typeof(callback) === 'function') {
          return callback();
        } else {
          return null;
        }
      }
      if (!stream.parent) {
        this.streamNodes[stream.id] = new StreamNode(this, this, stream);
      }
      if (stream.parent && this.streamNodes[stream.parent.id]) {
        this.streamNodes[stream.id] =
          new StreamNode(this, this.streamNodes[stream.parent.id], stream);
      }
      if (stream.parent && !this.streamNodes[stream.parent.id]) {
        if (!this.waitForParentStream[stream.parent.id]) {
          this.waitForParentStream[stream.parent.id] = [];
        }
        this.waitForParentStream[stream.parent.id].push(stream);
        if (typeof(callback) === 'function') {
          return callback();
        } else {
          return null;
        }
      }
      _.each(this.waitForStream[stream.id], function (event) {
        this.eventEnterScope(event, null, function () {});
      }.bind(this));
      _.each(this.waitForParentStream[stream.id], function (stream) {
        this.streamEnterScope(stream, null, function () {});
      }.bind(this));
      if (typeof(callback) === 'function') {
        return callback();
      } else {
        return null;
      }
    },

    eventLeaveScope: function (event, reason, callback) {
      var node = this.streamNodes[event.stream.id];
      if (node === 'undefined') {
        throw new Error('ConnectionNode: can\'t find path to remove event' + event.id);
      }
      node.eventLeaveScope(event, reason, callback);

    },

    eventChange: function (event, reason, callback) {
      var node = this.streamNodes[event.stream.id];
      if (node === 'undefined') {
        throw new Error('ConnectionNode: can\'t find path to change event' + event.id);
      }
      node.eventChange(event, reason, callback);
    },

// ----------- connection attached virtual nodes ------------//
    updateConnectionVirtualNodes: function (a, b) {
      console.log('updateConnectionVirtualNodes', a, b);
      console.log('updateConnectionVirtualNodes', this);
    },

    addRedirections: function (from, to, type) {
    // if the source is already in the list:
      if (this.streamNodes[from]) {
        if (this.streamNodes[from].redirect) {
          this.streamNodes[from].redirect.push({to: to, type: type});
        } else {
          this.streamNodes[from].redirect = [{to: to, type: type}];
        }
      } else {
        if (this.virtNodeWaiting[from]) {
          this.virtNodeWaiting[from].push({to: to, type: type});
        } else {
          this.virtNodeWaiting[from] = [{to: to, type: type}];
        }
      }
    },

    setRedirections: function (streamId) {
      // check for event redirection
      if (this.virtNodeWaiting[streamId]) {
        if (this.streamNodes[streamId].redirect) {
          // for loop to add them all ?
          for (var i = 0, n = this.virtNodeWaiting[streamId].length; i < n; ++i) {
            this.streamNodes[streamId].redirect.push(this.virtNodeWaiting[streamId][i]);
          }
        } else {
          this.streamNodes[streamId].redirect = this.virtNodeWaiting[streamId];
        }
        delete this.virtNodeWaiting[streamId];
      }
    },

    /**
     * Creates a new Virtual node
     * @param parent the parent object
     * @param id the virtual node's id
     * @param name the virtual node's name
     */
    createVirtualStreamNode: function (parentNode, parent, id, name, vn) {
      var connectionNode =  this;
      var virtualStream = new Pryv.Stream(this.connection, {_parent: parent,
        parentId: parent ? parent.id : null, childrenIds: [], id: id, name: name,
        virtual: vn});

      this.streamNodes[id] = new StreamNode(connectionNode,
        parentNode, virtualStream);
      this.connection.datastore.streamsIndex[virtualStream.id] = virtualStream;
      if (parent) {
        parent.childrenIds.push(virtualStream.id);
      }
      console.log('Set up new virtual node as VirtualStream:', virtualStream);

      return {virtStream: virtualStream, virtStreamNode: this.streamNodes[id]};
    },

//----------- debug ------------//
    _debugTree : function () {
      var me = {
        name : this.connection.displayId
      };

      _.extend(me, TreeNode.prototype._debugTree.call(this));

      return me;
    }

  });
Object.defineProperty(ConnectionNode.prototype, 'id', {
  get: function () { return this.connection.id; },
  set: function () { throw new Error('ConnectionNode.id property is read only'); }
});
},{"./StreamNode":82,"./TreeNode":38,"./VirtualNode.js":28,"pryv":10,"underscore":9}],18:[function(require,module,exports){
var socketIO = require('socket.io-client'),
    _ = require('underscore');

function isBrowser() {
  return typeof(window) !== 'undefined';
}

var utility = module.exports = isBrowser() ?
  require('./utility-browser.js') : require('./utility-node.js');

/**
 * @returns {Boolean} `true` if we're in a web browser environment
 */
utility.isBrowser = isBrowser;

utility.SignalEmitter = require('./SignalEmitter.js');

/**
 * Merges two object (key/value map) and remove "null" properties
 *
 * @param {Object} sourceA
 * @param {Object} sourceB
 * @returns {*|Block|Node|Tag}
 */
utility.mergeAndClean = function (sourceA, sourceB) {
  sourceA = sourceA || {};
  sourceB = sourceB || {};
  var result = _.clone(sourceA);
  _.extend(result, sourceB);
  _.each(_.keys(result), function (key) {
    if (result[key] === null) { delete result[key]; }
  });
  return result;
};

/**
 * Creates a query string from an object (key/value map)
 *
 * @param {Object} data
 * @returns {String} key1=value1&key2=value2....
 */
utility.getQueryParametersString = function (data) {
  data = this.mergeAndClean(data);
  return Object.keys(data).map(function (key) {
    if (data[key] !== null) {
      if (_.isArray(data[key])) {
        data[key] = this.mergeAndClean(data[key]);
        var keyE = encodeURIComponent(key + '[]');
        return data[key].map(function (subData) {
          return keyE + '=' + encodeURIComponent(subData);
        }).join('&');
      } else {
        return encodeURIComponent(key) + '=' + encodeURIComponent(data[key]);
      }
    }
  }, this).join('&');
};

utility.regex = require('./regex');

/**
 * Cross-platform string endsWith
 *
 * @param {String} string
 * @param {String} suffix
 * @returns {Boolean}
 */
utility.endsWith = function (string, suffix) {
  return string.indexOf(suffix, string.length - suffix.length) !== -1;
};

utility.ioConnect = function (settings) {
  var httpMode = settings.ssl ? 'https' : 'http';
  var url = httpMode + '://' + settings.host + ':' + settings.port + '' +
      settings.path + '?auth=' + settings.auth + '&resource=' + settings.namespace;

  return socketIO.connect(url, {'force new connection': true});
};


},{"./SignalEmitter.js":42,"./regex":40,"./utility-browser.js":63,"./utility-node.js":67,"socket.io-client":83,"underscore":43}],22:[function(require,module,exports){
(function(){/* global $ */
var Backbone = require('backbone'),
    Marionette = require('backbone.marionette'),
    _ = require('underscore');
var eachStream = function (collection, callback) {
  collection.each(function (model) {
    if (_.isFunction(callback)) {
      callback(model);
    }
    if (model.children) {
      eachStream(model.children, callback);
    }
  });
};
var TreeView = Marionette.CompositeView.extend({
  template: '#node-template',
  tagName: 'details',
  ui: {
    checkbox: '.input-checkbox'
  },
  initialize: function () {
    // grab the child collection from the parent model
    // so that we can render the collection as children
    // of this parent node
    this.collection = this.model.children;
    this.listenTo(this.model, 'change', this.render);
  },
  appendHtml: function (collectionView, itemView) {
    // ensure we nest the child list inside of 
    // the current list item
    collectionView.$('summary:first').after(itemView.el);
  },
  onRender: function () {
    this.ui.checkbox[0].checked = this.model.get('checked');
    this.ui.checkbox.click(this.toggleCheck.bind(this));
    $('details').details();
  },
  toggleCheck: function () {
    var checked = !this.model.get('checked');
    this.model.set('checked', checked);
    eachStream(this.collection, function (model) {
      model.set('checked', checked);
    });
  }
});

// The tree's root: a simple collection view that renders 
// a recursive tree structure for each item in the collection
var TreeRoot = Marionette.CollectionView.extend({
  itemView: TreeView,
  id: '',
  className: 'create-sharing full-height',
  onRender: function () {
    var dateFrom = new Date(this.options.timeFrom * 1000);
    var dateTo = new Date(this.options.timeTo * 1000);
    function toDateInputValue(date) {
      var local = new Date(date);
      local.setMinutes(date.getMinutes() - date.getTimezoneOffset());
      return local.toJSON().slice(0, 10);
    }

    this.$el.prepend(
      '<h5 data-i18n="modal.share.settings.title"></h5>' +
      '<form role="form" id="form-create-sharing"' +
      '<div class="form-horizontal">' +
      '<div class="form-group">' +
      '<div class="col-sm-5">' +
      '<input type="text" class="form-control" id="input-name" ' +
        'data-i18n="[placeholder]modal.share.settings.name" required>' +
      '</div>' +
      '</div>' +
      '<div class="form-group">' +
      '<div class="col-sm-5">' +
      '<select class="form-control" id="input-global-permission">' +
      '  <option value="read" selected="selected" ' +
        'data-i18n="modal.share.settings.read"></option>' +
      '  <option value="contribute" ' +
        'data-i18n="modal.share.settings.contribute"></option>' +
      '  <option value="manage" ' +
        'data-i18n="modal.share.settings.manage"></option>' +
      '</select>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="col-sm-5 panel panel-default advanced-settings">' +
      '  <div class="panel-heading">' +
      '    <h4 class="panel-title">' +
      '       <a data-toggle="collapse" data-parent="#accordion" href="#collapseOne">' +
      '       Advanced settings ' +
      '       </a>' +
      '     </h4>' +
      '   </div>' +
      '   <div id="collapseOne" class="panel-collapse collapse">' +
      '     <div class="panel-body">' +
      '<div class="form-horizontal">' +
      '<div class="form-group">' +
      '<div class="col-sm-12">' +
      '<input type="text" class="form-control" id="input-token" placeholder="Token">' +
      '</div>' +
      '</div>' +
      '</div>' +

      '<div class="form-inline">' +
      '<div class="form-group">' +
      '<input type="date" class="form-control" id="input-from-date" ' +
      'value="' + toDateInputValue(dateFrom) + '" disabled>' +
      '</div>' +
      '<div class="form-group">' +
      '<input type="time" class="form-control" id="input-from-time" ' +
      'value="' + dateFrom.toLocaleTimeString() + '" disabled>' +
      '</div>' +
      '<label> < --- > </label>' +
      '<div class="form-group">' +
      '<input type="date" class="form-control" id="input-to-date" ' +
      'value="' + toDateInputValue(dateTo) + '" disabled>' +
      '</div>' +
      '<div class="form-group">' +
      '<input type="time" class="form-control" id="input-to-time" ' +
      'value="' + dateTo.toLocaleTimeString() + '" disabled>' +
      '</div>' +
      '</div>' +
      '      </div>' +
      ' </div> ' +
      '  </div> ' +
      '<input type="submit" style="opacity: 0; visibility: hidden;">' +
      '<h5 data-i18n="modal.share.settings.selectStreams"></h5>' +
      '');
    var $form = $('#form-create-sharing', this.$el),
      $name = $('#input-name', this.$el);
    $form.submit(this.createSharing.bind(this));
    $name.bind('change paste keyup', function () {
      //$token.val(slugMe($name.val()));
    });
  },
  createSharing: function (e, $btn) {
    e.preventDefault();
    $btn = $btn || $('#publish');
    var $name = $('#input-name', this.$el),
      $token = $('#input-token', this.$el),
      $permission = $('#input-global-permission', this.$el),
      $spin = $('.fa-spin', $btn);
    var access = {}, name = $name.val().trim(), token = $token.val().trim(),
      permission = $permission.val();
    if (name.length === 0) {
      $('#form-create-sharing', this.$el).find(':submit').click();
      return;
    }
    if (permission !== 'read' || permission !== 'manage' || permission !== 'contribute') {
      permission = 'read';
    }
    access.name = name;
    access.token = token;
    access.permissions = [];
    if ($spin) {
      $spin.show();
    }
    eachStream(this.collection, function (model) {
      if (model.get('checked')) {
        access.permissions.push({streamId : model.get('id'), level: permission});
      }
    });
    this.options.connection.accesses.create(access, function (error, result) {
      if ($spin) {
        $spin.hide();
      }
      if (error || result.message) {
        $btn.removeClass('btn-primary');
        $btn.addClass('btn-danger');
      } else {
        $btn.removeClass('btn-primary');
        $btn.addClass('btn-success');
        this.trigger('sharing:createSuccess', result.token);
      }
    }.bind(this));
  }
});
var TreeNode = Backbone.Model.extend({
  defaults : {
    checked: true
  },
  initialize: function () {
    var children = this.get('children');
    var c = [];
    if (!children && this.get('connection') && this.get('childrenIds')) {
      _.each(this.get('childrenIds'), function (childId) {
        c.push(this.get('connection').streams.getById(childId));
      }.bind(this));
      children = c;
    }
    if (children) {
      this.children = new TreeNodeCollection(children);
      //this.unset('children');
    }
  }
});
var TreeNodeCollection = Backbone.Collection.extend({
  model: TreeNode
});
var Controller = module.exports = function ($modal, connection, streams, timeFilter, target) {
  this.$modal = $modal;
  this.target = target;
  this.connection = connection;

  this.streams = streams;
  this.timeFrom = timeFilter[1];
  this.timeTo = timeFilter[0];
  this.container = '.modal-content';
  this.treeView = null;
  // TODO: ignore stream if  stream.parentId is already present
};
Controller.prototype.show = function () {
  this.$modal.modal({currentTarget: this.target});
  $(this.container).empty().hide();
  setTimeout(function () {
    $(this.container).fadeIn();
  }.bind(this), 500);
  var tree = new TreeNodeCollection(this.streams);
  this.treeView = new TreeRoot({
    collection: tree,
    timeFrom: this.timeFrom,
    timeTo: this.timeTo,
    connection: this.connection
  });
  this.treeView.render();
  $(this.container).prepend('<div class="modal-header">  ' +
    '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">' +
    '&times;</button> ' +
    '<h4 class="modal-title" id="myModalLabel" data-i18n="modal.share.header"></h4>' +
    '<div class="modal-close"></div> ' +
    '</div><div id="modal-content"><div id="creation-content"></div>' +
    '<div id="creation-footer" class="col-md-12">' +
    '<button id="publish" class="btn btn-pryv-turquoise">' +
    '<span data-i18n="button.publish"></span> ' +
    '<i class="fa fa-spinner fa-spin" style="display: none;"></i></button>' +
    '<button id="cancel" class="btn" data-dismiss="modal" data-i18n="button.cancel"></button>' +
    '</div></div>');
  $('#creation-content').html(this.treeView.el);
  $('body').i18n();
  $('#publish').click(function (e) {
    this.treeView.createSharing(e, $('#publish'));
  }.bind(this));
  this.treeView.on('sharing:createSuccess', function (token) {
    $('#publish').remove();
    $('#cancel').text('Ok').addClass('btn-pryv-turquoise');
    $('#creation-content').empty();
    var url = this.connection.id.replace(/\?auth.*$/, '');
    url = url.replace(/\.in/, '.li');
    url = url.replace(/\.io/, '.me');
    url += '#/sharings/' + token;
    $('#creation-content').html('<div class="container">' +
      '<h4 data-i18n="modal.share.success"></h4>' +
      '<h3 class="share-link"><a href="' + url + '">' + url + '</a></h3>' +
      '<p class="text-center share">' +
      '<a target="_blank" href="https://www.facebook.com/sharer.php?u=' +
      url.replace(/#/g, '%23') + '&t=" ' +
      'onclick="javascript:window.open(this.href, \'\', ' +
      '\'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=400,width=700\');' +
      'return false;">' +
      '<i class="fa fa-facebook"></i></a>' +
      '<a target="_blank" href="https://twitter.com/share?url=' +
      url.replace(/#/g, '%23') + '&via=pryv" ' +
      'onclick="javascript:window.open(this.href, \'\', ' +
      '\'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=400,width=700\');' +
      'return false;">' +
      '<i class="fa fa-twitter"></i></a>' +
      '<a href="mailto:?subject=Slice of life&amp;body=' +
      'I just shared a slice of life with you: ' + url +
      '" title="Share by Email">' +
      '<i class="fa fa-envelope"></i></a>' +
      '</p></div>');
    $('body').i18n();
  }.bind(this));
};
Controller.prototype.close = function () {
  this.treeView.close();
  $(this.container).empty();
};
})()
},{"backbone":30,"backbone.marionette":32,"underscore":9}],26:[function(require,module,exports){
(function(){/* global window, $ */
var _ = require('underscore'),
  ListView = require('./ListView.js'),
  ChartView = require('./../numericals/ChartView.js'),
  Model = require('./../numericals/ChartModel.js'),
  TimeSeriesCollection = require('./../numericals/TimeSeriesCollection.js'),
  TimeSeriesModel = require('./../numericals/TimeSeriesModel.js');

var Controller = module.exports = function ($modal, events, treemap) {
  this.$modal = $modal;
  this.events = events;
  this.treemap = treemap;
  this.datas = {};
  this.chartView = null;

  // Very important hack flag.
  this.initial = true;
  this.called = false;

  /* Base event containers */
  this.eventsToAdd = [];
  this.eventsToRem = [];
  this.eventsToCha = [];

  this.chartCollection = new TimeSeriesCollection([], {type: 'All'});
  this.eventCollections = {
    note: new TimeSeriesCollection([], {type: 'Note'}),
    picture: new TimeSeriesCollection([], {type: 'Pictures'}),
    position: new TimeSeriesCollection([], {type: 'Positions'}),
    numerical: new TimeSeriesCollection([], {type: 'Numericals'})
  };

  this.eventCollectionsViews = {
    note: null,
    picture: null,
    position: null,
    numerical: null
  };

  for (var e in events) {
    if (events.hasOwnProperty(e)) {
      this.eventEnter(events[e]);
    }
  }

  this.$content = $modal.find('.modal-content');

  // Create the div we will use
  this.$content.html($('#template-draganddrop').html());
  this.resizeModal();

  $('.modal-dnd-list').append('<ul></ul>');
  $(window).resize(this.resizeModal.bind(this));
};

_.extend(Controller.prototype, {

  show: function () {
    if (this.initial) {
      this.called = true;
      return;
    }
    this.$modal.modal();
    this.eventCollectionsViews.note =
      new ListView({collection: this.eventCollections.note });
    this.eventCollectionsViews.picture =
      new ListView({collection: this.eventCollections.picture });
    this.eventCollectionsViews.position =
      new ListView({collection: this.eventCollections.position });
    this.eventCollectionsViews.numerical =
      new ListView({collection: this.eventCollections.numerical });

    this.chartView = new ChartView({model:
      new Model({
        container: '.modal-dnd-chart',
        view: null,
        requiresDim: false,
        collection: this.chartCollection,
        highlighted: false,
        highlightedTime: null,
        allowPieChart: false,
        dimensions: null,
        legendContainer: '.modal-dnd-legend',
        legendStyle: 'list', // Legend style: 'list', 'table'
        legendButton: true,  // A button in the legend
        legendButtonContent: ['remove'],
        legendShow: true,     // Show legend or not
        legendExtras: true,   // use extras in the legend
        onClick: false,
        onHover: true,
        onDnD: false,
        allowPan: false,      // Allows navigation through the chart
        allowZoom: false,     // Allows zooming on the chart
        xaxis: true,
        showNodeCount: false
      })});

    this.chartView.render();

    this.chartView.on('remove', function (m) {
      this.chartCollection.remove(m);
      var e = {type: m.get('type')};
      var c = this.getTimeSeriesCollectionByEvent(e);
      c.add(m);

      this.eventCollectionsViews.note.render();
      this.eventCollectionsViews.position.render();
      this.eventCollectionsViews.picture.render();
      this.eventCollectionsViews.numerical.render();

    }.bind(this));

    var $ul = $('.modal-dnd-list ul');
    var el;

    if (this.eventCollections.note.notNull) {
      $ul.append('<li>');
      $('li:last', $ul).text('Notes');
      this.eventCollectionsViews.note.ul = $('li:last', $ul);
      this.eventCollectionsViews.note.render();
      el = this.eventCollectionsViews.note.el;
      $('li:last', $ul).append(el);
    }

    if (this.eventCollections.picture.notNull) {
      $ul.append('<li>');
      $('li:last', $ul).text('Pictures');
      this.eventCollectionsViews.picture.ul = $('li:last', $ul);
      this.eventCollectionsViews.picture.render();
      el = this.eventCollectionsViews.picture.el;
      $('li:last', $ul).append(el);
    }

    if (this.eventCollections.position.notNull) {
      $ul.append('<li>');
      $('li:last', $ul).text('Positions');
      this.eventCollectionsViews.position.ul = $('li:last', $ul);
      this.eventCollectionsViews.position.render();
      el = this.eventCollectionsViews.position.el;
      $('li:last', $ul).append(el);
    }

    if (this.eventCollections.numerical.notNull) {
      $ul.append('<li>');
      $('li:last', $ul).text('Numericals');
      this.eventCollectionsViews.numerical.ul = $('li:last', $ul);
      this.eventCollectionsViews.numerical.render();
      el = this.eventCollectionsViews.numerical.el;
      $('li:last', $ul).append(el);
    }

    this.eventCollectionsViews.note.on('itemview:series:click', function (evt) {
      this.addSerieToChart(evt.model);
      this.eventCollections.note.remove(evt.model);
    }.bind(this));

    this.eventCollectionsViews.picture.on('itemview:series:click', function (evt) {
      this.addSerieToChart(evt.model);
      this.eventCollections.picture.remove(evt.model);
    }.bind(this));

    this.eventCollectionsViews.position.on('itemview:series:click', function (evt) {
      this.addSerieToChart(evt.model);
      this.eventCollections.position.remove(evt.model);
    }.bind(this));

    this.eventCollectionsViews.numerical.on('itemview:series:click', function (evt) {
      this.addSerieToChart(evt.model);
      this.eventCollections.numerical.remove(evt.model);
    }.bind(this));

    $('#dnd-btn-cancel').bind('click', function () {
      this.close();
      this.$modal.modal('hide');
    }.bind(this));

    $('#dnd-field-name').bind('input', function () {
      var val = $('#dnd-field-name').val();
      if (val.length > 0) {
        $('.modal-dnd-footer').removeClass('has-error');
        $('.modal-dnd-footer').addClass('has-success');
      } else {
        $('.modal-dnd-footer').removeClass('has-success');
        $('.modal-dnd-footer').addClass('has-error');
      }
    });

    $('#dnd-btn-create').bind('click', function () {
      var errors = 0;
      var vn_filters = [];
      var vn_name = $('#dnd-field-name').val();

      this.chartCollection.each(function (e) {
        vn_filters.push({stream: e.get('events')[0].stream, type: e.get('type')});
      });

      if (!vn_name) {
        errors++;
      }

      if (vn_filters.length === 0) {
        errors++;
      }

      if (errors > 0) {
        return;
      } else {
        this.treemap.createVirtualNode(vn_filters, vn_name);
        this.close();
        $('#pryv-modal').hide().removeClass('in').attr('aria-hidden', 'true');
        $('.modal-backdrop').remove();
      }
    }.bind(this));
  },



  /* Base event functions */
  eventEnter: function (event) {
    this.events[event.id] = event;
    if (!this.datas[event.streamId]) {
      this.datas[event.streamId] = {};
    }
    if (!this.datas[event.streamId][event.type]) {
      this.datas[event.streamId][event.type] = {};
    }
    this.datas[event.streamId][event.type][event.id] = event;
    this.eventsToAdd.push(event);
    this.debounceUpdateCollections();
  },

  eventLeave: function (event) {
    if (this.events[event.id]) {
      delete this.events[event.id];
    }
    if (this.datas[event.streamId] &&
      this.datas[event.streamId][event.type] &&
      this.datas[event.streamId][event.type][event.id]) {
      delete this.datas[event.streamId][event.type][event.id];
    }
    this.eventsToRem.push(event);
    this.debounceUpdateCollections();
  },

  eventChange: function (event) {
    if (this.events[event.id]) {
      this.events[event.id] = event;
    }
    if (this.datas[event.streamId] &&
      this.datas[event.streamId][event.type] &&
      this.datas[event.streamId][event.type][event.id]) {
      this.datas[event.streamId][event.type][event.id] = event;
    }
    this.eventsToCha.push(event);
    this.debounceUpdateCollections();
  },

  debounceUpdateCollections: _.debounce(function () {
    var eventsToAdd = this.eventsToAdd;
    var eventsToRem = this.eventsToRem;
    var eventsToCha = this.eventsToCha;

    var eventsCategory;
    var eventsCollection;
    var eventsModel;
    var events;
    var matching;

    this.eventsToAdd = [];
    this.eventsToRem = [];
    this.eventsToCha = [];

    var i;
    var eIter;

    // Process those to add
    for (i = 0; i < eventsToAdd.length; ++i) {
      var filter = {
        connectionId: eventsToAdd[i].connection.id,
        streamId: eventsToAdd[i].streamId,
        type: eventsToAdd[i].type
      };
      eventsCategory = this.getEventsCategory(eventsToAdd[i]);
      eventsCollection = this.getTimeSeriesCollectionByEvent(eventsToAdd[i]);
      if (eventsCollection) {
        // find corresponding model
        matching = eventsCollection.where(filter);
        if (matching && matching.length !== 0) {
          eventsModel = matching[0];
          eventsModel.get('events').push(eventsToAdd[i]);
        } else {
          eventsModel = new TimeSeriesModel({
            events: [eventsToAdd[i]],
            connectionId: eventsToAdd[i].connection.id,
            streamId: eventsToAdd[i].streamId,
            streamName: eventsToAdd[i].stream.name,
            type: eventsToAdd[i].type,
            category: this.getEventsCategory(eventsToAdd[i])
          });
          eventsCollection.add(eventsModel);
        }
      }
    }

    // Process those to remove
    for (i = 0; i < eventsToRem.length; ++i) {
      eventsCategory = this.getEventsCategory(eventsToRem[i]);
      eventsCollection = this.getTimeSeriesCollectionByEvent(eventsToRem[i]);
      if (eventsCollection) {
        // find corresponding model
        matching = eventsCollection.where({
          connectionId: eventsToRem[i].connection.id,
          streamId: eventsToRem[i].streamId,
          type: eventsToRem[i].type
        });
        if (matching && matching.length !== 0) {
          eventsModel = matching[0];
          events = eventsModel.get('events');
          for (eIter = 0; eIter < events.length; ++eIter) {
            if (events[eIter].id === eventsToRem[i].id) {
              delete events[eIter];
            }
          }
        }
      }
    }

    // Process those to change
    for (i = 0; i < eventsToCha.length; ++i) {
      eventsCategory = this.getEventsCategory(eventsToCha[i]);
      eventsCollection = this.getTimeSeriesCollectionByEvent(eventsToCha[i]);
      if (eventsCollection) {
        // find corresponding model
        matching = eventsCollection.where({
          connectionId: eventsToCha[i].connection.id,
          streamId: eventsToCha[i].streamId,
          type: eventsToCha[i].type
        });
        if (matching && matching.length !== 0) {
          eventsModel = matching[0];
          events = eventsModel.get('events');
          for (eIter = 0; eIter < events.length; ++eIter) {
            if (events[eIter].id === eventsToCha[i].id) {
              events[eIter] = eventsToCha[i];
            }
          }
        }
      }
    }

    if (this.initial) {
      this.initial = false;
      this.eventCollections.note.each(function (m) {
        this.addSerieToChart(m);
      }.bind(this));
      this.eventCollections.numerical.each(function (m) {
        this.addSerieToChart(m);
      }.bind(this));
      this.eventCollections.picture.each(function (m) {
        this.addSerieToChart(m);
      }.bind(this));
      this.eventCollections.position.each(function (m) {
        this.addSerieToChart(m);
      }.bind(this));

      var m = null;
      while (this.eventCollections.note.length !== 0) {
        this.eventCollections.note.notNull = true;
        m = this.eventCollections.note.at(0);
        this.eventCollections.note.remove(m);
      }
      while (this.eventCollections.numerical.length !== 0) {
        this.eventCollections.numerical.notNull = true;
        m = this.eventCollections.numerical.at(0);
        this.eventCollections.numerical.remove(m);
      }
      while (this.eventCollections.picture.length !== 0) {
        this.eventCollections.picture.notNull = true;
        m = this.eventCollections.picture.at(0);
        this.eventCollections.picture.remove(m);
      }
      while (this.eventCollections.position.length !== 0) {
        this.eventCollections.position.notNull = true;
        m = this.eventCollections.position.at(0);
        this.eventCollections.position.remove(m);
      }
      if (this.called) {

        this.show();
      }
    }
  }, 100),

  getEventsCategory: function (event) {
    if (this.eventIsNote(event)) {
      return 'note';
    } else if (this.eventIsNumerical(event)) {
      return 'numerical';
    } else if (this.eventIsPicture(event)) {
      return 'picture';
    } else if (this.eventIsPosition(event)) {
      return 'position';
    } else {
      return null;
    }
  },

  getTimeSeriesCollectionByEvent: function (event) {
    if (this.eventIsNote(event)) {
      return this.eventCollections.note;
    } else if (this.eventIsNumerical(event)) {
      return this.eventCollections.numerical;
    } else if (this.eventIsPicture(event)) {
      return this.eventCollections.picture;
    } else if (this.eventIsPosition(event)) {
      return this.eventCollections.position;
    } else {
      return null;
    }
  },

  /* Functions to the event category */
  eventIsNote: function (e) {
    var eventType = e.type;
    return (eventType === 'note/txt' || eventType === 'note/text');
  },

  eventIsNumerical: function (e) {
    var eventTypeClass = e.type.split('/')[0];
    return (
      eventTypeClass === 'money' ||
        eventTypeClass === 'absorbed-dose' ||
        eventTypeClass === 'absorbed-dose-equivalent' ||
        eventTypeClass === 'absorbed-dose-rate' ||
        eventTypeClass === 'absorbed-dose-rate' ||
        eventTypeClass === 'area' ||
        eventTypeClass === 'capacitance' ||
        eventTypeClass === 'catalytic-activity' ||
        eventTypeClass === 'count' ||
        eventTypeClass === 'data-quantity' ||
        eventTypeClass === 'density' ||
        eventTypeClass === 'dynamic-viscosity' ||
        eventTypeClass === 'electric-charge' ||
        eventTypeClass === 'electric-charge-line-density' ||
        eventTypeClass === 'electric-current' ||
        eventTypeClass === 'electrical-conductivity' ||
        eventTypeClass === 'electromotive-force' ||
        eventTypeClass === 'energy' ||
        eventTypeClass === 'force' ||
        eventTypeClass === 'length' ||
        eventTypeClass === 'luminous-intensity' ||
        eventTypeClass === 'mass' ||
        eventTypeClass === 'mol' ||
        eventTypeClass === 'power' ||
        eventTypeClass === 'pressure' ||
        eventTypeClass === 'speed' ||
        eventTypeClass === 'temperature' ||
        eventTypeClass === 'volume'
      );
  },

  eventIsPicture: function (e) {
    var eventType = e.type;
    return (eventType === 'note/txt' || eventType === 'note/text');
  },

  eventIsPosition: function (e) {
    var eventType = e.type;
    return (eventType === 'note/txt' || eventType === 'note/text');
  },

  close: function () {
    this.chartView.close();
    $('#pryv-modal').hide().removeClass('in').attr('aria-hidden', 'true');
    $('.modal-backdrop').remove();
    this.$modal.find('.modal-content').empty();
  },


  /**
   * Adder functions
   */

  addSerieToChart: function (m) {
    this.chartCollection.add(m);
  },

  resizeModal: _.debounce(function () {
    this.chartView.render();
  }, 250)
});

})()
},{"./../numericals/ChartModel.js":86,"./../numericals/ChartView.js":85,"./../numericals/TimeSeriesCollection.js":87,"./../numericals/TimeSeriesModel.js":88,"./ListView.js":84,"underscore":9}],49:[function(require,module,exports){
/**
 * DataStore handles in memory caching of objects.
 * @private
 */

var _ = require('underscore');

function Datastore(connection) {
  this.connection = connection;
  this.streamsIndex = {}; // streams are linked to their object representation
  this.eventIndex = {}; // events are store by their id
  this.rootStreams = [];
}

module.exports = Datastore;

Datastore.prototype.init = function (callback) {
  this.connection.streams._getObjects({state: 'all'}, function (error, result) {
    if (error) { return callback('Datastore faild to init - '  + error); }
    if (result) {
      this._rebuildStreamIndex(result); // maybe done transparently
    }
    callback(null, result);
  }.bind(this));

  // TODO activate monitoring
};

Datastore.prototype._rebuildStreamIndex = function (streamArray) {
  this.streamsIndex = {};
  this.rootStreams = [];
  this._indexStreamArray(streamArray);
};

Datastore.prototype._indexStreamArray = function (streamArray) {
  _.each(streamArray, function (stream) {
    this.indexStream(stream);
  }.bind(this));
};

Datastore.prototype.indexStream = function (stream) {
  this.streamsIndex[stream.id] = stream;
  if (! stream.parentId) { this.rootStreams.push(stream); }
  this._indexStreamArray(stream._children);
  delete stream._children; // cleanup when in datastore mode
  delete stream._parent;
};

/**
 *
 * @param streamId
 * @returns Stream or null if not found
 */
Datastore.prototype.getStreams = function () {
  return this.rootStreams;
};


/**
 *
 * @param streamId
 * @param test (do no throw error if Stream is not found
 * @returns Stream or null if not found
 */
Datastore.prototype.getStreamById = function (streamId, test) {
  var result = this.streamsIndex[streamId];
  if (! test && ! result) {
    throw new Error('Datastore.getStreamById cannot find stream with id: ' + streamId);
  }
  return result;
};

//-------------------------

/**
 * @param serialId
 * @returns Event or null if not found
 */
Datastore.prototype.getEventBySerialId = function (serialId) {
  return this.eventIndex[serialId];
};

/**
 * @param eventID
 * @returns Event or null if not found
 */
Datastore.prototype.getEventById = function (eventId) {
  var result = null;
  _.each(this.eventIndex, function (event /*,eventId*/) {
    if (event.id === eventId) { result = event; }
    // TODO optimize and break
  }.bind(this));
  return result;
};

/**
 * @returns allEvents
 */
Datastore.prototype.getAllEvents = function () {
  return _.value(this.eventIndex);
};

/**
 * @param event
 */
Datastore.prototype.addEvent = function (event) {
  this.eventIndex[event.serialId] = event;
};




},{"underscore":43}],83:[function(require,module,exports){
(function(){/*! Socket.IO.js build:0.9.16, development. Copyright(c) 2011 LearnBoost <dev@learnboost.com> MIT Licensed */

var io = ('undefined' === typeof module ? {} : module.exports);
(function() {

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, global) {

  /**
   * IO namespace.
   *
   * @namespace
   */

  var io = exports;

  /**
   * Socket.IO version
   *
   * @api public
   */

  io.version = '0.9.16';

  /**
   * Protocol implemented.
   *
   * @api public
   */

  io.protocol = 1;

  /**
   * Available transports, these will be populated with the available transports
   *
   * @api public
   */

  io.transports = [];

  /**
   * Keep track of jsonp callbacks.
   *
   * @api private
   */

  io.j = [];

  /**
   * Keep track of our io.Sockets
   *
   * @api private
   */
  io.sockets = {};


  /**
   * Manages connections to hosts.
   *
   * @param {String} uri
   * @Param {Boolean} force creation of new socket (defaults to false)
   * @api public
   */

  io.connect = function (host, details) {
    var uri = io.util.parseUri(host)
      , uuri
      , socket;

    if (global && global.location) {
      uri.protocol = uri.protocol || global.location.protocol.slice(0, -1);
      uri.host = uri.host || (global.document
        ? global.document.domain : global.location.hostname);
      uri.port = uri.port || global.location.port;
    }

    uuri = io.util.uniqueUri(uri);

    var options = {
        host: uri.host
      , secure: 'https' == uri.protocol
      , port: uri.port || ('https' == uri.protocol ? 443 : 80)
      , query: uri.query || ''
    };

    io.util.merge(options, details);

    if (options['force new connection'] || !io.sockets[uuri]) {
      socket = new io.Socket(options);
    }

    if (!options['force new connection'] && socket) {
      io.sockets[uuri] = socket;
    }

    socket = socket || io.sockets[uuri];

    // if path is different from '' or /
    return socket.of(uri.path.length > 1 ? uri.path : '');
  };

})('object' === typeof module ? module.exports : (this.io = {}), this);
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, global) {

  /**
   * Utilities namespace.
   *
   * @namespace
   */

  var util = exports.util = {};

  /**
   * Parses an URI
   *
   * @author Steven Levithan <stevenlevithan.com> (MIT license)
   * @api public
   */

  var re = /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;

  var parts = ['source', 'protocol', 'authority', 'userInfo', 'user', 'password',
               'host', 'port', 'relative', 'path', 'directory', 'file', 'query',
               'anchor'];

  util.parseUri = function (str) {
    var m = re.exec(str || '')
      , uri = {}
      , i = 14;

    while (i--) {
      uri[parts[i]] = m[i] || '';
    }

    return uri;
  };

  /**
   * Produces a unique url that identifies a Socket.IO connection.
   *
   * @param {Object} uri
   * @api public
   */

  util.uniqueUri = function (uri) {
    var protocol = uri.protocol
      , host = uri.host
      , port = uri.port;

    if ('document' in global) {
      host = host || document.domain;
      port = port || (protocol == 'https'
        && document.location.protocol !== 'https:' ? 443 : document.location.port);
    } else {
      host = host || 'localhost';

      if (!port && protocol == 'https') {
        port = 443;
      }
    }

    return (protocol || 'http') + '://' + host + ':' + (port || 80);
  };

  /**
   * Mergest 2 query strings in to once unique query string
   *
   * @param {String} base
   * @param {String} addition
   * @api public
   */

  util.query = function (base, addition) {
    var query = util.chunkQuery(base || '')
      , components = [];

    util.merge(query, util.chunkQuery(addition || ''));
    for (var part in query) {
      if (query.hasOwnProperty(part)) {
        components.push(part + '=' + query[part]);
      }
    }

    return components.length ? '?' + components.join('&') : '';
  };

  /**
   * Transforms a querystring in to an object
   *
   * @param {String} qs
   * @api public
   */

  util.chunkQuery = function (qs) {
    var query = {}
      , params = qs.split('&')
      , i = 0
      , l = params.length
      , kv;

    for (; i < l; ++i) {
      kv = params[i].split('=');
      if (kv[0]) {
        query[kv[0]] = kv[1];
      }
    }

    return query;
  };

  /**
   * Executes the given function when the page is loaded.
   *
   *     io.util.load(function () { console.log('page loaded'); });
   *
   * @param {Function} fn
   * @api public
   */

  var pageLoaded = false;

  util.load = function (fn) {
    if ('document' in global && document.readyState === 'complete' || pageLoaded) {
      return fn();
    }

    util.on(global, 'load', fn, false);
  };

  /**
   * Adds an event.
   *
   * @api private
   */

  util.on = function (element, event, fn, capture) {
    if (element.attachEvent) {
      element.attachEvent('on' + event, fn);
    } else if (element.addEventListener) {
      element.addEventListener(event, fn, capture);
    }
  };

  /**
   * Generates the correct `XMLHttpRequest` for regular and cross domain requests.
   *
   * @param {Boolean} [xdomain] Create a request that can be used cross domain.
   * @returns {XMLHttpRequest|false} If we can create a XMLHttpRequest.
   * @api private
   */

  util.request = function (xdomain) {

    if (xdomain && 'undefined' != typeof XDomainRequest && !util.ua.hasCORS) {
      return new XDomainRequest();
    }

    if ('undefined' != typeof XMLHttpRequest && (!xdomain || util.ua.hasCORS)) {
      return new XMLHttpRequest();
    }

    if (!xdomain) {
      try {
        return new window[(['Active'].concat('Object').join('X'))]('Microsoft.XMLHTTP');
      } catch(e) { }
    }

    return null;
  };

  /**
   * XHR based transport constructor.
   *
   * @constructor
   * @api public
   */

  /**
   * Change the internal pageLoaded value.
   */

  if ('undefined' != typeof window) {
    util.load(function () {
      pageLoaded = true;
    });
  }

  /**
   * Defers a function to ensure a spinner is not displayed by the browser
   *
   * @param {Function} fn
   * @api public
   */

  util.defer = function (fn) {
    if (!util.ua.webkit || 'undefined' != typeof importScripts) {
      return fn();
    }

    util.load(function () {
      setTimeout(fn, 100);
    });
  };

  /**
   * Merges two objects.
   *
   * @api public
   */

  util.merge = function merge (target, additional, deep, lastseen) {
    var seen = lastseen || []
      , depth = typeof deep == 'undefined' ? 2 : deep
      , prop;

    for (prop in additional) {
      if (additional.hasOwnProperty(prop) && util.indexOf(seen, prop) < 0) {
        if (typeof target[prop] !== 'object' || !depth) {
          target[prop] = additional[prop];
          seen.push(additional[prop]);
        } else {
          util.merge(target[prop], additional[prop], depth - 1, seen);
        }
      }
    }

    return target;
  };

  /**
   * Merges prototypes from objects
   *
   * @api public
   */

  util.mixin = function (ctor, ctor2) {
    util.merge(ctor.prototype, ctor2.prototype);
  };

  /**
   * Shortcut for prototypical and static inheritance.
   *
   * @api private
   */

  util.inherit = function (ctor, ctor2) {
    function f() {};
    f.prototype = ctor2.prototype;
    ctor.prototype = new f;
  };

  /**
   * Checks if the given object is an Array.
   *
   *     io.util.isArray([]); // true
   *     io.util.isArray({}); // false
   *
   * @param Object obj
   * @api public
   */

  util.isArray = Array.isArray || function (obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
  };

  /**
   * Intersects values of two arrays into a third
   *
   * @api public
   */

  util.intersect = function (arr, arr2) {
    var ret = []
      , longest = arr.length > arr2.length ? arr : arr2
      , shortest = arr.length > arr2.length ? arr2 : arr;

    for (var i = 0, l = shortest.length; i < l; i++) {
      if (~util.indexOf(longest, shortest[i]))
        ret.push(shortest[i]);
    }

    return ret;
  };

  /**
   * Array indexOf compatibility.
   *
   * @see bit.ly/a5Dxa2
   * @api public
   */

  util.indexOf = function (arr, o, i) {

    for (var j = arr.length, i = i < 0 ? i + j < 0 ? 0 : i + j : i || 0;
         i < j && arr[i] !== o; i++) {}

    return j <= i ? -1 : i;
  };

  /**
   * Converts enumerables to array.
   *
   * @api public
   */

  util.toArray = function (enu) {
    var arr = [];

    for (var i = 0, l = enu.length; i < l; i++)
      arr.push(enu[i]);

    return arr;
  };

  /**
   * UA / engines detection namespace.
   *
   * @namespace
   */

  util.ua = {};

  /**
   * Whether the UA supports CORS for XHR.
   *
   * @api public
   */

  util.ua.hasCORS = 'undefined' != typeof XMLHttpRequest && (function () {
    try {
      var a = new XMLHttpRequest();
    } catch (e) {
      return false;
    }

    return a.withCredentials != undefined;
  })();

  /**
   * Detect webkit.
   *
   * @api public
   */

  util.ua.webkit = 'undefined' != typeof navigator
    && /webkit/i.test(navigator.userAgent);

   /**
   * Detect iPad/iPhone/iPod.
   *
   * @api public
   */

  util.ua.iDevice = 'undefined' != typeof navigator
      && /iPad|iPhone|iPod/i.test(navigator.userAgent);

})('undefined' != typeof io ? io : module.exports, this);
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.EventEmitter = EventEmitter;

  /**
   * Event emitter constructor.
   *
   * @api public.
   */

  function EventEmitter () {};

  /**
   * Adds a listener
   *
   * @api public
   */

  EventEmitter.prototype.on = function (name, fn) {
    if (!this.$events) {
      this.$events = {};
    }

    if (!this.$events[name]) {
      this.$events[name] = fn;
    } else if (io.util.isArray(this.$events[name])) {
      this.$events[name].push(fn);
    } else {
      this.$events[name] = [this.$events[name], fn];
    }

    return this;
  };

  EventEmitter.prototype.addListener = EventEmitter.prototype.on;

  /**
   * Adds a volatile listener.
   *
   * @api public
   */

  EventEmitter.prototype.once = function (name, fn) {
    var self = this;

    function on () {
      self.removeListener(name, on);
      fn.apply(this, arguments);
    };

    on.listener = fn;
    this.on(name, on);

    return this;
  };

  /**
   * Removes a listener.
   *
   * @api public
   */

  EventEmitter.prototype.removeListener = function (name, fn) {
    if (this.$events && this.$events[name]) {
      var list = this.$events[name];

      if (io.util.isArray(list)) {
        var pos = -1;

        for (var i = 0, l = list.length; i < l; i++) {
          if (list[i] === fn || (list[i].listener && list[i].listener === fn)) {
            pos = i;
            break;
          }
        }

        if (pos < 0) {
          return this;
        }

        list.splice(pos, 1);

        if (!list.length) {
          delete this.$events[name];
        }
      } else if (list === fn || (list.listener && list.listener === fn)) {
        delete this.$events[name];
      }
    }

    return this;
  };

  /**
   * Removes all listeners for an event.
   *
   * @api public
   */

  EventEmitter.prototype.removeAllListeners = function (name) {
    if (name === undefined) {
      this.$events = {};
      return this;
    }

    if (this.$events && this.$events[name]) {
      this.$events[name] = null;
    }

    return this;
  };

  /**
   * Gets all listeners for a certain event.
   *
   * @api publci
   */

  EventEmitter.prototype.listeners = function (name) {
    if (!this.$events) {
      this.$events = {};
    }

    if (!this.$events[name]) {
      this.$events[name] = [];
    }

    if (!io.util.isArray(this.$events[name])) {
      this.$events[name] = [this.$events[name]];
    }

    return this.$events[name];
  };

  /**
   * Emits an event.
   *
   * @api public
   */

  EventEmitter.prototype.emit = function (name) {
    if (!this.$events) {
      return false;
    }

    var handler = this.$events[name];

    if (!handler) {
      return false;
    }

    var args = Array.prototype.slice.call(arguments, 1);

    if ('function' == typeof handler) {
      handler.apply(this, args);
    } else if (io.util.isArray(handler)) {
      var listeners = handler.slice();

      for (var i = 0, l = listeners.length; i < l; i++) {
        listeners[i].apply(this, args);
      }
    } else {
      return false;
    }

    return true;
  };

})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

/**
 * Based on JSON2 (http://www.JSON.org/js.html).
 */

(function (exports, nativeJSON) {
  "use strict";

  // use native JSON if it's available
  if (nativeJSON && nativeJSON.parse){
    return exports.JSON = {
      parse: nativeJSON.parse
    , stringify: nativeJSON.stringify
    };
  }

  var JSON = exports.JSON = {};

  function f(n) {
      // Format integers to have at least two digits.
      return n < 10 ? '0' + n : n;
  }

  function date(d, key) {
    return isFinite(d.valueOf()) ?
        d.getUTCFullYear()     + '-' +
        f(d.getUTCMonth() + 1) + '-' +
        f(d.getUTCDate())      + 'T' +
        f(d.getUTCHours())     + ':' +
        f(d.getUTCMinutes())   + ':' +
        f(d.getUTCSeconds())   + 'Z' : null;
  };

  var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
      escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
      gap,
      indent,
      meta = {    // table of character substitutions
          '\b': '\\b',
          '\t': '\\t',
          '\n': '\\n',
          '\f': '\\f',
          '\r': '\\r',
          '"' : '\\"',
          '\\': '\\\\'
      },
      rep;


  function quote(string) {

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

      escapable.lastIndex = 0;
      return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
          var c = meta[a];
          return typeof c === 'string' ? c :
              '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
      }) + '"' : '"' + string + '"';
  }


  function str(key, holder) {

// Produce a string from holder[key].

      var i,          // The loop counter.
          k,          // The member key.
          v,          // The member value.
          length,
          mind = gap,
          partial,
          value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

      if (value instanceof Date) {
          value = date(key);
      }

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

      if (typeof rep === 'function') {
          value = rep.call(holder, key, value);
      }

// What happens next depends on the value's type.

      switch (typeof value) {
      case 'string':
          return quote(value);

      case 'number':

// JSON numbers must be finite. Encode non-finite numbers as null.

          return isFinite(value) ? String(value) : 'null';

      case 'boolean':
      case 'null':

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce 'null'. The case is included here in
// the remote chance that this gets fixed someday.

          return String(value);

// If the type is 'object', we might be dealing with an object or an array or
// null.

      case 'object':

// Due to a specification blunder in ECMAScript, typeof null is 'object',
// so watch out for that case.

          if (!value) {
              return 'null';
          }

// Make an array to hold the partial results of stringifying this object value.

          gap += indent;
          partial = [];

// Is the value an array?

          if (Object.prototype.toString.apply(value) === '[object Array]') {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

              length = value.length;
              for (i = 0; i < length; i += 1) {
                  partial[i] = str(i, value) || 'null';
              }

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

              v = partial.length === 0 ? '[]' : gap ?
                  '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' :
                  '[' + partial.join(',') + ']';
              gap = mind;
              return v;
          }

// If the replacer is an array, use it to select the members to be stringified.

          if (rep && typeof rep === 'object') {
              length = rep.length;
              for (i = 0; i < length; i += 1) {
                  if (typeof rep[i] === 'string') {
                      k = rep[i];
                      v = str(k, value);
                      if (v) {
                          partial.push(quote(k) + (gap ? ': ' : ':') + v);
                      }
                  }
              }
          } else {

// Otherwise, iterate through all of the keys in the object.

              for (k in value) {
                  if (Object.prototype.hasOwnProperty.call(value, k)) {
                      v = str(k, value);
                      if (v) {
                          partial.push(quote(k) + (gap ? ': ' : ':') + v);
                      }
                  }
              }
          }

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

          v = partial.length === 0 ? '{}' : gap ?
              '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' :
              '{' + partial.join(',') + '}';
          gap = mind;
          return v;
      }
  }

// If the JSON object does not yet have a stringify method, give it one.

  JSON.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

      var i;
      gap = '';
      indent = '';

// If the space parameter is a number, make an indent string containing that
// many spaces.

      if (typeof space === 'number') {
          for (i = 0; i < space; i += 1) {
              indent += ' ';
          }

// If the space parameter is a string, it will be used as the indent string.

      } else if (typeof space === 'string') {
          indent = space;
      }

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

      rep = replacer;
      if (replacer && typeof replacer !== 'function' &&
              (typeof replacer !== 'object' ||
              typeof replacer.length !== 'number')) {
          throw new Error('JSON.stringify');
      }

// Make a fake root object containing our value under the key of ''.
// Return the result of stringifying the value.

      return str('', {'': value});
  };

// If the JSON object does not yet have a parse method, give it one.

  JSON.parse = function (text, reviver) {
  // The parse method takes a text and an optional reviver function, and returns
  // a JavaScript value if the text is a valid JSON text.

      var j;

      function walk(holder, key) {

  // The walk method is used to recursively walk the resulting structure so
  // that modifications can be made.

          var k, v, value = holder[key];
          if (value && typeof value === 'object') {
              for (k in value) {
                  if (Object.prototype.hasOwnProperty.call(value, k)) {
                      v = walk(value, k);
                      if (v !== undefined) {
                          value[k] = v;
                      } else {
                          delete value[k];
                      }
                  }
              }
          }
          return reviver.call(holder, key, value);
      }


  // Parsing happens in four stages. In the first stage, we replace certain
  // Unicode characters with escape sequences. JavaScript handles many characters
  // incorrectly, either silently deleting them, or treating them as line endings.

      text = String(text);
      cx.lastIndex = 0;
      if (cx.test(text)) {
          text = text.replace(cx, function (a) {
              return '\\u' +
                  ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
          });
      }

  // In the second stage, we run the text against regular expressions that look
  // for non-JSON patterns. We are especially concerned with '()' and 'new'
  // because they can cause invocation, and '=' because it can cause mutation.
  // But just to be safe, we want to reject all unexpected forms.

  // We split the second stage into 4 regexp operations in order to work around
  // crippling inefficiencies in IE's and Safari's regexp engines. First we
  // replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
  // replace all simple value tokens with ']' characters. Third, we delete all
  // open brackets that follow a colon or comma or that begin the text. Finally,
  // we look to see that the remaining characters are only whitespace or ']' or
  // ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

      if (/^[\],:{}\s]*$/
              .test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
                  .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
                  .replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

  // In the third stage we use the eval function to compile the text into a
  // JavaScript structure. The '{' operator is subject to a syntactic ambiguity
  // in JavaScript: it can begin a block or an object literal. We wrap the text
  // in parens to eliminate the ambiguity.

          j = eval('(' + text + ')');

  // In the optional fourth stage, we recursively walk the new structure, passing
  // each name/value pair to a reviver function for possible transformation.

          return typeof reviver === 'function' ?
              walk({'': j}, '') : j;
      }

  // If the text is not JSON parseable, then a SyntaxError is thrown.

      throw new SyntaxError('JSON.parse');
  };

})(
    'undefined' != typeof io ? io : module.exports
  , typeof JSON !== 'undefined' ? JSON : undefined
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Parser namespace.
   *
   * @namespace
   */

  var parser = exports.parser = {};

  /**
   * Packet types.
   */

  var packets = parser.packets = [
      'disconnect'
    , 'connect'
    , 'heartbeat'
    , 'message'
    , 'json'
    , 'event'
    , 'ack'
    , 'error'
    , 'noop'
  ];

  /**
   * Errors reasons.
   */

  var reasons = parser.reasons = [
      'transport not supported'
    , 'client not handshaken'
    , 'unauthorized'
  ];

  /**
   * Errors advice.
   */

  var advice = parser.advice = [
      'reconnect'
  ];

  /**
   * Shortcuts.
   */

  var JSON = io.JSON
    , indexOf = io.util.indexOf;

  /**
   * Encodes a packet.
   *
   * @api private
   */

  parser.encodePacket = function (packet) {
    var type = indexOf(packets, packet.type)
      , id = packet.id || ''
      , endpoint = packet.endpoint || ''
      , ack = packet.ack
      , data = null;

    switch (packet.type) {
      case 'error':
        var reason = packet.reason ? indexOf(reasons, packet.reason) : ''
          , adv = packet.advice ? indexOf(advice, packet.advice) : '';

        if (reason !== '' || adv !== '')
          data = reason + (adv !== '' ? ('+' + adv) : '');

        break;

      case 'message':
        if (packet.data !== '')
          data = packet.data;
        break;

      case 'event':
        var ev = { name: packet.name };

        if (packet.args && packet.args.length) {
          ev.args = packet.args;
        }

        data = JSON.stringify(ev);
        break;

      case 'json':
        data = JSON.stringify(packet.data);
        break;

      case 'connect':
        if (packet.qs)
          data = packet.qs;
        break;

      case 'ack':
        data = packet.ackId
          + (packet.args && packet.args.length
              ? '+' + JSON.stringify(packet.args) : '');
        break;
    }

    // construct packet with required fragments
    var encoded = [
        type
      , id + (ack == 'data' ? '+' : '')
      , endpoint
    ];

    // data fragment is optional
    if (data !== null && data !== undefined)
      encoded.push(data);

    return encoded.join(':');
  };

  /**
   * Encodes multiple messages (payload).
   *
   * @param {Array} messages
   * @api private
   */

  parser.encodePayload = function (packets) {
    var decoded = '';

    if (packets.length == 1)
      return packets[0];

    for (var i = 0, l = packets.length; i < l; i++) {
      var packet = packets[i];
      decoded += '\ufffd' + packet.length + '\ufffd' + packets[i];
    }

    return decoded;
  };

  /**
   * Decodes a packet
   *
   * @api private
   */

  var regexp = /([^:]+):([0-9]+)?(\+)?:([^:]+)?:?([\s\S]*)?/;

  parser.decodePacket = function (data) {
    var pieces = data.match(regexp);

    if (!pieces) return {};

    var id = pieces[2] || ''
      , data = pieces[5] || ''
      , packet = {
            type: packets[pieces[1]]
          , endpoint: pieces[4] || ''
        };

    // whether we need to acknowledge the packet
    if (id) {
      packet.id = id;
      if (pieces[3])
        packet.ack = 'data';
      else
        packet.ack = true;
    }

    // handle different packet types
    switch (packet.type) {
      case 'error':
        var pieces = data.split('+');
        packet.reason = reasons[pieces[0]] || '';
        packet.advice = advice[pieces[1]] || '';
        break;

      case 'message':
        packet.data = data || '';
        break;

      case 'event':
        try {
          var opts = JSON.parse(data);
          packet.name = opts.name;
          packet.args = opts.args;
        } catch (e) { }

        packet.args = packet.args || [];
        break;

      case 'json':
        try {
          packet.data = JSON.parse(data);
        } catch (e) { }
        break;

      case 'connect':
        packet.qs = data || '';
        break;

      case 'ack':
        var pieces = data.match(/^([0-9]+)(\+)?(.*)/);
        if (pieces) {
          packet.ackId = pieces[1];
          packet.args = [];

          if (pieces[3]) {
            try {
              packet.args = pieces[3] ? JSON.parse(pieces[3]) : [];
            } catch (e) { }
          }
        }
        break;

      case 'disconnect':
      case 'heartbeat':
        break;
    };

    return packet;
  };

  /**
   * Decodes data payload. Detects multiple messages
   *
   * @return {Array} messages
   * @api public
   */

  parser.decodePayload = function (data) {
    // IE doesn't like data[i] for unicode chars, charAt works fine
    if (data.charAt(0) == '\ufffd') {
      var ret = [];

      for (var i = 1, length = ''; i < data.length; i++) {
        if (data.charAt(i) == '\ufffd') {
          ret.push(parser.decodePacket(data.substr(i + 1).substr(0, length)));
          i += Number(length) + 1;
          length = '';
        } else {
          length += data.charAt(i);
        }
      }

      return ret;
    } else {
      return [parser.decodePacket(data)];
    }
  };

})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.Transport = Transport;

  /**
   * This is the transport template for all supported transport methods.
   *
   * @constructor
   * @api public
   */

  function Transport (socket, sessid) {
    this.socket = socket;
    this.sessid = sessid;
  };

  /**
   * Apply EventEmitter mixin.
   */

  io.util.mixin(Transport, io.EventEmitter);


  /**
   * Indicates whether heartbeats is enabled for this transport
   *
   * @api private
   */

  Transport.prototype.heartbeats = function () {
    return true;
  };

  /**
   * Handles the response from the server. When a new response is received
   * it will automatically update the timeout, decode the message and
   * forwards the response to the onMessage function for further processing.
   *
   * @param {String} data Response from the server.
   * @api private
   */

  Transport.prototype.onData = function (data) {
    this.clearCloseTimeout();

    // If the connection in currently open (or in a reopening state) reset the close
    // timeout since we have just received data. This check is necessary so
    // that we don't reset the timeout on an explicitly disconnected connection.
    if (this.socket.connected || this.socket.connecting || this.socket.reconnecting) {
      this.setCloseTimeout();
    }

    if (data !== '') {
      // todo: we should only do decodePayload for xhr transports
      var msgs = io.parser.decodePayload(data);

      if (msgs && msgs.length) {
        for (var i = 0, l = msgs.length; i < l; i++) {
          this.onPacket(msgs[i]);
        }
      }
    }

    return this;
  };

  /**
   * Handles packets.
   *
   * @api private
   */

  Transport.prototype.onPacket = function (packet) {
    this.socket.setHeartbeatTimeout();

    if (packet.type == 'heartbeat') {
      return this.onHeartbeat();
    }

    if (packet.type == 'connect' && packet.endpoint == '') {
      this.onConnect();
    }

    if (packet.type == 'error' && packet.advice == 'reconnect') {
      this.isOpen = false;
    }

    this.socket.onPacket(packet);

    return this;
  };

  /**
   * Sets close timeout
   *
   * @api private
   */

  Transport.prototype.setCloseTimeout = function () {
    if (!this.closeTimeout) {
      var self = this;

      this.closeTimeout = setTimeout(function () {
        self.onDisconnect();
      }, this.socket.closeTimeout);
    }
  };

  /**
   * Called when transport disconnects.
   *
   * @api private
   */

  Transport.prototype.onDisconnect = function () {
    if (this.isOpen) this.close();
    this.clearTimeouts();
    this.socket.onDisconnect();
    return this;
  };

  /**
   * Called when transport connects
   *
   * @api private
   */

  Transport.prototype.onConnect = function () {
    this.socket.onConnect();
    return this;
  };

  /**
   * Clears close timeout
   *
   * @api private
   */

  Transport.prototype.clearCloseTimeout = function () {
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }
  };

  /**
   * Clear timeouts
   *
   * @api private
   */

  Transport.prototype.clearTimeouts = function () {
    this.clearCloseTimeout();

    if (this.reopenTimeout) {
      clearTimeout(this.reopenTimeout);
    }
  };

  /**
   * Sends a packet
   *
   * @param {Object} packet object.
   * @api private
   */

  Transport.prototype.packet = function (packet) {
    this.send(io.parser.encodePacket(packet));
  };

  /**
   * Send the received heartbeat message back to server. So the server
   * knows we are still connected.
   *
   * @param {String} heartbeat Heartbeat response from the server.
   * @api private
   */

  Transport.prototype.onHeartbeat = function (heartbeat) {
    this.packet({ type: 'heartbeat' });
  };

  /**
   * Called when the transport opens.
   *
   * @api private
   */

  Transport.prototype.onOpen = function () {
    this.isOpen = true;
    this.clearCloseTimeout();
    this.socket.onOpen();
  };

  /**
   * Notifies the base when the connection with the Socket.IO server
   * has been disconnected.
   *
   * @api private
   */

  Transport.prototype.onClose = function () {
    var self = this;

    /* FIXME: reopen delay causing a infinit loop
    this.reopenTimeout = setTimeout(function () {
      self.open();
    }, this.socket.options['reopen delay']);*/

    this.isOpen = false;
    this.socket.onClose();
    this.onDisconnect();
  };

  /**
   * Generates a connection url based on the Socket.IO URL Protocol.
   * See <https://github.com/learnboost/socket.io-node/> for more details.
   *
   * @returns {String} Connection url
   * @api private
   */

  Transport.prototype.prepareUrl = function () {
    var options = this.socket.options;

    return this.scheme() + '://'
      + options.host + ':' + options.port + '/'
      + options.resource + '/' + io.protocol
      + '/' + this.name + '/' + this.sessid;
  };

  /**
   * Checks if the transport is ready to start a connection.
   *
   * @param {Socket} socket The socket instance that needs a transport
   * @param {Function} fn The callback
   * @api private
   */

  Transport.prototype.ready = function (socket, fn) {
    fn.call(this);
  };
})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {

  /**
   * Expose constructor.
   */

  exports.Socket = Socket;

  /**
   * Create a new `Socket.IO client` which can establish a persistent
   * connection with a Socket.IO enabled server.
   *
   * @api public
   */

  function Socket (options) {
    this.options = {
        port: 80
      , secure: false
      , document: 'document' in global ? document : false
      , resource: 'socket.io'
      , transports: io.transports
      , 'connect timeout': 10000
      , 'try multiple transports': true
      , 'reconnect': true
      , 'reconnection delay': 500
      , 'reconnection limit': Infinity
      , 'reopen delay': 3000
      , 'max reconnection attempts': 10
      , 'sync disconnect on unload': false
      , 'auto connect': true
      , 'flash policy port': 10843
      , 'manualFlush': false
    };

    io.util.merge(this.options, options);

    this.connected = false;
    this.open = false;
    this.connecting = false;
    this.reconnecting = false;
    this.namespaces = {};
    this.buffer = [];
    this.doBuffer = false;

    if (this.options['sync disconnect on unload'] &&
        (!this.isXDomain() || io.util.ua.hasCORS)) {
      var self = this;
      io.util.on(global, 'beforeunload', function () {
        self.disconnectSync();
      }, false);
    }

    if (this.options['auto connect']) {
      this.connect();
    }
};

  /**
   * Apply EventEmitter mixin.
   */

  io.util.mixin(Socket, io.EventEmitter);

  /**
   * Returns a namespace listener/emitter for this socket
   *
   * @api public
   */

  Socket.prototype.of = function (name) {
    if (!this.namespaces[name]) {
      this.namespaces[name] = new io.SocketNamespace(this, name);

      if (name !== '') {
        this.namespaces[name].packet({ type: 'connect' });
      }
    }

    return this.namespaces[name];
  };

  /**
   * Emits the given event to the Socket and all namespaces
   *
   * @api private
   */

  Socket.prototype.publish = function () {
    this.emit.apply(this, arguments);

    var nsp;

    for (var i in this.namespaces) {
      if (this.namespaces.hasOwnProperty(i)) {
        nsp = this.of(i);
        nsp.$emit.apply(nsp, arguments);
      }
    }
  };

  /**
   * Performs the handshake
   *
   * @api private
   */

  function empty () { };

  Socket.prototype.handshake = function (fn) {
    var self = this
      , options = this.options;

    function complete (data) {
      if (data instanceof Error) {
        self.connecting = false;
        self.onError(data.message);
      } else {
        fn.apply(null, data.split(':'));
      }
    };

    var url = [
          'http' + (options.secure ? 's' : '') + ':/'
        , options.host + ':' + options.port
        , options.resource
        , io.protocol
        , io.util.query(this.options.query, 't=' + +new Date)
      ].join('/');

    if (this.isXDomain() && !io.util.ua.hasCORS) {
      var insertAt = document.getElementsByTagName('script')[0]
        , script = document.createElement('script');

      script.src = url + '&jsonp=' + io.j.length;
      insertAt.parentNode.insertBefore(script, insertAt);

      io.j.push(function (data) {
        complete(data);
        script.parentNode.removeChild(script);
      });
    } else {
      var xhr = io.util.request();

      xhr.open('GET', url, true);
      if (this.isXDomain()) {
        xhr.withCredentials = true;
      }
      xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
          xhr.onreadystatechange = empty;

          if (xhr.status == 200) {
            complete(xhr.responseText);
          } else if (xhr.status == 403) {
            self.onError(xhr.responseText);
          } else {
            self.connecting = false;            
            !self.reconnecting && self.onError(xhr.responseText);
          }
        }
      };
      xhr.send(null);
    }
  };

  /**
   * Find an available transport based on the options supplied in the constructor.
   *
   * @api private
   */

  Socket.prototype.getTransport = function (override) {
    var transports = override || this.transports, match;

    for (var i = 0, transport; transport = transports[i]; i++) {
      if (io.Transport[transport]
        && io.Transport[transport].check(this)
        && (!this.isXDomain() || io.Transport[transport].xdomainCheck(this))) {
        return new io.Transport[transport](this, this.sessionid);
      }
    }

    return null;
  };

  /**
   * Connects to the server.
   *
   * @param {Function} [fn] Callback.
   * @returns {io.Socket}
   * @api public
   */

  Socket.prototype.connect = function (fn) {
    if (this.connecting) {
      return this;
    }

    var self = this;
    self.connecting = true;
    
    this.handshake(function (sid, heartbeat, close, transports) {
      self.sessionid = sid;
      self.closeTimeout = close * 1000;
      self.heartbeatTimeout = heartbeat * 1000;
      if(!self.transports)
          self.transports = self.origTransports = (transports ? io.util.intersect(
              transports.split(',')
            , self.options.transports
          ) : self.options.transports);

      self.setHeartbeatTimeout();

      function connect (transports){
        if (self.transport) self.transport.clearTimeouts();

        self.transport = self.getTransport(transports);
        if (!self.transport) return self.publish('connect_failed');

        // once the transport is ready
        self.transport.ready(self, function () {
          self.connecting = true;
          self.publish('connecting', self.transport.name);
          self.transport.open();

          if (self.options['connect timeout']) {
            self.connectTimeoutTimer = setTimeout(function () {
              if (!self.connected) {
                self.connecting = false;

                if (self.options['try multiple transports']) {
                  var remaining = self.transports;

                  while (remaining.length > 0 && remaining.splice(0,1)[0] !=
                         self.transport.name) {}

                    if (remaining.length){
                      connect(remaining);
                    } else {
                      self.publish('connect_failed');
                    }
                }
              }
            }, self.options['connect timeout']);
          }
        });
      }

      connect(self.transports);

      self.once('connect', function (){
        clearTimeout(self.connectTimeoutTimer);

        fn && typeof fn == 'function' && fn();
      });
    });

    return this;
  };

  /**
   * Clears and sets a new heartbeat timeout using the value given by the
   * server during the handshake.
   *
   * @api private
   */

  Socket.prototype.setHeartbeatTimeout = function () {
    clearTimeout(this.heartbeatTimeoutTimer);
    if(this.transport && !this.transport.heartbeats()) return;

    var self = this;
    this.heartbeatTimeoutTimer = setTimeout(function () {
      self.transport.onClose();
    }, this.heartbeatTimeout);
  };

  /**
   * Sends a message.
   *
   * @param {Object} data packet.
   * @returns {io.Socket}
   * @api public
   */

  Socket.prototype.packet = function (data) {
    if (this.connected && !this.doBuffer) {
      this.transport.packet(data);
    } else {
      this.buffer.push(data);
    }

    return this;
  };

  /**
   * Sets buffer state
   *
   * @api private
   */

  Socket.prototype.setBuffer = function (v) {
    this.doBuffer = v;

    if (!v && this.connected && this.buffer.length) {
      if (!this.options['manualFlush']) {
        this.flushBuffer();
      }
    }
  };

  /**
   * Flushes the buffer data over the wire.
   * To be invoked manually when 'manualFlush' is set to true.
   *
   * @api public
   */

  Socket.prototype.flushBuffer = function() {
    this.transport.payload(this.buffer);
    this.buffer = [];
  };
  

  /**
   * Disconnect the established connect.
   *
   * @returns {io.Socket}
   * @api public
   */

  Socket.prototype.disconnect = function () {
    if (this.connected || this.connecting) {
      if (this.open) {
        this.of('').packet({ type: 'disconnect' });
      }

      // handle disconnection immediately
      this.onDisconnect('booted');
    }

    return this;
  };

  /**
   * Disconnects the socket with a sync XHR.
   *
   * @api private
   */

  Socket.prototype.disconnectSync = function () {
    // ensure disconnection
    var xhr = io.util.request();
    var uri = [
        'http' + (this.options.secure ? 's' : '') + ':/'
      , this.options.host + ':' + this.options.port
      , this.options.resource
      , io.protocol
      , ''
      , this.sessionid
    ].join('/') + '/?disconnect=1';

    xhr.open('GET', uri, false);
    xhr.send(null);

    // handle disconnection immediately
    this.onDisconnect('booted');
  };

  /**
   * Check if we need to use cross domain enabled transports. Cross domain would
   * be a different port or different domain name.
   *
   * @returns {Boolean}
   * @api private
   */

  Socket.prototype.isXDomain = function () {

    var port = global.location.port ||
      ('https:' == global.location.protocol ? 443 : 80);

    return this.options.host !== global.location.hostname 
      || this.options.port != port;
  };

  /**
   * Called upon handshake.
   *
   * @api private
   */

  Socket.prototype.onConnect = function () {
    if (!this.connected) {
      this.connected = true;
      this.connecting = false;
      if (!this.doBuffer) {
        // make sure to flush the buffer
        this.setBuffer(false);
      }
      this.emit('connect');
    }
  };

  /**
   * Called when the transport opens
   *
   * @api private
   */

  Socket.prototype.onOpen = function () {
    this.open = true;
  };

  /**
   * Called when the transport closes.
   *
   * @api private
   */

  Socket.prototype.onClose = function () {
    this.open = false;
    clearTimeout(this.heartbeatTimeoutTimer);
  };

  /**
   * Called when the transport first opens a connection
   *
   * @param text
   */

  Socket.prototype.onPacket = function (packet) {
    this.of(packet.endpoint).onPacket(packet);
  };

  /**
   * Handles an error.
   *
   * @api private
   */

  Socket.prototype.onError = function (err) {
    if (err && err.advice) {
      if (err.advice === 'reconnect' && (this.connected || this.connecting)) {
        this.disconnect();
        if (this.options.reconnect) {
          this.reconnect();
        }
      }
    }

    this.publish('error', err && err.reason ? err.reason : err);
  };

  /**
   * Called when the transport disconnects.
   *
   * @api private
   */

  Socket.prototype.onDisconnect = function (reason) {
    var wasConnected = this.connected
      , wasConnecting = this.connecting;

    this.connected = false;
    this.connecting = false;
    this.open = false;

    if (wasConnected || wasConnecting) {
      this.transport.close();
      this.transport.clearTimeouts();
      if (wasConnected) {
        this.publish('disconnect', reason);

        if ('booted' != reason && this.options.reconnect && !this.reconnecting) {
          this.reconnect();
        }
      }
    }
  };

  /**
   * Called upon reconnection.
   *
   * @api private
   */

  Socket.prototype.reconnect = function () {
    this.reconnecting = true;
    this.reconnectionAttempts = 0;
    this.reconnectionDelay = this.options['reconnection delay'];

    var self = this
      , maxAttempts = this.options['max reconnection attempts']
      , tryMultiple = this.options['try multiple transports']
      , limit = this.options['reconnection limit'];

    function reset () {
      if (self.connected) {
        for (var i in self.namespaces) {
          if (self.namespaces.hasOwnProperty(i) && '' !== i) {
              self.namespaces[i].packet({ type: 'connect' });
          }
        }
        self.publish('reconnect', self.transport.name, self.reconnectionAttempts);
      }

      clearTimeout(self.reconnectionTimer);

      self.removeListener('connect_failed', maybeReconnect);
      self.removeListener('connect', maybeReconnect);

      self.reconnecting = false;

      delete self.reconnectionAttempts;
      delete self.reconnectionDelay;
      delete self.reconnectionTimer;
      delete self.redoTransports;

      self.options['try multiple transports'] = tryMultiple;
    };

    function maybeReconnect () {
      if (!self.reconnecting) {
        return;
      }

      if (self.connected) {
        return reset();
      };

      if (self.connecting && self.reconnecting) {
        return self.reconnectionTimer = setTimeout(maybeReconnect, 1000);
      }

      if (self.reconnectionAttempts++ >= maxAttempts) {
        if (!self.redoTransports) {
          self.on('connect_failed', maybeReconnect);
          self.options['try multiple transports'] = true;
          self.transports = self.origTransports;
          self.transport = self.getTransport();
          self.redoTransports = true;
          self.connect();
        } else {
          self.publish('reconnect_failed');
          reset();
        }
      } else {
        if (self.reconnectionDelay < limit) {
          self.reconnectionDelay *= 2; // exponential back off
        }

        self.connect();
        self.publish('reconnecting', self.reconnectionDelay, self.reconnectionAttempts);
        self.reconnectionTimer = setTimeout(maybeReconnect, self.reconnectionDelay);
      }
    };

    this.options['try multiple transports'] = false;
    this.reconnectionTimer = setTimeout(maybeReconnect, this.reconnectionDelay);

    this.on('connect', maybeReconnect);
  };

})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.SocketNamespace = SocketNamespace;

  /**
   * Socket namespace constructor.
   *
   * @constructor
   * @api public
   */

  function SocketNamespace (socket, name) {
    this.socket = socket;
    this.name = name || '';
    this.flags = {};
    this.json = new Flag(this, 'json');
    this.ackPackets = 0;
    this.acks = {};
  };

  /**
   * Apply EventEmitter mixin.
   */

  io.util.mixin(SocketNamespace, io.EventEmitter);

  /**
   * Copies emit since we override it
   *
   * @api private
   */

  SocketNamespace.prototype.$emit = io.EventEmitter.prototype.emit;

  /**
   * Creates a new namespace, by proxying the request to the socket. This
   * allows us to use the synax as we do on the server.
   *
   * @api public
   */

  SocketNamespace.prototype.of = function () {
    return this.socket.of.apply(this.socket, arguments);
  };

  /**
   * Sends a packet.
   *
   * @api private
   */

  SocketNamespace.prototype.packet = function (packet) {
    packet.endpoint = this.name;
    this.socket.packet(packet);
    this.flags = {};
    return this;
  };

  /**
   * Sends a message
   *
   * @api public
   */

  SocketNamespace.prototype.send = function (data, fn) {
    var packet = {
        type: this.flags.json ? 'json' : 'message'
      , data: data
    };

    if ('function' == typeof fn) {
      packet.id = ++this.ackPackets;
      packet.ack = true;
      this.acks[packet.id] = fn;
    }

    return this.packet(packet);
  };

  /**
   * Emits an event
   *
   * @api public
   */
  
  SocketNamespace.prototype.emit = function (name) {
    var args = Array.prototype.slice.call(arguments, 1)
      , lastArg = args[args.length - 1]
      , packet = {
            type: 'event'
          , name: name
        };

    if ('function' == typeof lastArg) {
      packet.id = ++this.ackPackets;
      packet.ack = 'data';
      this.acks[packet.id] = lastArg;
      args = args.slice(0, args.length - 1);
    }

    packet.args = args;

    return this.packet(packet);
  };

  /**
   * Disconnects the namespace
   *
   * @api private
   */

  SocketNamespace.prototype.disconnect = function () {
    if (this.name === '') {
      this.socket.disconnect();
    } else {
      this.packet({ type: 'disconnect' });
      this.$emit('disconnect');
    }

    return this;
  };

  /**
   * Handles a packet
   *
   * @api private
   */

  SocketNamespace.prototype.onPacket = function (packet) {
    var self = this;

    function ack () {
      self.packet({
          type: 'ack'
        , args: io.util.toArray(arguments)
        , ackId: packet.id
      });
    };

    switch (packet.type) {
      case 'connect':
        this.$emit('connect');
        break;

      case 'disconnect':
        if (this.name === '') {
          this.socket.onDisconnect(packet.reason || 'booted');
        } else {
          this.$emit('disconnect', packet.reason);
        }
        break;

      case 'message':
      case 'json':
        var params = ['message', packet.data];

        if (packet.ack == 'data') {
          params.push(ack);
        } else if (packet.ack) {
          this.packet({ type: 'ack', ackId: packet.id });
        }

        this.$emit.apply(this, params);
        break;

      case 'event':
        var params = [packet.name].concat(packet.args);

        if (packet.ack == 'data')
          params.push(ack);

        this.$emit.apply(this, params);
        break;

      case 'ack':
        if (this.acks[packet.ackId]) {
          this.acks[packet.ackId].apply(this, packet.args);
          delete this.acks[packet.ackId];
        }
        break;

      case 'error':
        if (packet.advice){
          this.socket.onError(packet);
        } else {
          if (packet.reason == 'unauthorized') {
            this.$emit('connect_failed', packet.reason);
          } else {
            this.$emit('error', packet.reason);
          }
        }
        break;
    }
  };

  /**
   * Flag interface.
   *
   * @api private
   */

  function Flag (nsp, name) {
    this.namespace = nsp;
    this.name = name;
  };

  /**
   * Send a message
   *
   * @api public
   */

  Flag.prototype.send = function () {
    this.namespace.flags[this.name] = true;
    this.namespace.send.apply(this.namespace, arguments);
  };

  /**
   * Emit an event
   *
   * @api public
   */

  Flag.prototype.emit = function () {
    this.namespace.flags[this.name] = true;
    this.namespace.emit.apply(this.namespace, arguments);
  };

})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {

  /**
   * Expose constructor.
   */

  exports.websocket = WS;

  /**
   * The WebSocket transport uses the HTML5 WebSocket API to establish an
   * persistent connection with the Socket.IO server. This transport will also
   * be inherited by the FlashSocket fallback as it provides a API compatible
   * polyfill for the WebSockets.
   *
   * @constructor
   * @extends {io.Transport}
   * @api public
   */

  function WS (socket) {
    io.Transport.apply(this, arguments);
  };

  /**
   * Inherits from Transport.
   */

  io.util.inherit(WS, io.Transport);

  /**
   * Transport name
   *
   * @api public
   */

  WS.prototype.name = 'websocket';

  /**
   * Initializes a new `WebSocket` connection with the Socket.IO server. We attach
   * all the appropriate listeners to handle the responses from the server.
   *
   * @returns {Transport}
   * @api public
   */

  WS.prototype.open = function () {
    var query = io.util.query(this.socket.options.query)
      , self = this
      , Socket


    if (!Socket) {
      Socket = global.MozWebSocket || global.WebSocket;
    }

    this.websocket = new Socket(this.prepareUrl() + query);

    this.websocket.onopen = function () {
      self.onOpen();
      self.socket.setBuffer(false);
    };
    this.websocket.onmessage = function (ev) {
      self.onData(ev.data);
    };
    this.websocket.onclose = function () {
      self.onClose();
      self.socket.setBuffer(true);
    };
    this.websocket.onerror = function (e) {
      self.onError(e);
    };

    return this;
  };

  /**
   * Send a message to the Socket.IO server. The message will automatically be
   * encoded in the correct message format.
   *
   * @returns {Transport}
   * @api public
   */

  // Do to a bug in the current IDevices browser, we need to wrap the send in a 
  // setTimeout, when they resume from sleeping the browser will crash if 
  // we don't allow the browser time to detect the socket has been closed
  if (io.util.ua.iDevice) {
    WS.prototype.send = function (data) {
      var self = this;
      setTimeout(function() {
         self.websocket.send(data);
      },0);
      return this;
    };
  } else {
    WS.prototype.send = function (data) {
      this.websocket.send(data);
      return this;
    };
  }

  /**
   * Payload
   *
   * @api private
   */

  WS.prototype.payload = function (arr) {
    for (var i = 0, l = arr.length; i < l; i++) {
      this.packet(arr[i]);
    }
    return this;
  };

  /**
   * Disconnect the established `WebSocket` connection.
   *
   * @returns {Transport}
   * @api public
   */

  WS.prototype.close = function () {
    this.websocket.close();
    return this;
  };

  /**
   * Handle the errors that `WebSocket` might be giving when we
   * are attempting to connect or send messages.
   *
   * @param {Error} e The error.
   * @api private
   */

  WS.prototype.onError = function (e) {
    this.socket.onError(e);
  };

  /**
   * Returns the appropriate scheme for the URI generation.
   *
   * @api private
   */
  WS.prototype.scheme = function () {
    return this.socket.options.secure ? 'wss' : 'ws';
  };

  /**
   * Checks if the browser has support for native `WebSockets` and that
   * it's not the polyfill created for the FlashSocket transport.
   *
   * @return {Boolean}
   * @api public
   */

  WS.check = function () {
    return ('WebSocket' in global && !('__addTask' in WebSocket))
          || 'MozWebSocket' in global;
  };

  /**
   * Check if the `WebSocket` transport support cross domain communications.
   *
   * @returns {Boolean}
   * @api public
   */

  WS.xdomainCheck = function () {
    return true;
  };

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('websocket');

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.flashsocket = Flashsocket;

  /**
   * The FlashSocket transport. This is a API wrapper for the HTML5 WebSocket
   * specification. It uses a .swf file to communicate with the server. If you want
   * to serve the .swf file from a other server than where the Socket.IO script is
   * coming from you need to use the insecure version of the .swf. More information
   * about this can be found on the github page.
   *
   * @constructor
   * @extends {io.Transport.websocket}
   * @api public
   */

  function Flashsocket () {
    io.Transport.websocket.apply(this, arguments);
  };

  /**
   * Inherits from Transport.
   */

  io.util.inherit(Flashsocket, io.Transport.websocket);

  /**
   * Transport name
   *
   * @api public
   */

  Flashsocket.prototype.name = 'flashsocket';

  /**
   * Disconnect the established `FlashSocket` connection. This is done by adding a 
   * new task to the FlashSocket. The rest will be handled off by the `WebSocket` 
   * transport.
   *
   * @returns {Transport}
   * @api public
   */

  Flashsocket.prototype.open = function () {
    var self = this
      , args = arguments;

    WebSocket.__addTask(function () {
      io.Transport.websocket.prototype.open.apply(self, args);
    });
    return this;
  };
  
  /**
   * Sends a message to the Socket.IO server. This is done by adding a new
   * task to the FlashSocket. The rest will be handled off by the `WebSocket` 
   * transport.
   *
   * @returns {Transport}
   * @api public
   */

  Flashsocket.prototype.send = function () {
    var self = this, args = arguments;
    WebSocket.__addTask(function () {
      io.Transport.websocket.prototype.send.apply(self, args);
    });
    return this;
  };

  /**
   * Disconnects the established `FlashSocket` connection.
   *
   * @returns {Transport}
   * @api public
   */

  Flashsocket.prototype.close = function () {
    WebSocket.__tasks.length = 0;
    io.Transport.websocket.prototype.close.call(this);
    return this;
  };

  /**
   * The WebSocket fall back needs to append the flash container to the body
   * element, so we need to make sure we have access to it. Or defer the call
   * until we are sure there is a body element.
   *
   * @param {Socket} socket The socket instance that needs a transport
   * @param {Function} fn The callback
   * @api private
   */

  Flashsocket.prototype.ready = function (socket, fn) {
    function init () {
      var options = socket.options
        , port = options['flash policy port']
        , path = [
              'http' + (options.secure ? 's' : '') + ':/'
            , options.host + ':' + options.port
            , options.resource
            , 'static/flashsocket'
            , 'WebSocketMain' + (socket.isXDomain() ? 'Insecure' : '') + '.swf'
          ];

      // Only start downloading the swf file when the checked that this browser
      // actually supports it
      if (!Flashsocket.loaded) {
        if (typeof WEB_SOCKET_SWF_LOCATION === 'undefined') {
          // Set the correct file based on the XDomain settings
          WEB_SOCKET_SWF_LOCATION = path.join('/');
        }

        if (port !== 843) {
          WebSocket.loadFlashPolicyFile('xmlsocket://' + options.host + ':' + port);
        }

        WebSocket.__initialize();
        Flashsocket.loaded = true;
      }

      fn.call(self);
    }

    var self = this;
    if (document.body) return init();

    io.util.load(init);
  };

  /**
   * Check if the FlashSocket transport is supported as it requires that the Adobe
   * Flash Player plug-in version `10.0.0` or greater is installed. And also check if
   * the polyfill is correctly loaded.
   *
   * @returns {Boolean}
   * @api public
   */

  Flashsocket.check = function () {
    if (
        typeof WebSocket == 'undefined'
      || !('__initialize' in WebSocket) || !swfobject
    ) return false;

    return swfobject.getFlashPlayerVersion().major >= 10;
  };

  /**
   * Check if the FlashSocket transport can be used as cross domain / cross origin 
   * transport. Because we can't see which type (secure or insecure) of .swf is used
   * we will just return true.
   *
   * @returns {Boolean}
   * @api public
   */

  Flashsocket.xdomainCheck = function () {
    return true;
  };

  /**
   * Disable AUTO_INITIALIZATION
   */

  if (typeof window != 'undefined') {
    WEB_SOCKET_DISABLE_AUTO_INITIALIZATION = true;
  }

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('flashsocket');
})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);
/*	SWFObject v2.2 <http://code.google.com/p/swfobject/> 
	is released under the MIT License <http://www.opensource.org/licenses/mit-license.php> 
*/
if ('undefined' != typeof window) {
var swfobject=function(){var D="undefined",r="object",S="Shockwave Flash",W="ShockwaveFlash.ShockwaveFlash",q="application/x-shockwave-flash",R="SWFObjectExprInst",x="onreadystatechange",O=window,j=document,t=navigator,T=false,U=[h],o=[],N=[],I=[],l,Q,E,B,J=false,a=false,n,G,m=true,M=function(){var aa=typeof j.getElementById!=D&&typeof j.getElementsByTagName!=D&&typeof j.createElement!=D,ah=t.userAgent.toLowerCase(),Y=t.platform.toLowerCase(),ae=Y?/win/.test(Y):/win/.test(ah),ac=Y?/mac/.test(Y):/mac/.test(ah),af=/webkit/.test(ah)?parseFloat(ah.replace(/^.*webkit\/(\d+(\.\d+)?).*$/,"$1")):false,X=!+"\v1",ag=[0,0,0],ab=null;if(typeof t.plugins!=D&&typeof t.plugins[S]==r){ab=t.plugins[S].description;if(ab&&!(typeof t.mimeTypes!=D&&t.mimeTypes[q]&&!t.mimeTypes[q].enabledPlugin)){T=true;X=false;ab=ab.replace(/^.*\s+(\S+\s+\S+$)/,"$1");ag[0]=parseInt(ab.replace(/^(.*)\..*$/,"$1"),10);ag[1]=parseInt(ab.replace(/^.*\.(.*)\s.*$/,"$1"),10);ag[2]=/[a-zA-Z]/.test(ab)?parseInt(ab.replace(/^.*[a-zA-Z]+(.*)$/,"$1"),10):0}}else{if(typeof O[(['Active'].concat('Object').join('X'))]!=D){try{var ad=new window[(['Active'].concat('Object').join('X'))](W);if(ad){ab=ad.GetVariable("$version");if(ab){X=true;ab=ab.split(" ")[1].split(",");ag=[parseInt(ab[0],10),parseInt(ab[1],10),parseInt(ab[2],10)]}}}catch(Z){}}}return{w3:aa,pv:ag,wk:af,ie:X,win:ae,mac:ac}}(),k=function(){if(!M.w3){return}if((typeof j.readyState!=D&&j.readyState=="complete")||(typeof j.readyState==D&&(j.getElementsByTagName("body")[0]||j.body))){f()}if(!J){if(typeof j.addEventListener!=D){j.addEventListener("DOMContentLoaded",f,false)}if(M.ie&&M.win){j.attachEvent(x,function(){if(j.readyState=="complete"){j.detachEvent(x,arguments.callee);f()}});if(O==top){(function(){if(J){return}try{j.documentElement.doScroll("left")}catch(X){setTimeout(arguments.callee,0);return}f()})()}}if(M.wk){(function(){if(J){return}if(!/loaded|complete/.test(j.readyState)){setTimeout(arguments.callee,0);return}f()})()}s(f)}}();function f(){if(J){return}try{var Z=j.getElementsByTagName("body")[0].appendChild(C("span"));Z.parentNode.removeChild(Z)}catch(aa){return}J=true;var X=U.length;for(var Y=0;Y<X;Y++){U[Y]()}}function K(X){if(J){X()}else{U[U.length]=X}}function s(Y){if(typeof O.addEventListener!=D){O.addEventListener("load",Y,false)}else{if(typeof j.addEventListener!=D){j.addEventListener("load",Y,false)}else{if(typeof O.attachEvent!=D){i(O,"onload",Y)}else{if(typeof O.onload=="function"){var X=O.onload;O.onload=function(){X();Y()}}else{O.onload=Y}}}}}function h(){if(T){V()}else{H()}}function V(){var X=j.getElementsByTagName("body")[0];var aa=C(r);aa.setAttribute("type",q);var Z=X.appendChild(aa);if(Z){var Y=0;(function(){if(typeof Z.GetVariable!=D){var ab=Z.GetVariable("$version");if(ab){ab=ab.split(" ")[1].split(",");M.pv=[parseInt(ab[0],10),parseInt(ab[1],10),parseInt(ab[2],10)]}}else{if(Y<10){Y++;setTimeout(arguments.callee,10);return}}X.removeChild(aa);Z=null;H()})()}else{H()}}function H(){var ag=o.length;if(ag>0){for(var af=0;af<ag;af++){var Y=o[af].id;var ab=o[af].callbackFn;var aa={success:false,id:Y};if(M.pv[0]>0){var ae=c(Y);if(ae){if(F(o[af].swfVersion)&&!(M.wk&&M.wk<312)){w(Y,true);if(ab){aa.success=true;aa.ref=z(Y);ab(aa)}}else{if(o[af].expressInstall&&A()){var ai={};ai.data=o[af].expressInstall;ai.width=ae.getAttribute("width")||"0";ai.height=ae.getAttribute("height")||"0";if(ae.getAttribute("class")){ai.styleclass=ae.getAttribute("class")}if(ae.getAttribute("align")){ai.align=ae.getAttribute("align")}var ah={};var X=ae.getElementsByTagName("param");var ac=X.length;for(var ad=0;ad<ac;ad++){if(X[ad].getAttribute("name").toLowerCase()!="movie"){ah[X[ad].getAttribute("name")]=X[ad].getAttribute("value")}}P(ai,ah,Y,ab)}else{p(ae);if(ab){ab(aa)}}}}}else{w(Y,true);if(ab){var Z=z(Y);if(Z&&typeof Z.SetVariable!=D){aa.success=true;aa.ref=Z}ab(aa)}}}}}function z(aa){var X=null;var Y=c(aa);if(Y&&Y.nodeName=="OBJECT"){if(typeof Y.SetVariable!=D){X=Y}else{var Z=Y.getElementsByTagName(r)[0];if(Z){X=Z}}}return X}function A(){return !a&&F("6.0.65")&&(M.win||M.mac)&&!(M.wk&&M.wk<312)}function P(aa,ab,X,Z){a=true;E=Z||null;B={success:false,id:X};var ae=c(X);if(ae){if(ae.nodeName=="OBJECT"){l=g(ae);Q=null}else{l=ae;Q=X}aa.id=R;if(typeof aa.width==D||(!/%$/.test(aa.width)&&parseInt(aa.width,10)<310)){aa.width="310"}if(typeof aa.height==D||(!/%$/.test(aa.height)&&parseInt(aa.height,10)<137)){aa.height="137"}j.title=j.title.slice(0,47)+" - Flash Player Installation";var ad=M.ie&&M.win?(['Active'].concat('').join('X')):"PlugIn",ac="MMredirectURL="+O.location.toString().replace(/&/g,"%26")+"&MMplayerType="+ad+"&MMdoctitle="+j.title;if(typeof ab.flashvars!=D){ab.flashvars+="&"+ac}else{ab.flashvars=ac}if(M.ie&&M.win&&ae.readyState!=4){var Y=C("div");X+="SWFObjectNew";Y.setAttribute("id",X);ae.parentNode.insertBefore(Y,ae);ae.style.display="none";(function(){if(ae.readyState==4){ae.parentNode.removeChild(ae)}else{setTimeout(arguments.callee,10)}})()}u(aa,ab,X)}}function p(Y){if(M.ie&&M.win&&Y.readyState!=4){var X=C("div");Y.parentNode.insertBefore(X,Y);X.parentNode.replaceChild(g(Y),X);Y.style.display="none";(function(){if(Y.readyState==4){Y.parentNode.removeChild(Y)}else{setTimeout(arguments.callee,10)}})()}else{Y.parentNode.replaceChild(g(Y),Y)}}function g(ab){var aa=C("div");if(M.win&&M.ie){aa.innerHTML=ab.innerHTML}else{var Y=ab.getElementsByTagName(r)[0];if(Y){var ad=Y.childNodes;if(ad){var X=ad.length;for(var Z=0;Z<X;Z++){if(!(ad[Z].nodeType==1&&ad[Z].nodeName=="PARAM")&&!(ad[Z].nodeType==8)){aa.appendChild(ad[Z].cloneNode(true))}}}}}return aa}function u(ai,ag,Y){var X,aa=c(Y);if(M.wk&&M.wk<312){return X}if(aa){if(typeof ai.id==D){ai.id=Y}if(M.ie&&M.win){var ah="";for(var ae in ai){if(ai[ae]!=Object.prototype[ae]){if(ae.toLowerCase()=="data"){ag.movie=ai[ae]}else{if(ae.toLowerCase()=="styleclass"){ah+=' class="'+ai[ae]+'"'}else{if(ae.toLowerCase()!="classid"){ah+=" "+ae+'="'+ai[ae]+'"'}}}}}var af="";for(var ad in ag){if(ag[ad]!=Object.prototype[ad]){af+='<param name="'+ad+'" value="'+ag[ad]+'" />'}}aa.outerHTML='<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"'+ah+">"+af+"</object>";N[N.length]=ai.id;X=c(ai.id)}else{var Z=C(r);Z.setAttribute("type",q);for(var ac in ai){if(ai[ac]!=Object.prototype[ac]){if(ac.toLowerCase()=="styleclass"){Z.setAttribute("class",ai[ac])}else{if(ac.toLowerCase()!="classid"){Z.setAttribute(ac,ai[ac])}}}}for(var ab in ag){if(ag[ab]!=Object.prototype[ab]&&ab.toLowerCase()!="movie"){e(Z,ab,ag[ab])}}aa.parentNode.replaceChild(Z,aa);X=Z}}return X}function e(Z,X,Y){var aa=C("param");aa.setAttribute("name",X);aa.setAttribute("value",Y);Z.appendChild(aa)}function y(Y){var X=c(Y);if(X&&X.nodeName=="OBJECT"){if(M.ie&&M.win){X.style.display="none";(function(){if(X.readyState==4){b(Y)}else{setTimeout(arguments.callee,10)}})()}else{X.parentNode.removeChild(X)}}}function b(Z){var Y=c(Z);if(Y){for(var X in Y){if(typeof Y[X]=="function"){Y[X]=null}}Y.parentNode.removeChild(Y)}}function c(Z){var X=null;try{X=j.getElementById(Z)}catch(Y){}return X}function C(X){return j.createElement(X)}function i(Z,X,Y){Z.attachEvent(X,Y);I[I.length]=[Z,X,Y]}function F(Z){var Y=M.pv,X=Z.split(".");X[0]=parseInt(X[0],10);X[1]=parseInt(X[1],10)||0;X[2]=parseInt(X[2],10)||0;return(Y[0]>X[0]||(Y[0]==X[0]&&Y[1]>X[1])||(Y[0]==X[0]&&Y[1]==X[1]&&Y[2]>=X[2]))?true:false}function v(ac,Y,ad,ab){if(M.ie&&M.mac){return}var aa=j.getElementsByTagName("head")[0];if(!aa){return}var X=(ad&&typeof ad=="string")?ad:"screen";if(ab){n=null;G=null}if(!n||G!=X){var Z=C("style");Z.setAttribute("type","text/css");Z.setAttribute("media",X);n=aa.appendChild(Z);if(M.ie&&M.win&&typeof j.styleSheets!=D&&j.styleSheets.length>0){n=j.styleSheets[j.styleSheets.length-1]}G=X}if(M.ie&&M.win){if(n&&typeof n.addRule==r){n.addRule(ac,Y)}}else{if(n&&typeof j.createTextNode!=D){n.appendChild(j.createTextNode(ac+" {"+Y+"}"))}}}function w(Z,X){if(!m){return}var Y=X?"visible":"hidden";if(J&&c(Z)){c(Z).style.visibility=Y}else{v("#"+Z,"visibility:"+Y)}}function L(Y){var Z=/[\\\"<>\.;]/;var X=Z.exec(Y)!=null;return X&&typeof encodeURIComponent!=D?encodeURIComponent(Y):Y}var d=function(){if(M.ie&&M.win){window.attachEvent("onunload",function(){var ac=I.length;for(var ab=0;ab<ac;ab++){I[ab][0].detachEvent(I[ab][1],I[ab][2])}var Z=N.length;for(var aa=0;aa<Z;aa++){y(N[aa])}for(var Y in M){M[Y]=null}M=null;for(var X in swfobject){swfobject[X]=null}swfobject=null})}}();return{registerObject:function(ab,X,aa,Z){if(M.w3&&ab&&X){var Y={};Y.id=ab;Y.swfVersion=X;Y.expressInstall=aa;Y.callbackFn=Z;o[o.length]=Y;w(ab,false)}else{if(Z){Z({success:false,id:ab})}}},getObjectById:function(X){if(M.w3){return z(X)}},embedSWF:function(ab,ah,ae,ag,Y,aa,Z,ad,af,ac){var X={success:false,id:ah};if(M.w3&&!(M.wk&&M.wk<312)&&ab&&ah&&ae&&ag&&Y){w(ah,false);K(function(){ae+="";ag+="";var aj={};if(af&&typeof af===r){for(var al in af){aj[al]=af[al]}}aj.data=ab;aj.width=ae;aj.height=ag;var am={};if(ad&&typeof ad===r){for(var ak in ad){am[ak]=ad[ak]}}if(Z&&typeof Z===r){for(var ai in Z){if(typeof am.flashvars!=D){am.flashvars+="&"+ai+"="+Z[ai]}else{am.flashvars=ai+"="+Z[ai]}}}if(F(Y)){var an=u(aj,am,ah);if(aj.id==ah){w(ah,true)}X.success=true;X.ref=an}else{if(aa&&A()){aj.data=aa;P(aj,am,ah,ac);return}else{w(ah,true)}}if(ac){ac(X)}})}else{if(ac){ac(X)}}},switchOffAutoHideShow:function(){m=false},ua:M,getFlashPlayerVersion:function(){return{major:M.pv[0],minor:M.pv[1],release:M.pv[2]}},hasFlashPlayerVersion:F,createSWF:function(Z,Y,X){if(M.w3){return u(Z,Y,X)}else{return undefined}},showExpressInstall:function(Z,aa,X,Y){if(M.w3&&A()){P(Z,aa,X,Y)}},removeSWF:function(X){if(M.w3){y(X)}},createCSS:function(aa,Z,Y,X){if(M.w3){v(aa,Z,Y,X)}},addDomLoadEvent:K,addLoadEvent:s,getQueryParamValue:function(aa){var Z=j.location.search||j.location.hash;if(Z){if(/\?/.test(Z)){Z=Z.split("?")[1]}if(aa==null){return L(Z)}var Y=Z.split("&");for(var X=0;X<Y.length;X++){if(Y[X].substring(0,Y[X].indexOf("="))==aa){return L(Y[X].substring((Y[X].indexOf("=")+1)))}}}return""},expressInstallCallback:function(){if(a){var X=c(R);if(X&&l){X.parentNode.replaceChild(l,X);if(Q){w(Q,true);if(M.ie&&M.win){l.style.display="block"}}if(E){E(B)}}a=false}}}}();
}
// Copyright: Hiroshi Ichikawa <http://gimite.net/en/>
// License: New BSD License
// Reference: http://dev.w3.org/html5/websockets/
// Reference: http://tools.ietf.org/html/draft-hixie-thewebsocketprotocol

(function() {
  
  if ('undefined' == typeof window || window.WebSocket) return;

  var console = window.console;
  if (!console || !console.log || !console.error) {
    console = {log: function(){ }, error: function(){ }};
  }
  
  if (!swfobject.hasFlashPlayerVersion("10.0.0")) {
    console.error("Flash Player >= 10.0.0 is required.");
    return;
  }
  if (location.protocol == "file:") {
    console.error(
      "WARNING: web-socket-js doesn't work in file:///... URL " +
      "unless you set Flash Security Settings properly. " +
      "Open the page via Web server i.e. http://...");
  }

  /**
   * This class represents a faux web socket.
   * @param {string} url
   * @param {array or string} protocols
   * @param {string} proxyHost
   * @param {int} proxyPort
   * @param {string} headers
   */
  WebSocket = function(url, protocols, proxyHost, proxyPort, headers) {
    var self = this;
    self.__id = WebSocket.__nextId++;
    WebSocket.__instances[self.__id] = self;
    self.readyState = WebSocket.CONNECTING;
    self.bufferedAmount = 0;
    self.__events = {};
    if (!protocols) {
      protocols = [];
    } else if (typeof protocols == "string") {
      protocols = [protocols];
    }
    // Uses setTimeout() to make sure __createFlash() runs after the caller sets ws.onopen etc.
    // Otherwise, when onopen fires immediately, onopen is called before it is set.
    setTimeout(function() {
      WebSocket.__addTask(function() {
        WebSocket.__flash.create(
            self.__id, url, protocols, proxyHost || null, proxyPort || 0, headers || null);
      });
    }, 0);
  };

  /**
   * Send data to the web socket.
   * @param {string} data  The data to send to the socket.
   * @return {boolean}  True for success, false for failure.
   */
  WebSocket.prototype.send = function(data) {
    if (this.readyState == WebSocket.CONNECTING) {
      throw "INVALID_STATE_ERR: Web Socket connection has not been established";
    }
    // We use encodeURIComponent() here, because FABridge doesn't work if
    // the argument includes some characters. We don't use escape() here
    // because of this:
    // https://developer.mozilla.org/en/Core_JavaScript_1.5_Guide/Functions#escape_and_unescape_Functions
    // But it looks decodeURIComponent(encodeURIComponent(s)) doesn't
    // preserve all Unicode characters either e.g. "\uffff" in Firefox.
    // Note by wtritch: Hopefully this will not be necessary using ExternalInterface.  Will require
    // additional testing.
    var result = WebSocket.__flash.send(this.__id, encodeURIComponent(data));
    if (result < 0) { // success
      return true;
    } else {
      this.bufferedAmount += result;
      return false;
    }
  };

  /**
   * Close this web socket gracefully.
   */
  WebSocket.prototype.close = function() {
    if (this.readyState == WebSocket.CLOSED || this.readyState == WebSocket.CLOSING) {
      return;
    }
    this.readyState = WebSocket.CLOSING;
    WebSocket.__flash.close(this.__id);
  };

  /**
   * Implementation of {@link <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-registration">DOM 2 EventTarget Interface</a>}
   *
   * @param {string} type
   * @param {function} listener
   * @param {boolean} useCapture
   * @return void
   */
  WebSocket.prototype.addEventListener = function(type, listener, useCapture) {
    if (!(type in this.__events)) {
      this.__events[type] = [];
    }
    this.__events[type].push(listener);
  };

  /**
   * Implementation of {@link <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-registration">DOM 2 EventTarget Interface</a>}
   *
   * @param {string} type
   * @param {function} listener
   * @param {boolean} useCapture
   * @return void
   */
  WebSocket.prototype.removeEventListener = function(type, listener, useCapture) {
    if (!(type in this.__events)) return;
    var events = this.__events[type];
    for (var i = events.length - 1; i >= 0; --i) {
      if (events[i] === listener) {
        events.splice(i, 1);
        break;
      }
    }
  };

  /**
   * Implementation of {@link <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-registration">DOM 2 EventTarget Interface</a>}
   *
   * @param {Event} event
   * @return void
   */
  WebSocket.prototype.dispatchEvent = function(event) {
    var events = this.__events[event.type] || [];
    for (var i = 0; i < events.length; ++i) {
      events[i](event);
    }
    var handler = this["on" + event.type];
    if (handler) handler(event);
  };

  /**
   * Handles an event from Flash.
   * @param {Object} flashEvent
   */
  WebSocket.prototype.__handleEvent = function(flashEvent) {
    if ("readyState" in flashEvent) {
      this.readyState = flashEvent.readyState;
    }
    if ("protocol" in flashEvent) {
      this.protocol = flashEvent.protocol;
    }
    
    var jsEvent;
    if (flashEvent.type == "open" || flashEvent.type == "error") {
      jsEvent = this.__createSimpleEvent(flashEvent.type);
    } else if (flashEvent.type == "close") {
      // TODO implement jsEvent.wasClean
      jsEvent = this.__createSimpleEvent("close");
    } else if (flashEvent.type == "message") {
      var data = decodeURIComponent(flashEvent.message);
      jsEvent = this.__createMessageEvent("message", data);
    } else {
      throw "unknown event type: " + flashEvent.type;
    }
    
    this.dispatchEvent(jsEvent);
  };
  
  WebSocket.prototype.__createSimpleEvent = function(type) {
    if (document.createEvent && window.Event) {
      var event = document.createEvent("Event");
      event.initEvent(type, false, false);
      return event;
    } else {
      return {type: type, bubbles: false, cancelable: false};
    }
  };
  
  WebSocket.prototype.__createMessageEvent = function(type, data) {
    if (document.createEvent && window.MessageEvent && !window.opera) {
      var event = document.createEvent("MessageEvent");
      event.initMessageEvent("message", false, false, data, null, null, window, null);
      return event;
    } else {
      // IE and Opera, the latter one truncates the data parameter after any 0x00 bytes.
      return {type: type, data: data, bubbles: false, cancelable: false};
    }
  };
  
  /**
   * Define the WebSocket readyState enumeration.
   */
  WebSocket.CONNECTING = 0;
  WebSocket.OPEN = 1;
  WebSocket.CLOSING = 2;
  WebSocket.CLOSED = 3;

  WebSocket.__flash = null;
  WebSocket.__instances = {};
  WebSocket.__tasks = [];
  WebSocket.__nextId = 0;
  
  /**
   * Load a new flash security policy file.
   * @param {string} url
   */
  WebSocket.loadFlashPolicyFile = function(url){
    WebSocket.__addTask(function() {
      WebSocket.__flash.loadManualPolicyFile(url);
    });
  };

  /**
   * Loads WebSocketMain.swf and creates WebSocketMain object in Flash.
   */
  WebSocket.__initialize = function() {
    if (WebSocket.__flash) return;
    
    if (WebSocket.__swfLocation) {
      // For backword compatibility.
      window.WEB_SOCKET_SWF_LOCATION = WebSocket.__swfLocation;
    }
    if (!window.WEB_SOCKET_SWF_LOCATION) {
      console.error("[WebSocket] set WEB_SOCKET_SWF_LOCATION to location of WebSocketMain.swf");
      return;
    }
    var container = document.createElement("div");
    container.id = "webSocketContainer";
    // Hides Flash box. We cannot use display: none or visibility: hidden because it prevents
    // Flash from loading at least in IE. So we move it out of the screen at (-100, -100).
    // But this even doesn't work with Flash Lite (e.g. in Droid Incredible). So with Flash
    // Lite, we put it at (0, 0). This shows 1x1 box visible at left-top corner but this is
    // the best we can do as far as we know now.
    container.style.position = "absolute";
    if (WebSocket.__isFlashLite()) {
      container.style.left = "0px";
      container.style.top = "0px";
    } else {
      container.style.left = "-100px";
      container.style.top = "-100px";
    }
    var holder = document.createElement("div");
    holder.id = "webSocketFlash";
    container.appendChild(holder);
    document.body.appendChild(container);
    // See this article for hasPriority:
    // http://help.adobe.com/en_US/as3/mobile/WS4bebcd66a74275c36cfb8137124318eebc6-7ffd.html
    swfobject.embedSWF(
      WEB_SOCKET_SWF_LOCATION,
      "webSocketFlash",
      "1" /* width */,
      "1" /* height */,
      "10.0.0" /* SWF version */,
      null,
      null,
      {hasPriority: true, swliveconnect : true, allowScriptAccess: "always"},
      null,
      function(e) {
        if (!e.success) {
          console.error("[WebSocket] swfobject.embedSWF failed");
        }
      });
  };
  
  /**
   * Called by Flash to notify JS that it's fully loaded and ready
   * for communication.
   */
  WebSocket.__onFlashInitialized = function() {
    // We need to set a timeout here to avoid round-trip calls
    // to flash during the initialization process.
    setTimeout(function() {
      WebSocket.__flash = document.getElementById("webSocketFlash");
      WebSocket.__flash.setCallerUrl(location.href);
      WebSocket.__flash.setDebug(!!window.WEB_SOCKET_DEBUG);
      for (var i = 0; i < WebSocket.__tasks.length; ++i) {
        WebSocket.__tasks[i]();
      }
      WebSocket.__tasks = [];
    }, 0);
  };
  
  /**
   * Called by Flash to notify WebSockets events are fired.
   */
  WebSocket.__onFlashEvent = function() {
    setTimeout(function() {
      try {
        // Gets events using receiveEvents() instead of getting it from event object
        // of Flash event. This is to make sure to keep message order.
        // It seems sometimes Flash events don't arrive in the same order as they are sent.
        var events = WebSocket.__flash.receiveEvents();
        for (var i = 0; i < events.length; ++i) {
          WebSocket.__instances[events[i].webSocketId].__handleEvent(events[i]);
        }
      } catch (e) {
        console.error(e);
      }
    }, 0);
    return true;
  };
  
  // Called by Flash.
  WebSocket.__log = function(message) {
    console.log(decodeURIComponent(message));
  };
  
  // Called by Flash.
  WebSocket.__error = function(message) {
    console.error(decodeURIComponent(message));
  };
  
  WebSocket.__addTask = function(task) {
    if (WebSocket.__flash) {
      task();
    } else {
      WebSocket.__tasks.push(task);
    }
  };
  
  /**
   * Test if the browser is running flash lite.
   * @return {boolean} True if flash lite is running, false otherwise.
   */
  WebSocket.__isFlashLite = function() {
    if (!window.navigator || !window.navigator.mimeTypes) {
      return false;
    }
    var mimeType = window.navigator.mimeTypes["application/x-shockwave-flash"];
    if (!mimeType || !mimeType.enabledPlugin || !mimeType.enabledPlugin.filename) {
      return false;
    }
    return mimeType.enabledPlugin.filename.match(/flashlite/i) ? true : false;
  };
  
  if (!window.WEB_SOCKET_DISABLE_AUTO_INITIALIZATION) {
    if (window.addEventListener) {
      window.addEventListener("load", function(){
        WebSocket.__initialize();
      }, false);
    } else {
      window.attachEvent("onload", function(){
        WebSocket.__initialize();
      });
    }
  }
  
})();

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {

  /**
   * Expose constructor.
   *
   * @api public
   */

  exports.XHR = XHR;

  /**
   * XHR constructor
   *
   * @costructor
   * @api public
   */

  function XHR (socket) {
    if (!socket) return;

    io.Transport.apply(this, arguments);
    this.sendBuffer = [];
  };

  /**
   * Inherits from Transport.
   */

  io.util.inherit(XHR, io.Transport);

  /**
   * Establish a connection
   *
   * @returns {Transport}
   * @api public
   */

  XHR.prototype.open = function () {
    this.socket.setBuffer(false);
    this.onOpen();
    this.get();

    // we need to make sure the request succeeds since we have no indication
    // whether the request opened or not until it succeeded.
    this.setCloseTimeout();

    return this;
  };

  /**
   * Check if we need to send data to the Socket.IO server, if we have data in our
   * buffer we encode it and forward it to the `post` method.
   *
   * @api private
   */

  XHR.prototype.payload = function (payload) {
    var msgs = [];

    for (var i = 0, l = payload.length; i < l; i++) {
      msgs.push(io.parser.encodePacket(payload[i]));
    }

    this.send(io.parser.encodePayload(msgs));
  };

  /**
   * Send data to the Socket.IO server.
   *
   * @param data The message
   * @returns {Transport}
   * @api public
   */

  XHR.prototype.send = function (data) {
    this.post(data);
    return this;
  };

  /**
   * Posts a encoded message to the Socket.IO server.
   *
   * @param {String} data A encoded message.
   * @api private
   */

  function empty () { };

  XHR.prototype.post = function (data) {
    var self = this;
    this.socket.setBuffer(true);

    function stateChange () {
      if (this.readyState == 4) {
        this.onreadystatechange = empty;
        self.posting = false;

        if (this.status == 200){
          self.socket.setBuffer(false);
        } else {
          self.onClose();
        }
      }
    }

    function onload () {
      this.onload = empty;
      self.socket.setBuffer(false);
    };

    this.sendXHR = this.request('POST');

    if (global.XDomainRequest && this.sendXHR instanceof XDomainRequest) {
      this.sendXHR.onload = this.sendXHR.onerror = onload;
    } else {
      this.sendXHR.onreadystatechange = stateChange;
    }

    this.sendXHR.send(data);
  };

  /**
   * Disconnects the established `XHR` connection.
   *
   * @returns {Transport}
   * @api public
   */

  XHR.prototype.close = function () {
    this.onClose();
    return this;
  };

  /**
   * Generates a configured XHR request
   *
   * @param {String} url The url that needs to be requested.
   * @param {String} method The method the request should use.
   * @returns {XMLHttpRequest}
   * @api private
   */

  XHR.prototype.request = function (method) {
    var req = io.util.request(this.socket.isXDomain())
      , query = io.util.query(this.socket.options.query, 't=' + +new Date);

    req.open(method || 'GET', this.prepareUrl() + query, true);

    if (method == 'POST') {
      try {
        if (req.setRequestHeader) {
          req.setRequestHeader('Content-type', 'text/plain;charset=UTF-8');
        } else {
          // XDomainRequest
          req.contentType = 'text/plain';
        }
      } catch (e) {}
    }

    return req;
  };

  /**
   * Returns the scheme to use for the transport URLs.
   *
   * @api private
   */

  XHR.prototype.scheme = function () {
    return this.socket.options.secure ? 'https' : 'http';
  };

  /**
   * Check if the XHR transports are supported
   *
   * @param {Boolean} xdomain Check if we support cross domain requests.
   * @returns {Boolean}
   * @api public
   */

  XHR.check = function (socket, xdomain) {
    try {
      var request = io.util.request(xdomain),
          usesXDomReq = (global.XDomainRequest && request instanceof XDomainRequest),
          socketProtocol = (socket && socket.options && socket.options.secure ? 'https:' : 'http:'),
          isXProtocol = (global.location && socketProtocol != global.location.protocol);
      if (request && !(usesXDomReq && isXProtocol)) {
        return true;
      }
    } catch(e) {}

    return false;
  };

  /**
   * Check if the XHR transport supports cross domain requests.
   *
   * @returns {Boolean}
   * @api public
   */

  XHR.xdomainCheck = function (socket) {
    return XHR.check(socket, true);
  };

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.htmlfile = HTMLFile;

  /**
   * The HTMLFile transport creates a `forever iframe` based transport
   * for Internet Explorer. Regular forever iframe implementations will 
   * continuously trigger the browsers buzy indicators. If the forever iframe
   * is created inside a `htmlfile` these indicators will not be trigged.
   *
   * @constructor
   * @extends {io.Transport.XHR}
   * @api public
   */

  function HTMLFile (socket) {
    io.Transport.XHR.apply(this, arguments);
  };

  /**
   * Inherits from XHR transport.
   */

  io.util.inherit(HTMLFile, io.Transport.XHR);

  /**
   * Transport name
   *
   * @api public
   */

  HTMLFile.prototype.name = 'htmlfile';

  /**
   * Creates a new Ac...eX `htmlfile` with a forever loading iframe
   * that can be used to listen to messages. Inside the generated
   * `htmlfile` a reference will be made to the HTMLFile transport.
   *
   * @api private
   */

  HTMLFile.prototype.get = function () {
    this.doc = new window[(['Active'].concat('Object').join('X'))]('htmlfile');
    this.doc.open();
    this.doc.write('<html></html>');
    this.doc.close();
    this.doc.parentWindow.s = this;

    var iframeC = this.doc.createElement('div');
    iframeC.className = 'socketio';

    this.doc.body.appendChild(iframeC);
    this.iframe = this.doc.createElement('iframe');

    iframeC.appendChild(this.iframe);

    var self = this
      , query = io.util.query(this.socket.options.query, 't='+ +new Date);

    this.iframe.src = this.prepareUrl() + query;

    io.util.on(window, 'unload', function () {
      self.destroy();
    });
  };

  /**
   * The Socket.IO server will write script tags inside the forever
   * iframe, this function will be used as callback for the incoming
   * information.
   *
   * @param {String} data The message
   * @param {document} doc Reference to the context
   * @api private
   */

  HTMLFile.prototype._ = function (data, doc) {
    // unescape all forward slashes. see GH-1251
    data = data.replace(/\\\//g, '/');
    this.onData(data);
    try {
      var script = doc.getElementsByTagName('script')[0];
      script.parentNode.removeChild(script);
    } catch (e) { }
  };

  /**
   * Destroy the established connection, iframe and `htmlfile`.
   * And calls the `CollectGarbage` function of Internet Explorer
   * to release the memory.
   *
   * @api private
   */

  HTMLFile.prototype.destroy = function () {
    if (this.iframe){
      try {
        this.iframe.src = 'about:blank';
      } catch(e){}

      this.doc = null;
      this.iframe.parentNode.removeChild(this.iframe);
      this.iframe = null;

      CollectGarbage();
    }
  };

  /**
   * Disconnects the established connection.
   *
   * @returns {Transport} Chaining.
   * @api public
   */

  HTMLFile.prototype.close = function () {
    this.destroy();
    return io.Transport.XHR.prototype.close.call(this);
  };

  /**
   * Checks if the browser supports this transport. The browser
   * must have an `Ac...eXObject` implementation.
   *
   * @return {Boolean}
   * @api public
   */

  HTMLFile.check = function (socket) {
    if (typeof window != "undefined" && (['Active'].concat('Object').join('X')) in window){
      try {
        var a = new window[(['Active'].concat('Object').join('X'))]('htmlfile');
        return a && io.Transport.XHR.check(socket);
      } catch(e){}
    }
    return false;
  };

  /**
   * Check if cross domain requests are supported.
   *
   * @returns {Boolean}
   * @api public
   */

  HTMLFile.xdomainCheck = function () {
    // we can probably do handling for sub-domains, we should
    // test that it's cross domain but a subdomain here
    return false;
  };

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('htmlfile');

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {

  /**
   * Expose constructor.
   */

  exports['xhr-polling'] = XHRPolling;

  /**
   * The XHR-polling transport uses long polling XHR requests to create a
   * "persistent" connection with the server.
   *
   * @constructor
   * @api public
   */

  function XHRPolling () {
    io.Transport.XHR.apply(this, arguments);
  };

  /**
   * Inherits from XHR transport.
   */

  io.util.inherit(XHRPolling, io.Transport.XHR);

  /**
   * Merge the properties from XHR transport
   */

  io.util.merge(XHRPolling, io.Transport.XHR);

  /**
   * Transport name
   *
   * @api public
   */

  XHRPolling.prototype.name = 'xhr-polling';

  /**
   * Indicates whether heartbeats is enabled for this transport
   *
   * @api private
   */

  XHRPolling.prototype.heartbeats = function () {
    return false;
  };

  /** 
   * Establish a connection, for iPhone and Android this will be done once the page
   * is loaded.
   *
   * @returns {Transport} Chaining.
   * @api public
   */

  XHRPolling.prototype.open = function () {
    var self = this;

    io.Transport.XHR.prototype.open.call(self);
    return false;
  };

  /**
   * Starts a XHR request to wait for incoming messages.
   *
   * @api private
   */

  function empty () {};

  XHRPolling.prototype.get = function () {
    if (!this.isOpen) return;

    var self = this;

    function stateChange () {
      if (this.readyState == 4) {
        this.onreadystatechange = empty;

        if (this.status == 200) {
          self.onData(this.responseText);
          self.get();
        } else {
          self.onClose();
        }
      }
    };

    function onload () {
      this.onload = empty;
      this.onerror = empty;
      self.retryCounter = 1;
      self.onData(this.responseText);
      self.get();
    };

    function onerror () {
      self.retryCounter ++;
      if(!self.retryCounter || self.retryCounter > 3) {
        self.onClose();  
      } else {
        self.get();
      }
    };

    this.xhr = this.request();

    if (global.XDomainRequest && this.xhr instanceof XDomainRequest) {
      this.xhr.onload = onload;
      this.xhr.onerror = onerror;
    } else {
      this.xhr.onreadystatechange = stateChange;
    }

    this.xhr.send(null);
  };

  /**
   * Handle the unclean close behavior.
   *
   * @api private
   */

  XHRPolling.prototype.onClose = function () {
    io.Transport.XHR.prototype.onClose.call(this);

    if (this.xhr) {
      this.xhr.onreadystatechange = this.xhr.onload = this.xhr.onerror = empty;
      try {
        this.xhr.abort();
      } catch(e){}
      this.xhr = null;
    }
  };

  /**
   * Webkit based browsers show a infinit spinner when you start a XHR request
   * before the browsers onload event is called so we need to defer opening of
   * the transport until the onload event is called. Wrapping the cb in our
   * defer method solve this.
   *
   * @param {Socket} socket The socket instance that needs a transport
   * @param {Function} fn The callback
   * @api private
   */

  XHRPolling.prototype.ready = function (socket, fn) {
    var self = this;

    io.util.defer(function () {
      fn.call(self);
    });
  };

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('xhr-polling');

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {
  /**
   * There is a way to hide the loading indicator in Firefox. If you create and
   * remove a iframe it will stop showing the current loading indicator.
   * Unfortunately we can't feature detect that and UA sniffing is evil.
   *
   * @api private
   */

  var indicator = global.document && "MozAppearance" in
    global.document.documentElement.style;

  /**
   * Expose constructor.
   */

  exports['jsonp-polling'] = JSONPPolling;

  /**
   * The JSONP transport creates an persistent connection by dynamically
   * inserting a script tag in the page. This script tag will receive the
   * information of the Socket.IO server. When new information is received
   * it creates a new script tag for the new data stream.
   *
   * @constructor
   * @extends {io.Transport.xhr-polling}
   * @api public
   */

  function JSONPPolling (socket) {
    io.Transport['xhr-polling'].apply(this, arguments);

    this.index = io.j.length;

    var self = this;

    io.j.push(function (msg) {
      self._(msg);
    });
  };

  /**
   * Inherits from XHR polling transport.
   */

  io.util.inherit(JSONPPolling, io.Transport['xhr-polling']);

  /**
   * Transport name
   *
   * @api public
   */

  JSONPPolling.prototype.name = 'jsonp-polling';

  /**
   * Posts a encoded message to the Socket.IO server using an iframe.
   * The iframe is used because script tags can create POST based requests.
   * The iframe is positioned outside of the view so the user does not
   * notice it's existence.
   *
   * @param {String} data A encoded message.
   * @api private
   */

  JSONPPolling.prototype.post = function (data) {
    var self = this
      , query = io.util.query(
             this.socket.options.query
          , 't='+ (+new Date) + '&i=' + this.index
        );

    if (!this.form) {
      var form = document.createElement('form')
        , area = document.createElement('textarea')
        , id = this.iframeId = 'socketio_iframe_' + this.index
        , iframe;

      form.className = 'socketio';
      form.style.position = 'absolute';
      form.style.top = '0px';
      form.style.left = '0px';
      form.style.display = 'none';
      form.target = id;
      form.method = 'POST';
      form.setAttribute('accept-charset', 'utf-8');
      area.name = 'd';
      form.appendChild(area);
      document.body.appendChild(form);

      this.form = form;
      this.area = area;
    }

    this.form.action = this.prepareUrl() + query;

    function complete () {
      initIframe();
      self.socket.setBuffer(false);
    };

    function initIframe () {
      if (self.iframe) {
        self.form.removeChild(self.iframe);
      }

      try {
        // ie6 dynamic iframes with target="" support (thanks Chris Lambacher)
        iframe = document.createElement('<iframe name="'+ self.iframeId +'">');
      } catch (e) {
        iframe = document.createElement('iframe');
        iframe.name = self.iframeId;
      }

      iframe.id = self.iframeId;

      self.form.appendChild(iframe);
      self.iframe = iframe;
    };

    initIframe();

    // we temporarily stringify until we figure out how to prevent
    // browsers from turning `\n` into `\r\n` in form inputs
    this.area.value = io.JSON.stringify(data);

    try {
      this.form.submit();
    } catch(e) {}

    if (this.iframe.attachEvent) {
      iframe.onreadystatechange = function () {
        if (self.iframe.readyState == 'complete') {
          complete();
        }
      };
    } else {
      this.iframe.onload = complete;
    }

    this.socket.setBuffer(true);
  };

  /**
   * Creates a new JSONP poll that can be used to listen
   * for messages from the Socket.IO server.
   *
   * @api private
   */

  JSONPPolling.prototype.get = function () {
    var self = this
      , script = document.createElement('script')
      , query = io.util.query(
             this.socket.options.query
          , 't='+ (+new Date) + '&i=' + this.index
        );

    if (this.script) {
      this.script.parentNode.removeChild(this.script);
      this.script = null;
    }

    script.async = true;
    script.src = this.prepareUrl() + query;
    script.onerror = function () {
      self.onClose();
    };

    var insertAt = document.getElementsByTagName('script')[0];
    insertAt.parentNode.insertBefore(script, insertAt);
    this.script = script;

    if (indicator) {
      setTimeout(function () {
        var iframe = document.createElement('iframe');
        document.body.appendChild(iframe);
        document.body.removeChild(iframe);
      }, 100);
    }
  };

  /**
   * Callback function for the incoming message stream from the Socket.IO server.
   *
   * @param {String} data The message
   * @api private
   */

  JSONPPolling.prototype._ = function (msg) {
    this.onData(msg);
    if (this.isOpen) {
      this.get();
    }
    return this;
  };

  /**
   * The indicator hack only works after onload
   *
   * @param {Socket} socket The socket instance that needs a transport
   * @param {Function} fn The callback
   * @api private
   */

  JSONPPolling.prototype.ready = function (socket, fn) {
    var self = this;
    if (!indicator) return fn.call(this);

    io.util.load(function () {
      fn.call(self);
    });
  };

  /**
   * Checks if browser supports this transport.
   *
   * @return {Boolean}
   * @api public
   */

  JSONPPolling.check = function () {
    return 'document' in global;
  };

  /**
   * Check if cross domain requests are supported
   *
   * @returns {Boolean}
   * @api public
   */

  JSONPPolling.xdomainCheck = function () {
    return true;
  };

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('jsonp-polling');

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);

if (typeof define === "function" && define.amd) {
  define([], function () { return io; });
}
})();
})()
},{}],54:[function(require,module,exports){
(function(){/* global FormData */
var Backbone = require('backbone');

module.exports = Backbone.Model.extend({
  defaults: {
    event: null
  },
  save: function () {
    var event = this.get('event'),
      file = event.file;
    if (file) {
      this.get('event').addAttachment(file, function () {
        //  console.log('trash event callback', arguments);
      });
    }
    event.update(function () {
      //  console.log('update event callback', arguments);
    });
  },
  create: function (callback, progressCallback) {
    console.log('CREATE', this);
    var event = this.get('event'),
      file = event.file;
    if (file) {
      event.connection.events.createWithAttachment(event, file, callback, progressCallback);
    }  else {
      event.connection.events.create(event, callback);
    }
  },
  addAttachment: function (file) {
    var data = new FormData();
    data.append(file.name.split('.')[0], file);
    this.get('event').file = data;
    this.get('event').previewFile = file;
  },
  removeAttachment: function (fileName, callback) {
    this.get('event').removeAttachment(fileName, callback);
  }
});
})()
},{"backbone":30}],53:[function(require,module,exports){
(function(){/* global $, FileReader, document*/
var Marionette = require('backbone.marionette'),
  _ = require('underscore'),
  Model = require('./EventModel.js'),
  MapLoader = require('google-maps'),
  creationStep = {typeSelect: 'typeSelect', streamSelect: 'streamSelect',
    pictureSelect: 'pictureSelect', eventEdit: 'eventEdit'},
  validType = ['note/txt', 'picture/attached', 'position/wgs84'],
  UNIQUE_ID = 0;

module.exports = Marionette.ItemView.extend({
  type: 'Creation',
  step: creationStep.typeSelect,
  className: 'full-height',
  pictureFile: null,
  focusedStream: null,
  newEvents: null,
  eventTime: null,
  eventType: null,
  google: null,
  connectionSelected: null,
  streamSelected: null,
  canPublish : true,
  getTemplate: function () {
    if (this.step === creationStep.typeSelect) {
      return '#template-detail-creation-type';
    } else if (this.step === creationStep.streamSelect) {
      return '#template-detail-creation-stream';
    } else if (this.step === creationStep.pictureSelect) {
      return '#template-detail-picture-select';
    } else if (this.step === creationStep.eventEdit) {
      return '#template-detail-creation-event';
    }
  },
  templateHelpers: function () {
    return {
      getStream: function () {
        return this.getStream();
      }.bind(this),
      getEventType: function () {
        return this.eventType.split('/')[0] || '';
      }.bind(this),
      getTypedView: function () {
        if (this.eventType === validType[2]) {
          this._initPositionView();
          return this._getPositionView();
        }
        if (this.eventType === validType[1]) {
          return this._getPictureView();
        }
        if (this.eventType === validType[0]) {
          return this._getNoteView();
        }
      }.bind(this)
    };
  },
  itemViewContainer: '#modal-content',
  ui: {
    type: '#type-select',
    fileElem: '#fileElem',
    fileSelect: '#fileSelect',
    stream: '.stream-tree-summary',
    inputStream: 'input.create-stream',
    selectStreamRadio: 'input.select-stream',
    publish: '#publish',
    cancel: '#cancel',
    spin: '.fa-spin',
    createStreamFrom: '.create-stream'
  },
  initialize: function () {
    this.step = creationStep.typeSelect;
  },
  onRender: function () {
    $(this.itemViewContainer).html($(this.el).fadeIn());
    this.ui.type.bind('click', this.onTypeClick.bind(this));
    this.ui.stream.bind('click', this.onStreamClick.bind(this));
    this.ui.fileSelect.bind('click', this.onFileSelectClick.bind(this));
    this.ui.fileElem.bind('change', this.onFileSelected.bind(this));
    this.ui.publish.bind('click', this.onPublishClick.bind(this));
    this.ui.cancel.bind('click', this.onCancelClick.bind(this));
    this.ui.inputStream.bind('keypress past', this.onInputStreamChange.bind(this));
    this.ui.createStreamFrom.bind('submit', function (e) {
      e.preventDefault();
      this.onPublishClick();
    }.bind(this));
    this.ui.spin.hide();
    $('.td-progress').hide();
    $('body').i18n();
  },
  _close: function () {
    this.trigger('close');
  },
  onInputStreamChange: function (e) {
    var currentValue = e.target.value;
    this.ui.selectStreamRadio.each(function (i, elem) {
      elem.checked = false;
    });
    this.ui.inputStream.val('');
    this.streamSelected = null;
    this.connectionSelected = null;
    $(e.target).parent().parent().find('input[type="radio"]').prop('checked', true);
    e.target.value = currentValue;
  },
  onPublishClick: function () {
    if (this.streamSelected && this.connectionSelected) {
      this.ui.spin.show();
      if (this.eventType === validType[2]) {
        this._publishPosition();
      }
      else if (this.eventType === validType[1]) {
        this._publishPicture();
      }
      else if (this.eventType === validType[0]) {
        this._publishNote();
      }
    } else {
      var input, parentId, name;
      /*jshint -W083 */
      for (var i = 0; i < this.ui.inputStream.length; i++) {
        input = $(this.ui.inputStream[i]);
        if (input.val().length > 0) {
          this.ui.spin.show();
          name = input.val().trim();
          parentId = input.attr('data-parentId') || null;
          this.connectionSelected = this.connection.get(input.attr('data-connection'));
          this.connectionSelected.streams.create({parentId: parentId, name: name},
          function (err, res) {
            if (err) {
              console.warn(err);
              this.ui.publish.css({'background-color': '#e74c3c'});
              this.ui.spin.hide();
            } else {
              this.streamSelected = res.id;
              this.onPublishClick();
            }
          }.bind(this));
          break;
        }
      }
    }
  },
  _publishNote: function () {

    var event = this.newEvents.get('event');
    var tags = $('#tags-0').val().trim().split(',');
    var description = $('#description-0').val().trim();
    var content = $('#content-0').val().trim();
    var time = new Date($('#edit-time-0').val()).getTime() / 1000;
    event.content = content;
    event.tags = tags;
    event.description = description;
    event.time = time;
    event.streamId = this.streamSelected;
    event.connection = this.connectionSelected;
    this.newEvents.create(function (err) {
      this.ui.spin.hide();
      if (err) {
        console.warn(err);
        this.ui.publish.css({'background-color': '#e74c3c'});
      } else {
        this.ui.publish.css({'background-color': '#2ecc71'});
        this._close();
      }
    }.bind(this));
  },
  _publishPosition: function () {
    var event = this.newEvents.get('event');
    var tags = $('#tags-0').val().trim().split(',');
    var description = $('#description-0').val().trim();
    var time = new Date($('#edit-time-0').val()).getTime() / 1000;
    event.tags = tags;
    event.description = description;
    event.time = time;
    event.streamId = this.streamSelected;
    event.connection = this.connectionSelected;
    this.newEvents.create(function (err) {
      this.ui.spin.hide();
      if (err) {
        console.warn(err);
        this.ui.publish.css({'background-color': '#e74c3c'});
      } else {
        this.ui.publish.css({'background-color': '#2ecc71'});
        this._close();
      }
    }.bind(this));

  },
  _publishPicture: function () {
    var self = this;
    if (!this.canPublish) {
      return;
    }
    this.canPublish = false;
    var asyncCount = this.newEvents.length;
    var create = function (model, $progressBar) {
      var error = false;
      model.create(function (err) {
        asyncCount--;
        $progressBar.removeClass('progress-striped', 'active');
        if (err) {
          error = true;
          $progressBar.find('.progress-bar').css({'background-color': '#e74c3c', 'width' : '100%'});
        } else {
          $progressBar.find('.progress-bar').css({'background-color': '#2ecc71', 'width' : '100%'});
          model.set('published', true);
        }
        if (error && asyncCount === 0) {
          self.ui.spin.hide();
          self.canPublish = true;
        } else if (!error && asyncCount === 0) {
          self.ui.spin.hide();
          self._close();
        }
      },
        function (e) {
          $progressBar.find('.progress-bar').css(
            {'width' : Math.ceil(100 * (e.loaded / e.total)) + '%'}
          );
        });
    };
    var tags, description, time, event, $progressBar;
    $('.td-tags, .td-time, .td-description').hide();
    $('.td-progress').show();
    for (var i = 0; i < this.newEvents.length; i++) {
      if (!this.newEvents[i].get('published')) {
        event = this.newEvents[i].get('event');
        $progressBar = $('#progress-' + i);
        $progressBar.addClass('progress-striped', 'active');
        $progressBar.find('.progress-bar').css({'background-color': '#2980b9', 'width' : '0%'});
        tags = $('#tags-' + i).val().trim().split(',');
        description = $('#description-' + i).val().trim();
        time = new Date($('#edit-time-' + i).val()).getTime() / 1000;
        event.tags = tags;
        event.description = description;
        event.time = time;
        event.streamId = this.streamSelected;
        event.connection = this.connectionSelected;
        create(this.newEvents[i], $progressBar);
      }
    }
  },

  onCancelClick: function () {
    this._close();
  },

  onStreamClick: function (e) {
    var streamSelected = $(e.target).attr('data-stream') ||
                         $(e.target).parent().attr('data-stream') ||
                         $(e.target).parent().parent().attr('data-stream'),
      connectionSelected = this.connection.get($(e.target).attr('data-connection') ||
                           $(e.target).parent().attr('data-connection') ||
                           $(e.target).parent().parent().attr('data-connection'));
    if (streamSelected && connectionSelected) {
      this.ui.inputStream.val('');
      $(e.target).find('input[type="radio"]').prop('checked', true);
    }
    this.streamSelected = streamSelected;
    if (connectionSelected) {
      this.connectionSelected = connectionSelected;
    }
    return true;
  },
  onTypeClick: function (e) {
    var typeSelected =  $(e.target).attr('data-type') || $(e.target).parent().attr('data-type'),
      event = this.model.get('event');

    if (validType.indexOf(typeSelected) !== -1) {
      event.type = this.eventType =  typeSelected;
      $('#myModalLabel').attr('data-i18n',
        'modal.addEvent.header.add-' + this.eventType.split('/')[0]);
      if (typeSelected === validType[1]) {
        this.step = creationStep.pictureSelect;
      } else  if (typeSelected === validType[2]) {
        MapLoader.KEY = 'AIzaSyCWRjaX1-QcCqSK-UKfyR0aBpBwy6hYK5M';
        MapLoader.load().then(function (google) {
          this.google = google;
        }.bind(this));
        this.step = creationStep.eventEdit;
      } else {
        this.step = creationStep.eventEdit;
      }
      this.render();
    }
    return true;
  },
  onFileSelectClick: function () {
    this.ui.fileElem.click();
  },
  onFileSelected: function (e) {
    var files = e.target.files;
    if (!files) {
      return false;
    }
    this.newEvents = [];
    _.each(files, function (file) {
      if (file.type.indexOf('image') !== -1) {
        var time = new Date().getTime() / 1000;
        if (file.lastModifiedDate) {
          time = file.lastModifiedDate.getTime() / 1000;
        }
        var model = new Model({event: {
          time: time,
          type: this.eventType,
          tags: [],
          content: null,
          description: ''
        }});
        model.addAttachment(file);
        this.newEvents.push(model);
      }
    }.bind(this));
    if (this.newEvents.length > 0) {
      this.step = creationStep.eventEdit;
      this.render();
      return true;
    } else {
      return false;
    }
  },
  getStream: function () {
    this.streamSelected  = this.focusedStream ? this.focusedStream.id : null;
    this.connectionSelected  = this.focusedStream ? this.focusedStream.connection : null;
    var result = '<div id="stream-select"><form>',
      connections  = this.connection._connections,
      open = '';
    if (this.focusedStream && this.focusedStream.length === 1) {
      this.focusedStream.ancestor = this._getStreamAncestor(this.focusedStream[0]);
    }
    _.each(connections, function (c) {
      if (!this._isWritePermission(c)) {
        return;
      }
      if (this.focusedStream && this.focusedStream.ancestor && this.focusedStream.ancestor[0] &&
        this.focusedStream.ancestor[0].serialId === c.serialId) {
        open = 'in';
        this.focusedStream.ancestor.shift();
      } else {
        open = '';
      }

      UNIQUE_ID++;
      result += '<li class="stream-tree-summary connection" data-toggle="collapse" ' +
        'data-target="#collapse' + UNIQUE_ID + '">' +
        '<label for="selectStream' + UNIQUE_ID + '">' +
        c.username;
      if (c._accessInfo.name !== 'pryv-browser') {
        result += ' / ' + c._accessInfo.name;
      }
      result += '</label></li>';
      result += '<ul id="collapse' + UNIQUE_ID +
        '" class="panel-collapse  collapse in stream-tree-children">' +
        '<div class="panel-body">';
      result += this.getStreamStructure(c);
      UNIQUE_ID++;
      result +=  '<li class="stream-tree-summary"><div class="pryv-radio">' +
        '<input type="radio" name="selectStream" id="selectStream' + UNIQUE_ID +
        '" class="select-stream"><label for="selectStream' + UNIQUE_ID + '">' +
        '<input type="text" class="form-control create-stream" ' +
        'data-i18n="[placeholder]modal.addEvent.createStream;"' +
        ' data-parentId="" data-connection="' + c.serialId + '">' +
        '</label></div></li>';
      result += '</div></ul>';

    }.bind(this));
    return result + '</form></div>';
  },
  getStreamStructure: function (connection) {
    var rootStreams = connection.datastore.getStreams(),
      result = '', open = '', checked = '';
    for (var i = 0; i < rootStreams.length; i++) {
      if (this._isWritePermission(connection, rootStreams[i])) {
        if (this.focusedStream && this.focusedStream.ancestor && this.focusedStream.ancestor[0] &&
          this.focusedStream.ancestor[0].id === rootStreams[i].id) {
          open = 'in';
          this.focusedStream.ancestor.shift();
          if (this.focusedStream.ancestor.length === 0) {
            checked = 'checked';
          }
        } else {
          checked = '';
          open = '';
        }
        result += this._walkStreamStructure(rootStreams[i], checked, open);
      }
    }
    return result;

  },
  _walkStreamStructure: function (stream, checked, open) {
    UNIQUE_ID++;
    var result = '<li data-connection="' +
      stream.connection.serialId + '" data-stream="' +
      stream.id + '" class="stream-tree-summary" data-toggle="collapse" ' +
      'data-target="#collapse' + UNIQUE_ID + '">' +
      '<div class="pryv-radio">' +
      '<input type="radio" name="selectStream" id="selectStream' + UNIQUE_ID +
      '" class="select-stream" ' +
      checked + '><label for="selectStream' + UNIQUE_ID + '">' +
      stream.name + '</label></div></li>';
    result += '<ul id="collapse' + UNIQUE_ID +
      '" class="panel-collapse  collapse ' + open + ' stream-tree-children">' +
      '<div class="panel-body">';
    open = '';
    checked = '';
    for (var j = 0; j < stream.children.length; j++) {
      if (this._isWritePermission(stream.connection, stream.children[j])) {
        if (this.focusedStream && this.focusedStream.ancestor && this.focusedStream.ancestor[0] &&
          this.focusedStream.ancestor[0].id === stream.children[j].id) {
          open = 'in';
          this.focusedStream.ancestor.shift();
          if (this.focusedStream.ancestor.length === 0) {
            checked = 'checked';
          }
        } else {
          open = '';
          checked = '';
        }
        result += this._walkStreamStructure(stream.children[j], checked, open);
      }
    }
    UNIQUE_ID++;
    result +=  '<li class="stream-tree-summary"><div class="pryv-radio">' +
      '<input type="radio" name="selectStream" id="selectStream' + UNIQUE_ID +
      '" class="select-stream"><label for="selectStream' + UNIQUE_ID + '">' +
      '<input type="text" class="form-control create-stream" ' +
      'data-i18n="[placeholder]modal.addEvent.createStream;"' +
      ' data-parentId="' + stream.id + '" data-connection="' + stream.connection.serialId + '">' +
      '</label></div></li>' +
      '</div></ul>';
    return result;
  },
  _isWritePermission: function (connection, streamId) {
    if (!connection._accessInfo) {
      return false;
    }
    if (connection._accessInfo.type === 'personal') {
      return true;
    }
    if (connection._accessInfo.permissions &&
      connection._accessInfo.permissions[0].streamId === '*' &&
      connection._accessInfo.permissions[0].streamId !== 'read') {
      return true;
    }
    if (connection._accessInfo.permissions &&
      connection._accessInfo.permissions[0].streamId === '*' &&
      connection._accessInfo.permissions[0].streamId === 'read') {
      return false;
    }
    if (streamId) {
      return !!_.find(connection._accessInfo.permissions, function (p) {
        return p.streamId === streamId && p.level !== 'read';
      });
    }
    return false;
  },
  _getStreamAncestor: function (stream) {
    var result = [];
    var ancestor = stream.parent;
    result.unshift(stream);
    while (ancestor) {
      result.unshift(ancestor);
      ancestor = ancestor.parent;
    }
    result.unshift(stream.connection);
    return result;
  },
  _initPositionView: function () {
    if (!this.google) {
      _.delay(this._initPositionView.bind(this), 100);
      return;
    }
    var map, elevator, marker, lat, lng;
    this.newEvents = new Model({event: {
      time: new Date().getTime() / 1000,
      type: this.eventType,
      tags: [],
      content: {},
      description: ''
    }});
    if (this.newEvents.get('event')) {
      this.newEvents.get('event').content.latitude = lat = 46.51759;
      this.newEvents.get('event').content.longitude = lng = 6.56267;

      map = new this.google.maps.Map(document.getElementById('creation-position'), {
        zoom: 16,
        center: new this.google.maps.LatLng(lat, lng),
        mapTypeId: this.google.maps.MapTypeId.ROADMAP
      });
      elevator = new this.google.maps.ElevationService();
      marker = new this.google.maps.Marker({
        position: new this.google.maps.LatLng(lat, lng),
        draggable: true
      });

      this.google.maps.event.addListener(marker, 'dragend', function (evt) {
        var event = this.newEvents.get('event');
        event.content.latitude = evt.latLng.lat();
        event.content.longitude = evt.latLng.lng();
        var positionalRequest = {
          'locations': [evt.latLng]
        };
        elevator.getElevationForLocations(positionalRequest, function (results, status) {
          if (status === this.google.maps.ElevationStatus.OK) {
            // Retrieve the first result
            if (results[0]) {
              var event = this.newEvents.get('event');
              event.content.altitude = results[0].elevation;
            }
          }
        }.bind(this));
      }.bind(this));
      map.setCenter(marker.position);
      marker.setMap(map);
    }
  },
  _getNoteView: function () {
    this.newEvents = new Model({event: {
      time: new Date().getTime() / 1000,
      type: this.eventType,
      tags: [],
      content: null,
      description: ''
    }});
    var result = '';
    result += '<form id="creation-form" role="form">' +
      '      <div class="form-group td-content">' +
      '        <label class="sr-only" for="content">Content</label>' +
      '        <textarea rows="15" class="form-control" id="content-0" ' +
      'data-i18n="[placeholder]modal.addEvent.editForm.noteContent"></textarea>' +
      '      </div>' +
      '  <div class="form-group td-tags">' +
      '    <label class="sr-only" for="tags">Tags</label>' +
      '    <input type="text" class="form-control" id="tags-0" ' +
      'data-i18n="[placeholder]modal.addEvent.editForm.tags">' +
      '    </div>' +
      '    <div class="form-group td-time">' +
      '      <label class="sr-only" for="edit-time">Time</label>' +
      '      <input type="datetime-local" class="edit" id="edit-time-0" ' +
      'value="' + new Date().toISOString().slice(0, -5) +
      '">' +
      '      </div>' +
      '      <div class="form-group td-description">' +
      '        <label class="sr-only" for="description">Description</label>' +
      '        <textarea rows="3" class="form-control" id="description-0" ' +
      'data-i18n="[placeholder]modal.addEvent.editForm.description"></textarea>' +
      '      </div>' +
      '    </form>';
    return result;
  },
  _getPositionView: function () {
    var result = '';
    result += '<div id="creation-position" class="col-md-12"></div>';
    result += '<form id="creation-form" role="form">' +
      '  <div class="form-group td-tags">' +
      '    <label class="sr-only" for="tags">Tags</label>' +
      '    <input type="text" class="form-control" id="tags-0" ' +
      'data-i18n="[placeholder]modal.addEvent.editForm.tags">' +
      '    </div>' +
      '    <div class="form-group td-time">' +
      '      <label class="sr-only" for="edit-time">Time</label>' +
      '      <input type="datetime-local" class="edit" id="edit-time-0" ' +
      'value="' + new Date().toISOString().slice(0, -5) +
      '">' +
      '      </div>' +
      '      <div class="form-group td-description">' +
      '        <label class="sr-only" for="description">Description</label>' +
      '        <textarea rows="3" class="form-control" id="description-0" ' +
      'data-i18n="[placeholder]modal.addEvent.editForm.description;"></textarea>' +
      '      </div>' +
      '    </form>';
    return result;
  },
  _getPictureView: function () {
    var reader = new FileReader();
    var toRead = [];
    var  readFile = function (elems) {
      var elem = elems.shift(), file, selector;
      if (elem) {
        file = elem.file;
        selector = elem.selector;
        reader.onload = function (e) {
          $(selector).attr('src', e.target.result);
          readFile(elems);
        };
        reader.readAsDataURL(file);
      }
    };
    var result = '';
    if (this.newEvents.length === 1) {
      var event = this.newEvents[0].get('event');
      result += '<div id="creation-picture" class="col-md-12">' +
        '<img src="#" id="preview-0"></div>';
      result += '<form id="creation-form" role="form">' +
        '<div id="progress-0' +
        '" class="td-progress progress progress-striped active" >' +
        '<div class="progress-bar" role="progressbar" aria-valuenow="" aria-valuemin="0" ' +
        'aria-valuemax="100" style="width: 0%"></div></div>' +
        '  <div class="form-group td-tags">' +
        '    <label class="sr-only" for="tags">Tags</label>' +
        '    <input type="text" class="form-control" id="tags-0" ' +
        'data-i18n="[placeholder]modal.addEvent.editForm.tags;">' +
        '    </div>' +
        '    <div class="form-group td-time">' +
        '      <label class="sr-only" for="edit-time">Time</label>' +
        '      <input type="datetime-local" class="edit" id="edit-time-0" ' +
        'value="' + new Date(Math.round(event.time * 1000)).toISOString().slice(0, -5) +
        '">' +
        '      </div>' +
        '      <div class="form-group td-description">' +
        '        <label class="sr-only" for="description">Description</label>' +
        '        <textarea rows="3" class="form-control" id="description-0" ' +
        'data-i18n="[placeholder]modal.addEvent.editForm.description;"></textarea>' +
        '      </div>' +
        '    </form>';
      toRead.push({file: event.previewFile, selector: '#preview-0'});
    } else {
      result = '<table id="creation-picture-table" class="table table-striped">';
      for (var i = 0; i < this.newEvents.length; i++) {
        var model = this.newEvents[i];
        result += '<tr>' +
          '<td class="td-preview"><div class="preview"><img src="#" id="preview-' + i +
          '"></div></td>' +
          '<td class="td-progress"><div id="progress-' + i +
          '" class="progress progress-striped active" >' +
          '<div class="progress-bar" role="progressbar" aria-valuenow="" aria-valuemin="0" ' +
          'aria-valuemax="100" style="width: 0%"></div></div></td>' +
          '<td class="td-tags"><div class="form-group"><label class="sr-only" ' +
          'for="tags">Tags</label>' +
          '<input type="text" class="form-control" id="tags-' + i +
          '" data-i18n="[placeholder]modal.addEvent.editForm.tags;">' +
          '</div></td>' +
          '<td class="td-time"><div class="form-group"><label class="sr-only" ' +
          'for="edit-time">Time</label>' +
          '<input type="datetime-local" class="edit" id="edit-time-' + i + '" value="' +
          new Date(Math.round(model.get('event').time * 1000)).toISOString().slice(0, -5) +
          '"></div></td>' +
          '<td class="td-description"><div class="form-group"><label class="sr-only" ' +
          'for="description">Description' +
          '</label><textarea row="3" class="form-control" id="description-' + i + '" ' +
          'data-i18n="[placeholder]modal.addEvent.editForm.description;"></textarea></div></td>' +
          '</tr>';
        toRead.push({file: model.get('event').previewFile, selector: '#preview-' + i});
      }
      result += '</table>';
    }
    _.delay(readFile(toRead), 1000);
    return result;
  }
});
})()
},{"./EventModel.js":54,"backbone.marionette":32,"google-maps":89,"underscore":9}],51:[function(require,module,exports){
var Backbone = require('backbone'),
  Model = require('./Model.js');

module.exports = Backbone.Collection.extend({
  url: '#',
  model: Model
});
},{"./Model.js":50,"backbone":30}],50:[function(require,module,exports){
var Backbone = require('backbone');

module.exports = Backbone.Model.extend({
  defaults: {
    connection: null,
    collection: null,
    checked: true,
    error: null,
    created: false
  }
});
},{"backbone":30}],55:[function(require,module,exports){
(function(){/*global $ */
var Marionette = require('backbone.marionette'),
  _ = require('underscore');

module.exports = Marionette.ItemView.extend({
  template: '#nav-settings-modal-template',
  ui: {
    a: 'a'
  },
  onRender: function () {
    this.ui.a.click(function (e) {
      this._removeActive();
      e.currentTarget.classList.add('active');
      this.trigger('showRegion', e.currentTarget.getAttribute('data-name'));
    }.bind(this));
    setTimeout(function () {$('body').i18n(); }, 100);
  },
  _removeActive: function () {
    _.each(this.ui.a, function (a) {
      a.classList.remove('active');
    });
  },
  activeRegion: function (regionName) {
    for (var i = 0 ; i < this.ui.a.length; i++) {
      if (this.ui.a[i].getAttribute('data-name') === regionName) {
        this._removeActive();
        this.ui.a[i].classList.add('active');
        break;
      }
    }
  }

});



})()
},{"backbone.marionette":32,"underscore":9}],52:[function(require,module,exports){
(function(){/* global $ */
var Marionette = require('backbone.marionette'),
  ItemView = require('./ItemView.js'),
  _ = require('underscore');

module.exports = Marionette.CompositeView.extend({
  template: '#template-subscribeListCompositeView',
  container: '.modal-content',
  itemView: ItemView,
  itemViewContainer: '#subscribe-list',
  $addButton: null,
  $forms: null,
  initialize: function () {
    this.listenTo(this.collection, 'change', this.debounceRender);
    //this.listenTo(this.collection, 'change', this.bindClick);
    $(this.container).append('<div class="modal-header">  ' +
      '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>' +
      ' <h4 class="modal-title" id="myModalLabel">Add to my Pryv</h4><div class="modal-close">' +
      '</div></div>' +
      '<div id="modal-content">' +
      '<div id="creation-content"><ul id="subscribe-list"></ul></div>' +
      '<div id="creation-footer" class="col-md-12">' +
      '<button class="btn btn-pryv-turquoise" id="add-subscribe">Add ' +
      '<i class="fa fa-spinner fa-spin"></i></button>' +
      '<button id="cancel" class="btn" data-dismiss="modal">Cancel</button>' +
      '</div></div>');
    this.$addButton = $('#add-subscribe');
    $('.fa-spin', this.$addButton).hide();
    this.$addButton.bind('click', this._addSubscribe.bind(this));
  },
  _addSubscribe: function () {
    var subscriptions = [];
    $('.fa-spin', this.$addButton).show();
    this.$addButton.attr('disabled', 'disabled');
    this.collection.each(function (model) {
      if (model.get('checked') && !model.get('created')) {
        subscriptions.push(model);
      }
    }.bind(this));
    this.trigger('subscription:add', subscriptions);
  },
  onCreateSubscriptionFinished: function (error) {
    console.log('onCreateSubscriptionFinished');
    $('.fa-spin', this.$addButton).hide();
    this.$addButton.attr('disabled', false);
    if (!error) {
      this.trigger('close');
    }
  },
  appendHtml: function (collectionView, itemView) {
    $(this.itemViewContainer).append(itemView.el);
  },
  onRender: function () {
    this.$forms = $('form.subscribe');
    this.$forms.bind('submit',
      function (e) {
        e.preventDefault();
        this._addSubscribe();
      }.bind(this));
  },
  onBeforeClose: function () {
    $(this.container).empty();
    return true;
  },
  debounceRender: _.debounce(function () {
    this.render();
  }, 10)
});

})()
},{"./ItemView.js":90,"backbone.marionette":32,"underscore":9}],56:[function(require,module,exports){

var Marionette = require('backbone.marionette');

module.exports = Marionette.ItemView.extend({
  template: '#password-settings-modal-template',
  ui: {
    form: 'form',
    save: 'button[type=submit]',
    spinner: '.fa-spinner',
    current: '#currentPassword',
    new: '#newPassword',
    reNew: '#reNewPassword'
  },
  onRender: function () {
    this.bindUIElements();
    this.ui.spinner.hide();
    this.ui.form.submit(this._onFormSubmit.bind(this));
  },
  _onFormSubmit: function (e) {
    e.preventDefault();
    var newPass = this.ui.new.val();
    var reNewPass = this.ui.reNew.val();
    var currentPass = this.ui.current.val();
    if (newPass && newPass.length > 0 && newPass === reNewPass) {
      this.ui.spinner.show();
      this.ui.save.prop('disabled', true);
      this.options.connection.account.changePassword(currentPass, newPass, function (error) {
        this.ui.spinner.hide();
        this.ui.save.prop('disabled', false);
        if (error) {
          console.warn(error);
          this.ui.save.css({'background-color': '#e74c3c'});
        }  else {
          this.ui.save.css({'background-color': '#2ecc71'});
          this.ui.new.val('');
          this.ui.reNew.val('');
          this.ui.current.val('');
        }
      }.bind(this));
    }
  }

});



},{"backbone.marionette":32}],59:[function(require,module,exports){
var Backbone = require('backbone'),
  Model = require('./SharingModel.js');

module.exports = Backbone.Collection.extend({
  url: '#',
  model: Model
});
},{"./SharingModel.js":57,"backbone":30}],58:[function(require,module,exports){
(function(){/* global $ */
var Marionette = require('backbone.marionette'),
  ItemView = require('./BookmarkItemView.js'),
  Pryv = require('pryv'),
  _ = require('underscore');

module.exports = Marionette.CompositeView.extend({
  template: '#template-bookmarkListCompositeView',
  container: '.sharings',
  itemView: ItemView,
  itemViewContainer: '#bookmark-list',
  $url: null,
  $auth: null,
  $name: null,
  $tick: null,
  $form: null,
  _findAuthFromUrl: function () {

    var url = this.$url.val(),
      params = Pryv.utility.getParamsFromUrl(url),
      sharings = Pryv.utility.getSharingsFromUrl(url);
    if (params && params.auth) {
      this.$auth.val(params.auth);
    } else if (sharings && sharings.length > 0) {
      this.$auth.val(sharings.join(','));
    }

  },
  initialize: function () {
    this.listenTo(this.collection, 'change', this.debounceRender);
    //this.listenTo(this.collection, 'change', this.bindClick);
    $(this.container).append('<h5 data-i18n="modal.manageSlices.followedSlices"></h5>' +
      
      '<table class="table" >' +
      '<thead><tr><th data-i18n="modal.manageSlices.name"></th>' +
      '<th data-i18n="modal.manageSlices.link"></th><th></th></tr></thead>' +
      '<tbody id="bookmark-list"></tbody>' +
      '</table>' +
      '<button class="btn btn-default btn-sm" id="add-slice">' +
      ' <i class="fa fa-plus-square-o"></i> ' +
      '<span data-i18n="modal.manageSlices.newAdd"></span></button>' +
      '<form class="form-inline" id="add-bookmark" role="form">' +
      '<div class="form-group">' +
      ' <label class="sr-only" for="add-bookmark-url">url</label>' +
      ' <input type="url" class="form-control" id="add-bookmark-url" ' +
      'data-i18n="[placeholder]modal.manageSlices.newLink">' +
      '</div> ' +
      '<div class="form-group">' +
        '<label class="sr-only" for="add-bookmark-name">Name</label>' +
        '<input type="text" class="form-control" id="add-bookmark-name" ' +
      'data-i18n="[placeholder]modal.manageSlices.newName">' +
      '</div>' +
      '<div class="form-group">' +
        ' <label class="sr-only" for="add-bookmark-auth">token</label>' +
        ' <input type="text" class="form-control" id="add-bookmark-auth" placeholder="Token(s)">' +
      '</div> ' +
      ' <button type="submit" id ="add-bookmark-btn" class="btn btn-default">' +
      '<span data-i18n="button.add"></span> ' +
      '<i class="fa fa-spinner fa-spin"></i></button>  ' +
      '' +
      ' </form>');
    this.$url = $('#add-bookmark-url');
    this.$auth = $('#add-bookmark-auth');
    this.$name = $('#add-bookmark-name');
    this.$btn = $('#add-bookmark-btn');
    this.$form = $('#add-bookmark');
    this.$spin = $('#add-bookmark-btn .fa-spin');
    this.$spin.hide();
    this.$form.toggle();
    this.$addSlice = $('#add-slice');
    this.$addSlice.click(function () {
      this.$form.toggle();
      this.$addSlice.toggle();
    }.bind(this));
    this.$form.bind('change paste keyup', function () {
      this.$btn.removeClass('btn-danger btn-success').addClass('btn-default');
    }.bind(this));
    this.$url.bind('change paste keyup', this._findAuthFromUrl.bind(this));
    this.$form.submit(function (e) {
      e.preventDefault();
      var auths = this.$auth.val().split(','),
        url = this.$url.val(),
        name = this.$name.val(),
        sameNameExtension = '',
        i = 0;
      this.$spin.show();
      auths.forEach(function (auth) {
        this.trigger('bookmark:add', url, auth, name + sameNameExtension);
        i += 1;
        sameNameExtension = '-' + i;
      }.bind(this));
    }.bind(this));
  },
  endAddBookmark: function (error) {
    this.$spin.hide();
    if (error) {
      this.$btn.removeClass('btn-default btn-success').addClass('btn-danger');
    } else {
      this.$btn.removeClass('btn-default btn-danger').addClass('btn-success');
    }
  },
  appendHtml: function (collectionView, itemView) {
    $(this.itemViewContainer).append(itemView.el);
  },
  onRender: function () {
    $('body').i18n();
  },
  onBeforeClose: function () {
    $(this.container).empty();
    return true;
  },
  debounceRender: _.debounce(function () {
    this.render();
  }, 10)
});

})()
},{"./BookmarkItemView.js":91,"backbone.marionette":32,"pryv":10,"underscore":9}],62:[function(require,module,exports){
var Backbone = require('backbone'),
  Model = require('./BookmarkModel.js');

module.exports = Backbone.Collection.extend({
  url: '#',
  model: Model
});
},{"./BookmarkModel.js":61,"backbone":30}],57:[function(require,module,exports){
var Backbone = require('backbone');

module.exports = Backbone.Model.extend({
  defaults: {
    sharing: null,
    collection: null
  }
});
},{"backbone":30}],61:[function(require,module,exports){
var Backbone = require('backbone');

module.exports = Backbone.Model.extend({
  defaults: {
    bookmark: null,
    collection: null
  }
});
},{"backbone":30}],60:[function(require,module,exports){
(function(){/* global $ */
var Marionette = require('backbone.marionette'),
  ItemView = require('./SharingItemView.js'),
  _ = require('underscore');

module.exports = Marionette.CompositeView.extend({
  template: '#template-sharingListCompositeView',
  container: '.sharings',
  itemView: ItemView,
  itemViewContainer: '#sharing-list',

  initialize: function () {
    this.listenTo(this.collection, 'add remove', this.debounceRender);
    //this.listenTo(this.collection, 'change', this.bindClick);
    $(this.container).append('<h5 data-i18n="modal.manageSlices.sharedSlices"></h5>' +
    '<table class="table" >' +
      '<thead><tr><th data-i18n="modal.manageSlices.name">Name</th>' +
      '<th data-i18n="modal.manageSlices.link">Link</th>' +
      '<th data-i18n="modal.manageSlices.share">Share</th><th></th></tr></thead>' +
      '<tbody id="sharing-list"></tbody>' +
    '</table>');
  },
  appendHtml: function (collectionView, itemView) {
    $(this.itemViewContainer).append(itemView.el);
  },
  onRender: function () {
    $('body').i18n();
  },
  onBeforeClose: function () {
    $(this.container).empty();
    return true;
  },
  debounceRender: _.debounce(function () {
    this.render();
  }, 10)
});

})()
},{"./SharingItemView.js":92,"backbone.marionette":32,"underscore":9}],42:[function(require,module,exports){
(function(){/**
 * (event)Emitter renamed to avoid confusion with prvy's events
 */


var _ = require('underscore');

var SignalEmitter = module.exports = function (messagesMap) {
  SignalEmitter.extend(this, messagesMap);
};


SignalEmitter.extend = function (object, messagesMap, name) {
  if (! name) {
    throw new Error('"name" parameter must be set');
  }
  object._signalEmitterEvents = {};
  _.each(_.values(messagesMap), function (value) {
    object._signalEmitterEvents[value] = [];
  });
  _.extend(object, SignalEmitter.prototype);
  object._signalEmitterName = name;
};


SignalEmitter.Messages = {
  /** called when a batch of changes is expected, content: <batchId> unique**/
  BATCH_BEGIN : 'beginBatch',
  /** called when a batch of changes is done, content: <batchId> unique**/
  BATCH_DONE : 'doneBatch',
  /** if an eventListener return this string, it will be removed automatically **/
  UNREGISTER_LISTENER : 'unregisterMePlease'
};

/**
 * Add an event listener
 * @param signal one of  Messages.SIGNAL.*.*
 * @param callback function(content) .. content vary on each signal.
 * If the callback returns SignalEmitter.Messages.UNREGISTER_LISTENER it will be removed
 * @return the callback function for further reference
 */
SignalEmitter.prototype.addEventListener = function (signal, callback) {
  this._signalEmitterEvents[signal].push(callback);
  return callback;
};


/**
 * remove the callback matching this signal
 */
SignalEmitter.prototype.removeEventListener = function (signal, callback) {
  for (var i = 0; i < this._signalEmitterEvents[signal].length; i++) {
    if (this._signalEmitterEvents[signal][i] === callback) {
      this._signalEmitterEvents[signal][i] = null;
    }
  }
};


/**
 * A changes occurred on the filter
 * @param signal
 * @param content
 * @param batch
 * @private
 */
SignalEmitter.prototype._fireEvent = function (signal, content, batch) {
  var batchId = batch ? batch.id : null;
  if (! signal) { throw new Error(); }

  var batchStr = batchId ? ' batch: ' + batchId + ', ' + batch.batchName : '';
  console.log('FireEvent-' + this._signalEmitterName  + ' : ' + signal + batchStr);

  _.each(this._signalEmitterEvents[signal], function (callback) {
    if (callback !== null &&
      SignalEmitter.Messages.UNREGISTER_LISTENER === callback(content, batchId, batch)) {
      this.removeEventListener(signal, callback);
    }
  }, this);
};


SignalEmitter.batchSerial = 0;
/**
 * start a batch process
 * @param eventual superBatch you can hook on. In this case it will call superBatch.waitForMe(..)
 * @return an object where you have to call stop when done
 */
SignalEmitter.prototype.startBatch = function (batchName, orHookOnBatch) {
  if (orHookOnBatch && orHookOnBatch.sender === this) { // test if this batch comes form me
    return orHookOnBatch.waitForMeToFinish();
  }
  var batch = {
    sender : this,
    batchName : batchName || '',
    id : this._signalEmitterName + SignalEmitter.batchSerial++,
    filter : this,
    waitFor : 1,
    doneCallbacks : {},

    waitForMeToFinish : function () {
      batch.waitFor++;
      return this;
    },

    /**
     * listener are stored in key/map fashion, so addOnDoneListener('bob',..)
     * may be called several time, callback 'bob', will be done just once
     * @param key a unique key per callback
     * @param callback
     */
    addOnDoneListener : function (key, callback) {
      this.doneCallbacks[key] = callback;
    },
    done : function (name) {
      this.waitFor--;
      if (this.waitFor === 0) {
        _.each(this.doneCallbacks, function (callback) { callback(); });
        this.filter._fireEvent(SignalEmitter.Messages.BATCH_DONE, this.id, this);
      }
      if (this.waitFor < 0) {
        console.error('This batch has been done() to much :' + name);
      }
    }
  };
  this._fireEvent(SignalEmitter.Messages.BATCH_BEGIN, batch.id, batch);
  return batch;
};

})()
},{"underscore":43}],48:[function(require,module,exports){
var _ = require('underscore'),
    utility = require('../utility/utility'),
    Monitor = require('../Monitor');

/**
 * @class ConnectionMonitors
 * @private
 *
 * @param {Connection} connection
 * @constructor
 */
function ConnectionMonitors(connection) {
  this.connection = connection;
  this._monitors = {};
  this.ioSocket = null;
}

/**
 * Start monitoring this Connection. Any change that occurs on the connection (add, delete, change)
 * will trigger an event. Changes to the filter will also trigger events if they have an impact on
 * the monitored data.
 * @param {Filter} filter - changes to this filter will be monitored.
 * @returns {Monitor}
 */
ConnectionMonitors.prototype.create = function (filter) {
  if (!this.connection.username) {
    console.error('Cannot create a monitor for a connection without username:', this.connection);
    return null;
  }
  return new Monitor(this.connection, filter);
};



/**
 * TODO
 * @private
 */
ConnectionMonitors.prototype._stopMonitoring = function (/*callback*/) {

};

/**
 * Internal for Connection.Monitor
 * Maybe moved in Monitor by the way
 * @param callback
 * @private
 * @return {Object} XHR or Node http request
 */
ConnectionMonitors.prototype._startMonitoring = function (callback) {
  if (!this.connection.username) {
    console.error('Cannot start monitoring for a connection without username:', this.connection);
    return callback(true);
  }
  if (this.ioSocket) { return callback(null/*, ioSocket*/); }

  var settings = {
    host : this.connection.username + '.' + this.connection.settings.domain,
    port : this.connection.settings.port,
    ssl : this.connection.settings.ssl,
    path : this.connection.settings.extraPath + '/' + this.connection.username,
    namespace : '/' + this.connection.username,
    auth : this.connection.auth
  };

  this.ioSocket = utility.ioConnect(settings);

  this.ioSocket.on('connect', function () {
    _.each(this._monitors, function (monitor) { monitor._onIoConnect(); });
  }.bind(this));
  this.ioSocket.on('error', function (error) {
    _.each(this._monitors, function (monitor) { monitor._onIoError(error); });
  }.bind(this));
  this.ioSocket.on('eventsChanged', function () {
    _.each(this._monitors, function (monitor) { monitor._onIoEventsChanged(); });
  }.bind(this));
  this.ioSocket.on('streamsChanged', function () {
    _.each(this._monitors, function (monitor) { monitor._onIoStreamsChanged(); });
  }.bind(this));
  callback(null);
};

module.exports = ConnectionMonitors;



},{"../Monitor":16,"../utility/utility":18,"underscore":43}],44:[function(require,module,exports){
var utility = require('../utility/utility.js'),
  _ = require('underscore'),
  Filter = require('../Filter'),
  Event = require('../Event'),
  CC = require('./ConnectionConstants.js');

/**
 * @class ConnectionEvents
 *
 * Coverage of the API
 *  GET /events -- 100%
 *  POST /events -- only data (no object)
 *  POST /events/start -- 0%
 *  POST /events/stop -- 0%
 *  PUT /events/{event-id} -- 100%
 *  DELETE /events/{event-id} -- only data (no object)
 *  POST /events/batch -- only data (no object)
 *
 *  attached files manipulations are covered by Event
 *
 *
 * @param {Connection} connection
 * @constructor
 */
function ConnectionEvents(connection) {
  this.connection = connection;
}


/**
 * @example
 * // get events from the Diary stream
 * conn.events.get({streamId : 'diary'},
 *  function(events) {
 *    console.log('got ' + events.length + ' events)
 *  }
 * );
 * @param {FilterLike} filter
 * @param {ConnectionEvents~getCallback} doneCallback
 * @param {ConnectionEvents~partialResultCallback} partialResultCallback
 */
ConnectionEvents.prototype.get = function (filter, doneCallback, partialResultCallback) {
  //TODO handle caching
  var result = [];
  this._get(filter, function (error, res) {
    var eventList = res.events || res.event;
    _.each(eventList, function (eventData) {
      result.push(new Event(this.connection, eventData));
    }.bind(this));
    doneCallback(error, result);
    if (partialResultCallback) { partialResultCallback(result); }
  }.bind(this));
};

/**
 * @param {Event} event
 * @param {Connection~requestCallback} callback
 */
ConnectionEvents.prototype.update = function (event, callback) {
  this._updateWithIdAndData(event.id, event.getData(), callback);
};

/**
 * @param {Event | eventId} event
 * @param {Connection~requestCallback} callback
 */
ConnectionEvents.prototype.trash = function (event, callback) {
  this.trashWithId(event.id, callback);
};

/**
 * @param {String} eventId
 * @param {Connection~requestCallback} callback
 */
ConnectionEvents.prototype.trashWithId = function (eventId, callback) {
  var url = '/events/' + eventId;
  this.connection.request('DELETE', url, callback, null);
};

/**
 * This is the preferred method to create an event, or to create it on the API.
 * The function return the newly created object.. It will be updated when posted on the API.
 * @param {NewEventLike} event -- minimum {streamId, type } -- if typeof Event, must belong to
 * the same connection and not exists on the API.
 * @param {ConnectionEvents~eventCreatedOnTheAPI} callback
 * @return {Event} event
 */
ConnectionEvents.prototype.create = function (newEventlike, callback) {
  var event = null;
  if (newEventlike instanceof Event) {
    if (newEventlike.connection !== this.connection) {
      return callback(new Error('event.connection does not match current connection'));
    }
    if (newEventlike.id) {
      return callback(new Error('cannot create an event already existing on the API'));
    }
    event = newEventlike;
  } else {
    event = new Event(this.connection, newEventlike);
  }

  var url = '/events';
  this.connection.request('POST', url, function (err, result, resultInfo) {
    if (! err && resultInfo.code !== 201) {
      err = {id : CC.Errors.INVALID_RESULT_CODE};
    }
    /**
     * Change will happend with offline caching...
     *
     * An error may hapend 400.. or other if app is behind an non-opened gateway. Thus making
     * difficult to detect if the error is a real bad request.
     * The first step would be to consider only bad request if the response can be identified
     * as coming from a valid api-server. If not, we should cache the event for later synch
     * then remove the error and send the cached version of the event.
     *
     */
    // TODO if err === API_UNREACHABLE then save event in cache
    if (result && ! err) {
      _.extend(event, result.event);
    }
    if (_.isFunction(callback)) {

      callback(err, err ? null : event);
    }
  }, event.getData());
  return event;
};
ConnectionEvents.prototype.createWithAttachment = function (newEventLike, file, callback,
                                                            progressCallback) {
  var event = null;
  if (newEventLike instanceof Event) {
    if (newEventLike.connection !== this.connection) {
      return callback(new Error('event.connection does not match current connection'));
    }
    if (newEventLike.id) {
      return callback(new Error('cannot create an event already existing on the API'));
    }
    event = newEventLike;
  } else {
    event = new Event(this.connection, newEventLike);
  }
  file.append('event', JSON.stringify(event.getData()));
  var url = '/events';
  this.connection.request('POST', url, function (err, result) {
    if (result) {
      _.extend(event, result.event);
    }
    callback(err, event);
  }, file, true, progressCallback);
};
ConnectionEvents.prototype.addAttachment = function (eventId, file, callback, progressCallback) {
  var url = '/events/' + eventId;
  this.connection.request('POST', url, callback, file, true, progressCallback);
};
ConnectionEvents.prototype.removeAttachment = function (eventId, fileName, callback) {
  var url = '/events/' + eventId + '/' + fileName;
  this.connection.request('DELETE', url, callback);
};
/**
 * //TODO make it NewEventLike compatible
 * This is the prefered method to create events in batch
 * @param {Object[]} eventsData -- minimum {streamId, type }
 * @param {ConnectionEvents~eventBatchCreatedOnTheAPI}
 * @param {function} [callBackWithEventsBeforeRequest] mostly for testing purposes
 * @return {Event[]} events
 */
ConnectionEvents.prototype.batchWithData =
  function (eventsData, callback, callBackWithEventsBeforeRequest) {
  if (!_.isArray(eventsData)) { eventsData = [eventsData]; }

  var createdEvents = [];
  var eventMap = {};

  var url = '/';
  // use the serialId as a temporary Id for the batch
  _.each(eventsData, function (eventData, i) {
    var event =  new Event(this.connection, eventData);
    createdEvents.push(event);
    eventMap[i] = event;
  }.bind(this));

  if (callBackWithEventsBeforeRequest) {
    callBackWithEventsBeforeRequest(createdEvents);
  }

  var mapBeforePush = function (evs) {
    return _.map(evs, function (e) {
      return {
        method: 'events.create',
        params: e
      };
    });
  };

  this.connection.request('POST', url, function (err, result) {
    _.each(result.results, function (eventData, i) {
      _.extend(eventMap[i], eventData.event); // add the data to the event
    });
    callback(err, createdEvents);
  }, mapBeforePush(eventsData));

  return createdEvents;
};

// --- raw access to the API

/**
 * @param {FilterLike} filter
 * @param {Connection~requestCallback} callback
 * @private
 */
ConnectionEvents.prototype._get = function (filter, callback) {
  var tParams = filter;
  if (filter instanceof Filter) { tParams = filter.getData(true); }
  if (_.has(tParams, 'streams') && tParams.streams.length === 0) { // dead end filter..
    return callback(null, []);
  }
  var url = '/events?' + utility.getQueryParametersString(tParams);
  this.connection.request('GET', url, callback, null);
};


/**
 * @param {String} eventId
 * @param {Object} data
 * @param  {Connection~requestCallback} callback
 * @private
 */
ConnectionEvents.prototype._updateWithIdAndData = function (eventId, data, callback) {
  var url = '/events/' + eventId;
  this.connection.request('PUT', url, callback, data);
};


module.exports = ConnectionEvents;

/**
 * Called with the desired Events as result.
 * @callback ConnectionEvents~getCallback
 * @param {Object} error - eventual error
 * @param {Event[]} result
 */


/**
 * Called each time a "part" of the result is received
 * @callback ConnectionEvents~partialResultCallback
 * @param {Event[]} result
 */


/**
 * Called when an event is created on the API
 * @callback ConnectionEvents~eventCreatedOnTheAPI
 * @param {Object} error - eventual error
 * @param {Event} event
 */

/**
 * Called when batch create an array of events on the API
 * @callback ConnectionEvents~eventBatchCreatedOnTheAPI
 * @param {Object} error - eventual error
 * @param {Event[]} events
 */

},{"../Event":12,"../Filter":13,"../utility/utility.js":18,"./ConnectionConstants.js":37,"underscore":43}],47:[function(require,module,exports){
var apiPathAccesses = '/accesses';
var _ = require('underscore');

/**
 * @class Accesses
 * @link http://api.pryv.com/reference.html#methods-accesses
 * @link http://api.pryv.com/reference.html#data-structure-access
 * @param {Connection} connection
 * @constructor
 */
function Accesses(connection) {
  this.connection = connection;
}
/**
 * @param {Connection~requestCallback} callback
 */
Accesses.prototype.get = function (callback) {
  this.connection.request('GET', apiPathAccesses, function (err, res) {
    var accesses = res.accesses || res.access;
    if (typeof(callback) === 'function') {
      callback(err, accesses);
    }
  });
};

Accesses.prototype.create = function (access, callback) {
  this.connection.request('POST', apiPathAccesses, function (err, res) {
    var access = res.access;
    if (typeof(callback) === 'function') {
      callback(err, access);
    }
  }, access);
};
Accesses.prototype.update = function (access, callback) {
  if (access.id) {
    this.connection.request('PUT', apiPathAccesses + '/' + access.id, callback,
      _.pick(access, 'name', 'deviceName', 'permissions'));
  } else {
    if (callback && _.isFunction(callback)) {
      return callback('No access id found');
    }

  }
};

Accesses.prototype.delete = function (sharingId, callback) {
  this.connection.request('DELETE', apiPathAccesses + '/' + sharingId, function (err, result) {
    var error = err;
    if (result && result.message) {
      error = result;
    }
    callback(error, result);
  });
};
module.exports = Accesses;
},{"underscore":43}],45:[function(require,module,exports){
var _ = require('underscore'),
    utility = require('../utility/utility.js'),
    Stream = require('../Stream.js');

/**
 * @class ConnectionStreams
 * @description
 * ##Coverage of the API
 *
 *  * GET /streams -- 100%
 *  * POST /streams -- only data (no object)
 *  * PUT /streams -- 0%
 *  * DELETE /streams/{stream-id} -- 0%
 *
 *
 *
 * @param {Connection} connection
 * @constructor
 */
function ConnectionStreams(connection) {
  this.connection = connection;
  this._streamsIndex = {};
}



/**
 * @typedef ConnectionStreamsOptions parameters than can be passed along a Stream request
 * @property {string} parentId  if parentId is null you will get all the "root" streams.
 * @property {string} [state] 'all' || null  - if null you get only "active" streams
 **/


/**
 * @param {ConnectionStreamsOptions} options
 * @param {ConnectionStreams~getCallback} callback - handles the response
 */
ConnectionStreams.prototype.get = function (options, callback) {
  if (this.connection.datastore) {
    var resultTree = [];
    if (options && _.has(options, 'parentId')) {
      resultTree = this.connection.datastore.getStreamById(options.parentId).children;
    } else {
      resultTree = this.connection.datastore.getStreams();
    }
    if (resultTree.length > 0) {
      callback(null, resultTree);
    } else {
      this._getObjects(options, callback);
    }
  } else {
    this._getObjects(options, callback);
  }
};



/**
 * @param {ConnectionStreamsOptions} options
 * @param {ConnectionStreams~getCallback} callback - handles the response
 */
ConnectionStreams.prototype.updateProperties = function (stream, properties, options, callback) {
  if (this.connection.datastore) {
    var resultTree = [];
    if (options && _.has(options, 'parentId')) {
      resultTree = this.connection.datastore.getStreamById(options.parentId).children;
    } else {
      resultTree = this.connection.datastore.getStreams();
    }
    callback(null, resultTree);
  } else {
    this._getObjects(options, callback);
  }
};


/**
 * Get a Stream by it's Id.
 * Works only if fetchStructure has been done once.
 * @param {string} streamId
 * @throws {Error} Connection.fetchStructure must have been called before.
 */
ConnectionStreams.prototype.getById = function (streamId) {
  if (! this.connection.datastore) {
    throw new Error('Call connection.fetchStructure before, to get automatic stream mapping');
  }
  return this.connection.datastore.getStreamById(streamId);
};


// ------------- Raw calls to the API ----------- //

/**
 * get streams on the API
 * @private
 * @param {ConnectionStreams~options} opts
 * @param callback
 */
ConnectionStreams.prototype._getData = function (opts, callback) {
  var url = opts ? '/streams?' + utility.getQueryParametersString(opts) : '/streams';
  this.connection.request('GET', url, callback, null);
};

ConnectionStreams.prototype.create = function (streamData, callback) {
  streamData = _.pick(streamData, 'id', 'name', 'parentId', 'singleActivity',
    'clientData', 'trashed');
  this._createWithData(streamData, callback);
};
/**
 * Create a stream on the API with a jsonObject
 * @private
 * @param {Object} streamData an object array.. typically one that can be obtained with
 * stream.getData()
 * @param callback
 */
ConnectionStreams.prototype._createWithData = function (streamData, callback) {
  var url = '/streams';
  this.connection.request('POST', url, function (err, resultData) {
    if (!err && resultData) {
      streamData.id = resultData.stream.id;
      var stream = new Stream(this.connection, resultData.stream);
      if (this.connection.datastore) {
        this.connection.datastore.indexStream(stream);
      }
    }
    if (_.isFunction(callback)) {
      return callback(err, resultData.stream);
    }
  }.bind(this), streamData);
};

/**
 * Update a stream on the API with a jsonObject
 * @private
 * @param {Object} streamData an object array.. typically one that can be obtained with
 * stream.getData()
 * @param callback
 */
ConnectionStreams.prototype._updateWithData = function (streamData, callback) {
  var url = '/streams/' + streamData.id;
  this.connection.request('PUT', url, callback, streamData);
};

// -- helper for get --- //

/**
 * @private
 * @param {ConnectionStreams~options} options
 */
ConnectionStreams.prototype._getObjects = function (options, callback) {
  options = options || {};
  options.parentId = options.parentId || null;
  var streamsIndex = {};
  var resultTree = [];
  this._getData(options, function (error, result) {
    if (error) { return callback('Stream.get failed: ' + JSON.stringify(error)); }
    var treeData = result.streams || result.stream;
    ConnectionStreams.Utils.walkDataTree(treeData, function (streamData) {
      var stream = new Stream(this.connection, streamData);
      streamsIndex[streamData.id] = stream;
      if (stream.parentId === options.parentId) { // attached to the rootNode or filter
        resultTree.push(stream);
        stream._parent = null;
        stream._children = [];
      } else {
        // localStorage will cleanup  parent / children link if needed
        stream._parent =  streamsIndex[stream.parentId];
        stream._parent._children.push(stream);
      }
    }.bind(this));
    callback(null, resultTree);
  }.bind(this));
};


/**
 * Called once per streams
 * @callback ConnectionStreams~walkTreeEachStreams
 * @param {Stream} stream
 */

/**
 * Called when walk is done
 * @callback ConnectionStreams~walkTreeDone
 */

/**
 * Walk the tree structure.. parents are always announced before childrens
 * @param {ConnectionStreams~options} options
 * @param {ConnectionStreams~walkTreeEachStreams} eachStream
 * @param {ConnectionStreams~walkTreeDone} done
 */
ConnectionStreams.prototype.walkTree = function (options, eachStream, done) {
  this.get(options, function (error, result) {
    if (error) { return done('Stream.walkTree failed: ' + error); }
    ConnectionStreams.Utils.walkObjectTree(result, eachStream);
    if (done) { done(null); }
  });
};


/**
 * Called when tree has been flatened
 * @callback ConnectionStreams~getFlatenedObjectsDone
 * @param {ConnectionStreams[]} streams
 */

/**
 * Get the all the streams of the Tree in a list.. parents firsts
 * @param {ConnectionStreams~options} options
 * @param {ConnectionStreams~getFlatenedObjectsDone} done
 */
ConnectionStreams.prototype.getFlatenedObjects = function (options, callback) {
  var result = [];
  this.walkTree(options,
    function (stream) { // each stream
    result.push(stream);
  }, function (error) {  // done
    if (error) { return callback(error); }
    callback(null, result);
  }.bind(this));
};


/**
 * Utility to debug a tree structure
 * @param {ConnectionStreams[]} arrayOfStreams
 */
ConnectionStreams.prototype.getDisplayTree = function (arrayOfStreams) {
  return ConnectionStreams.Utils._debugTree(arrayOfStreams);
};

/**
 * Utility to get a Stream Tree as if was sent by the API
 * @param {ConnectionStreams[]} arrayOfStreams
 */
ConnectionStreams.prototype.toJSON = function (arrayOfStreams) {
  return ConnectionStreams.Utils.toJSON(arrayOfStreams);
};


// TODO Validate that it's the good place for them .. Could have been in Stream or utility
ConnectionStreams.Utils = {

  /**
   * Make a pure JSON object from an array of Stream.. shoudl be the same than what we
   * get from the API
   * @param streamArray
   * @param eachStream
   */
  toJSON : function (arrayOfStreams) {

    var result = [];
    if (! arrayOfStreams  || ! arrayOfStreams instanceof Array) {
      throw new Error('expected an array for argument :' + arrayOfStreams);
    }

    _.each(arrayOfStreams, function (stream) {
      if (! stream || ! stream instanceof Stream) {
        throw new Error('expected a Streams array ' + stream);
      }
      result.push({
        name : stream.name,
        id : stream.id,
        parentId : stream.parentId,
        singleActivity : stream.singleActivity,
        clientData : stream.clientData,
        trashed : stream.trashed,
        created : stream.created,
        createdBy : stream.createdBy,
        modified : stream.modified,
        modifiedBy : stream.modifiedBy,
        children : ConnectionStreams.Utils.toJSON(stream.children)
      });
    });
    return result;
  },

  /**
   * Walk thru a streamArray of objects
   * @param streamTree
   * @param callback function(stream)
   */
  walkObjectTree : function (streamArray, eachStream) {
    _.each(streamArray, function (stream) {
      eachStream(stream);
      ConnectionStreams.Utils.walkObjectTree(stream.children, eachStream);
    });
  },

  /**
   * Walk thru a streamTree obtained from the API. Replaces the children[] by childrenIds[].
   * This is used to Flaten the Tree
   * @param streamTree
   * @param callback function(streamData, subTree)  subTree is the descendance tree
   */
  walkDataTree : function (streamTree, callback) {
    _.each(streamTree, function (streamStruct) {
      var stream = _.omit(streamStruct, 'children');
      stream.childrenIds = [];
      var subTree = {};
      callback(stream, subTree);
      if (_.has(streamStruct, 'children')) {
        subTree = streamStruct.children;

        _.each(streamStruct.children, function (childTree) {
          stream.childrenIds.push(childTree.id);
        });
        this.walkDataTree(streamStruct.children, callback);
      }
    }.bind(this));
  },


  /**
   * ShowTree
   */
  _debugTree : function (arrayOfStreams) {
    var result = [];
    if (! arrayOfStreams  || ! arrayOfStreams instanceof Array) {
      throw new Error('expected an array for argument :' + arrayOfStreams);
    }
    _.each(arrayOfStreams, function (stream) {
      if (! stream || ! stream instanceof Stream) {
        throw new Error('expected a Streams array ' + stream);
      }
      result.push({
        name : stream.name,
        id : stream.id,
        parentId : stream.parentId,
        children : ConnectionStreams.Utils._debugTree(stream.children)
      });
    });
    return result;
  }

};

module.exports = ConnectionStreams;

/**
 * Called with the desired streams as result.
 * @callback ConnectionStreams~getCallback
 * @param {Object} error - eventual error
 * @param {Stream[]} result
 */


},{"../Stream.js":14,"../utility/utility.js":18,"underscore":43}],46:[function(require,module,exports){
var apiPathBookmarks = '/followed-slices',
  Connection = require('../Connection.js'),
  _ = require('underscore');

/**
 * @class Bookmarks
 * @link http://api.pryv.com/reference.html#data-structure-subscriptions-aka-bookmarks
 * @param {Connection} connection
 * @constructor
 */
function Bookmarks(connection, Conn) {
  this.connection = connection;
  Connection = Conn;
}
/**
 * @param {Connection~requestCallback} callback
 */
Bookmarks.prototype.get = function (callback) {
  this.connection.request('GET', apiPathBookmarks, function (error, res) {
    var result = [],
      bookmarks = res.followedSlices || res.followedSlice;
    _.each(bookmarks, function (bookmark) {
      bookmark.url = bookmark.url.replace(/\.li/, '.in');
      bookmark.url = bookmark.url.replace(/\.me/, '.io');
      var conn =  new Connection({
        auth: bookmark.accessToken,
        url: bookmark.url,
        name: bookmark.name,
        bookmarkId: bookmark.id
      });
      result.push(conn);
    });
    callback(error, result);
  });
};

Bookmarks.prototype.create = function (bookmark, callback) {
  if (bookmark.name && bookmark.url && bookmark.accessToken) {
    this.connection.request('POST', apiPathBookmarks, function (err, result) {
      var error = err;
      if (!error) {
        var conn =  new Connection({
          auth: bookmark.accessToken,
          url: bookmark.url,
          name: bookmark.name,
          bookmarkId: result.followedSlice.id
        });
        bookmark = conn;
      }
      callback(error, bookmark);
    }, bookmark);
    return bookmark;
  }
};
Bookmarks.prototype.delete = function (bookmarkId, callback) {
  this.connection.request('DELETE', apiPathBookmarks + '/' + bookmarkId, function (err, result) {
    var error = err;
    if (result && result.message) {
      error = result;
    }
    callback(error, result);
  });
};

module.exports = Bookmarks;
},{"../Connection.js":17,"underscore":43}],69:[function(require,module,exports){
(function(){/* global $ */
var  Marionette = require('backbone.marionette');
 /* TODO This a the view for each node, with dynamic animation
 we can't re-render on change because animation would no be done
 If the model is a event Node we must include a new typed view
 */
module.exports = Marionette.ItemView.extend({
  template: '#nodeView',
  initialize: function () {
    this.listenTo(this.model, 'change', this.change);

    this.$el.attr('id', this.model.get('id'));
    this.$el.attr('data-streamId', this.model.get('streamId'));
    this.$el.attr('data-streamName', this.model.get('streamName'));
    this.$el.attr('data-connectionId', this.model.get('connectionId'));
    this.$el.addClass('node animated  fadeIn');
    this.$el.addClass(this.model.get('className'));

  },
  triggers: {
    'click .nodeHeader': 'headerClicked'
  },
  change: function () {

    this._refreshStyle();
  },

  renderView: function () {

    this.render();
  },
  render: function () {
    if (this.beforeRender) { this.beforeRender(); }
    this.trigger('before:render', this);
    this.trigger('item:before:render', this);
    this._refreshStyle();
    var data = this.serializeData();
    var template = this.getTemplate();
    var html = Marionette.Renderer.render(template, data);
    this.$el.html(html);

    $('#' + this.model.get('containerId')).prepend(this.$el);
    if (this.model.get('eventView')) {
      this.model.get('eventView').render(this.model.get('id'));
    }
    this.bindUIElements();

    if (this.onRender) { this.onRender(); }
    this.trigger('render', this);
    this.trigger('item:rendered', this);
    return this;

  },
  _refreshStyle: function () {
    if (this.model.get('weight') === 0) {
      this.close();
      return;
    }
    this.$el.attr('weight', this.model.get('weight'));
    this.$el.attr('className', this.model.get('className'));
    this.$el.css('width', this.model.get('width'));
    this.$el.css('height', this.model.get('height'));
    this.$el.css('left', this.model.get('x'));
    this.$el.css('top', this.model.get('y'));
    if (this.model.get('color')) {
      this.$el.css('background-color', this.model.get('color'));
    }
  },
  close: function () {

    this.$el.removeClass('animated  fadeIn');
    this.$el.addClass('animated  fadeOut');
    this.remove();
  }
});
})()
},{"backbone.marionette":32}],70:[function(require,module,exports){

var _ = require('underscore');
var TreemapUtils = module.exports = TreemapUtils || {};
TreemapUtils.sumArray = function (nodes) {
  // Use one adding function rather than create a new one each
  // time sumArray is called.
  return _.reduce(TreemapUtils._extractWeight(nodes), function (memo, num) {
    return memo + num;
  }, 0);

};
TreemapUtils._getMaxWeight = function (nodes) {
  return Math.max.apply(null, TreemapUtils._extractWeight(nodes));
};
TreemapUtils._getMinWeight = function (nodes) {
  return Math.min.apply(null, TreemapUtils._extractWeight(nodes));
};
TreemapUtils._extractWeight = function (nodes) {
  var result = [];
  _.each(nodes, function (node) {
    result.push(node.normalizedWeight);
  });
  return result;
};
//
// Treemap squarify layout function.
//  rect - containing rectangle; an array of 4 values x, y, width, height
//  vals - array of (normalized) float values each representing percent contribution to
//  total area of containing rectangle
//
// Non-recursive implementation of the squarify treemap layout algorithm published in:
// "Squarified Treemaps" by Mark Bruls, Kees Huizing and Jarke J. van Wijk
// http://www.win.tue.nl/~vanwijk/stm.pdf
//
// Includes tips and tricks from:
// http://ejohn.org/blog/fast-javascript-maxmin/#postcomment
//
TreemapUtils.squarify = function (rect, vals) {
  // console.log('squrify begin');

  var Subrectangle = function (rect) {
    this.setX = function (x) {
      rect.width -= x - rect.x;
      rect.x = x;
    };
    this.setY = function (y) {
      rect.height -= y - rect.y;
      rect.y = y;
    };
    this.getX = function () {
      return rect.x;
    };
    this.getY = function () {
      return rect.y;
    };
    this.getW = function () {
      return rect.width;
    };
    this.getH = function () {
      return rect.height;
    };
    this.getWidth = function () {
      return Math.min(rect.width, rect.height);
    };
  };
  //
  // The function worst() gives the highest aspect ratio of a list
  // of rectangles, given the length of the side along which they are to
  // be laid out.
  // Let a list of areas R be given and let s be their total sum. Then the function worst is
  // defined by:
  // worst(R,w) = max(max(w^2r=s^2; s^2=(w^2r)))
  //              for all r in R
  // Since one term is increasing in r and the other is decreasing, this is equal to
  //              max(w^2r+=(s^2); s^2=(w^2r-))
  // where r+ and r- are the maximum and minimum of R.
  // Hence, the current maximum and minimum of the row that is being laid out.
  //
  var worst = function (r, w) {
    var rMax = TreemapUtils._getMaxWeight(r);
    var rMin = TreemapUtils._getMinWeight(r);

    var s = TreemapUtils.sumArray(r);
    var sSqr = s * s;
    var wSqr = w * w;
    return Math.max((wSqr * rMax) / sSqr, sSqr / (wSqr * rMin));
  };

  // Take row of values and calculate the set of rectangles
  // that will fit in the current subrectangle.
  var layoutrow = function (row) {
    var x = subrect.getX(),
      y = subrect.getY(),
      maxX = x + subrect.getW(),
      maxY = y + subrect.getH(),
      rowHeight,
      i,
      w;

    if (subrect.getW() < subrect.getH()) {
      rowHeight = Math.ceil(TreemapUtils.sumArray(row) / subrect.getW());
      if (y + rowHeight >= maxY) { rowHeight = maxY - y; }
      for (i = 0; i < row.length; i++) {
        w = Math.ceil(row[i].normalizedWeight  / rowHeight);
        if (x + w > maxX || i + 1 === row.length) { w = maxX - x; }
        layout[row[i].uniqueId] = {x: x, y: y, width: w, height: rowHeight};

        x = (x + w);
      }
      subrect.setY(y + rowHeight);
    } else {
      rowHeight = Math.ceil(TreemapUtils.sumArray(row) / subrect.getH());
      if (x + rowHeight >= maxX) { rowHeight = maxX - x; }
      for (i = 0; i < row.length; i++) {
        w = Math.ceil(row[i].normalizedWeight  / rowHeight);
        if (y + w > maxY || i + 1 === row.length) { w = maxY - y; }
        // layout.push({x: x, y: y, width: rowHeight, height: w});
        layout[row[i].uniqueId] = {x: x, y: y, width: rowHeight, height: w};

        y = (y + w);
      }
      subrect.setX(x + rowHeight);
    }
  };

  // Pull values from input array until the aspect ratio of rectangles in row
  // under construction degrades.
  var buildRow = function (children) {
    var row = [];
    row.push(children.shift()); // descending input
    //row.push(children.pop()); // ascending input
    if (children.length === 0) {
      return row;
    }
    var newRow = row.slice();
    var w = subrect.getWidth();
    do {
      newRow.push(children[0]); // descending input
      //newRow.push(children[children.length-1]); // ascending input
      //  console.log('worst');
//      console.log(worst(row, w));
      if (worst(row, w) > worst(newRow, w)) {
        row = newRow.slice();
        children.shift(); // descending input
        //children.pop(); // ascending input
      }
      else {
        break;
      }
    } while (children.length > 0);
    return row;
  };

  // Non recursive version of Bruls, Huizing and van Wijk
  // squarify layout algorithim.
  // While values exist in input array, make a row with good aspect
  // ratios for its values then caclulate the row's geometry, repeat.
  var nrSquarify = function (children) {
    do {
      layoutrow(buildRow(children));
    } while (children.length > 0);
  };


  var layout = {};
  var newVals;

  newVals =  _.clone(_.sortBy(vals, function (num) {
    return num.normalizedWeight;
  }).reverse());

  var i;

  // if either height or width of containing rect are <= 0
  // simply copy containing rect to layout rects
  if (rect.width <= 0 || rect.height <= 0) {
    for (i = 0; i < vals.length; i++) {
      layout[vals[i].uniqueId] = rect;
    }
  } else { // else compute squarified layout
    _.each(newVals, function (val) {
      val.normalizedWeight = Math.round(val.normalizedWeight * rect.width * rect.height);

    });
    // vals come in normalized. convert them here to make them relative to containing rect
    // newVals = vals.map(function(item){return item*(rect.width*rect.height);});
    var subrect = new Subrectangle(rect);
    nrSquarify(newVals);
  }
  return layout;
};
},{"underscore":9}],33:[function(require,module,exports){
(function(){/* global confirm, document, navigator, location, window */

var utility = require('../utility/utility.js');
var Connection = require('../Connection.js');
var _ = require('underscore');


//--------------------- access ----------//
/**
 * @class Auth
 * */
var Auth = function () {
};


_.extend(Auth.prototype, {
  connection: null, // actual connection managed by Auth
  config: {
    registerURL: {ssl: true, host: 'reg.pryv.io'},
    registerStagingURL: {ssl: true, host: 'reg.pryv.in'},
    localDevel : false,
    sdkFullPath: 'https://dlw0lofo79is5.cloudfront.net/lib-javascript/latest'
  },
  state: null,  // actual state
  window: null,  // popup window reference (if any)
  spanButton: null, // an element on the app web page that can be controlled
  buttonHTML: '',
  onClick: {}, // functions called when button is clicked
  settings: null,
  pollingID: false,
  pollingIsOn: true, //may be turned off if we can communicate between windows
  cookieEnabled: false,
  ignoreStateFromURL: false // turned to true in case of loggout
});

/**
 * Method to initialize the data required for authorization.
 * @method _init
 * @access private
 */
Auth._init = function (i) {
  // start only if utility is loaded
  if (typeof utility === 'undefined') {
    if (i > 100) {
      throw new Error('Cannot find utility');
    }
    i++;
    return setTimeout('Auth._init(' + i + ')', 10 * i);
  }

  utility.loadExternalFiles(
    Auth.prototype.config.sdkFullPath + '/assets/buttonSigninPryv.css', 'css');

  if (utility.testIfStagingFromUrl()) {
    console.log('staging mode');
    Auth.prototype.config.registerURL = Auth.prototype.config.registerStagingURL;
  }

  console.log('init done');
};


Auth._init(1);

//--------------------- UI Content -----------//


Auth.prototype.uiSupportedLanguages = ['en', 'fr'];

Auth.prototype.uiButton = function (onClick, buttonText) {
  if (utility.supportCSS3()) {
    return '<div id="pryv-access-btn" class="pryv-access-btn-signin" data-onclick-action="' +
      onClick + '">' +
      '<a class="pryv-access-btn pryv-access-btn-pryv-access-color" href="#">' +
      '<span class="logoSignin">Y</span></a>' +
      '<a class="pryv-access-btn pryv-access-btn-pryv-access-color"  href="#"><span>' +
      buttonText + '</span></a></div>';
  } else   {
    return '<a href="#" id ="pryv-access-btn" data-onclick-action="' + onClick +
      '" class="pryv-access-btn-signinImage" ' +
      'src="' + this.config.sdkFullPath + '/assets/btnSignIn.png" >' + buttonText + '</a>';
  }
};

Auth.prototype.uiErrorButton = function () {
  var strs = {
    'en': { 'msg': 'Error :(' },
    'fr': { 'msg': 'Erreur :('}
  }[this.settings.languageCode];
  this.onClick.Error = function () {
    this.logout();
    return false;
  }.bind(this);
  return this.uiButton('Error', strs.msg);
};

Auth.prototype.uiLoadingButton = function () {
  var strs = {
    'en': { 'msg': 'Loading ...' },
    'fr': { 'msg': 'Chargement ...'}
  }[this.settings.languageCode];
  this.onClick.Loading = function () {
    return false;
  };
  return this.uiButton('Loading', strs.msg);

};

Auth.prototype.uiSigninButton = function () {
  var strs = {
    'en': { 'msg': 'Pryv Sign-In' },
    'fr': { 'msg': 'Connection à PrYv'}
  }[this.settings.languageCode];
  this.onClick.Signin = function () {
    this.popupLogin();
    return false;
  }.bind(this);
  return this.uiButton('Signin', strs.msg);

};

Auth.prototype.uiConfirmLogout = function () {
  var strs = {
    'en': { 'logout': 'Logout ?'},
    'fr': { 'logout': 'Se déconnecter?'}
  }[this.settings.languageCode];

  if (confirm(strs.logout)) {
    this.logout();
  }
};

Auth.prototype.uiInButton = function (username) {
  this.onClick.In = function () {
    this.uiConfirmLogout();
    return false;
  }.bind(this);
  return this.uiButton('In', username);
};

Auth.prototype.uiRefusedButton = function (message) {
  console.log('Pryv access [REFUSED]' + message);
  var strs = {
    'en': { 'msg': 'access refused'},
    'fr': { 'msg': 'Accès refusé'}
  }[this.settings.languageCode];
  this.onClick.Refused = function () {
    this.retry();
    return false;
  }.bind(this);
  return this.uiButton('Refused', strs.msg);

};

//--------------- end of UI ------------------//


Auth.prototype.updateButton = function (html) {
  this.buttonHTML = html;
  if (! this.settings.spanButtonID) { return; }

  utility.domReady(function () {
    if (! this.spanButton) {
      var element = document.getElementById(this.settings.spanButtonID);
      if (typeof(element) === 'undefined' || element === null) {
        throw new Error('access-SDK cannot find span ID: "' +
          this.settings.spanButtonID + '"');
      } else {
        this.spanButton = element;
      }
    }
    this.spanButton.innerHTML = this.buttonHTML;
    this.spanButton.onclick = function (e) {
      e.preventDefault();
      var element = document.getElementById('pryv-access-btn');
      console.log('onClick', this.spanButton,
        element.getAttribute('data-onclick-action'));
      this.onClick[element.getAttribute('data-onclick-action')]();
    }.bind(this);
  }.bind(this));
};

Auth.prototype.internalError = function (message, jsonData) {
  this.stateChanged({id: 'INTERNAL_ERROR', message: message, data: jsonData});
};

//STATE HUB
Auth.prototype.stateChanged  = function (data) {


  if (data.id) { // error
    if (this.settings.callbacks.error) {
      this.settings.callbacks.error(data.id, data.message);
    }
    this.updateButton(this.uiErrorButton());
    console.log('Error: ' + JSON.stringify(data));
    // this.logout();   Why should I retry if it failed already once?
  }

  if (data.status === this.state.status) {
    return;
  }
  if (data.status === 'LOADED') { // skip
    return;
  }
  if (data.status === 'POPUPINIT') { // skip
    return;
  }

  this.state = data;
  if (this.state.status === 'NEED_SIGNIN') {
    this.stateNeedSignin();
  }
  if (this.state.status === 'REFUSED') {
    this.stateRefused();
  }

  if (this.state.status === 'ACCEPTED') {
    this.stateAccepted();
  }

};

//STATE 0 Init
Auth.prototype.stateInitialization = function () {
  this.state = {status : 'initialization'};
  this.updateButton(this.uiLoadingButton());
  if (this.settings.callbacks.initialization) {
    this.settings.callbacks.initialization();
  }
};

//STATE 1 Need Signin
Auth.prototype.stateNeedSignin = function () {
  this.updateButton(this.uiSigninButton());
  if (this.settings.callbacks.needSignin) {
    this.settings.callbacks.needSignin(this.state.url, this.state.poll,
      this.state.poll_rate_ms);
  }
};


//STATE 2 User logged in and authorized
Auth.prototype.stateAccepted = function () {
  if (this.cookieEnabled) {
    utility.docCookies.setItem('access_username', this.state.username, 3600);
    utility.docCookies.setItem('access_token', this.state.token, 3600);
  }
  this.updateButton(this.uiInButton(this.state.username));

  this.connection.username = this.state.username;
  this.connection.auth = this.state.token;
  if (this.settings.callbacks.accepted) {
    this.settings.callbacks.accepted(this.state.username, this.state.token, this.state.lang);
  }
  if (this.settings.callbacks.signedIn) {
    this.settings.callbacks.signedIn(this.connection, this.state.lang);
  }
};

//STATE 3 User refused
Auth.prototype.stateRefused = function () {
  this.updateButton(this.uiRefusedButton(this.state.message));
  if (this.settings.callbacks.refused) {
    this.settings.callbacks.refused('refused:' + this.state.message);
  }
};


/**
 * clear all references
 */
Auth.prototype.logout = function () {
  this.ignoreStateFromURL = true;
  if (this.cookieEnabled) {
    utility.docCookies.removeItem('access_username');
    utility.docCookies.removeItem('access_token');
  }
  this.state = null;
  if (this.settings.callbacks.accepted) {
    this.settings.callbacks.accepted(false, false, false);
  }
  if (this.settings.callbacks.signedOut) {
    this.settings.callbacks.signedOut(this.connection);
  }
  this.connection = null;
  this.setup(this.settings);
};

/**
 * clear references and try again
 */
Auth.prototype.retry = Auth.prototype.logout;

Auth.prototype.login = function (settings) {
  // cookies
  this.cookieEnabled = (navigator.cookieEnabled) ? true : false;
  if (typeof navigator.cookieEnabled === 'undefined' && !this.cookieEnabled) {  //if not IE4+ NS6+
    document.cookie = 'testcookie';
    this.cookieEnabled = (document.cookie.indexOf('testcookie') !== -1) ? true : false;
  }
  this.settings = settings;

  var params = {
    appId : settings.appId,
    username : settings.username,
    password : settings.password
  };
  var path = '/auth/login';
  this.config.registerURL.host = utility.testIfStagingFromUrl() ?
    settings.username + '.pryv.in' : settings.username + '.pryv.io';
  var domain = utility.testIfStagingFromUrl() ? 'pryv.in' : 'pryv.io';
  this.connection = new Connection(null, null, {
    ssl: this.config.registerURL.ssl,
    domain: domain
  });

  var pack = {
    path :  path,
    params : params,
    success : function (data)  {
      if (data.token) {
        if (this.cookieEnabled && settings.rememberMe) {
          utility.docCookies.setItem('access_username', settings.username, 3600);
          utility.docCookies.setItem('access_token', data.token, 3600);
          utility.docCookies.setItem('access_preferredLanguage', data.preferredLanguage, 3600);
        }
        console.log('set cookie', this.cookieEnabled, settings.rememberMe,
          utility.docCookies.getItem('access_username'),
          utility.docCookies.getItem('access_token'));
        this.connection.username = settings.username;
        this.connection.auth = data.token;
        if (typeof(this.settings.callbacks.signedIn)  === 'function') {
          this.settings.callbacks.signedIn(this.connection);
        }
      } else {
        if (typeof(this.settings.error) === 'function') {
          this.settings.callbacks.error(data);
        }
      }
    }.bind(this),
    error : function (jsonError) {
      if (typeof(this.settings.callbacks.error) === 'function') {
        this.settings.callbacks.error(jsonError);
      }
    }.bind(this)
  };

  utility.request(_.extend(pack, this.config.registerURL));
};
Auth.prototype.trustedLogout = function () {
  var path = '/auth/logout';
  if (this.connection) {
    this.connection.request('POST', path, function (error) {
      if (error && typeof(this.settings.callbacks.error) === 'function') {
        return this.settings.callbacks.error(error);
      }
      if (!error && typeof(this.settings.callbacks.signedOut) === 'function') {
        return this.settings.callbacks.signedOut(this.connection);
      }
    }.bind(this));
  }
};
Auth.prototype.whoAmI = function (settings) {
  this.settings = settings;
  var domain = (this.config.registerURL.host === 'reg.pryv.io') ? 'pryv.io' : 'pryv.in';
  var path = '/auth/who-am-i';
  this.config.registerURL.host = utility.testIfStagingFromUrl() ?
    settings.username + '.pryv.in' : settings.username + '.pryv.io';
  this.connection = new Connection(null, null, {ssl: this.config.registerURL.ssl, domain: domain});
  var pack = {
    path :  path,
    method: 'GET',
    success : function (data)  {
      if (data.token) {
        this.connection.username = data.username;
        this.connection.auth = data.token;
        var conn = new Connection(data.username, data.token,
          {ssl: this.config.registerURL.ssl, domain: domain});
        console.log('before access info', this.connection);
        conn.accessInfo(function (error) {
          console.log('after access info', this.connection);
          if (!error) {
            if (typeof(this.settings.callbacks.signedIn)  === 'function') {
              this.settings.callbacks.signedIn(this.connection);
            }
          } else {
            if (typeof(this.settings.callbacks.error) === 'function') {
              this.settings.callbacks.error(error);
            }
          }
        }.bind(this));

      } else {
        if (typeof(this.settings.callbacks.error) === 'function') {
          this.settings.callbacks.error(data);
        }
      }
    }.bind(this),
    error : function (jsonError) {
      if (typeof(this.settings.callbacks.error) === 'function') {
        this.settings.callbacks.error(jsonError);
      }
    }.bind(this)
  };

  utility.request(_.extend(pack, this.config.registerURL));

};
Auth.prototype.loginWithCookie = function (settings) {
  this.settings = settings;
  var domain = (this.config.registerURL.host === 'reg.pryv.io') ? 'pryv.io' : 'pryv.in';
  this.connection = new Connection(null, null, {ssl: this.config.registerURL.ssl, domain: domain});
  this.cookieEnabled = (navigator.cookieEnabled) ? true : false;
  if (typeof navigator.cookieEnabled === 'undefined' && !this.cookieEnabled) {  //if not IE4+ NS6+
    document.cookie = 'testcookie';
    this.cookieEnabled = (document.cookie.indexOf('testcookie') !== -1) ? true : false;
  }
  var cookieUserName = this.cookieEnabled ? utility.docCookies.getItem('access_username') : false;
  var cookieToken = this.cookieEnabled ? utility.docCookies.getItem('access_token') : false;
  console.log('get cookie', cookieUserName, cookieToken);
  if (cookieUserName && cookieToken) {
    this.connection.username = cookieUserName;
    this.connection.auth = cookieToken;
    if (typeof(this.settings.callbacks.signedIn) === 'function') {
      this.settings.callbacks.signedIn(this.connection);
    }
    return this.connection;
  }
  return false;
};
/**
 *
 * @param settings
 * @returns {Connection} the connection managed by Auth.. A new one is created each time setup is
 * called.
 */
Auth.prototype.setup = function (settings) {
  this.state = null;

  //--- check the browser capabilities


  // cookies
  this.cookieEnabled = (navigator.cookieEnabled) ? true : false;
  if (typeof navigator.cookieEnabled === 'undefined' && !this.cookieEnabled) {  //if not IE4+ NS6+
    document.cookie = 'testcookie';
    this.cookieEnabled = (document.cookie.indexOf('testcookie') !== -1) ? true : false;
  }

  //TODO check settings..

  settings.languageCode =
    utility.getPreferredLanguage(this.uiSupportedLanguages, settings.languageCode);

  //-- returnURL
  settings.returnURL = settings.returnURL || 'auto#';
  if (settings.returnURL) {
    // check the trailer
    var trailer = settings.returnURL.charAt(settings.returnURL.length - 1);
    if ('#&?'.indexOf(trailer) < 0) {
      throw new Error('Pryv access: Last character of --returnURL setting-- is not ' +
        '"?", "&" or "#": ' + settings.returnURL);
    }

    // set self as return url?
    var returnself = (settings.returnURL.indexOf('self') === 0);
    if (settings.returnURL.indexOf('auto') === 0) {
      returnself = utility.browserIsMobileOrTablet();
      if (!returnself) { settings.returnURL = false; }
    }

    if (returnself) {
      var myParams = settings.returnURL.substring(4);
      // eventually clean-up current url from previous pryv returnURL
      settings.returnURL = this._cleanStatusFromURL() + myParams;
    }

    if (settings.returnURL) {
      if (settings.returnURL.indexOf('http') < 0) {
        throw new Error('Pryv access: --returnURL setting-- does not start with http: ' +
          settings.returnURL);
      }
    }
  }

  //  spanButtonID is checked only when possible
  this.settings = settings;

  var params = {
    requestingAppId : settings.requestingAppId,
    requestedPermissions : settings.requestedPermissions,
    languageCode : settings.languageCode,
    returnURL : settings.returnURL
  };

  if (this.config.localDevel) {
    // return url will be forced to https://l.pryv.in:4443/Auth.html
    params.localDevel = this.config.localDevel;
  }

  this.stateInitialization();
  var domain = (this.config.registerURL.host === 'reg.pryv.io') ? 'pryv.io' : 'pryv.in';

  this.connection = new Connection(null, null, {ssl: this.config.registerURL.ssl, domain: domain});
  // look if we have a returning user (document.cookie)
  var cookieUserName = this.cookieEnabled ? utility.docCookies.getItem('access_username') : false;
  var cookieToken = this.cookieEnabled ? utility.docCookies.getItem('access_token') : false;

  // look in the URL if we are returning from a login process
  var stateFromURL =  this._getStatusFromURL();

  if (stateFromURL && (! this.ignoreStateFromURL)) {
    this.stateChanged(stateFromURL);
  } else if (cookieToken && cookieUserName) {
    this.stateChanged({status: 'ACCEPTED', username: cookieUserName, token: cookieToken});
  } else { // launch process $

    var pack = {
      path :  '/access',
      params : params,
      success : function (data)  {
        if (data.status && data.status !== 'ERROR') {
          this.stateChanged(data);
        } else {
          // TODO call shouldn't failed
          this.internalError('/access Invalid data: ', data);
        }
      }.bind(this),
      error : function (jsonError) {
        this.internalError('/access ajax call failed: ', jsonError);
      }.bind(this)
    };

    utility.request(_.extend(pack, this.config.registerURL));


  }


  return this.connection;
};

//logout the user if

//read the polling
Auth.prototype.poll = function poll() {
  if (this.pollingIsOn && this.state.poll_rate_ms) {
    // remove eventually waiting poll..
    if (this.pollingID) { clearTimeout(this.pollingID); }


    var pack = {
      path :  '/access/' + this.state.key,
      method : 'GET',
      success : function (data)  {
        this.stateChanged(data);
      }.bind(this),
      error : function (jsonError) {
        this.internalError('poll failed: ', jsonError);
      }.bind(this)
    };

    utility.request(_.extend(pack, this.config.registerURL));


    this.pollingID = setTimeout(this.poll.bind(this), this.state.poll_rate_ms);
  } else {
    console.log('stopped polling: on=' + this.pollingIsOn + ' rate:' + this.state.poll_rate_ms);
  }
};


//messaging between browser window and window.opener
Auth.prototype.popupCallBack = function (event) {
  // Do not use 'this' here !
  if (this.settings.forcePolling) { return; }
  if (event.source !== this.window) {
    console.log('popupCallBack event.source does not match Auth.window');
    return false;
  }
  console.log('from popup >>> ' + JSON.stringify(event.data));
  this.pollingIsOn = false; // if we can receive messages we stop polling
  this.stateChanged(event.data);
};



Auth.prototype.popupLogin = function popupLogin() {
  if ((! this.state) || (! this.state.url)) {
    throw new Error('Pryv Sign-In Error: NO SETUP. Please call Auth.setup() first.');
  }

  if (this.settings.returnURL) {
    location.href = this.state.url;
    return;
  }

  // start polling
  setTimeout(this.poll(), 1000);

  var screenX = typeof window.screenX !== 'undefined' ? window.screenX : window.screenLeft,
    screenY = typeof window.screenY !== 'undefined' ? window.screenY : window.screenTop,
    outerWidth = typeof window.outerWidth !== 'undefined' ?
      window.outerWidth : document.body.clientWidth,
    outerHeight = typeof window.outerHeight !== 'undefined' ?
      window.outerHeight : (document.body.clientHeight - 22),
    width    = 270,
    height   = 420,
    left     = parseInt(screenX + ((outerWidth - width) / 2), 10),
    top      = parseInt(screenY + ((outerHeight - height) / 2.5), 10),
    features = (
      'width=' + width +
        ',height=' + height +
        ',left=' + left +
        ',top=' + top +
        ',scrollbars=yes'
      );


  window.addEventListener('message', this.popupCallBack.bind(this), false);

  this.window = window.open(this.state.url, 'prYv Sign-in', features);

  if (! this.window) {
    // TODO try to fall back on access
    console.log('FAILED_TO_OPEN_WINDOW');
  } else {
    if (window.focus) {
      this.window.focus();
    }
  }

  return false;
};




//util to grab parameters from url query string
Auth.prototype._getStatusFromURL = function () {
  var vars = {};
  window.location.href.replace(/[?#&]+prYv([^=&]+)=([^&]*)/gi,
    function (m, key, value) {
      vars[key] = value;
    });

  //TODO check validity of status

  return (vars.key) ? vars : false;
};

//util to grab parameters from url query string
Auth.prototype._cleanStatusFromURL = function () {
  return window.location.href.replace(/[?#&]+prYv([^=&]+)=([^&]*)/gi, '');
};

//-------------------- UTILS ---------------------//

module.exports = new Auth();

})()
},{"../Connection.js":17,"../utility/utility.js":18,"underscore":43}],82:[function(require,module,exports){
var TreeNode = require('./TreeNode');
var _ = require('underscore');

/**
 * Holder for Connection Nodes.
 * @type {*}
 */

var StreamNode = module.exports = TreeNode.implement(
  function (connectionNode, parentNode, stream) {
    TreeNode.call(this, parentNode.treeMap, parentNode);
    this.stream = stream;
    this.connectionNode = connectionNode;
    if (this.connectionNode.connection.accessInfo().type === 'personal') {

      if (this.stream.clientData && this.stream.clientData['pryv-browser:bgColor']) {
        this.stream.color = this.stream.clientData['pryv-browser:bgColor'];
      } else if (parentNode.stream && parentNode.stream.clientData &&
        parentNode.stream.clientData['pryv-browser:bgColor']) {
        this.stream.color = parentNode.stream.clientData['pryv-browser:bgColor'];
      } else if (parentNode.stream && parentNode.stream.color) {
        this.stream.color = parentNode.stream.color;
      }
    }


    /**
     * eventsNodes are stored by their key
     **/
    this.eventsNodes = {};
    this.eventsNodesAggregated = {};
  },
  {
    className: 'StreamNode',


    _needToAggregate: function () {
      if (this.getWeight() > 0  && (this.width <= this.minWidth || this.height <= this.minHeight)) {
        /* we don't need to aggregate if all the events are in the same stream
         so we need to walk all the child of this stream with 3 stop condition:
         - if a stream has more than one stream we aggregate it
         - if a stream has one stream and one or more eventsNode we aggregate it
         - if a stream has only eventsNode we don't aggregate it
         */
        var node = this, currentAggregated;
        var numberOfStreamNode, numberOfEventsNode;
        while (true) {
          numberOfEventsNode = _.size(node.eventsNodes);
          currentAggregated = node.aggregated;
          // force aggregated to false for getChildren to return nonAggregated node
          node.aggregated = false;
          numberOfStreamNode = _.size(node.getChildren()) - numberOfEventsNode;
          node.aggregated = currentAggregated;
          if (numberOfStreamNode === 0) {
            return false;
          }
          if (numberOfStreamNode > 1) {
            return true;
          }
          if (numberOfStreamNode > 0 && numberOfEventsNode > 0) {
            return true;
          }
          // at this point the node has only one stream as child
          node = node.getChildren()[0];
        }
      }  else {
        return false;
      }
    },
    _aggregate: function () {
      _.each(this.getChildren(), function (child) {
        child._closeView(false);
      });
      this.aggregated = true;
      this.createEventsNodesFromAllEvents(this.getAllEvents());
      _.each(this.eventsNodesAggregated, function (node) {
        node._createView();
      });
    },
    _desaggregate: function () {
      _.each(this.eventsNodesAggregated, function (node) {
        node._closeView(false);
      });
      this.aggregated = false;
      _.each(this.getChildren(), function (child) {
        child._createView();
      });
    },
    getWeight: function () {
      var children = [];
      var weight = 0;
      // Streams
      _.each(this.stream.children, function (child) {
        var childTemp =  this.connectionNode.streamNodes[child.id];
        children.push(childTemp);
      }, this);

      // Events
      _.each(this.eventsNodes, function (eventNode) {
        children.push(eventNode);
      });

      children.forEach(function (child) {
        weight += child.getWeight();
      });

      return weight;
    },

    getChildren: function () {
      var children = [];

      if (this.aggregated) {
        var weight = this.getWeight();
        var aggregatedWeight = 0;
        _.each(this.eventsNodesAggregated, function (node) {
          if (!node.originalWeight) {
            node.originalWeight = node.getWeight;
          }
          aggregatedWeight += node.originalWeight();
        });
        _.each(this.eventsNodesAggregated, function (node) {
          node.getWeight = function () {
            return (node.originalWeight() / aggregatedWeight) * weight;
          };
          children.push(node);
        });
      } else {
        // Streams
        _.each(this.stream.children, function (child) {
          var childTemp =  this.connectionNode.streamNodes[child.id];
          children.push(childTemp);
        }, this);

        // Events
        _.each(this.eventsNodes, function (eventNode) {
          children.push(eventNode);
        });
      }
      return children;
    },
    getAllEvents: function () {
      var allEvents = [];
      _.each(this.stream.children, function (streamChild) {
        var streamChildNode = this.connectionNode.streamNodes[streamChild.id];
        allEvents = _.union(allEvents, streamChildNode.getAllEvents());
      }, this);

      _.each(this.eventsNodes, function (eventNodeChild) {
        _.each(eventNodeChild.events, function (event) {
          allEvents.push(event);
        });
      });
      return allEvents;
    },
    createEventsNodesFromAllEvents: function (events) {
      this.eventsNodesAggregated = {};
      _.each(events, function (event) {
        var key = this._findEventNodeType(event);
        var eventView = this._findEventNode(key, this.eventsNodesAggregated);
        if (eventView === null) {
          throw new Error('StreamNode: did not find an eventView for event: ' + event.id);
        }
        eventView.eventEnterScope(event);
      }, this);

    },
    eventEnterScope: function (event, reason, callback) {
      var key = this._findEventNodeType(event);
      var eventNode = this._findEventNode(key, this.eventsNodes);
      if (eventNode === null) {
        throw new Error('StreamNode: did not find an eventView for event: ' + event.id);
      }
      if (this.redirect) {
        for (var i = 0, n = this.redirect.length; i < n; ++i) {
          if (this.redirect[i].type === event.type &&
            this.stream.id === event.streamId) {
            this.connectionNode.streamNodes[this.redirect[i].to]
              .eventEnterScope(event, reason, callback);
          }
        }
      }
      eventNode.eventEnterScope(event, reason, callback);
      var aggregatedParent = this._findAggregatedParent();
      if (aggregatedParent) {
        eventNode =  aggregatedParent._findEventNode(key, aggregatedParent.eventsNodesAggregated);
        if (eventNode === null) {
          throw new Error('EventEnterScore: did not find an eventView for the aggregated stream');
        }
        eventNode.eventEnterScope(event, reason, callback);
      }
    },


    eventLeaveScope: function (event, reason, callback) {
      var key = this._findEventNodeType(event), eventNode = this.eventsNodes[key];
      if (!eventNode) {
        if (_.isFunction(callback)) {
          return callback();
        }
      }
      if (this.redirect) {
        for (var i = 0, n = this.redirect.length; i < n; ++i) {
          if (this.redirect[i].type === event.type &&
            this.stream.id === event.streamId) {
            this.connectionNode.streamNodes[this.redirect[i].to]
              .eventLeaveScope(event, reason, callback);
          }
        }
      }
      eventNode.eventLeaveScope(event, reason, callback);
      if (eventNode.size === 0) {
        eventNode._closeView();
        delete this.eventsNodes[key];
      }
      var aggregatedParent = this._findAggregatedParent();
      if (aggregatedParent) {
        eventNode =  aggregatedParent._findEventNode(key, aggregatedParent.eventsNodesAggregated);
        if (eventNode === null) {
          throw new Error('EventLeaveScore: did not find an eventView for the aggregated stream');
        }
        eventNode.eventLeaveScope(event, reason, callback);
        if (eventNode.size === 0) {
          eventNode._closeView();
          delete aggregatedParent.eventsNodesAggregated[key];
        }

      }
    },

    eventChange: function (event, reason, callback) {
      var key = this._findEventNodeType(event), eventNode = this.eventsNodes[key];
      if (!eventNode) {
        throw new Error('StreamNode: did not find an eventView for event: ' + event.id);
      }
      if (this.redirect) {
        for (var i = 0, n = this.redirect.length; i < n; ++i) {
          if (this.redirect[i].type === event.type &&
            this.stream.id === event.streamId) {
            this.connectionNode.streamNodes[this.redirect[i].to]
              .eventChange(event, reason, callback);
          }
        }
      }
      eventNode.eventChange(event, reason, callback);
      var aggregatedParent = this._findAggregatedParent();
      if (aggregatedParent) {
        eventNode =  aggregatedParent._findEventNode(key, aggregatedParent.eventsNodesAggregated);
        if (eventNode === null) {
          throw new Error('eventChange: did not find an eventView for the aggregated stream');
        }
        eventNode.eventChange(event, reason, callback);
      }
    },
    _findAggregatedParent: function () {
      var parent = this;
      while (parent) {
        if (parent.aggregated) {
          return parent;
        }
        parent = parent.parent;
      }
      return null;
    },
    _findEventNodeType: function (event) {
      var keys = _.keys(StreamNode.registeredEventNodeTypes);
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (StreamNode.registeredEventNodeTypes[key].acceptThisEventType(event.type)) {
          return key;
        }
      }
      return;
    },
    _findEventNode: function (key, eventsNodeList) {
      var eventNode = null;
      if (key && _.has(eventsNodeList, key)) {
        eventNode =  eventsNodeList[key]; // found one
      }  else { // create is
        eventNode = new StreamNode.registeredEventNodeTypes[key](this);
        eventsNodeList[key] = eventNode;
      }
      return eventNode;
    },

    //----------- debug ------------//
    _debugTree : function () {
      var me = {
        name : this.stream.name,
        nullChildren : 0
      };

      _.extend(me, TreeNode.prototype._debugTree.call(this));


      return me;
    }
  });


StreamNode.registeredEventNodeTypes = {
  'NotesEventsNode' : require('./eventsNode/NotesEventsNode.js'),
  'PositionsEventsNode' : require('./eventsNode/PositionsEventsNode.js'),
  'PicturesEventsNode' : require('./eventsNode/PicturesEventsNode.js'),
  'NumericalsEventsNode' : require('./eventsNode/NumericalsEventsNode.js'),
  'TweetsEventsNode' : require('./eventsNode/TweetsEventsNode.js'),
  'GenericEventsNode' : require('./eventsNode/GenericEventsNode.js')
};
},{"./TreeNode":38,"./eventsNode/GenericEventsNode.js":96,"./eventsNode/NotesEventsNode.js":95,"./eventsNode/NumericalsEventsNode.js":97,"./eventsNode/PicturesEventsNode.js":94,"./eventsNode/PositionsEventsNode.js":93,"./eventsNode/TweetsEventsNode.js":98,"underscore":9}],71:[function(require,module,exports){
var Backbone = require('backbone'),
  Model = require('./EventModel.js');

module.exports = Backbone.Collection.extend({
  url: '#',
  model: Model,
  highlightedDate: null,
  currentElement: null,
  comparator: function (a, b) {
    var aTime = a.get('event').time;
    var bTime = b.get('event').time;
    return aTime > bTime ? -1
      : aTime < bTime ? 1
      : 0;
  },
  highlightEvent: function (time) {
    var next =  this.getEventhighlighted(time);
    if (!next || next === Infinity) {
      return;
    }
    this.setCurrentElement(next);
    return next;
  },
  getEventhighlighted: function (time) {
    this.highlightedDate = time === Infinity ? 99999999999 : time;
    return this.min(this._getTimeDifference.bind(this));
  },
  getTrashed: function () {
    return this.filter(this._getTrashed);
  },
  getEventById: function (id) {
    return this.find(function (e) {
      return e.get('event').id === id;
    });
  },
  getActive: function () {
    return this.reject(this._getTrashed);
  },
  _getTimeDifference: function (event) {
    return event.getTimeDifference(this.highlightedDate);
  },
  _getTrashed: function (event) {
    return event.isTrashed();
  },
  getCurrentElement: function () {
    return this.currentElement;
  },
  setCurrentElement: function (model) {
    if (!model) {
      return;
    }
    if (!this.currentElement || this.currentElement.get('event').id !== model.get('event').id) {
      if (this.currentElement) {
        this.currentElement.setHighlighted(false);
      }
      if (model) {
        model.setHighlighted(true);
      }
    }
    this.currentElement = model;
  },
  next: function () {
    this.setCurrentElement(this.at(this.indexOf(this.getCurrentElement()) + 1));
    return this;
  },
  prev: function () {
    this.setCurrentElement(this.at(this.indexOf(this.getCurrentElement()) - 1));
    return this;
  }
});
},{"./EventModel.js":78,"backbone":30}],72:[function(require,module,exports){
(function(){/* global $, FormData */
var Marionette = require('backbone.marionette'),
  _ = require('underscore');

module.exports = Marionette.ItemView.extend({
  template: '#template-detail-full',
  itemViewContainer: '#detail-common',
  tagName: 'div',
  id: 'detail-full',
  // addAttachmentContainer: '#add-attachment',
  waitSubmit: false,
  // addAttachmentId: 0,
  // attachmentId: {},
  ui: {
    li: 'li.editable',
    edit: '.edit',
    submit: '#submit-edit',
    submitSpin: '#submit-edit .fa-spin',
    trash: '#trash-edit',
    trashSpin: '#trash-edit .fa-spin'
  },
  templateHelpers: function () {
    return {
      /*showContent: function () {
       return this.objectToHtml('content', this.model.get('event').content, 'content');
       }.bind(this),
       showAttachment: function () {
       return this.showAttachment();
       }.bind(this),   */
      getStreamStructure: function () {
        return this.getStreamStructure();
      }.bind(this)
    };
  },
  initialize: function () {
    this.listenTo(this.model, 'change', this.render);
  },
  onRender: function () {
    $(this.itemViewContainer).html(this.el);
    //  this.addAttachment();
    this.ui.li.bind('dblclick', this.onEditClick.bind(this));
    this.ui.edit.bind('blur', this.onEditBlur.bind(this));
    this.ui.edit.bind('keypress', this.onEditKeypress.bind(this));
    this.ui.submit.bind('click', this.submit.bind(this));
    this.ui.trash.bind('click', this.trash.bind(this));
    this.ui.submit.hide();
    /* _.each(_.keys(this.attachmentId), function (k) {
     $('#' + k + ' i').bind('click', { id: k, fileName: this.attachmentId[k] },
     this._onRemoveFileClick.bind(this));
     }.bind(this));  */
    $('body').i18n();
  },
  onEditClick: function (e) {
    this.ui.submit.show();
    $(e.currentTarget).addClass('editing');
    this.ui.edit.focus();
  },
  onEditBlur: function (e) {
    this.updateEvent(e.currentTarget);
    this.ui.submit.show();
    if (e.relatedTarget.id === 'submit-edit') {
      this.submit();
    }
    return true;
  },
  onEditKeypress: function (e) {
    var ENTER_KEY = 13;
    if (e.which === ENTER_KEY) {
      this.updateEvent(e.currentTarget);
      this.ui.submit.show();
    }
  },
  /*addAttachment: function () {
   var id = 'attachment-' + this.addAttachmentId;
   var html = '<li><input type="file" id="' + id + '"></li>';
   this.addAttachmentId++;
   $(this.addAttachmentContainer).append(html);
   $('#' + id).bind('change', this._onFileAttach.bind(this));
   },
   _onFileAttach : function (event)	{
   var file = new FormData();
   event.target.disabled = true;
   file.append('attachment-0', event.target.files[0]);
   this.model.addAttachment(file);
   this.addAttachment();
   },
   showAttachment: function () {
   var event =  this.model.get('event');
   var attachments = event.attachments;
   var html = '';
   if (attachments) {
   html += '<ul> attachments:';
   _.each(_.keys(attachments), function (k) {
   html += '<li id="' + k + '">' + k + ': <a href="' + event.url + '/' +
   attachments[k].fileName + '?auth=' + event.connection.auth + '" target="_blank"> ' +
   attachments[k].fileName + '</a>  <i class="delete"></i> </li>';
   this.attachmentId[k] = attachments[k].fileName;
   }.bind(this));
   html += '</ul>';
   } else {
   return '';
   }
   return html;
   },
   _onRemoveFileClick: function (event) {
   this.model.removeAttachment(event.data.fileName, function () {
   $('#' + event.data.id + ' i').off();
   $('#' + event.data.id).remove();
   delete this.attachmentId[event.data.id];
   }.bind(this));
   },   */
  /* jshint -W098, -W061 */
  updateEvent: function ($elem) {
    var event = this.model.get('event'),
      key = ($($elem).attr('id')).replace('edit-', '').replace('-', '.'),
      value = $($elem).val().trim();
    console.log('DEBUG', key, value);
    if (key === 'time') {
      value = new Date(value);
      if (isNaN(value)) {
        // TODO input is not a date decide what to do
        return;
      }
      value = value.getTime() / 1000;
    } else if (key === 'tags') {
      value = value.split(',');
      value = value.map(function (e) {
        return e.trim();
      });
    }
    eval('event.' + key + ' = value');
    this.completeEdit($($elem).parent());
    this.render();
    if (key === 'streamId') {
      $('#current-streamId label').text($('#edit-streamId option:selected').text().trim());
    }
    if (this.waitSubmit) {
      this.waitSubmit = false;
      this.submit();
    }
  },
  submit: _.throttle(function () {
    if ($('.editing').length !== 0) {
      this.waitSubmit = true;
      return;
    }
    var event = this.model.get('event');
    this.ui.submitSpin.show();
    if (event.id) {
      this.model.set('event', event).save(function () {
        this.ui.submitSpin.hide();
      }.bind(this));
    } else if (event.connection && event.type && event.streamId) {
      this.model.set('event', event).create(function () {
        this.ui.submitSpin.hide();
      }.bind(this));
    } else {

      console.err('Creation event failed, missing valid properties', event);
    }
  }, 5 * 1000),

  trash: function () {
    this.ui.trashSpin.show();
    this.model.trash(function () {
      this.ui.trashSpin.hide();
    }.bind(this));
  },
  completeEdit: function ($elem) {
    $($elem).removeClass('editing');
  },
  getStreamStructure: function () {
    var rootStreams = this.model.get('event').connection.datastore.getStreams(),
      currentStreamId = this.model.get('event').streamId,
      result = '';
    for (var i = 0; i < rootStreams.length; i++) {
      result += this._walkStreamStructure(rootStreams[i], 0, currentStreamId);
    }
    return result;

  },
  _walkStreamStructure: function (stream, depth, currentStreamId) {
    var indentNbr = 4,
      result = '<option ';
    result += stream.id === currentStreamId ? 'selected="selected" ' : '';
    result += 'value="' + stream.id + '" >';
    for (var i = 0; i < depth * indentNbr; i++) {
      result += '&nbsp;';
    }
    result += stream.name;
    result += '</option>';
    depth++;
    for (var j = 0; j < stream.children.length; j++) {
      result += this._walkStreamStructure(stream.children[j], depth, currentStreamId);
    }
    return result;
  }
  /*  objectToHtml: function (key, object, id) {
   var result = '';
   if (_.isObject(object)) {
   result += '<ul>' + key + ':';
   _.each(_.keys(object), function (k) {
   result += this.objectToHtml(k, object[k], id + '-' + k);
   }.bind(this));
   result += '</ul>';
   return result;
   } else {
   return '<li class="editable" id="current-' + id + '">' + key +
   ': <label>' + object + '</label>' +
   '<input class="edit" id="edit-' + id + '" value="' + object + '"></li>';
   }
   }  */
});
})()
},{"backbone.marionette":32,"underscore":9}],73:[function(require,module,exports){
(function(){/* global $ */
var Marionette = require('backbone.marionette'),
  ItemView = require('./ItemView.js'),
  _ = require('underscore');

module.exports = Marionette.CompositeView.extend({
  template: '#template-detailListCompositeView',
  container: '.modal-content',
  itemView: ItemView,
  itemViewContainer: '#detail-list',
  checkAll: false,
  events: {
    'click #check-all': 'onCheckAllClick',
    'scroll #detail-list' : '_showMore'
  },
  initialize: function () {
    if ($('.modal-panel-right').length === 0) {
      /* jshint -W101 */
      $(this.container).append(
        '<div class="modal-panel-right"> ' +
        '    <div id="modal-right-content"> ' +
        '        <div id="detail-list"></div> ' +
        '        <div id="filter"> <input type="checkbox" id="check-all"> <span data-i18n="modal.detail.checkAll"></span> ' +
          '      <button id ="trash-selected" type="button" class="btn btn-danger" data-i18n="modal.detail.trashSelected"></button></div>' +
        '    </div> ' +
        '</div>');

    }
    //this.listenTo(this.collection, 'add remove', this.debounceRender);
    //this.listenTo(this.collection, 'change', this.bindClick);
  },
  appendHtml: function (collectionView, itemView) {
    $(this.itemViewContainer).append(itemView.el);
  },
  onRender: function () {
    var $checkAll = $('#check-all');
    this.checkAll = false;
    $checkAll.off();
    $checkAll[0].checked = false;
    $checkAll.bind('click', this.onCheckAllClick.bind(this));
    $('#trash-selected').bind('click', this.onTrashSelectedClick.bind(this));
    $('#detail-list').bind('scroll', this._showMore.bind(this));
  },
  onTrashSelectedClick: function () {
    var i = 0;
    this.collection.each(function (model) {
      if (model.get('checked')) {
        i++;
        model.trash(function () { i--; });
      }
    }.bind(this));
  },
  onCheckAllClick: function () {
    this.checkAll = !this.checkAll;
    this.collection.each(function (model) {
      model.set('checked', this.checkAll);
    }.bind(this));
  },
  debounceRender: _.debounce(function () {
    this.render();
  }, 100),
  _showMore: function () {
    var $detailList = $('#detail-list');
    var height = $detailList.height();
    var scrollHeight = $detailList[0].scrollHeight;
    var scrollTop = $detailList.scrollTop();
    var triggerOffset = 1.15;
    var scrollBarHeight = height * height / scrollHeight;
    var currentScroll = (scrollBarHeight + (scrollTop / (scrollHeight / height))) * triggerOffset;
    // if we are closer than 'margin' to the end of the content, load more books
    if (currentScroll >= height) {
      this.trigger('showMore');
    }
  }
});

})()
},{"./ItemView.js":99,"backbone.marionette":32,"underscore":9}],78:[function(require,module,exports){
var Backbone = require('backbone');

module.exports = Backbone.Model.extend({
  defaults: {
    event: null,
    collection: null,
    highlighted: false,
    checked: false
  },
  getTimeDifference: function (time) {
    return Math.abs(time - this.get('event').time);
  },
  isTrashed: function () {
    return this.get('event').trashed;
  },
  setHighlighted: function (highlight) {
    this.set('highlighted', highlight);
  },
  save: function (callback) {
    var event = this.get('event'),
      file = event.file;
    if (file) {
      this.get('event').addAttachment(file, callback);
    }
    event.update(callback);
  },
  create: function (callback) {
    var event = this.get('event'),
      file = event.file;
    if (file) {
      event.connection.events.createWithAttachment(event, file, callback);
    }  else {
      event.connection.events.create(event, callback);
    }
  },
  addAttachment: function (file) {
    this.get('event').file = file;
    console.log('addAttachment', file, this);
  },
  removeAttachment: function (fileName, callback) {
    this.get('event').removeAttachment(fileName, callback);
  },
  trash: function (callback) {
    this.get('event').trash(callback);
  }
});
},{"backbone":30}],85:[function(require,module,exports){
(function(){/* global $ */
var Marionette = require('backbone.marionette'),
  Pryv = require('pryv'),
  _ = require('underscore'),
  ChartTransform = require('./utils/ChartTransform.js');
var DND_TRANSFER_DATA = null;
module.exports = Marionette.CompositeView.extend({
  template: '#template-chart-container',
  container: null,
  options: null,
  data: null,
  plot: null,
  chartContainer: null,
  useExtras: null,
  waitExtras: null,

  currentlyEdited: null,


  initialize: function () {
    _.extend(this, ChartTransform);
    this.listenTo(this.model.get('collection'), 'add', this.render);
    this.listenTo(this.model.get('collection'), 'remove', this.render);
    this.listenTo(this.model, 'change:dimensions', this.resize);
    this.listenTo(this.model, 'change:highlightedTime', this.onDateHighLighted);
    this.container = this.model.get('container');
  },

  onRender: function () {
    if (
      !this.model.get('collection') ||
      this.model.get('collection').length === 0 ||
      !this.model.get('container') ||
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
        if (!Pryv.eventTypes.extras('mass/kg')) {
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

    this.plot = $.plot($(this.chartContainer), this.data, this.options);

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
    if (!this.model.get('dimensions')) {
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
      timeformat: '%y/%m/%d %h:%M:%S',
      ticks: this.getExtremeTimes()
    } ];
    this.options.yaxes = [];
    this.options.xaxis = {};


    this.options.legend = {};
    if (this.model.get('legendButton')) {
      var model = this.model;
      this.options.legend.labelFormatter = function (label) {
        var buttons = model.get('legendButtonContent');
        var legend = '<span class="DnD-legend-text">' + label + '</span>';
        for (var i = 0; i < buttons.length; ++i) {
          switch (buttons[i]) {
          case 'ready':
            legend = legend + '<a class="btn btn-primary btn-xs DnD-legend-button ' +
              'DnD-legend-button-ready" ' +
              'href="javascript:;"><span class="fa fa-check"></span></a>';
            break;
          case 'duplicate':
            legend = legend + '<a class="btn btn-primary btn-xs DnD-legend-button ' +
              'DnD-legend-button-duplicate" ' +
              'href="javascript:;"><span class="fa fa-files-o"></span></a>';
            break;
          case 'remove':
            legend = legend + '<a class="btn btn-primary btn-xs DnD-legend-button ' +
              'DnD-legend-button-remove" ' +
              'href="javascript:;"><span class="fa fa-minus"></span></a>';
            break;
          case 'edit':
            legend = legend + '<a class="btn btn-primary btn-xs DnD-legend-button ' +
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
      this.options.xaxis.panRange = [this.getExtremeTimes()[0] - 100000,
        this.getExtremeTimes()[1] + 100000];
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
   * @param series, the series to add (a single one)
   * @param seriesIndex, its index
   */
  addSeries: function (series, seriesIndex) {

    series.sortData();
    var data = this.transform(series);
    var label = this.useExtras ?
      Pryv.eventTypes.extras(series.get('type')).symbol : series.get('type');

    // Configures series
    this.data.push({
      data: data,
      label: label,
      yaxis: (seriesIndex + 1)
    });

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
      this.data[seriesIndex].bars = { show: true,
                                      barWidth : this.getDurationFunction(series.get('interval'))
                                        (new Date(2011, 1, 1, 1, 1))};
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
    if (!date) {
      date = this.model.get('highlightedTime');
    }
    if (!this.plot || !date) {
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
    if (!this.plot) {
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



  setUpPanZoomUI: function () {
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
  },



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
        Pryv.eventTypes.extras(m.get('events')[0].type).symbol : m.get('events')[0].type) +
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

})()
},{"./utils/ChartTransform.js":100,"backbone.marionette":32,"pryv":10,"underscore":9}],84:[function(require,module,exports){
var Marionette = require('backbone.marionette'),
  ItemView = require('./ItemView.js');

module.exports = Marionette.CollectionView.extend({
  tagName: 'ul',
  itemView: ItemView,

  onRender: function () {
    if (this.children.length === 0) {
      this.$el.parent().css({visibility: 'hidden'});
    }
  }
});

},{"./ItemView.js":101,"backbone.marionette":32}],87:[function(require,module,exports){
var Backbone = require('backbone'),
  Model = require('./TimeSeriesModel.js');

module.exports = Backbone.Collection.extend({
  model: Model,

  initialize: function (models, options) {
    this.type = options.type;
  },

  comparator: function () {

  }
});
},{"./TimeSeriesModel.js":88,"backbone":30}],86:[function(require,module,exports){
var Backbone = require('backbone');

module.exports = Backbone.Model.extend({
  defaults: {
    container: null,
    view: null,

    requiresDim: false,

    collection: null,

    highlighted: false,
    highlightedTime: null,

    allowPieChart: false,

    singleNumberAsText: true,

    // Chart dimensions
    dimensions: null,

    // Legend style
    legendStyle: 'table', // Legend style: 'list', 'table'
    legendButton: false,  // A button in the legend
    legendButtonCount: ['edit', 'duplicate', 'remove'],
    legendShow: true,     // Show legend on size/true/false
    legendExtras: true,   // use extras in the legend

    /* Events control */
    onClick: null,
    onHover: null,
    onDnD: null,

    // Panning and Zooming
    allowPan: false,      // Allows navigation through the chart
    allowZoom: false,     // Allows zooming on the chart
    panZoomButton: false,

    // Display X-axis
    xaxis: null,

    // Editable point mode
    editPoint: false,

    // Show node count
    showNodeCount: true
  },

  initialize: function () {
    this.on('remove', function () {
      console.log('model: remove received');
    });
  },

  setHighlighted: function (highlight) {
    this.set('highlighted', highlight);
  }
});
},{"backbone":30}],88:[function(require,module,exports){

var Backbone = require('backbone');

module.exports = Backbone.Model.extend({
  defaults: {
    events: [],
    connectionId: null,
    streamId: null,
    streamName: null,
    type: null,
    category: null,

    color: null,
    style: null,
    transform: null,
    interval: null,
    fitting: null,

    virtual: null
  },
  sortData: function () {
    this.get('events').sort(function (a, b) {
      if (a.time < b.time) { return -1; }
      if (b.time < a.time) { return 1; }
      return 0;
    });
  }

});
},{"backbone":30}],90:[function(require,module,exports){
var Marionette = require('backbone.marionette');

module.exports = Marionette.ItemView.extend({

  tagName: 'li',
  template: '#template-subscriptionItemView',
  ui: {
    checkbox: '.checkbox input',
    name: '.subscription-name'
  },
  initialize: function () {
    this.listenTo(this.model, 'change', this.render);

  },
  onRender: function () {
    this.ui.checkbox[0].checked = this.model.get('checked');
    this.ui.checkbox.bind('click', function () {
      this.model.set('checked', this.ui.checkbox[0].checked);
    }.bind(this));
    this.ui.name.val(this.model.get('connection').name);
    this.ui.name.bind('change paste keyup', function () {
      this.model.get('connection').name =  this.ui.name.val();
    }.bind(this));
  }
});
},{"backbone.marionette":32}],92:[function(require,module,exports){
var Marionette = require('backbone.marionette');

module.exports = Marionette.ItemView.extend({

  tagName: 'tr',
  template: '#template-sharingItemView',
  ui: {
    editName: '.sharing-edit-name',
    editNameInput: '.sharing-name .input-group input',
    editNameSpan: '.sharing-name .input-group span',
    editNameButton: '.sharing-name .input-group button',
    editNameSpinner: '.sharing-name .fa-spin'
  },
  events: {
    'click .sharing-trash': '_onTrashClick',
    'click i.sharing-edit-name': '_onEditNameClick'
  },

  initialize: function () {
    this.listenTo(this.model, 'change', this.render);

  },
  onRender: function () {
    this.ui.editNameInput.hide();
    this.ui.editNameSpan.hide();
    this.ui.editNameSpinner.hide();
    this.ui.editNameButton.click(this._onSaveClick.bind(this));
  },
  _onTrashClick: function () {
    this.trigger('sharing:delete', this.model);
  },
  _onEditNameClick: function () {
    this.ui.editName.hide();
    this.ui.editNameSpinner.hide();
    this.ui.editNameButton.removeClass('btn-danger').addClass('btn-default');
    this.ui.editNameInput.show();
    this.ui.editNameSpan.show();
  },
  _onSaveClick: function () {
    var val = this.ui.editNameInput.val().trim();
    if (val.length > 0) {
      this.model.get('sharing').oldName = this.model.get('sharing').name;
      this.model.get('sharing').name = val;
      this.ui.editNameSpinner.show();
      this.trigger('sharing:update', this);
    }
  },
  endUpdateSharing: function (error) {
    this.ui.editNameSpinner.hide();
    if (error) {
      this.ui.editNameButton.removeClass('btn-default').addClass('btn-danger');
      this.model.get('sharing').name = this.model.get('sharing').oldName;
    } else {
      this.ui.editNameInput.hide();
      this.ui.editNameSpan.hide();
      this.ui.editName.show();
      this.render();
    }
  }
});
},{"backbone.marionette":32}],91:[function(require,module,exports){
var Marionette = require('backbone.marionette');

module.exports = Marionette.ItemView.extend({

  tagName: 'tr',
  template: '#template-bookmarkItemView',
  events: {
    'click .bookmark-trash': '_onTrashClick'
  },
  initialize: function () {
    this.listenTo(this.model, 'change', this.render);

  },
  onRender: function () {
  },
  _onTrashClick: function () {
    this.trigger('bookmark:delete', this.model);
  }
});
},{"backbone.marionette":32}],76:[function(require,module,exports){
(function(){/* global $, FormData */
var Marionette = require('backbone.marionette'),
  _ = require('underscore');

module.exports = Marionette.ItemView.extend({
  type: 'Tweet',
  template: '#template-detail-content-tweet',
  itemViewContainer: '#detail-content',
  templateHelpers: {
    getUrl: function () {
      var id = this.event.content.id,
        screenName = this.event.content['screen-name'],
        date = new Date(this.event.time * 1000);
      return '<a href="https://twitter.com/' + screenName + '/status/' + id + '"' +
        'data-datetime="' + date.toISOString() + '">' + date.toLocaleDateString() + '</a>';
    }
  },
  ui: {
    li: 'li.editable',
    edit: '.edit'
  },
  initialize: function () {
    this.listenTo(this.model, 'change', this.render);
  },
  onRender: function () {
    $(this.itemViewContainer).html(this.el);
    this.ui.li.bind('dblclick', this.onEditClick.bind(this));
    this.ui.edit.bind('blur', this.onEditBlur.bind(this));
  },
  onEditClick: function (e) {
    $(e.currentTarget).addClass('editing');
    this.ui.edit.focus();
  },
  onEditBlur: function (e) {
    this.updateEvent(e.currentTarget);
    return true;
  },
  /* jshint -W098, -W061 */
  updateEvent: function ($elem) {
    var event = this.model.get('event'),
      key = ($($elem).attr('id')).replace('edit-', '').replace('-', '.'),
      value = $($elem).val().trim();
    eval('event.' + key + ' = value');
    this.completeEdit($($elem).parent());
    this.render();

  },
  completeEdit: function ($elem) {
    $($elem).removeClass('editing');
  }
});
})()
},{"backbone.marionette":32,"underscore":9}],75:[function(require,module,exports){
(function(){/* global $, FormData */
var Marionette = require('backbone.marionette'),
  _ = require('underscore');

module.exports = Marionette.ItemView.extend({
  type: 'Note',
  template: '#template-detail-content-note',
  itemViewContainer: '#detail-content',
  ui: {
    li: 'li.editable',
    edit: '.edit'
  },
  initialize: function () {
    this.listenTo(this.model, 'change', this.render);
  },
  onRender: function () {
    $(this.itemViewContainer).html(this.el);
    this.ui.li.bind('dblclick', this.onEditClick.bind(this));
    this.ui.edit.bind('blur', this.onEditBlur.bind(this));
    $('body').i18n();
  },
  onEditClick: function (e) {
    $('#submit-edit').show();
    $(e.currentTarget).addClass('editing');
    this.ui.edit.focus();
  },
  onEditBlur: function (e) {
    this.updateEvent(e.currentTarget);
    return true;
  },
  /* jshint -W098, -W061 */
  updateEvent: function ($elem) {
    var event = this.model.get('event'),
      key = ($($elem).attr('id')).replace('edit-', '').replace('-', '.'),
      value = $($elem).val().trim();
    eval('event.' + key + ' = value');
    this.completeEdit($($elem).parent());
    this.render();

  },
  completeEdit: function ($elem) {
    $($elem).removeClass('editing');
  }
});
})()
},{"backbone.marionette":32,"underscore":9}],74:[function(require,module,exports){
(function(){/* global $, FormData */
var Marionette = require('backbone.marionette'),
  _ = require('underscore');

module.exports = Marionette.ItemView.extend({
  type: 'Generic',
  template: '#template-detail-content-generic',
  itemViewContainer: '#detail-content',
  addAttachmentContainer: '#add-attachment',
  addAttachmentId: 0,
  attachmentId: {},
  ui: {
    li: 'li.editable',
    edit: '.edit'
  },
  templateHelpers: function () {
    return {
      showContent: function () {
        return this.objectToHtml('content', this.model.get('event').content, 'content');
      }.bind(this),
      showAttachment: function () {
        return this.showAttachment();
      }.bind(this)
    };
  },
  initialize: function () {
    this.listenTo(this.model, 'change', this.render);
  },
  onRender: function () {
    $(this.itemViewContainer).html(this.el);
    this.addAttachment();
    this.ui.li.bind('dblclick', this.onEditClick.bind(this));
    this.ui.edit.bind('blur', this.onEditBlur.bind(this));
    this.ui.edit.bind('keypress', this.onEditKeypress.bind(this));
    _.each(_.keys(this.attachmentId), function (k) {
      $('#' + k + ' i').bind('click', { id: k, fileName: this.attachmentId[k] },
        this._onRemoveFileClick.bind(this));
    }.bind(this));
  },
  onEditClick: function (e) {
    $(e.currentTarget).addClass('editing');
    this.ui.edit.focus();
  },
  onEditBlur: function (e) {
    this.updateEvent(e.currentTarget);
    if (e.relatedTarget.id === 'submit-edit') {
      this.submit();
    }
    return true;
  },
  onEditKeypress: function (e) {
    var ENTER_KEY = 13;
    if (e.which === ENTER_KEY) {
      this.updateEvent(e.currentTarget);
    }
  },
  addAttachment: function () {
    var id = 'attachment-' + this.addAttachmentId;
    var html = '<li><input type="file" id="' + id + '"></li>';
    this.addAttachmentId++;
    $(this.addAttachmentContainer).append(html);
    $('#' + id).bind('change', this._onFileAttach.bind(this));
  },
  _onFileAttach : function (event)	{
    var file = new FormData();
    event.target.disabled = true;
    file.append('attachment-0', event.target.files[0]);
    this.model.addAttachment(file);
    this.addAttachment();
  },
  showAttachment: function () {
    var event =  this.model.get('event');
    var attachments = event.attachments;
    var html = '';
    if (attachments) {
      html += '<ul> attachments:';
      _.each(_.keys(attachments), function (k) {
        html += '<li id="' + k + '">' + k + ': <a href="' + event.url + '/' +
          attachments[k].fileName + '?auth=' + event.connection.auth + '" target="_blank"> ' +
          attachments[k].fileName + '</a>  <i class="delete"></i> </li>';
        this.attachmentId[k] = attachments[k].fileName;
      }.bind(this));
      html += '</ul>';
    } else {
      return '';
    }
    return html;
  },
  _onRemoveFileClick: function (event) {
    this.model.removeAttachment(event.data.fileName, function () {
      $('#' + event.data.id + ' i').off();
      $('#' + event.data.id).remove();
      delete this.attachmentId[event.data.id];
    }.bind(this));
  },
  /* jshint -W098, -W061 */
  updateEvent: function ($elem) {
    var event = this.model.get('event'),
      key = ($($elem).attr('id')).replace('edit-', '').replace('-', '.'),
      value = $($elem).val().trim();
    eval('event.' + key + ' = value');
    this.completeEdit($($elem).parent());
    this.render();

  },
  completeEdit: function ($elem) {
    $($elem).removeClass('editing');
  },
  objectToHtml: function (key, object, id) {
    var result = '';
    if (_.isObject(object)) {
      result += '<ul>' + key + ':';
      _.each(_.keys(object), function (k) {
        result += this.objectToHtml(k, object[k], id + '-' + k);
      }.bind(this));
      result += '</ul>';
      return result;
    } else {
      return '<li class="editable" id="current-' + id + '">' + key +
        ': <label>' + object + '</label>' +
        '<input class="edit" id="edit-' + id + '" value="' + object + '"></li>';
    }
  }
});
})()
},{"backbone.marionette":32,"underscore":9}],79:[function(require,module,exports){
(function(){/* global $, FormData */
var Marionette = require('backbone.marionette'),
  _ = require('underscore');

module.exports = Marionette.ItemView.extend({
  type: 'Picture',
  tagName: 'div',
  className: 'full-height full-width',
  template: '#template-detail-content-picture',
  itemViewContainer: '#detail-content',
  addAttachmentContainer: '#add-attachment',
  addAttachmentId: 0,
  attachmentId: {},
  ui: {
    li: 'li.editable',
    edit: '.edit'
  },
  templateHelpers: function () {
    return {
      getSrc: function () {
        return this.getSrc();
      }.bind(this),
      getAlt: function () {
        return this.getAlt();
      }.bind(this)
    };
  },
  initialize: function () {
    this.listenTo(this.model, 'change', this.render);
  },
  onRender: function () {
    $(this.itemViewContainer).html(this.el);
    $('#current-picture .fa-angle-left').click(function () {
      this.trigger('previous');
    }.bind(this));
    $('#current-picture .fa-angle-right').click(function () {
      this.trigger('next');
    }.bind(this));
    this.addAttachment();
  },
  addAttachment: function () {
    var id = 'attachment-' + this.addAttachmentId;
    var html = '<li><input type="file" id="' + id + '"></li>';
    this.addAttachmentId++;
    $(this.addAttachmentContainer).append(html);
    $('#' + id).bind('change', this._onFileAttach.bind(this));
  },
  _onFileAttach : function (e)	{
    var file = new FormData(),
      keys = this.model.get('event').attachments ? _.keys(this.model.get('event').attachments) :
        [e.target.files[0].name];
    e.target.disabled = true;
    file.append(keys[0].split('.')[0], e.target.files[0]);
    this.model.addAttachment(file);
  },
  getSrc: function () {
    var event = this.model.get('event'),
      attachments = event.attachments;
    if (attachments) {
      var keys = _.keys(attachments);
      return event.url + '/' + attachments[keys[0]].id + '?readToken=' +
        attachments[keys[0]].readToken;
    } else {
      return '';
    }
  },
  getAlt: function () {
    var event = this.model.get('event'),
      attachments = event.attachments;
    if (attachments) {
      var keys = _.keys(attachments);
      return keys[0];
    } else {
      return '';
    }
  },
  /* jshint -W098, -W061 */
  updateEvent: function ($elem) {
    var event = this.model.get('event'),
      key = ($($elem).attr('id')).replace('edit-', '').replace('-', '.'),
      value = $($elem).val().trim();
    eval('event.' + key + ' = value');
    this.completeEdit($($elem).parent());
    this.render();

  },
  completeEdit: function ($elem) {
    $($elem).removeClass('editing');
  }
});
})()
},{"backbone.marionette":32,"underscore":9}],80:[function(require,module,exports){
(function(){/* global $, document*/
var Marionette = require('backbone.marionette'),
  MapLoader = require('google-maps');

module.exports = Marionette.ItemView.extend({
  type: 'Position',
  template: '#template-detail-content-position',
  tagName: 'div',
  id: 'map_canvas',
  itemViewContainer: '#detail-content',
  google: null,
  map: null,
  waitForGoogle: false,
  marker: null,
  ui: {
    li: 'li.editable',
    edit: '.edit'
  },
  initialize: function () {
    this.listenTo(this.model, 'change', this.actualizePosition);
    MapLoader.KEY = 'AIzaSyCWRjaX1-QcCqSK-UKfyR0aBpBwy6hYK5M';
    MapLoader.load().then(function (google) {
      this.google = google;
      if (this.waitForGoogle) {
        this.waitForGoogle = false;
        this.render();
      }
    }.bind(this));
  },
  actualizePosition: function () {
    if (!this.google) {
      this.waitForGoogle = true;
    } else {
      var lat = this.model.get('event').content.latitude,
        lng = this.model.get('event').content.longitude;
      this.marker.setPosition(new this.google.maps.LatLng(lat, lng));
      this.map.setCenter(this.marker.position);
    }
  },
  onRender: function () {
    if (!this.google) {
      this.waitForGoogle = true;
    } else {
      $(this.itemViewContainer).html(this.el);
      setTimeout(function () {
        if (this.model.get('event')) {
          if (!this.model.get('event').content) {
            this.model.get('event').content = {};
          }
          var lat = this.model.get('event').content.latitude || 46.51759,
            lng = this.model.get('event').content.longitude || 6.56267;
          this.map = new this.google.maps.Map(document.getElementById('map_canvas'), {
            zoom: 16,
            center: new this.google.maps.LatLng(lat, lng),
            mapTypeId: this.google.maps.MapTypeId.ROADMAP
          });
          var elevator = new this.google.maps.ElevationService();
          this.marker = new this.google.maps.Marker({
            position: new this.google.maps.LatLng(lat, lng),
            draggable: true
          });

          this.google.maps.event.addListener(this.marker, 'dragend', function (evt) {
            $('#submit-edit').show();
            var event = this.model.get('event');
            event.content.latitude = evt.latLng.lat();
            event.content.longitude = evt.latLng.lng();
            var positionalRequest = {
              'locations': [evt.latLng]
            };
            elevator.getElevationForLocations(positionalRequest, function (results, status) {
              if (status === this.google.maps.ElevationStatus.OK) {
                // Retrieve the first result
                if (results[0]) {
                  var event = this.model.get('event');
                  event.content.altitude = results[0].elevation;
                }
              }
            }.bind(this));
          }.bind(this));

          this.map.setCenter(this.marker.position);
          this.marker.setMap(this.map);
        }
      }.bind(this), 1000);

    }
  }
});
})()
},{"backbone.marionette":32,"google-maps":89}],81:[function(require,module,exports){
(function(){/* global $*/
var Marionette = require('backbone.marionette'),
  _ = require('underscore'),
  creationStep = {typeSelect: 'typeSelect', streamSelect: 'streamSelect'},
  validType = ['note/txt', 'picture/attached', 'position/wgs84'];

module.exports = Marionette.ItemView.extend({
  type: 'Creation',
  step: creationStep.typeSelect,
  getTemplate: function () {
    if (this.step === creationStep.typeSelect) {
      return '#template-detail-creation-type';
    } else if (this.step === creationStep.streamSelect) {
      return '#template-detail-creation-stream';
    }
  },
  templateHelpers: function () {
    return {
      getStream: function () {
        return this.getStream();
      }.bind(this)
    };
  },
  itemViewContainer: '#detail-content',
  ui: {
    type: '#type-select',
    stream: 'ul#stream-select'
  },
  initialize: function () {
    this.listenTo(this.model, 'change', this.render);
    this.step = creationStep.typeSelect;
  },
  onRender: function () {
    $(this.itemViewContainer).html(this.el);
    this.ui.type.bind('click', this.onTypeClick.bind(this));
    this.ui.stream.bind('click', this.onStreamClick.bind(this));
  },
  onStreamClick: function (e) {
    var streamSelected = $(e.target).attr('data-stream'),
      connectionSelected = this.connection.get($(e.target).attr('data-connection')),
      event = this.model.get('event');
    event.streamId = streamSelected;
    if (connectionSelected) {
      event.connection = connectionSelected;
      this.trigger('endOfSelection');
    }
    return true;
  },
  onTypeClick: function (e) {
    var typeSelected =  $(e.target).attr('data-type') || $(e.target).parent().attr('data-type'),
        event = this.model.get('event');

    if (validType.indexOf(typeSelected) !== -1) {
      event.type = typeSelected;
      this.step = creationStep.streamSelect;
      this.render();
    }
    return true;
  },
  getStream: function () {
    var result = '<ul id="stream-select">',
      connections  = this.connection._connections;
    _.each(connections, function (c) {
      if (!this._isWritePermission(c)) {
        return;
      }
      result += '<ul>' + c.username + ' / ' + c._accessInfo.name;
      result += this.getStreamStructure(c);
      result += '</ul>';

    }.bind(this));
    return result + '</ul>';
  },
  getStreamStructure: function (connection) {
    var rootStreams = connection.datastore.getStreams(),
      result = '';
    for (var i = 0; i < rootStreams.length; i++) {
      if (this._isWritePermission(connection, rootStreams[i])) {
        result += '<ul>' + this._walkStreamStructure(rootStreams[i]) + '</ul>';
      }
    }
    return result;

  },
  _walkStreamStructure: function (stream) {
    var preSelected = this.connectionId === stream.connection.serialId &&
      this.streamId === stream.id ? 'preSelected-stream' : '';
    var result = '<li class="' + preSelected + '" data-connection="' +
      stream.connection.serialId + '" data-stream="' +
      stream.id + '">' + stream.name + '</li>';
    for (var j = 0; j < stream.children.length; j++) {
      if (this._isWritePermission(stream.connection, stream.children[j])) {
        result += '<ul>' + this._walkStreamStructure(stream.children[j]) + '</ul>';
      }
    }
    return result;
  },
  _isWritePermission: function (connection, streamId) {
    if (!connection._accessInfo) {
      return false;
    }
    if (connection._accessInfo.type === 'personal') {
      return true;
    }
    if (connection._accessInfo.permissions &&
      connection._accessInfo.permissions[0].streamId === '*' &&
      connection._accessInfo.permissions[0].streamId !== 'read') {
      return true;
    }
    if (connection._accessInfo.permissions &&
      connection._accessInfo.permissions[0].streamId === '*' &&
      connection._accessInfo.permissions[0].streamId === 'read') {
      return false;
    }
    if (streamId) {
      return !!_.find(connection._accessInfo.permissions, function (p) {
        return p.streamId === streamId && p.level !== 'read';
      });
    }
    return false;
  }
});
})()
},{"backbone.marionette":32,"underscore":9}],32:[function(require,module,exports){
(function(){// MarionetteJS (Backbone.Marionette)
// ----------------------------------
// v1.1.0
//
// Copyright (c)2013 Derick Bailey, Muted Solutions, LLC.
// Distributed under MIT license
//
// http://marionettejs.com



/*!
 * Includes BabySitter
 * https://github.com/marionettejs/backbone.babysitter/
 *
 * Includes Wreqr
 * https://github.com/marionettejs/backbone.wreqr/
 */

(function (root, factory) {
  if (typeof exports === 'object') {

    var underscore = require('underscore');
    var backbone = require('backbone');
    var wreqr = require('backbone.wreqr');
    var babysitter = require('backbone.babysitter');

    module.exports = factory(underscore, backbone, wreqr, babysitter);

  } else if (typeof define === 'function' && define.amd) {

    define(['underscore', 'backbone', 'backbone.wreqr', 'backbone.babysitter'], factory);

  } 
}(this, function (_, Backbone) {

  var Marionette = (function(global, Backbone, _){
  "use strict";

  // Define and export the Marionette namespace
  var Marionette = {};
  Backbone.Marionette = Marionette;

  // Get the DOM manipulator for later use
  Marionette.$ = Backbone.$;

// Helpers
// -------

// For slicing `arguments` in functions
var protoSlice = Array.prototype.slice;
function slice(args) {
  return protoSlice.call(args);
}

function throwError(message, name) {
  var error = new Error(message);
  error.name = name || 'Error';
  throw error;
}

// Marionette.extend
// -----------------

// Borrow the Backbone `extend` method so we can use it as needed
Marionette.extend = Backbone.Model.extend;

// Marionette.getOption
// --------------------

// Retrieve an object, function or other value from a target
// object or its `options`, with `options` taking precedence.
Marionette.getOption = function(target, optionName){
  if (!target || !optionName){ return; }
  var value;

  if (target.options && (optionName in target.options) && (target.options[optionName] !== undefined)){
    value = target.options[optionName];
  } else {
    value = target[optionName];
  }

  return value;
};

// Trigger an event and/or a corresponding method name. Examples:
//
// `this.triggerMethod("foo")` will trigger the "foo" event and
// call the "onFoo" method.
//
// `this.triggerMethod("foo:bar") will trigger the "foo:bar" event and
// call the "onFooBar" method.
Marionette.triggerMethod = (function(){

  // split the event name on the :
  var splitter = /(^|:)(\w)/gi;

  // take the event section ("section1:section2:section3")
  // and turn it in to uppercase name
  function getEventName(match, prefix, eventName) {
    return eventName.toUpperCase();
  }

  // actual triggerMethod name
  var triggerMethod = function(event) {
    // get the method name from the event name
    var methodName = 'on' + event.replace(splitter, getEventName);
    var method = this[methodName];

    // trigger the event, if a trigger method exists
    if(_.isFunction(this.trigger)) {
      this.trigger.apply(this, arguments);
    }

    // call the onMethodName if it exists
    if (_.isFunction(method)) {
      // pass all arguments, except the event name
      return method.apply(this, _.tail(arguments));
    }
  };

  return triggerMethod;
})();

// DOMRefresh
// ----------
//
// Monitor a view's state, and after it has been rendered and shown
// in the DOM, trigger a "dom:refresh" event every time it is
// re-rendered.

Marionette.MonitorDOMRefresh = (function(){
  // track when the view has been shown in the DOM,
  // using a Marionette.Region (or by other means of triggering "show")
  function handleShow(view){
    view._isShown = true;
    triggerDOMRefresh(view);
  }

  // track when the view has been rendered
  function handleRender(view){
    view._isRendered = true;
    triggerDOMRefresh(view);
  }

  // Trigger the "dom:refresh" event and corresponding "onDomRefresh" method
  function triggerDOMRefresh(view){
    if (view._isShown && view._isRendered){
      if (_.isFunction(view.triggerMethod)){
        view.triggerMethod("dom:refresh");
      }
    }
  }

  // Export public API
  return function(view){
    view.listenTo(view, "show", function(){
      handleShow(view);
    });

    view.listenTo(view, "render", function(){
      handleRender(view);
    });
  };
})();


// Marionette.bindEntityEvents & unbindEntityEvents
// ---------------------------
//
// These methods are used to bind/unbind a backbone "entity" (collection/model) 
// to methods on a target object. 
//
// The first parameter, `target`, must have a `listenTo` method from the
// EventBinder object.
//
// The second parameter is the entity (Backbone.Model or Backbone.Collection)
// to bind the events from.
//
// The third parameter is a hash of { "event:name": "eventHandler" }
// configuration. Multiple handlers can be separated by a space. A
// function can be supplied instead of a string handler name. 

(function(Marionette){
  "use strict";

  // Bind the event to handlers specified as a string of
  // handler names on the target object
  function bindFromStrings(target, entity, evt, methods){
    var methodNames = methods.split(/\s+/);

    _.each(methodNames,function(methodName) {

      var method = target[methodName];
      if(!method) {
        throwError("Method '"+ methodName +"' was configured as an event handler, but does not exist.");
      }

      target.listenTo(entity, evt, method, target);
    });
  }

  // Bind the event to a supplied callback function
  function bindToFunction(target, entity, evt, method){
      target.listenTo(entity, evt, method, target);
  }

  // Bind the event to handlers specified as a string of
  // handler names on the target object
  function unbindFromStrings(target, entity, evt, methods){
    var methodNames = methods.split(/\s+/);

    _.each(methodNames,function(methodName) {
      var method = target[methodName];
      target.stopListening(entity, evt, method, target);
    });
  }

  // Bind the event to a supplied callback function
  function unbindToFunction(target, entity, evt, method){
      target.stopListening(entity, evt, method, target);
  }

  
  // generic looping function
  function iterateEvents(target, entity, bindings, functionCallback, stringCallback){
    if (!entity || !bindings) { return; }

    // allow the bindings to be a function
    if (_.isFunction(bindings)){
      bindings = bindings.call(target);
    }

    // iterate the bindings and bind them
    _.each(bindings, function(methods, evt){

      // allow for a function as the handler, 
      // or a list of event names as a string
      if (_.isFunction(methods)){
        functionCallback(target, entity, evt, methods);
      } else {
        stringCallback(target, entity, evt, methods);
      }

    });
  }
 
  // Export Public API
  Marionette.bindEntityEvents = function(target, entity, bindings){
    iterateEvents(target, entity, bindings, bindToFunction, bindFromStrings);
  };

  Marionette.unbindEntityEvents = function(target, entity, bindings){
    iterateEvents(target, entity, bindings, unbindToFunction, unbindFromStrings);
  };

})(Marionette);


// Callbacks
// ---------

// A simple way of managing a collection of callbacks
// and executing them at a later point in time, using jQuery's
// `Deferred` object.
Marionette.Callbacks = function(){
  this._deferred = Marionette.$.Deferred();
  this._callbacks = [];
};

_.extend(Marionette.Callbacks.prototype, {

  // Add a callback to be executed. Callbacks added here are
  // guaranteed to execute, even if they are added after the 
  // `run` method is called.
  add: function(callback, contextOverride){
    this._callbacks.push({cb: callback, ctx: contextOverride});

    this._deferred.done(function(context, options){
      if (contextOverride){ context = contextOverride; }
      callback.call(context, options);
    });
  },

  // Run all registered callbacks with the context specified. 
  // Additional callbacks can be added after this has been run 
  // and they will still be executed.
  run: function(options, context){
    this._deferred.resolve(context, options);
  },

  // Resets the list of callbacks to be run, allowing the same list
  // to be run multiple times - whenever the `run` method is called.
  reset: function(){
    var callbacks = this._callbacks;
    this._deferred = Marionette.$.Deferred();
    this._callbacks = [];
    
    _.each(callbacks, function(cb){
      this.add(cb.cb, cb.ctx);
    }, this);
  }
});


// Marionette Controller
// ---------------------
//
// A multi-purpose object to use as a controller for
// modules and routers, and as a mediator for workflow
// and coordination of other objects, views, and more.
Marionette.Controller = function(options){
  this.triggerMethod = Marionette.triggerMethod;
  this.options = options || {};

  if (_.isFunction(this.initialize)){
    this.initialize(this.options);
  }
};

Marionette.Controller.extend = Marionette.extend;

// Controller Methods
// --------------

// Ensure it can trigger events with Backbone.Events
_.extend(Marionette.Controller.prototype, Backbone.Events, {
  close: function(){
    this.stopListening();
    this.triggerMethod("close");
    this.unbind();
  }
});

// Region 
// ------
//
// Manage the visual regions of your composite application. See
// http://lostechies.com/derickbailey/2011/12/12/composite-js-apps-regions-and-region-managers/

Marionette.Region = function(options){
  this.options = options || {};

  this.el = Marionette.getOption(this, "el");

  if (!this.el){
    var err = new Error("An 'el' must be specified for a region.");
    err.name = "NoElError";
    throw err;
  }

  if (this.initialize){
    var args = Array.prototype.slice.apply(arguments);
    this.initialize.apply(this, args);
  }
};


// Region Type methods
// -------------------

_.extend(Marionette.Region, {

  // Build an instance of a region by passing in a configuration object
  // and a default region type to use if none is specified in the config.
  //
  // The config object should either be a string as a jQuery DOM selector,
  // a Region type directly, or an object literal that specifies both
  // a selector and regionType:
  //
  // ```js
  // {
  //   selector: "#foo",
  //   regionType: MyCustomRegion
  // }
  // ```
  //
  buildRegion: function(regionConfig, defaultRegionType){

    var regionIsString = (typeof regionConfig === "string");
    var regionSelectorIsString = (typeof regionConfig.selector === "string");
    var regionTypeIsUndefined = (typeof regionConfig.regionType === "undefined");
    var regionIsType = (typeof regionConfig === "function");

    if (!regionIsType && !regionIsString && !regionSelectorIsString) {
      throw new Error("Region must be specified as a Region type, a selector string or an object with selector property");
    }

    var selector, RegionType;
   
    // get the selector for the region
    
    if (regionIsString) {
      selector = regionConfig;
    } 

    if (regionConfig.selector) {
      selector = regionConfig.selector;
    }

    // get the type for the region
    
    if (regionIsType){
      RegionType = regionConfig;
    }

    if (!regionIsType && regionTypeIsUndefined) {
      RegionType = defaultRegionType;
    }

    if (regionConfig.regionType) {
      RegionType = regionConfig.regionType;
    }
    
    // build the region instance
    var region = new RegionType({
      el: selector
    });

    // override the `getEl` function if we have a parentEl
    // this must be overridden to ensure the selector is found
    // on the first use of the region. if we try to assign the
    // region's `el` to `parentEl.find(selector)` in the object
    // literal to build the region, the element will not be
    // guaranteed to be in the DOM already, and will cause problems
    if (regionConfig.parentEl){

      region.getEl = function(selector) {
        var parentEl = regionConfig.parentEl;
        if (_.isFunction(parentEl)){
          parentEl = parentEl();
        }
        return parentEl.find(selector);
      };
    }

    return region;
  }

});

// Region Instance Methods
// -----------------------

_.extend(Marionette.Region.prototype, Backbone.Events, {

  // Displays a backbone view instance inside of the region.
  // Handles calling the `render` method for you. Reads content
  // directly from the `el` attribute. Also calls an optional
  // `onShow` and `close` method on your view, just after showing
  // or just before closing the view, respectively.
  show: function(view){

    this.ensureEl();

    var isViewClosed = view.isClosed || _.isUndefined(view.$el);

    var isDifferentView = view !== this.currentView;

    if (isDifferentView) {
      this.close();
    }

    view.render();

    if (isDifferentView || isViewClosed) {
      this.open(view);
    }
    
    this.currentView = view;

    Marionette.triggerMethod.call(this, "show", view);
    Marionette.triggerMethod.call(view, "show");
  },

  ensureEl: function(){
    if (!this.$el || this.$el.length === 0){
      this.$el = this.getEl(this.el);
    }
  },

  // Override this method to change how the region finds the
  // DOM element that it manages. Return a jQuery selector object.
  getEl: function(selector){
    return Marionette.$(selector);
  },

  // Override this method to change how the new view is
  // appended to the `$el` that the region is managing
  open: function(view){
    this.$el.empty().append(view.el);
  },

  // Close the current view, if there is one. If there is no
  // current view, it does nothing and returns immediately.
  close: function(){
    var view = this.currentView;
    if (!view || view.isClosed){ return; }

    // call 'close' or 'remove', depending on which is found
    if (view.close) { view.close(); }
    else if (view.remove) { view.remove(); }

    Marionette.triggerMethod.call(this, "close");

    delete this.currentView;
  },

  // Attach an existing view to the region. This 
  // will not call `render` or `onShow` for the new view, 
  // and will not replace the current HTML for the `el`
  // of the region.
  attachView: function(view){
    this.currentView = view;
  },

  // Reset the region by closing any existing view and
  // clearing out the cached `$el`. The next time a view
  // is shown via this region, the region will re-query the
  // DOM for the region's `el`.
  reset: function(){
    this.close();
    delete this.$el;
  }
});

// Copy the `extend` function used by Backbone's classes
Marionette.Region.extend = Marionette.extend;

// Marionette.RegionManager
// ------------------------
//
// Manage one or more related `Marionette.Region` objects.
Marionette.RegionManager = (function(Marionette){

  var RegionManager = Marionette.Controller.extend({
    constructor: function(options){
      this._regions = {};
      Marionette.Controller.prototype.constructor.call(this, options);
    },

    // Add multiple regions using an object literal, where
    // each key becomes the region name, and each value is
    // the region definition.
    addRegions: function(regionDefinitions, defaults){
      var regions = {};

      _.each(regionDefinitions, function(definition, name){
        if (typeof definition === "string"){
          definition = { selector: definition };
        }

        if (definition.selector){
          definition = _.defaults({}, definition, defaults);
        }

        var region = this.addRegion(name, definition);
        regions[name] = region;
      }, this);

      return regions;
    },

    // Add an individual region to the region manager,
    // and return the region instance
    addRegion: function(name, definition){
      var region;

      var isObject = _.isObject(definition);
      var isString = _.isString(definition);
      var hasSelector = !!definition.selector;

      if (isString || (isObject && hasSelector)){
        region = Marionette.Region.buildRegion(definition, Marionette.Region);
      } else if (_.isFunction(definition)){
        region = Marionette.Region.buildRegion(definition, Marionette.Region);
      } else {
        region = definition;
      }

      this._store(name, region);
      this.triggerMethod("region:add", name, region);
      return region;
    },

    // Get a region by name
    get: function(name){
      return this._regions[name];
    },

    // Remove a region by name
    removeRegion: function(name){
      var region = this._regions[name];
      this._remove(name, region);
    },

    // Close all regions in the region manager, and
    // remove them
    removeRegions: function(){
      _.each(this._regions, function(region, name){
        this._remove(name, region);
      }, this);
    },

    // Close all regions in the region manager, but
    // leave them attached
    closeRegions: function(){
      _.each(this._regions, function(region, name){
        region.close();
      }, this);
    },

    // Close all regions and shut down the region
    // manager entirely
    close: function(){
      this.removeRegions();
      var args = Array.prototype.slice.call(arguments);
      Marionette.Controller.prototype.close.apply(this, args);
    },

    // internal method to store regions
    _store: function(name, region){
      this._regions[name] = region;
      this._setLength();
    },

    // internal method to remove a region
    _remove: function(name, region){
      region.close();
      delete this._regions[name];
      this._setLength();
      this.triggerMethod("region:remove", name, region);
    },

    // set the number of regions current held
    _setLength: function(){
      this.length = _.size(this._regions);
    }

  });

  // Borrowing this code from Backbone.Collection:
  // http://backbonejs.org/docs/backbone.html#section-106
  //
  // Mix in methods from Underscore, for iteration, and other
  // collection related features.
  var methods = ['forEach', 'each', 'map', 'find', 'detect', 'filter', 
    'select', 'reject', 'every', 'all', 'some', 'any', 'include', 
    'contains', 'invoke', 'toArray', 'first', 'initial', 'rest', 
    'last', 'without', 'isEmpty', 'pluck'];

  _.each(methods, function(method) {
    RegionManager.prototype[method] = function() {
      var regions = _.values(this._regions);
      var args = [regions].concat(_.toArray(arguments));
      return _[method].apply(_, args);
    };
  });

  return RegionManager;
})(Marionette);


// Template Cache
// --------------

// Manage templates stored in `<script>` blocks,
// caching them for faster access.
Marionette.TemplateCache = function(templateId){
  this.templateId = templateId;
};

// TemplateCache object-level methods. Manage the template
// caches from these method calls instead of creating 
// your own TemplateCache instances
_.extend(Marionette.TemplateCache, {
  templateCaches: {},

  // Get the specified template by id. Either
  // retrieves the cached version, or loads it
  // from the DOM.
  get: function(templateId){
    var cachedTemplate = this.templateCaches[templateId];

    if (!cachedTemplate){
      cachedTemplate = new Marionette.TemplateCache(templateId);
      this.templateCaches[templateId] = cachedTemplate;
    }

    return cachedTemplate.load();
  },

  // Clear templates from the cache. If no arguments
  // are specified, clears all templates:
  // `clear()`
  //
  // If arguments are specified, clears each of the 
  // specified templates from the cache:
  // `clear("#t1", "#t2", "...")`
  clear: function(){
    var i;
    var args = slice(arguments);
    var length = args.length;

    if (length > 0){
      for(i=0; i<length; i++){
        delete this.templateCaches[args[i]];
      }
    } else {
      this.templateCaches = {};
    }
  }
});

// TemplateCache instance methods, allowing each
// template cache object to manage its own state
// and know whether or not it has been loaded
_.extend(Marionette.TemplateCache.prototype, {

  // Internal method to load the template
  load: function(){
    // Guard clause to prevent loading this template more than once
    if (this.compiledTemplate){
      return this.compiledTemplate;
    }

    // Load the template and compile it
    var template = this.loadTemplate(this.templateId);
    this.compiledTemplate = this.compileTemplate(template);

    return this.compiledTemplate;
  },

  // Load a template from the DOM, by default. Override
  // this method to provide your own template retrieval
  // For asynchronous loading with AMD/RequireJS, consider
  // using a template-loader plugin as described here: 
  // https://github.com/marionettejs/backbone.marionette/wiki/Using-marionette-with-requirejs
  loadTemplate: function(templateId){
    var template = Marionette.$(templateId).html();

    if (!template || template.length === 0){
      throwError("Could not find template: '" + templateId + "'", "NoTemplateError");
    }

    return template;
  },

  // Pre-compile the template before caching it. Override
  // this method if you do not need to pre-compile a template
  // (JST / RequireJS for example) or if you want to change
  // the template engine used (Handebars, etc).
  compileTemplate: function(rawTemplate){
    return _.template(rawTemplate);
  }
});


// Renderer
// --------

// Render a template with data by passing in the template
// selector and the data to render.
Marionette.Renderer = {

  // Render a template with data. The `template` parameter is
  // passed to the `TemplateCache` object to retrieve the
  // template function. Override this method to provide your own
  // custom rendering and template handling for all of Marionette.
  render: function(template, data){

    if (!template) {
      var error = new Error("Cannot render the template since it's false, null or undefined.");
      error.name = "TemplateNotFoundError";
      throw error;
    }

    var templateFunc;
    if (typeof template === "function"){
      templateFunc = template;
    } else {
      templateFunc = Marionette.TemplateCache.get(template);
    }

    return templateFunc(data);
  }
};



// Marionette.View
// ---------------

// The core view type that other Marionette views extend from.
Marionette.View = Backbone.View.extend({

  constructor: function(){
    _.bindAll(this, "render");

    var args = Array.prototype.slice.apply(arguments);
    Backbone.View.prototype.constructor.apply(this, args);

    Marionette.MonitorDOMRefresh(this);
    this.listenTo(this, "show", this.onShowCalled, this);
  },

  // import the "triggerMethod" to trigger events with corresponding
  // methods if the method exists 
  triggerMethod: Marionette.triggerMethod,

  // Get the template for this view
  // instance. You can set a `template` attribute in the view
  // definition or pass a `template: "whatever"` parameter in
  // to the constructor options.
  getTemplate: function(){
    return Marionette.getOption(this, "template");
  },

  // Mix in template helper methods. Looks for a
  // `templateHelpers` attribute, which can either be an
  // object literal, or a function that returns an object
  // literal. All methods and attributes from this object
  // are copies to the object passed in.
  mixinTemplateHelpers: function(target){
    target = target || {};
    var templateHelpers = Marionette.getOption(this, "templateHelpers");
    if (_.isFunction(templateHelpers)){
      templateHelpers = templateHelpers.call(this);
    }
    return _.extend(target, templateHelpers);
  },

  // Configure `triggers` to forward DOM events to view
  // events. `triggers: {"click .foo": "do:foo"}`
  configureTriggers: function(){
    if (!this.triggers) { return; }

    var triggerEvents = {};

    // Allow `triggers` to be configured as a function
    var triggers = _.result(this, "triggers");

    // Configure the triggers, prevent default
    // action and stop propagation of DOM events
    _.each(triggers, function(value, key){

      // build the event handler function for the DOM event
      triggerEvents[key] = function(e){

        // stop the event in its tracks
        if (e && e.preventDefault){ e.preventDefault(); }
        if (e && e.stopPropagation){ e.stopPropagation(); }

        // build the args for the event
        var args = {
          view: this,
          model: this.model,
          collection: this.collection
        };

        // trigger the event
        this.triggerMethod(value, args);
      };

    }, this);

    return triggerEvents;
  },

  // Overriding Backbone.View's delegateEvents to handle 
  // the `triggers`, `modelEvents`, and `collectionEvents` configuration
  delegateEvents: function(events){
    this._delegateDOMEvents(events);
    Marionette.bindEntityEvents(this, this.model, Marionette.getOption(this, "modelEvents"));
    Marionette.bindEntityEvents(this, this.collection, Marionette.getOption(this, "collectionEvents"));
  },

  // internal method to delegate DOM events and triggers
  _delegateDOMEvents: function(events){
    events = events || this.events;
    if (_.isFunction(events)){ events = events.call(this); }

    var combinedEvents = {};
    var triggers = this.configureTriggers();
    _.extend(combinedEvents, events, triggers);

    Backbone.View.prototype.delegateEvents.call(this, combinedEvents);
  },

  // Overriding Backbone.View's undelegateEvents to handle unbinding
  // the `triggers`, `modelEvents`, and `collectionEvents` config
  undelegateEvents: function(){
    var args = Array.prototype.slice.call(arguments);
    Backbone.View.prototype.undelegateEvents.apply(this, args);

    Marionette.unbindEntityEvents(this, this.model, Marionette.getOption(this, "modelEvents"));
    Marionette.unbindEntityEvents(this, this.collection, Marionette.getOption(this, "collectionEvents"));
  },

  // Internal method, handles the `show` event.
  onShowCalled: function(){},

  // Default `close` implementation, for removing a view from the
  // DOM and unbinding it. Regions will call this method
  // for you. You can specify an `onClose` method in your view to
  // add custom code that is called after the view is closed.
  close: function(){
    if (this.isClosed) { return; }

    // allow the close to be stopped by returning `false`
    // from the `onBeforeClose` method
    var shouldClose = this.triggerMethod("before:close");
    if (shouldClose === false){
      return;
    }

    // mark as closed before doing the actual close, to
    // prevent infinite loops within "close" event handlers
    // that are trying to close other views
    this.isClosed = true;
    this.triggerMethod("close");

    // unbind UI elements
    this.unbindUIElements();

    // remove the view from the DOM
    this.remove();
  },

  // This method binds the elements specified in the "ui" hash inside the view's code with
  // the associated jQuery selectors.
  bindUIElements: function(){
    if (!this.ui) { return; }

    // store the ui hash in _uiBindings so they can be reset later
    // and so re-rendering the view will be able to find the bindings
    if (!this._uiBindings){
      this._uiBindings = this.ui;
    }

    // get the bindings result, as a function or otherwise
    var bindings = _.result(this, "_uiBindings");

    // empty the ui so we don't have anything to start with
    this.ui = {};

    // bind each of the selectors
    _.each(_.keys(bindings), function(key) {
      var selector = bindings[key];
      this.ui[key] = this.$(selector);
    }, this);
  },

  // This method unbinds the elements specified in the "ui" hash
  unbindUIElements: function(){
    if (!this.ui || !this._uiBindings){ return; }

    // delete all of the existing ui bindings
    _.each(this.ui, function($el, name){
      delete this.ui[name];
    }, this);

    // reset the ui element to the original bindings configuration
    this.ui = this._uiBindings;
    delete this._uiBindings;
  }
});

// Item View
// ---------

// A single item view implementation that contains code for rendering
// with underscore.js templates, serializing the view's model or collection,
// and calling several methods on extended views, such as `onRender`.
Marionette.ItemView = Marionette.View.extend({
  
  // Setting up the inheritance chain which allows changes to 
  // Marionette.View.prototype.constructor which allows overriding
  constructor: function(){
    Marionette.View.prototype.constructor.apply(this, slice(arguments));
  },

  // Serialize the model or collection for the view. If a model is
  // found, `.toJSON()` is called. If a collection is found, `.toJSON()`
  // is also called, but is used to populate an `items` array in the
  // resulting data. If both are found, defaults to the model.
  // You can override the `serializeData` method in your own view
  // definition, to provide custom serialization for your view's data.
  serializeData: function(){
    var data = {};

    if (this.model) {
      data = this.model.toJSON();
    }
    else if (this.collection) {
      data = { items: this.collection.toJSON() };
    }

    return data;
  },

  // Render the view, defaulting to underscore.js templates.
  // You can override this in your view definition to provide
  // a very specific rendering for your view. In general, though,
  // you should override the `Marionette.Renderer` object to
  // change how Marionette renders views.
  render: function(){
    this.isClosed = false;

    this.triggerMethod("before:render", this);
    this.triggerMethod("item:before:render", this);

    var data = this.serializeData();
    data = this.mixinTemplateHelpers(data);

    var template = this.getTemplate();
    var html = Marionette.Renderer.render(template, data);

    this.$el.html(html);
    this.bindUIElements();

    this.triggerMethod("render", this);
    this.triggerMethod("item:rendered", this);

    return this;
  },

  // Override the default close event to add a few
  // more events that are triggered.
  close: function(){
    if (this.isClosed){ return; }

    this.triggerMethod('item:before:close');

    Marionette.View.prototype.close.apply(this, slice(arguments));

    this.triggerMethod('item:closed');
  }
});

// Collection View
// ---------------

// A view that iterates over a Backbone.Collection
// and renders an individual ItemView for each model.
Marionette.CollectionView = Marionette.View.extend({
  // used as the prefix for item view events
  // that are forwarded through the collectionview
  itemViewEventPrefix: "itemview",

  // constructor
  constructor: function(options){
    this._initChildViewStorage();

    Marionette.View.prototype.constructor.apply(this, slice(arguments));

    this._initialEvents();
  },

  // Configured the initial events that the collection view
  // binds to. Override this method to prevent the initial
  // events, or to add your own initial events.
  _initialEvents: function(){
    if (this.collection){
      this.listenTo(this.collection, "add", this.addChildView, this);
      this.listenTo(this.collection, "remove", this.removeItemView, this);
      this.listenTo(this.collection, "reset", this.render, this);
    }
  },

  // Handle a child item added to the collection
  addChildView: function(item, collection, options){
    this.closeEmptyView();
    var ItemView = this.getItemView(item);
    var index = this.collection.indexOf(item);
    this.addItemView(item, ItemView, index);
  },

  // Override from `Marionette.View` to guarantee the `onShow` method
  // of child views is called.
  onShowCalled: function(){
    this.children.each(function(child){
      Marionette.triggerMethod.call(child, "show");
    });
  },

  // Internal method to trigger the before render callbacks
  // and events
  triggerBeforeRender: function(){
    this.triggerMethod("before:render", this);
    this.triggerMethod("collection:before:render", this);
  },

  // Internal method to trigger the rendered callbacks and
  // events
  triggerRendered: function(){
    this.triggerMethod("render", this);
    this.triggerMethod("collection:rendered", this);
  },

  // Render the collection of items. Override this method to
  // provide your own implementation of a render function for
  // the collection view.
  render: function(){
    this.isClosed = false;
    this.triggerBeforeRender();
    this._renderChildren();
    this.triggerRendered();
    return this;
  },

  // Internal method. Separated so that CompositeView can have
  // more control over events being triggered, around the rendering
  // process
  _renderChildren: function(){
    this.closeEmptyView();
    this.closeChildren();

    if (this.collection && this.collection.length > 0) {
      this.showCollection();
    } else {
      this.showEmptyView();
    }
  },

  // Internal method to loop through each item in the
  // collection view and show it
  showCollection: function(){
    var ItemView;
    this.collection.each(function(item, index){
      ItemView = this.getItemView(item);
      this.addItemView(item, ItemView, index);
    }, this);
  },

  // Internal method to show an empty view in place of
  // a collection of item views, when the collection is
  // empty
  showEmptyView: function(){
    var EmptyView = Marionette.getOption(this, "emptyView");

    if (EmptyView && !this._showingEmptyView){
      this._showingEmptyView = true;
      var model = new Backbone.Model();
      this.addItemView(model, EmptyView, 0);
    }
  },

  // Internal method to close an existing emptyView instance
  // if one exists. Called when a collection view has been
  // rendered empty, and then an item is added to the collection.
  closeEmptyView: function(){
    if (this._showingEmptyView){
      this.closeChildren();
      delete this._showingEmptyView;
    }
  },

  // Retrieve the itemView type, either from `this.options.itemView`
  // or from the `itemView` in the object definition. The "options"
  // takes precedence.
  getItemView: function(item){
    var itemView = Marionette.getOption(this, "itemView");

    if (!itemView){
      throwError("An `itemView` must be specified", "NoItemViewError");
    }

    return itemView;
  },

  // Render the child item's view and add it to the
  // HTML for the collection view.
  addItemView: function(item, ItemView, index){
    // get the itemViewOptions if any were specified
    var itemViewOptions = Marionette.getOption(this, "itemViewOptions");
    if (_.isFunction(itemViewOptions)){
      itemViewOptions = itemViewOptions.call(this, item, index);
    }

    // build the view 
    var view = this.buildItemView(item, ItemView, itemViewOptions);
    
    // set up the child view event forwarding
    this.addChildViewEventForwarding(view);

    // this view is about to be added
    this.triggerMethod("before:item:added", view);

    // Store the child view itself so we can properly
    // remove and/or close it later
    this.children.add(view);

    // Render it and show it
    this.renderItemView(view, index);

    // call the "show" method if the collection view
    // has already been shown
    if (this._isShown){
      Marionette.triggerMethod.call(view, "show");
    }

    // this view was added
    this.triggerMethod("after:item:added", view);
  },

  // Set up the child view event forwarding. Uses an "itemview:"
  // prefix in front of all forwarded events.
  addChildViewEventForwarding: function(view){
    var prefix = Marionette.getOption(this, "itemViewEventPrefix");

    // Forward all child item view events through the parent,
    // prepending "itemview:" to the event name
    this.listenTo(view, "all", function(){
      var args = slice(arguments);
      args[0] = prefix + ":" + args[0];
      args.splice(1, 0, view);

      Marionette.triggerMethod.apply(this, args);
    }, this);
  },

  // render the item view
  renderItemView: function(view, index) {
    view.render();
    this.appendHtml(this, view, index);
  },

  // Build an `itemView` for every model in the collection.
  buildItemView: function(item, ItemViewType, itemViewOptions){
    var options = _.extend({model: item}, itemViewOptions);
    return new ItemViewType(options);
  },

  // get the child view by item it holds, and remove it
  removeItemView: function(item){
    var view = this.children.findByModel(item);
    this.removeChildView(view);
    this.checkEmpty();
  },

  // Remove the child view and close it
  removeChildView: function(view){

    // shut down the child view properly,
    // including events that the collection has from it
    if (view){
      this.stopListening(view);

      // call 'close' or 'remove', depending on which is found
      if (view.close) { view.close(); }
      else if (view.remove) { view.remove(); }

      this.children.remove(view);
    }

    this.triggerMethod("item:removed", view);
  },

  // helper to show the empty view if the collection is empty
  checkEmpty: function() {
    // check if we're empty now, and if we are, show the
    // empty view
    if (!this.collection || this.collection.length === 0){
      this.showEmptyView();
    }
  },

  // Append the HTML to the collection's `el`.
  // Override this method to do something other
  // then `.append`.
  appendHtml: function(collectionView, itemView, index){
    collectionView.$el.append(itemView.el);
  },

  // Internal method to set up the `children` object for
  // storing all of the child views
  _initChildViewStorage: function(){
    this.children = new Backbone.ChildViewContainer();
  },

  // Handle cleanup and other closing needs for
  // the collection of views.
  close: function(){
    if (this.isClosed){ return; }

    this.triggerMethod("collection:before:close");
    this.closeChildren();
    this.triggerMethod("collection:closed");

    Marionette.View.prototype.close.apply(this, slice(arguments));
  },

  // Close the child views that this collection view
  // is holding on to, if any
  closeChildren: function(){
    this.children.each(function(child){
      this.removeChildView(child);
    }, this);
    this.checkEmpty();
  }
});


// Composite View
// --------------

// Used for rendering a branch-leaf, hierarchical structure.
// Extends directly from CollectionView and also renders an
// an item view as `modelView`, for the top leaf
Marionette.CompositeView = Marionette.CollectionView.extend({

  // Setting up the inheritance chain which allows changes to
  // Marionette.CollectionView.prototype.constructor which allows overriding
  constructor: function(){
    Marionette.CollectionView.prototype.constructor.apply(this, slice(arguments));
  },

  // Configured the initial events that the composite view
  // binds to. Override this method to prevent the initial
  // events, or to add your own initial events.
  _initialEvents: function(){
    if (this.collection){
      this.listenTo(this.collection, "add", this.addChildView, this);
      this.listenTo(this.collection, "remove", this.removeItemView, this);
      this.listenTo(this.collection, "reset", this._renderChildren, this);
    }
  },

  // Retrieve the `itemView` to be used when rendering each of
  // the items in the collection. The default is to return
  // `this.itemView` or Marionette.CompositeView if no `itemView`
  // has been defined
  getItemView: function(item){
    var itemView = Marionette.getOption(this, "itemView") || this.constructor;

    if (!itemView){
      throwError("An `itemView` must be specified", "NoItemViewError");
    }

    return itemView;
  },

  // Serialize the collection for the view.
  // You can override the `serializeData` method in your own view
  // definition, to provide custom serialization for your view's data.
  serializeData: function(){
    var data = {};

    if (this.model){
      data = this.model.toJSON();
    }

    return data;
  },

  // Renders the model once, and the collection once. Calling
  // this again will tell the model's view to re-render itself
  // but the collection will not re-render.
  render: function(){
    this.isRendered = true;
    this.isClosed = false;
    this.resetItemViewContainer();

    this.triggerBeforeRender();
    var html = this.renderModel();
    this.$el.html(html);
    // the ui bindings is done here and not at the end of render since they
    // will not be available until after the model is rendered, but should be
    // available before the collection is rendered.
    this.bindUIElements();
    this.triggerMethod("composite:model:rendered");

    this._renderChildren();

    this.triggerMethod("composite:rendered");
    this.triggerRendered();
    return this;
  },

  _renderChildren: function(){
    if (this.isRendered){
      Marionette.CollectionView.prototype._renderChildren.call(this);
      this.triggerMethod("composite:collection:rendered");
    }
  },

  // Render an individual model, if we have one, as
  // part of a composite view (branch / leaf). For example:
  // a treeview.
  renderModel: function(){
    var data = {};
    data = this.serializeData();
    data = this.mixinTemplateHelpers(data);

    var template = this.getTemplate();
    return Marionette.Renderer.render(template, data);
  },

  // Appends the `el` of itemView instances to the specified
  // `itemViewContainer` (a jQuery selector). Override this method to
  // provide custom logic of how the child item view instances have their
  // HTML appended to the composite view instance.
  appendHtml: function(cv, iv, index){
    var $container = this.getItemViewContainer(cv);
    $container.append(iv.el);
  },

  // Internal method to ensure an `$itemViewContainer` exists, for the
  // `appendHtml` method to use.
  getItemViewContainer: function(containerView){
    if ("$itemViewContainer" in containerView){
      return containerView.$itemViewContainer;
    }

    var container;
    var itemViewContainer = Marionette.getOption(containerView, "itemViewContainer");
    if (itemViewContainer){

      var selector = _.isFunction(itemViewContainer) ? itemViewContainer() : itemViewContainer;
      container = containerView.$(selector);
      if (container.length <= 0) {
        throwError("The specified `itemViewContainer` was not found: " + containerView.itemViewContainer, "ItemViewContainerMissingError");
      }

    } else {
      container = containerView.$el;
    }

    containerView.$itemViewContainer = container;
    return container;
  },

  // Internal method to reset the `$itemViewContainer` on render
  resetItemViewContainer: function(){
    if (this.$itemViewContainer){
      delete this.$itemViewContainer;
    }
  }
});


// Layout
// ------

// Used for managing application layouts, nested layouts and
// multiple regions within an application or sub-application.
//
// A specialized view type that renders an area of HTML and then
// attaches `Region` instances to the specified `regions`.
// Used for composite view management and sub-application areas.
Marionette.Layout = Marionette.ItemView.extend({
  regionType: Marionette.Region,
  
  // Ensure the regions are available when the `initialize` method
  // is called.
  constructor: function (options) {
    options = options || {};

    this._firstRender = true;
    this._initializeRegions(options);
    
    Marionette.ItemView.prototype.constructor.call(this, options);
  },

  // Layout's render will use the existing region objects the
  // first time it is called. Subsequent calls will close the
  // views that the regions are showing and then reset the `el`
  // for the regions to the newly rendered DOM elements.
  render: function(){

    if (this.isClosed){
      // a previously closed layout means we need to 
      // completely re-initialize the regions
      this._initializeRegions();
    }
    if (this._firstRender) {
      // if this is the first render, don't do anything to
      // reset the regions
      this._firstRender = false;
    } else if (!this.isClosed){
      // If this is not the first render call, then we need to 
      // re-initializing the `el` for each region
      this._reInitializeRegions();
    }

    var args = Array.prototype.slice.apply(arguments);
    var result = Marionette.ItemView.prototype.render.apply(this, args);

    return result;
  },

  // Handle closing regions, and then close the view itself.
  close: function () {
    if (this.isClosed){ return; }
    this.regionManager.close();
    var args = Array.prototype.slice.apply(arguments);
    Marionette.ItemView.prototype.close.apply(this, args);
  },

  // Add a single region, by name, to the layout
  addRegion: function(name, definition){
    var regions = {};
    regions[name] = definition;
    return this._buildRegions(regions)[name];
  },

  // Add multiple regions as a {name: definition, name2: def2} object literal
  addRegions: function(regions){
    this.regions = _.extend({}, this.regions, regions);
    return this._buildRegions(regions);
  },

  // Remove a single region from the Layout, by name
  removeRegion: function(name){
    delete this.regions[name];
    return this.regionManager.removeRegion(name);
  },

  // internal method to build regions
  _buildRegions: function(regions){
    var that = this;

    var defaults = {
      regionType: Marionette.getOption(this, "regionType"),
      parentEl: function(){ return that.$el; }
    };

    return this.regionManager.addRegions(regions, defaults);
  },

  // Internal method to initialize the regions that have been defined in a
  // `regions` attribute on this layout. 
  _initializeRegions: function (options) {
    var regions;
    this._initRegionManager();

    if (_.isFunction(this.regions)) {
      regions = this.regions(options);
    } else {
      regions = this.regions || {};
    }

    this.addRegions(regions);
  },

  // Internal method to re-initialize all of the regions by updating the `el` that
  // they point to
  _reInitializeRegions: function(){
    this.regionManager.closeRegions();
    this.regionManager.each(function(region){
      region.reset();
    });
  },

  // Internal method to initialize the region manager
  // and all regions in it
  _initRegionManager: function(){
    this.regionManager = new Marionette.RegionManager();

    this.listenTo(this.regionManager, "region:add", function(name, region){
      this[name] = region;
      this.trigger("region:add", name, region);
    });

    this.listenTo(this.regionManager, "region:remove", function(name, region){
      delete this[name];
      this.trigger("region:remove", name, region);
    });
  }
});


// AppRouter
// ---------

// Reduce the boilerplate code of handling route events
// and then calling a single method on another object.
// Have your routers configured to call the method on
// your object, directly.
//
// Configure an AppRouter with `appRoutes`.
//
// App routers can only take one `controller` object. 
// It is recommended that you divide your controller
// objects in to smaller pieces of related functionality
// and have multiple routers / controllers, instead of
// just one giant router and controller.
//
// You can also add standard routes to an AppRouter.

Marionette.AppRouter = Backbone.Router.extend({

  constructor: function(options){
    Backbone.Router.prototype.constructor.apply(this, slice(arguments));
	
    this.options = options || {};

    var appRoutes = Marionette.getOption(this, "appRoutes");
    var controller = this._getController();
    this.processAppRoutes(controller, appRoutes);
  },

  // Similar to route method on a Backbone Router but
  // method is called on the controller
  appRoute: function(route, methodName) {
    var controller = this._getController();
    this._addAppRoute(controller, route, methodName);
  },

  // Internal method to process the `appRoutes` for the
  // router, and turn them in to routes that trigger the
  // specified method on the specified `controller`.
  processAppRoutes: function(controller, appRoutes) {
    if (!appRoutes){ return; }

    var routeNames = _.keys(appRoutes).reverse(); // Backbone requires reverted order of routes

    _.each(routeNames, function(route) {
      this._addAppRoute(controller, route, appRoutes[route]);
    }, this);
  },

  _getController: function(){
    return Marionette.getOption(this, "controller");
  },

  _addAppRoute: function(controller, route, methodName){
    var method = controller[methodName];

    if (!method) {
      throw new Error("Method '" + methodName + "' was not found on the controller");
    }

    this.route(route, methodName, _.bind(method, controller));
  }
});


// Application
// -----------

// Contain and manage the composite application as a whole.
// Stores and starts up `Region` objects, includes an
// event aggregator as `app.vent`
Marionette.Application = function(options){
  this._initRegionManager();
  this._initCallbacks = new Marionette.Callbacks();
  this.vent = new Backbone.Wreqr.EventAggregator();
  this.commands = new Backbone.Wreqr.Commands();
  this.reqres = new Backbone.Wreqr.RequestResponse();
  this.submodules = {};

  _.extend(this, options);

  this.triggerMethod = Marionette.triggerMethod;
};

_.extend(Marionette.Application.prototype, Backbone.Events, {
  // Command execution, facilitated by Backbone.Wreqr.Commands
  execute: function(){
    var args = Array.prototype.slice.apply(arguments);
    this.commands.execute.apply(this.commands, args);
  },

  // Request/response, facilitated by Backbone.Wreqr.RequestResponse
  request: function(){
    var args = Array.prototype.slice.apply(arguments);
    return this.reqres.request.apply(this.reqres, args);
  },

  // Add an initializer that is either run at when the `start`
  // method is called, or run immediately if added after `start`
  // has already been called.
  addInitializer: function(initializer){
    this._initCallbacks.add(initializer);
  },

  // kick off all of the application's processes.
  // initializes all of the regions that have been added
  // to the app, and runs all of the initializer functions
  start: function(options){
    this.triggerMethod("initialize:before", options);
    this._initCallbacks.run(options, this);
    this.triggerMethod("initialize:after", options);

    this.triggerMethod("start", options);
  },

  // Add regions to your app. 
  // Accepts a hash of named strings or Region objects
  // addRegions({something: "#someRegion"})
  // addRegions({something: Region.extend({el: "#someRegion"}) });
  addRegions: function(regions){
    return this._regionManager.addRegions(regions);
  },

  // Close all regions in the app, without removing them
  closeRegions: function(){
    this._regionManager.closeRegions();
  },

  // Removes a region from your app, by name
  // Accepts the regions name
  // removeRegion('myRegion')
  removeRegion: function(region) {
    this._regionManager.removeRegion(region);
  },
  
  // Provides alternative access to regions
  // Accepts the region name
  // getRegion('main')
  getRegion: function(region) {
    return this._regionManager.get(region);
  },

  // Create a module, attached to the application
  module: function(moduleNames, moduleDefinition){
    // slice the args, and add this application object as the
    // first argument of the array
    var args = slice(arguments);
    args.unshift(this);

    // see the Marionette.Module object for more information
    return Marionette.Module.create.apply(Marionette.Module, args);
  },

  // Internal method to set up the region manager
  _initRegionManager: function(){
    this._regionManager = new Marionette.RegionManager();

    this.listenTo(this._regionManager, "region:add", function(name, region){
      this[name] = region;
    });

    this.listenTo(this._regionManager, "region:remove", function(name, region){
      delete this[name];
    });
  }
});

// Copy the `extend` function used by Backbone's classes
Marionette.Application.extend = Marionette.extend;

// Module
// ------

// A simple module system, used to create privacy and encapsulation in
// Marionette applications
Marionette.Module = function(moduleName, app){
  this.moduleName = moduleName;

  // store sub-modules
  this.submodules = {};

  this._setupInitializersAndFinalizers();

  // store the configuration for this module
  this.app = app;
  this.startWithParent = true;

  this.triggerMethod = Marionette.triggerMethod;
};

// Extend the Module prototype with events / listenTo, so that the module
// can be used as an event aggregator or pub/sub.
_.extend(Marionette.Module.prototype, Backbone.Events, {

  // Initializer for a specific module. Initializers are run when the
  // module's `start` method is called.
  addInitializer: function(callback){
    this._initializerCallbacks.add(callback);
  },

  // Finalizers are run when a module is stopped. They are used to teardown
  // and finalize any variables, references, events and other code that the
  // module had set up.
  addFinalizer: function(callback){
    this._finalizerCallbacks.add(callback);
  },

  // Start the module, and run all of its initializers
  start: function(options){
    // Prevent re-starting a module that is already started
    if (this._isInitialized){ return; }

    // start the sub-modules (depth-first hierarchy)
    _.each(this.submodules, function(mod){
      // check to see if we should start the sub-module with this parent
      if (mod.startWithParent){
        mod.start(options);
      }
    });

    // run the callbacks to "start" the current module
    this.triggerMethod("before:start", options);

    this._initializerCallbacks.run(options, this);
    this._isInitialized = true;

    this.triggerMethod("start", options);
  },

  // Stop this module by running its finalizers and then stop all of
  // the sub-modules for this module
  stop: function(){
    // if we are not initialized, don't bother finalizing
    if (!this._isInitialized){ return; }
    this._isInitialized = false;

    Marionette.triggerMethod.call(this, "before:stop");

    // stop the sub-modules; depth-first, to make sure the
    // sub-modules are stopped / finalized before parents
    _.each(this.submodules, function(mod){ mod.stop(); });

    // run the finalizers
    this._finalizerCallbacks.run(undefined,this);

    // reset the initializers and finalizers
    this._initializerCallbacks.reset();
    this._finalizerCallbacks.reset();

    Marionette.triggerMethod.call(this, "stop");
  },

  // Configure the module with a definition function and any custom args
  // that are to be passed in to the definition function
  addDefinition: function(moduleDefinition, customArgs){
    this._runModuleDefinition(moduleDefinition, customArgs);
  },

  // Internal method: run the module definition function with the correct
  // arguments
  _runModuleDefinition: function(definition, customArgs){
    if (!definition){ return; }

    // build the correct list of arguments for the module definition
    var args = _.flatten([
      this,
      this.app,
      Backbone,
      Marionette,
      Marionette.$, _,
      customArgs
    ]);

    definition.apply(this, args);
  },

  // Internal method: set up new copies of initializers and finalizers.
  // Calling this method will wipe out all existing initializers and
  // finalizers.
  _setupInitializersAndFinalizers: function(){
    this._initializerCallbacks = new Marionette.Callbacks();
    this._finalizerCallbacks = new Marionette.Callbacks();
  }
});

// Type methods to create modules
_.extend(Marionette.Module, {

  // Create a module, hanging off the app parameter as the parent object.
  create: function(app, moduleNames, moduleDefinition){
    var module = app;

    // get the custom args passed in after the module definition and
    // get rid of the module name and definition function
    var customArgs = slice(arguments);
    customArgs.splice(0, 3);

    // split the module names and get the length
    moduleNames = moduleNames.split(".");
    var length = moduleNames.length;

    // store the module definition for the last module in the chain
    var moduleDefinitions = [];
    moduleDefinitions[length-1] = moduleDefinition;

    // Loop through all the parts of the module definition
    _.each(moduleNames, function(moduleName, i){
      var parentModule = module;
      module = this._getModule(parentModule, moduleName, app);
      this._addModuleDefinition(parentModule, module, moduleDefinitions[i], customArgs);
    }, this);

    // Return the last module in the definition chain
    return module;
  },

  _getModule: function(parentModule, moduleName, app, def, args){
    // Get an existing module of this name if we have one
    var module = parentModule[moduleName];

    if (!module){
      // Create a new module if we don't have one
      module = new Marionette.Module(moduleName, app);
      parentModule[moduleName] = module;
      // store the module on the parent
      parentModule.submodules[moduleName] = module;
    }

    return module;
  },

  _addModuleDefinition: function(parentModule, module, def, args){
    var fn; 
    var startWithParent;

    if (_.isFunction(def)){
      // if a function is supplied for the module definition
      fn = def;
      startWithParent = true;

    } else if (_.isObject(def)){
      // if an object is supplied
      fn = def.define;
      startWithParent = def.startWithParent;
      
    } else {
      // if nothing is supplied
      startWithParent = true;
    }

    // add module definition if needed
    if (fn){
      module.addDefinition(fn, args);
    }

    // `and` the two together, ensuring a single `false` will prevent it
    // from starting with the parent
    module.startWithParent = module.startWithParent && startWithParent;

    // setup auto-start if needed
    if (module.startWithParent && !module.startWithParentIsConfigured){

      // only configure this once
      module.startWithParentIsConfigured = true;

      // add the module initializer config
      parentModule.addInitializer(function(options){
        if (module.startWithParent){
          module.start(options);
        }
      });

    }

  }
});



  return Marionette;
})(this, Backbone, _);

  return Backbone.Marionette; 

}));

})()
},{"backbone":103,"backbone.babysitter":104,"backbone.wreqr":102,"underscore":9}],77:[function(require,module,exports){
(function(){/* global window, $ */
var Marionette = require('backbone.marionette'),
  _ = require('underscore'),
  Model = require('../../../numericals/TimeSeriesModel.js'),
  Collection = require('../../../numericals/TimeSeriesCollection.js'),
  Settings = require('../../../numericals/utils/ChartSettings.js'),
  Sev = require('./SingleEditView.js'),
  Gcv = require('./GeneralConfigView.js');

module.exports = Marionette.ItemView.extend({
  type: 'Numerical',
  template: '#template-detail-content-numerical-general',
  itemViewContainer: '#detail-content',
  //addAttachmentContainer: '#add-attachment',
  //addAttachmentId: 0,
  //attachmentId: {},
  collection: new Collection([], {type: 'All'}),
  view: null,
  viewModel: null,
  viewType: Gcv,
  rendered: false,
  needToRender: null,
  firstRender: null,
  virtual: null,
  initialize: function () {
    this.firstRender = true;
    this.listenTo(this.model, 'change:collection', this.collectionChanged.bind(this));
    this.listenTo(this.model, 'change:event', this.highlightEvent.bind(this));
    this.updateCollection();
    this.prepareGeneralConfigModel();
    window.addEventListener('resize', this.debounceChildRender.bind(this));
  },
  highlightEvent: function () {
    this.viewModel.set('event', this.model.get('event'));
  },
  onRender: function () {
    this.view = new this.viewType({model: this.viewModel});

    if (this.viewType === Gcv) {
      this.view.bind('edit', this.editSeriesEvent.bind(this));
      this.view.bind('duplicate', this.duplicateSeriesEvent.bind(this));
      this.view.bind('remove', this.removeSeriesEvent.bind(this));
    } else if (this.viewType === Sev) {
      this.view.bind('ready', this.readySeriesEvent.bind(this));
      this.view.bind('cancel', this.cancelSeriesEvent.bind(this));
      this.view.bind('eventEdit', this.eventEdited.bind(this));
    }
    if (this.firstRender) {
      this.firstRender = false;
      this.debounceChildRender();
    } else {
      this.view.render();
    }
    $('body').i18n();
  },
  updateCollection: function () {
    if (!this.collection) {
      this.collection = new Collection([], {type: 'All'});
    }

    var c = this.collection;
    this.model.get('collection').each(function (e) {
      var ev = e.get('event');
      var connectionId = ev.connection.id;
      var streamId = ev.streamId;
      var streamName = ev.stream.name;
      var type = ev.type;

      var filter = {
        connectionId: connectionId,
        streamId: streamId,
        type: type
      };

      var m = c.where(filter);
      if (m && m.length !== 0) {
        for (var i = 0; i < m.length; ++i) {
          if (_.indexOf(m[i].get('events'), ev) === -1) {
            m[i].get('events').push(ev);
          }
        }
      } else {
        var s = new Settings(ev.stream, ev.type, this.model.get('virtual'));
        c.add(new Model({
            events: [ev],
            connectionId: connectionId,
            stream: ev.stream,
            streamId: streamId,
            streamName: streamName,
            type: type,
            category: 'any',
            virtual: this.model.get('virtual'),
            color: s.get('color'),
            style: s.get('style'),
            transform: s.get('transform'),
            interval: s.get('interval'),
            fitting: s.get('fitting')
          })
        );
      }
    }.bind(this));
  },
  onClose: function () {
    this.view.close();
    this.view = null;
    this.viewType = Gcv;
    this.viewModel = null;
    this.collection.reset();
    this.collection = null;
    this.rendered = null;
    this.needToRender = null;
  },
  editSeriesEvent: function (m) {

    this.closeChild();
    this.viewType = Sev;
    this.prepareSingleEditModel(m);
    this.render();
  },
  cancelSeriesEvent: function () {
    this.closeChild();
    this.viewType = Gcv;
    this.prepareGeneralConfigModel();
    this.render();
  },
  eventEdited: function (event) {
    var c = this.model.get('collection');
    var submitter = function () {
      this.collectionChanged.bind(this);
    }.bind(this);

    for (var i = 0; i < c.length; ++i) {
      var current = c.at(i);
      var e = current.get('event');
      if (e.id === event.eventId) {
        e.content = event.value;
        current.save(submitter);
        break;
      }
    }


  },
  readySeriesEvent: function (m) {
    var s = new Settings(m.get('stream'), m.get('type'), m.get('virtual'));
    s.set('color', m.get('color'));
    s.set('style', m.get('style'));
    s.set('transform', m.get('transform'));
    s.set('interval', m.get('interval'));
    s.set('fitting', m.get('fitting'));

    this.closeChild();
    this.viewType = Gcv;
    this.prepareGeneralConfigModel();
    this.render();
  },
  duplicateSeriesEvent: function (m) {

    this.closeChild();
    this.viewType = Gcv;
    var model = new Model({
      events: m.get('events'),
      connectionId: m.get('connectionId'),
      streamId: m.get('streamId'),
      streamName: m.get('streamName'),
      type: m.get('type'),
      category: m.get('category')
    });
    this.collection.add(model);
    this.prepareGeneralConfigModel();
    this.render();
  },
  removeSeriesEvent: function (m) {
    var virtual = this.model.get('virtual');
    var streamId = m.get('streamId');
    var type = m.get('type');
    var filters = virtual.filters;
    var newFilter = [];
    for (var i = 0; i < filters.length; ++i) {
      if (!(filters[i].streamId === streamId &&
        filters[i].type === type)) {
        newFilter.push(filters[i]);
      }
    }
    virtual.filters = newFilter;



    this.closeChild();
    this.viewType = Gcv;
    this.collection.remove(m);
    this.prepareGeneralConfigModel();
    this.render();
  },
  collectionChanged: function () {
    // TODO: depends on view type
    this.updateCollection();
    if (this.view) {
      this.view.unbind();
      this.view.close();
    }
    this.render();
  },
  prepareSingleEditModel: function (m) {
    this.viewModel = new Model({
      collection: this.collection,
      edited: m
    });
  },
  prepareGeneralConfigModel: function () {
    this.viewModel = new Model({
      collection: this.collection,
      virtual: this.model.get('virtual')
    });
  },
  closeChild: function () {
    this.view.unbind();
    this.view.close();
  },
  debounceChildRender: _.debounce(function () {
    this.view.render();
  }, 1000)
});
})()
},{"../../../numericals/TimeSeriesCollection.js":87,"../../../numericals/TimeSeriesModel.js":88,"../../../numericals/utils/ChartSettings.js":41,"./GeneralConfigView.js":106,"./SingleEditView.js":105,"backbone.marionette":32,"underscore":9}],99:[function(require,module,exports){
var Marionette = require('backbone.marionette');
var Pryv = require('pryv');
var UNIQUE_ID = 0;
var MAX_TEXT_CHAR = 140;
module.exports = Marionette.ItemView.extend({

  tagName: 'li',
  className: 'detail-item',
  template: '#template-detailItemView',
  templateHelpers: {
    getPreview: function () {
      var type = this.event.type;
      if (type.indexOf('picture') === 0) {
        return '';
      }
      if (type.indexOf('note') === 0) {
        var text = this.event.content.trim();
        if (text.length > MAX_TEXT_CHAR) {
          text = text.slice(0, MAX_TEXT_CHAR) + '...';
        }
        return '<div class="Center-Container is-Table">' +
          '<div class="Table-Cell">' +
          '<div class="Center-Block">' +
           text +
          '</div>' +
          '</div>' +
          '</div>';
      }
      if (Pryv.eventTypes.extras(this.event.type)) {
        return '<div class="Center-Container is-Table">' +
          '<div class="Table-Cell">' +
          '<div class="Center-Block">' +
          '<span class="value">' + this.event.content + '</span>' +
          '<span class="unity">' + Pryv.eventTypes.extras(this.event.type).symbol + '</span>' +
          '</div>' +
          '</div>' +
          '</div>';
      }
      return '';
    },
    getUniqueId: function () {
      UNIQUE_ID++;
      return UNIQUE_ID;
    }
  },
  ui: {
    checkbox: '.checkbox'
  },
  initialize: function () {
    //this.listenTo(this.model, 'change', this.render);
    this.listenTo(this.model, 'change:highlighted', this.highlight);
    this.listenTo(this.model, 'change:checked', this.check);

  },
  check: function () {
    this.ui.checkbox[0].checked = this.model.get('checked');
  },
  highlight: function () {
    if (this.model.get('highlighted')) {
      this.$el.addClass('highlighted');
    } else {
      this.$el.removeClass('highlighted');
    }
  },
  onRender: function () {
    this.check();
    this.highlight();
    if (this.model.get('event').type.indexOf('picture') === 0) {
      this.$el.css(
        {'background': 'url(' + this.model.get('event').getPicturePreview() +
          ') no-repeat center center',
          '-webkit-background-size': 'cover',
          '-moz-background-size': 'cover',
          '-o-background-size': 'cover',
          'background-size': 'cover'
        });
    }
    this.$el.bind('click', function () {
      this.trigger('date:clicked', this.model);
    }.bind(this));
    this.$('input').bind('click', function () {
      this.model.set('checked', this.ui.checkbox[0].checked);
    }.bind(this));
  }
});
},{"backbone.marionette":32,"pryv":10}],101:[function(require,module,exports){
var Marionette = require('backbone.marionette');

module.exports = Marionette.CompositeView.extend({
  template: '#template-draganddrop-itemview',
  tagName: 'li',
  ui: {
    selector: '.DnD-legend-button',
    spanText: '.DnD-legend-text'
  },
  state: false,
  templateHelpers: {
    displayName: function () {
      return this.streamName + ' / ' + this.type;
    }
  },
  onRender: function () {
    this.ui.selector.bind('click', function () {
      this.state = true;
      this.trigger('series:click', this.model);
    }.bind(this));
  }
});
},{"backbone.marionette":32}],89:[function(require,module,exports){
// Generated by CoffeeScript 1.6.3
(function() {
  var Google, Q;

  Q = require('q');

  Google = (function() {
    function Google() {}

    Google.URL = 'https://maps.googleapis.com/maps/api/js?sensor=false';

    Google.KEY = null;

    Google.WINDOW_CALLBACK_NAME = '__google_maps_api_provider_initializator__';

    Google.google = null;

    Google.loading = false;

    Google.promises = [];

    Google.load = function() {
      var deferred, script, url,
        _this = this;
      deferred = Q.defer();
      if (this.google === null) {
        if (this.loading === true) {
          this.promises.push(deferred);
        } else {
          this.loading = true;
          window[this.WINDOW_CALLBACK_NAME] = function() {
            return _this._ready(deferred);
          };
          url = this.URL;
          if (this.KEY !== null) {
            url += "&key=" + this.KEY;
          }
          url += "&callback=" + this.WINDOW_CALLBACK_NAME;
          script = document.createElement('script');
          script.type = 'text/javascript';
          script.src = url;
          document.body.appendChild(script);
        }
      } else {
        deferred.resolve(this.google);
      }
      return deferred.promise;
    };

    Google._ready = function(deferred) {
      var def, _i, _len, _ref;
      Google.loading = false;
      if (Google.google === null) {
        Google.google = window.google;
      }
      deferred.resolve(Google.google);
      _ref = Google.promises;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        def = _ref[_i];
        def.resolve(Google.google);
      }
      return Google.promises = [];
    };

    return Google;

  }).call(this);

  module.exports = Google;

}).call(this);

},{"q":107}],96:[function(require,module,exports){
(function(){/* global window */
var EventsNode = require('../EventsNode'),
  _ = require('underscore'),
  EventsView = require('../../view/events-views/generics/Model.js');


/**
 * Holder for EventsNode
 * @type {*}
 */
var DEFAULT_WEIGHT = 1;
var GenericEventsNode = module.exports = EventsNode.implement(
  function (parentStreamNode) {
    EventsNode.call(this, parentStreamNode);
  },
  {
    className: 'GenericEventsNode EventsNode',
    pluginView: EventsView,
    getWeight: function () {
      return DEFAULT_WEIGHT;
    }

  });

// we accept all kind of events
GenericEventsNode.acceptThisEventType = function (/*eventType*/) {
  return true;
};
try {
  Object.defineProperty(window.PryvBrowser, 'genericWeight', {
    set: function (value) {
      value = +value;
      if (_.isFinite(value)) {
        this.customConfig = true;
        DEFAULT_WEIGHT = value;
        if (_.isFunction(this.refresh)) {
          this.refresh();
        }
      }
    },
    get: function () {
      return DEFAULT_WEIGHT;
    }
  });
} catch (err) {
  console.warn('cannot define window.PryvBrowser');
}

})()
},{"../../view/events-views/generics/Model.js":108,"../EventsNode":109,"underscore":9}],97:[function(require,module,exports){
(function(){/* global window */
var EventsNode = require('../EventsNode'),
  EventsView = require('../../view/events-views/numericals/Model.js'),
  _ = require('underscore'),
  DEFAULT_WEIGHT = 1;

/**
 * Holder for EventsNode
 * @type {*}
 */
var NumericalsEventsNode = module.exports = EventsNode.implement(
  function (parentStreamNode) {
    EventsNode.call(this, parentStreamNode);
  },
  {
    className: 'NumericalsEventsNode EventsNode',
    pluginView: EventsView,
    getWeight: function () {
      return DEFAULT_WEIGHT;
    }

  });

// we accept all kind of events
NumericalsEventsNode.acceptThisEventType = function (eventType) {
  var eventTypeClass = eventType.split('/')[0];
  return (
    eventTypeClass === 'money' ||
      eventTypeClass === 'absorbed-dose' ||
      eventTypeClass === 'absorbed-dose-equivalent' ||
      eventTypeClass === 'absorbed-dose-rate' ||
      eventTypeClass === 'absorbed-dose-rate' ||
      eventTypeClass === 'area' ||
      eventTypeClass === 'capacitance' ||
      eventTypeClass === 'catalytic-activity' ||
      eventTypeClass === 'count' ||
      eventTypeClass === 'data-quantity' ||
      eventTypeClass === 'density' ||
      eventTypeClass === 'dynamic-viscosity' ||
      eventTypeClass === 'electric-charge' ||
      eventTypeClass === 'electric-charge-line-density' ||
      eventTypeClass === 'electric-current' ||
      eventTypeClass === 'electrical-conductivity' ||
      eventTypeClass === 'electromotive-force' ||
      eventTypeClass === 'energy' ||
      eventTypeClass === 'force' ||
      eventTypeClass === 'length' ||
      eventTypeClass === 'luminous-intensity' ||
      eventTypeClass === 'mass' ||
      eventTypeClass === 'mol' ||
      eventTypeClass === 'power' ||
      eventTypeClass === 'pressure' ||
      eventTypeClass === 'speed' ||
      eventTypeClass === 'temperature' ||
      eventTypeClass === 'volume'
    );
};
try {
  Object.defineProperty(window.PryvBrowser, 'numericalWeight', {
    set: function (value) {
      value = +value;
      if (_.isFinite(value)) {
        this.customConfig = true;
        DEFAULT_WEIGHT = value;
        if (_.isFunction(this.refresh)) {
          this.refresh();
        }
      }
    },
    get: function () {
      return DEFAULT_WEIGHT;
    }
  });
} catch (err) {
  console.warn('cannot define window.PryvBrowser');
}


})()
},{"../../view/events-views/numericals/Model.js":110,"../EventsNode":109,"underscore":9}],94:[function(require,module,exports){
(function(){/*global window */
var EventsNode = require('../EventsNode'),
  EventsView = require('../../view/events-views/pictures/Model.js'),
  _ = require('underscore'),
  DEFAULT_WEIGHT = 1;

/**
 * Holder for EventsNode
 * @type {*}
 */
var PicturesEventsNode = module.exports = EventsNode.implement(
  function (parentStreamNode) {
    EventsNode.call(this, parentStreamNode);
  },
  {
    className: 'PicturesEventsNode EventsNode',
    pluginView: EventsView,

    getWeight: function () {
      return DEFAULT_WEIGHT;
    }

  });

// we accept all kind of events
PicturesEventsNode.acceptThisEventType = function (eventType) {
  return (eventType === 'picture/attached');
};
try {
  Object.defineProperty(window.PryvBrowser, 'pictureWeight', {
    set: function (value) {
      value = +value;
      if (_.isFinite(value)) {
        this.customConfig = true;
        DEFAULT_WEIGHT = value;
        if (_.isFunction(this.refresh)) {
          this.refresh();
        }
      }
    },
    get: function () {
      return DEFAULT_WEIGHT;
    }
  });
} catch (err) {
  console.warn('cannot define window.PryvBrowser');
}


})()
},{"../../view/events-views/pictures/Model.js":111,"../EventsNode":109,"underscore":9}],93:[function(require,module,exports){
(function(){/* global window */
var EventsNode = require('../EventsNode'),
  EventsView = require('../../view/events-views/positions/Model.js'),
  _ = require('underscore'),
  DEFAULT_WEIGHT = 1;

/**
 * Holder for EventsNode
 * @type {*}
 */
var PositionsEventsNode = module.exports = EventsNode.implement(
  function (parentStreamNode) {
    EventsNode.call(this, parentStreamNode);
  },
  {
    className: 'PositionsEventsNode EventsNode',
    pluginView: EventsView,
    getWeight: function () {
      return DEFAULT_WEIGHT;
    }

  });

// we accept all kind of events
PositionsEventsNode.acceptThisEventType = function (eventType) {
  return (eventType === 'position/wgs84');
};
try {
  Object.defineProperty(window.PryvBrowser, 'positionWeight', {
    set: function (value) {
      value = +value;
      if (_.isFinite(value)) {
        this.customConfig = true;
        DEFAULT_WEIGHT = value;
        if (_.isFunction(this.refresh)) {
          this.refresh();
        }
      }
    },
    get: function () {
      return DEFAULT_WEIGHT;
    }
  });
} catch (err) {
  console.warn('cannot define window.PryvBrowser');
}


})()
},{"../../view/events-views/positions/Model.js":112,"../EventsNode":109,"underscore":9}],98:[function(require,module,exports){
(function(){/* global window */
var EventsNode = require('../EventsNode'),
  EventsView = require('../../view/events-views/tweet/Model.js'),
  _ = require('underscore'),
  DEFAULT_WEIGHT = 1;

/**
 * Holder for TweetsNode
 * @type {*}
 */
var TweetsEventsNode = module.exports = EventsNode.implement(
  function (parentStreamNode) {
    EventsNode.call(this, parentStreamNode);
  },
  {
    className: 'TweetsEventsNode EventsNode',
    pluginView: EventsView,
    getWeight: function () {
      return DEFAULT_WEIGHT;
    }

  });

// we accept all kind of events
TweetsEventsNode.acceptThisEventType = function (eventType) {
  return (eventType === 'message/twitter');
};
try {
  Object.defineProperty(window.PryvBrowser, 'tweetWeight', {
    set: function (value) {
      value = +value;
      if (_.isFinite(value)) {
        this.customConfig = true;
        DEFAULT_WEIGHT = value;
        if (_.isFunction(this.refresh)) {
          this.refresh();
        }
      }
    },
    get: function () {
      return DEFAULT_WEIGHT;
    }
  });
} catch (err) {
  console.warn('cannot define window.PryvBrowser');
}


})()
},{"../../view/events-views/tweet/Model.js":113,"../EventsNode":109,"underscore":9}],95:[function(require,module,exports){
(function(){/* global window */
var EventsNode = require('../EventsNode'),
  EventsView = require('../../view/events-views/notes/Model.js'),
  _ = require('underscore'),
  DEFAULT_WEIGHT = 1;

/**
 * Holder for EventsNode
 * @type {*}
 */
var NotesEventsNode = module.exports = EventsNode.implement(
  function (parentStreamNode) {
    EventsNode.call(this, parentStreamNode);
  },
  {
    className: 'NotesEventsNode EventsNode',
    pluginView: EventsView,
    getWeight: function () {
      return DEFAULT_WEIGHT;
    }

  });

// we accept all kind of events
NotesEventsNode.acceptThisEventType = function (eventType) {
  return (eventType === 'note/txt' || eventType === 'note/text');
};
try {
  Object.defineProperty(window.PryvBrowser, 'noteWeight', {
    set: function (value) {
      value = +value;
      if (_.isFinite(value)) {
        this.customConfig = true;
        DEFAULT_WEIGHT = value;
        if (_.isFunction(this.refresh)) {
          this.refresh();
        }
      }
    },
    get: function () {
      return DEFAULT_WEIGHT;
    }
  });
} catch (err) {
  console.warn('cannot define window.PryvBrowser');
}


})()
},{"../../view/events-views/notes/Model.js":114,"../EventsNode":109,"underscore":9}],115:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],107:[function(require,module,exports){
(function(process){// vim:ts=4:sts=4:sw=4:
/*!
 *
 * Copyright 2009-2012 Kris Kowal under the terms of the MIT
 * license found at http://github.com/kriskowal/q/raw/master/LICENSE
 *
 * With parts by Tyler Close
 * Copyright 2007-2009 Tyler Close under the terms of the MIT X license found
 * at http://www.opensource.org/licenses/mit-license.html
 * Forked at ref_send.js version: 2009-05-11
 *
 * With parts by Mark Miller
 * Copyright (C) 2011 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

(function (definition) {
    // Turn off strict mode for this function so we can assign to global.Q
    /* jshint strict: false */

    // This file will function properly as a <script> tag, or a module
    // using CommonJS and NodeJS or RequireJS module formats.  In
    // Common/Node/RequireJS, the module exports the Q API and when
    // executed as a simple <script>, it creates a Q global instead.

    // Montage Require
    if (typeof bootstrap === "function") {
        bootstrap("promise", definition);

    // CommonJS
    } else if (typeof exports === "object") {
        module.exports = definition();

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
        define(definition);

    // SES (Secure EcmaScript)
    } else if (typeof ses !== "undefined") {
        if (!ses.ok()) {
            return;
        } else {
            ses.makeQ = definition;
        }

    // <script>
    } else {
        Q = definition();
    }

})(function () {
"use strict";

var hasStacks = false;
try {
    throw new Error();
} catch (e) {
    hasStacks = !!e.stack;
}

// All code after this point will be filtered from stack traces reported
// by Q.
var qStartingLine = captureLine();
var qFileName;

// shims

// used for fallback in "allResolved"
var noop = function () {};

// Use the fastest possible means to execute a task in a future turn
// of the event loop.
var nextTick =(function () {
    // linked list of tasks (single, with head node)
    var head = {task: void 0, next: null};
    var tail = head;
    var flushing = false;
    var requestTick = void 0;
    var isNodeJS = false;

    function flush() {
        while (head.next) {
            head = head.next;
            var task = head.task;
            head.task = void 0;
            var domain = head.domain;

            if (domain) {
                head.domain = void 0;
                domain.enter();
            }

            try {
                task();

            } catch (e) {
                if (isNodeJS) {
                    // In node, uncaught exceptions are considered fatal errors.
                    // Re-throw them synchronously to interrupt flushing!

                    // Ensure continuation if the uncaught exception is suppressed
                    // listening "uncaughtException" events (as domains does).
                    // Continue in next event to avoid tick recursion.
                    domain && domain.exit();
                    setTimeout(flush, 0);
                    domain && domain.enter();

                    throw e;

                } else {
                    // In browsers, uncaught exceptions are not fatal.
                    // Re-throw them asynchronously to avoid slow-downs.
                    setTimeout(function() {
                       throw e;
                    }, 0);
                }
            }

            if (domain) {
                domain.exit();
            }
        }

        flushing = false;
    }

    nextTick = function (task) {
        tail = tail.next = {
            task: task,
            domain: isNodeJS && process.domain,
            next: null
        };

        if (!flushing) {
            flushing = true;
            requestTick();
        }
    };

    if (typeof process !== "undefined" && process.nextTick) {
        // Node.js before 0.9. Note that some fake-Node environments, like the
        // Mocha test runner, introduce a `process` global without a `nextTick`.
        isNodeJS = true;

        requestTick = function () {
            process.nextTick(flush);
        };

    } else if (typeof setImmediate === "function") {
        // In IE10, Node.js 0.9+, or https://github.com/NobleJS/setImmediate
        if (typeof window !== "undefined") {
            requestTick = setImmediate.bind(window, flush);
        } else {
            requestTick = function () {
                setImmediate(flush);
            };
        }

    } else if (typeof MessageChannel !== "undefined") {
        // modern browsers
        // http://www.nonblocking.io/2011/06/windownexttick.html
        var channel = new MessageChannel();
        channel.port1.onmessage = flush;
        requestTick = function () {
            channel.port2.postMessage(0);
        };

    } else {
        // old browsers
        requestTick = function () {
            setTimeout(flush, 0);
        };
    }

    return nextTick;
})();

// Attempt to make generics safe in the face of downstream
// modifications.
// There is no situation where this is necessary.
// If you need a security guarantee, these primordials need to be
// deeply frozen anyway, and if you don’t need a security guarantee,
// this is just plain paranoid.
// However, this does have the nice side-effect of reducing the size
// of the code by reducing x.call() to merely x(), eliminating many
// hard-to-minify characters.
// See Mark Miller’s explanation of what this does.
// http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
function uncurryThis(f) {
    var call = Function.call;
    return function () {
        return call.apply(f, arguments);
    };
}
// This is equivalent, but slower:
// uncurryThis = Function_bind.bind(Function_bind.call);
// http://jsperf.com/uncurrythis

var array_slice = uncurryThis(Array.prototype.slice);

var array_reduce = uncurryThis(
    Array.prototype.reduce || function (callback, basis) {
        var index = 0,
            length = this.length;
        // concerning the initial value, if one is not provided
        if (arguments.length === 1) {
            // seek to the first value in the array, accounting
            // for the possibility that is is a sparse array
            do {
                if (index in this) {
                    basis = this[index++];
                    break;
                }
                if (++index >= length) {
                    throw new TypeError();
                }
            } while (1);
        }
        // reduce
        for (; index < length; index++) {
            // account for the possibility that the array is sparse
            if (index in this) {
                basis = callback(basis, this[index], index);
            }
        }
        return basis;
    }
);

var array_indexOf = uncurryThis(
    Array.prototype.indexOf || function (value) {
        // not a very good shim, but good enough for our one use of it
        for (var i = 0; i < this.length; i++) {
            if (this[i] === value) {
                return i;
            }
        }
        return -1;
    }
);

var array_map = uncurryThis(
    Array.prototype.map || function (callback, thisp) {
        var self = this;
        var collect = [];
        array_reduce(self, function (undefined, value, index) {
            collect.push(callback.call(thisp, value, index, self));
        }, void 0);
        return collect;
    }
);

var object_create = Object.create || function (prototype) {
    function Type() { }
    Type.prototype = prototype;
    return new Type();
};

var object_hasOwnProperty = uncurryThis(Object.prototype.hasOwnProperty);

var object_keys = Object.keys || function (object) {
    var keys = [];
    for (var key in object) {
        if (object_hasOwnProperty(object, key)) {
            keys.push(key);
        }
    }
    return keys;
};

var object_toString = uncurryThis(Object.prototype.toString);

function isObject(value) {
    return value === Object(value);
}

// generator related shims

// FIXME: Remove this function once ES6 generators are in SpiderMonkey.
function isStopIteration(exception) {
    return (
        object_toString(exception) === "[object StopIteration]" ||
        exception instanceof QReturnValue
    );
}

// FIXME: Remove this helper and Q.return once ES6 generators are in
// SpiderMonkey.
var QReturnValue;
if (typeof ReturnValue !== "undefined") {
    QReturnValue = ReturnValue;
} else {
    QReturnValue = function (value) {
        this.value = value;
    };
}

// Until V8 3.19 / Chromium 29 is released, SpiderMonkey is the only
// engine that has a deployed base of browsers that support generators.
// However, SM's generators use the Python-inspired semantics of
// outdated ES6 drafts.  We would like to support ES6, but we'd also
// like to make it possible to use generators in deployed browsers, so
// we also support Python-style generators.  At some point we can remove
// this block.
var hasES6Generators;
try {
    /* jshint evil: true, nonew: false */
    new Function("(function* (){ yield 1; })");
    hasES6Generators = true;
} catch (e) {
    hasES6Generators = false;
}

// long stack traces

var STACK_JUMP_SEPARATOR = "From previous event:";

function makeStackTraceLong(error, promise) {
    // If possible, transform the error stack trace by removing Node and Q
    // cruft, then concatenating with the stack trace of `promise`. See #57.
    if (hasStacks &&
        promise.stack &&
        typeof error === "object" &&
        error !== null &&
        error.stack &&
        error.stack.indexOf(STACK_JUMP_SEPARATOR) === -1
    ) {
        var stacks = [];
        for (var p = promise; !!p; p = p.source) {
            if (p.stack) {
                stacks.unshift(p.stack);
            }
        }
        stacks.unshift(error.stack);

        var concatedStacks = stacks.join("\n" + STACK_JUMP_SEPARATOR + "\n");
        error.stack = filterStackString(concatedStacks);
    }
}

function filterStackString(stackString) {
    var lines = stackString.split("\n");
    var desiredLines = [];
    for (var i = 0; i < lines.length; ++i) {
        var line = lines[i];

        if (!isInternalFrame(line) && !isNodeFrame(line) && line) {
            desiredLines.push(line);
        }
    }
    return desiredLines.join("\n");
}

function isNodeFrame(stackLine) {
    return stackLine.indexOf("(module.js:") !== -1 ||
           stackLine.indexOf("(node.js:") !== -1;
}

function getFileNameAndLineNumber(stackLine) {
    // Named functions: "at functionName (filename:lineNumber:columnNumber)"
    // In IE10 function name can have spaces ("Anonymous function") O_o
    var attempt1 = /at .+ \((.+):(\d+):(?:\d+)\)$/.exec(stackLine);
    if (attempt1) {
        return [attempt1[1], Number(attempt1[2])];
    }

    // Anonymous functions: "at filename:lineNumber:columnNumber"
    var attempt2 = /at ([^ ]+):(\d+):(?:\d+)$/.exec(stackLine);
    if (attempt2) {
        return [attempt2[1], Number(attempt2[2])];
    }

    // Firefox style: "function@filename:lineNumber or @filename:lineNumber"
    var attempt3 = /.*@(.+):(\d+)$/.exec(stackLine);
    if (attempt3) {
        return [attempt3[1], Number(attempt3[2])];
    }
}

function isInternalFrame(stackLine) {
    var fileNameAndLineNumber = getFileNameAndLineNumber(stackLine);

    if (!fileNameAndLineNumber) {
        return false;
    }

    var fileName = fileNameAndLineNumber[0];
    var lineNumber = fileNameAndLineNumber[1];

    return fileName === qFileName &&
        lineNumber >= qStartingLine &&
        lineNumber <= qEndingLine;
}

// discover own file name and line number range for filtering stack
// traces
function captureLine() {
    if (!hasStacks) {
        return;
    }

    try {
        throw new Error();
    } catch (e) {
        var lines = e.stack.split("\n");
        var firstLine = lines[0].indexOf("@") > 0 ? lines[1] : lines[2];
        var fileNameAndLineNumber = getFileNameAndLineNumber(firstLine);
        if (!fileNameAndLineNumber) {
            return;
        }

        qFileName = fileNameAndLineNumber[0];
        return fileNameAndLineNumber[1];
    }
}

function deprecate(callback, name, alternative) {
    return function () {
        if (typeof console !== "undefined" &&
            typeof console.warn === "function") {
            console.warn(name + " is deprecated, use " + alternative +
                         " instead.", new Error("").stack);
        }
        return callback.apply(callback, arguments);
    };
}

// end of shims
// beginning of real work

/**
 * Creates fulfilled promises from non-thenables,
 * Passes Q promises through,
 * Coerces other thenables to Q promises.
 */
function Q(value) {
    return resolve(value);
}

/**
 * Performs a task in a future turn of the event loop.
 * @param {Function} task
 */
Q.nextTick = nextTick;

/**
 * Controls whether or not long stack traces will be on
 */
Q.longStackSupport = false;

/**
 * Constructs a {promise, resolve, reject} object.
 *
 * `resolve` is a callback to invoke with a more resolved value for the
 * promise. To fulfill the promise, invoke `resolve` with any value that is
 * not a thenable. To reject the promise, invoke `resolve` with a rejected
 * thenable, or invoke `reject` with the reason directly. To resolve the
 * promise to another thenable, thus putting it in the same state, invoke
 * `resolve` with that other thenable.
 */
Q.defer = defer;
function defer() {
    // if "messages" is an "Array", that indicates that the promise has not yet
    // been resolved.  If it is "undefined", it has been resolved.  Each
    // element of the messages array is itself an array of complete arguments to
    // forward to the resolved promise.  We coerce the resolution value to a
    // promise using the `resolve` function because it handles both fully
    // non-thenable values and other thenables gracefully.
    var messages = [], progressListeners = [], resolvedPromise;

    var deferred = object_create(defer.prototype);
    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, operands) {
        var args = array_slice(arguments);
        if (messages) {
            messages.push(args);
            if (op === "when" && operands[1]) { // progress operand
                progressListeners.push(operands[1]);
            }
        } else {
            nextTick(function () {
                resolvedPromise.promiseDispatch.apply(resolvedPromise, args);
            });
        }
    };

    // XXX deprecated
    promise.valueOf = deprecate(function () {
        if (messages) {
            return promise;
        }
        var nearerValue = nearer(resolvedPromise);
        if (isPromise(nearerValue)) {
            resolvedPromise = nearerValue; // shorten chain
        }
        return nearerValue;
    }, "valueOf", "inspect");

    promise.inspect = function () {
        if (!resolvedPromise) {
            return { state: "pending" };
        }
        return resolvedPromise.inspect();
    };

    if (Q.longStackSupport && hasStacks) {
        try {
            throw new Error();
        } catch (e) {
            // NOTE: don't try to use `Error.captureStackTrace` or transfer the
            // accessor around; that causes memory leaks as per GH-111. Just
            // reify the stack trace as a string ASAP.
            //
            // At the same time, cut off the first line; it's always just
            // "[object Promise]\n", as per the `toString`.
            promise.stack = e.stack.substring(e.stack.indexOf("\n") + 1);
        }
    }

    // NOTE: we do the checks for `resolvedPromise` in each method, instead of
    // consolidating them into `become`, since otherwise we'd create new
    // promises with the lines `become(whatever(value))`. See e.g. GH-252.

    function become(newPromise) {
        resolvedPromise = newPromise;
        promise.source = newPromise;

        array_reduce(messages, function (undefined, message) {
            nextTick(function () {
                newPromise.promiseDispatch.apply(newPromise, message);
            });
        }, void 0);

        messages = void 0;
        progressListeners = void 0;
    }

    deferred.promise = promise;
    deferred.resolve = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(resolve(value));
    };

    deferred.fulfill = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(fulfill(value));
    };
    deferred.reject = function (reason) {
        if (resolvedPromise) {
            return;
        }

        become(reject(reason));
    };
    deferred.notify = function (progress) {
        if (resolvedPromise) {
            return;
        }

        array_reduce(progressListeners, function (undefined, progressListener) {
            nextTick(function () {
                progressListener(progress);
            });
        }, void 0);
    };

    return deferred;
}

/**
 * Creates a Node-style callback that will resolve or reject the deferred
 * promise.
 * @returns a nodeback
 */
defer.prototype.makeNodeResolver = function () {
    var self = this;
    return function (error, value) {
        if (error) {
            self.reject(error);
        } else if (arguments.length > 2) {
            self.resolve(array_slice(arguments, 1));
        } else {
            self.resolve(value);
        }
    };
};

/**
 * @param resolver {Function} a function that returns nothing and accepts
 * the resolve, reject, and notify functions for a deferred.
 * @returns a promise that may be resolved with the given resolve and reject
 * functions, or rejected by a thrown exception in resolver
 */
Q.promise = promise;
function promise(resolver) {
    if (typeof resolver !== "function") {
        throw new TypeError("resolver must be a function.");
    }

    var deferred = defer();
    fcall(
        resolver,
        deferred.resolve,
        deferred.reject,
        deferred.notify
    ).fail(deferred.reject);
    return deferred.promise;
}

/**
 * Constructs a Promise with a promise descriptor object and optional fallback
 * function.  The descriptor contains methods like when(rejected), get(name),
 * set(name, value), post(name, args), and delete(name), which all
 * return either a value, a promise for a value, or a rejection.  The fallback
 * accepts the operation name, a resolver, and any further arguments that would
 * have been forwarded to the appropriate method above had a method been
 * provided with the proper name.  The API makes no guarantees about the nature
 * of the returned object, apart from that it is usable whereever promises are
 * bought and sold.
 */
Q.makePromise = Promise;
function Promise(descriptor, fallback, inspect) {
    if (fallback === void 0) {
        fallback = function (op) {
            return reject(new Error(
                "Promise does not support operation: " + op
            ));
        };
    }
    if (inspect === void 0) {
        inspect = function () {
            return {state: "unknown"};
        };
    }

    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, args) {
        var result;
        try {
            if (descriptor[op]) {
                result = descriptor[op].apply(promise, args);
            } else {
                result = fallback.call(promise, op, args);
            }
        } catch (exception) {
            result = reject(exception);
        }
        if (resolve) {
            resolve(result);
        }
    };

    promise.inspect = inspect;

    // XXX deprecated `valueOf` and `exception` support
    if (inspect) {
        var inspected = inspect();
        if (inspected.state === "rejected") {
            promise.exception = inspected.reason;
        }

        promise.valueOf = deprecate(function () {
            var inspected = inspect();
            if (inspected.state === "pending" ||
                inspected.state === "rejected") {
                return promise;
            }
            return inspected.value;
        });
    }

    return promise;
}

Promise.prototype.then = function (fulfilled, rejected, progressed) {
    var self = this;
    var deferred = defer();
    var done = false;   // ensure the untrusted promise makes at most a
                        // single call to one of the callbacks

    function _fulfilled(value) {
        try {
            return typeof fulfilled === "function" ? fulfilled(value) : value;
        } catch (exception) {
            return reject(exception);
        }
    }

    function _rejected(exception) {
        if (typeof rejected === "function") {
            makeStackTraceLong(exception, self);
            try {
                return rejected(exception);
            } catch (newException) {
                return reject(newException);
            }
        }
        return reject(exception);
    }

    function _progressed(value) {
        return typeof progressed === "function" ? progressed(value) : value;
    }

    nextTick(function () {
        self.promiseDispatch(function (value) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_fulfilled(value));
        }, "when", [function (exception) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_rejected(exception));
        }]);
    });

    // Progress propagator need to be attached in the current tick.
    self.promiseDispatch(void 0, "when", [void 0, function (value) {
        var newValue;
        var threw = false;
        try {
            newValue = _progressed(value);
        } catch (e) {
            threw = true;
            if (Q.onerror) {
                Q.onerror(e);
            } else {
                throw e;
            }
        }

        if (!threw) {
            deferred.notify(newValue);
        }
    }]);

    return deferred.promise;
};

Promise.prototype.thenResolve = function (value) {
    return when(this, function () { return value; });
};

Promise.prototype.thenReject = function (reason) {
    return when(this, function () { throw reason; });
};

// Chainable methods
array_reduce(
    [
        "isFulfilled", "isRejected", "isPending",
        "dispatch",
        "when", "spread",
        "get", "set", "del", "delete",
        "post", "send", "mapply", "invoke", "mcall",
        "keys",
        "fapply", "fcall", "fbind",
        "all", "allResolved",
        "timeout", "delay",
        "catch", "finally", "fail", "fin", "progress", "done",
        "nfcall", "nfapply", "nfbind", "denodeify", "nbind",
        "npost", "nsend", "nmapply", "ninvoke", "nmcall",
        "nodeify"
    ],
    function (undefined, name) {
        Promise.prototype[name] = function () {
            return Q[name].apply(
                Q,
                [this].concat(array_slice(arguments))
            );
        };
    },
    void 0
);

Promise.prototype.toSource = function () {
    return this.toString();
};

Promise.prototype.toString = function () {
    return "[object Promise]";
};

/**
 * If an object is not a promise, it is as "near" as possible.
 * If a promise is rejected, it is as "near" as possible too.
 * If it’s a fulfilled promise, the fulfillment value is nearer.
 * If it’s a deferred promise and the deferred has been resolved, the
 * resolution is "nearer".
 * @param object
 * @returns most resolved (nearest) form of the object
 */

// XXX should we re-do this?
Q.nearer = nearer;
function nearer(value) {
    if (isPromise(value)) {
        var inspected = value.inspect();
        if (inspected.state === "fulfilled") {
            return inspected.value;
        }
    }
    return value;
}

/**
 * @returns whether the given object is a promise.
 * Otherwise it is a fulfilled value.
 */
Q.isPromise = isPromise;
function isPromise(object) {
    return isObject(object) &&
        typeof object.promiseDispatch === "function" &&
        typeof object.inspect === "function";
}

Q.isPromiseAlike = isPromiseAlike;
function isPromiseAlike(object) {
    return isObject(object) && typeof object.then === "function";
}

/**
 * @returns whether the given object is a pending promise, meaning not
 * fulfilled or rejected.
 */
Q.isPending = isPending;
function isPending(object) {
    return isPromise(object) && object.inspect().state === "pending";
}

/**
 * @returns whether the given object is a value or fulfilled
 * promise.
 */
Q.isFulfilled = isFulfilled;
function isFulfilled(object) {
    return !isPromise(object) || object.inspect().state === "fulfilled";
}

/**
 * @returns whether the given object is a rejected promise.
 */
Q.isRejected = isRejected;
function isRejected(object) {
    return isPromise(object) && object.inspect().state === "rejected";
}

//// BEGIN UNHANDLED REJECTION TRACKING

// This promise library consumes exceptions thrown in handlers so they can be
// handled by a subsequent promise.  The exceptions get added to this array when
// they are created, and removed when they are handled.  Note that in ES6 or
// shimmed environments, this would naturally be a `Set`.
var unhandledReasons = [];
var unhandledRejections = [];
var unhandledReasonsDisplayed = false;
var trackUnhandledRejections = true;
function displayUnhandledReasons() {
    if (
        !unhandledReasonsDisplayed &&
        typeof window !== "undefined" &&
        !window.Touch &&
        window.console
    ) {
        console.warn("[Q] Unhandled rejection reasons (should be empty):",
                     unhandledReasons);
    }

    unhandledReasonsDisplayed = true;
}

function logUnhandledReasons() {
    for (var i = 0; i < unhandledReasons.length; i++) {
        var reason = unhandledReasons[i];
        if (reason && typeof reason.stack !== "undefined") {
            console.warn("Unhandled rejection reason:", reason.stack);
        } else {
            console.warn("Unhandled rejection reason (no stack):", reason);
        }
    }
}

function resetUnhandledRejections() {
    unhandledReasons.length = 0;
    unhandledRejections.length = 0;
    unhandledReasonsDisplayed = false;

    if (!trackUnhandledRejections) {
        trackUnhandledRejections = true;

        // Show unhandled rejection reasons if Node exits without handling an
        // outstanding rejection.  (Note that Browserify presently produces a
        // `process` global without the `EventEmitter` `on` method.)
        if (typeof process !== "undefined" && process.on) {
            process.on("exit", logUnhandledReasons);
        }
    }
}

function trackRejection(promise, reason) {
    if (!trackUnhandledRejections) {
        return;
    }

    unhandledRejections.push(promise);
    unhandledReasons.push(reason);
    displayUnhandledReasons();
}

function untrackRejection(promise) {
    if (!trackUnhandledRejections) {
        return;
    }

    var at = array_indexOf(unhandledRejections, promise);
    if (at !== -1) {
        unhandledRejections.splice(at, 1);
        unhandledReasons.splice(at, 1);
    }
}

Q.resetUnhandledRejections = resetUnhandledRejections;

Q.getUnhandledReasons = function () {
    // Make a copy so that consumers can't interfere with our internal state.
    return unhandledReasons.slice();
};

Q.stopUnhandledRejectionTracking = function () {
    resetUnhandledRejections();
    if (typeof process !== "undefined" && process.on) {
        process.removeListener("exit", logUnhandledReasons);
    }
    trackUnhandledRejections = false;
};

resetUnhandledRejections();

//// END UNHANDLED REJECTION TRACKING

/**
 * Constructs a rejected promise.
 * @param reason value describing the failure
 */
Q.reject = reject;
function reject(reason) {
    var rejection = Promise({
        "when": function (rejected) {
            // note that the error has been handled
            if (rejected) {
                untrackRejection(this);
            }
            return rejected ? rejected(reason) : this;
        }
    }, function fallback() {
        return this;
    }, function inspect() {
        return { state: "rejected", reason: reason };
    });

    // Note that the reason has not been handled.
    trackRejection(rejection, reason);

    return rejection;
}

/**
 * Constructs a fulfilled promise for an immediate reference.
 * @param value immediate reference
 */
Q.fulfill = fulfill;
function fulfill(value) {
    return Promise({
        "when": function () {
            return value;
        },
        "get": function (name) {
            return value[name];
        },
        "set": function (name, rhs) {
            value[name] = rhs;
        },
        "delete": function (name) {
            delete value[name];
        },
        "post": function (name, args) {
            // Mark Miller proposes that post with no name should apply a
            // promised function.
            if (name === null || name === void 0) {
                return value.apply(void 0, args);
            } else {
                return value[name].apply(value, args);
            }
        },
        "apply": function (thisP, args) {
            return value.apply(thisP, args);
        },
        "keys": function () {
            return object_keys(value);
        }
    }, void 0, function inspect() {
        return { state: "fulfilled", value: value };
    });
}

/**
 * Constructs a promise for an immediate reference, passes promises through, or
 * coerces promises from different systems.
 * @param value immediate reference or promise
 */
Q.resolve = resolve;
function resolve(value) {
    // If the object is already a Promise, return it directly.  This enables
    // the resolve function to both be used to created references from objects,
    // but to tolerably coerce non-promises to promises.
    if (isPromise(value)) {
        return value;
    }

    // assimilate thenables
    if (isPromiseAlike(value)) {
        return coerce(value);
    } else {
        return fulfill(value);
    }
}

/**
 * Converts thenables to Q promises.
 * @param promise thenable promise
 * @returns a Q promise
 */
function coerce(promise) {
    var deferred = defer();
    nextTick(function () {
        try {
            promise.then(deferred.resolve, deferred.reject, deferred.notify);
        } catch (exception) {
            deferred.reject(exception);
        }
    });
    return deferred.promise;
}

/**
 * Annotates an object such that it will never be
 * transferred away from this process over any promise
 * communication channel.
 * @param object
 * @returns promise a wrapping of that object that
 * additionally responds to the "isDef" message
 * without a rejection.
 */
Q.master = master;
function master(object) {
    return Promise({
        "isDef": function () {}
    }, function fallback(op, args) {
        return dispatch(object, op, args);
    }, function () {
        return resolve(object).inspect();
    });
}

/**
 * Registers an observer on a promise.
 *
 * Guarantees:
 *
 * 1. that fulfilled and rejected will be called only once.
 * 2. that either the fulfilled callback or the rejected callback will be
 *    called, but not both.
 * 3. that fulfilled and rejected will not be called in this turn.
 *
 * @param value      promise or immediate reference to observe
 * @param fulfilled  function to be called with the fulfilled value
 * @param rejected   function to be called with the rejection exception
 * @param progressed function to be called on any progress notifications
 * @return promise for the return value from the invoked callback
 */
Q.when = when;
function when(value, fulfilled, rejected, progressed) {
    return Q(value).then(fulfilled, rejected, progressed);
}

/**
 * Spreads the values of a promised array of arguments into the
 * fulfillment callback.
 * @param fulfilled callback that receives variadic arguments from the
 * promised array
 * @param rejected callback that receives the exception if the promise
 * is rejected.
 * @returns a promise for the return value or thrown exception of
 * either callback.
 */
Q.spread = spread;
function spread(promise, fulfilled, rejected) {
    return when(promise, function (valuesOrPromises) {
        return all(valuesOrPromises).then(function (values) {
            return fulfilled.apply(void 0, values);
        }, rejected);
    }, rejected);
}

/**
 * The async function is a decorator for generator functions, turning
 * them into asynchronous generators.  Although generators are only part
 * of the newest ECMAScript 6 drafts, this code does not cause syntax
 * errors in older engines.  This code should continue to work and will
 * in fact improve over time as the language improves.
 *
 * ES6 generators are currently part of V8 version 3.19 with the
 * --harmony-generators runtime flag enabled.  SpiderMonkey has had them
 * for longer, but under an older Python-inspired form.  This function
 * works on both kinds of generators.
 *
 * Decorates a generator function such that:
 *  - it may yield promises
 *  - execution will continue when that promise is fulfilled
 *  - the value of the yield expression will be the fulfilled value
 *  - it returns a promise for the return value (when the generator
 *    stops iterating)
 *  - the decorated function returns a promise for the return value
 *    of the generator or the first rejected promise among those
 *    yielded.
 *  - if an error is thrown in the generator, it propagates through
 *    every following yield until it is caught, or until it escapes
 *    the generator function altogether, and is translated into a
 *    rejection for the promise returned by the decorated generator.
 */
Q.async = async;
function async(makeGenerator) {
    return function () {
        // when verb is "send", arg is a value
        // when verb is "throw", arg is an exception
        function continuer(verb, arg) {
            var result;
            if (hasES6Generators) {
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    return reject(exception);
                }
                if (result.done) {
                    return result.value;
                } else {
                    return when(result.value, callback, errback);
                }
            } else {
                // FIXME: Remove this case when SM does ES6 generators.
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    if (isStopIteration(exception)) {
                        return exception.value;
                    } else {
                        return reject(exception);
                    }
                }
                return when(result, callback, errback);
            }
        }
        var generator = makeGenerator.apply(this, arguments);
        var callback = continuer.bind(continuer, "send");
        var errback = continuer.bind(continuer, "throw");
        return callback();
    };
}

/**
 * The spawn function is a small wrapper around async that immediately
 * calls the generator and also ends the promise chain, so that any
 * unhandled errors are thrown instead of forwarded to the error
 * handler. This is useful because it's extremely common to run
 * generators at the top-level to work with libraries.
 */
Q.spawn = spawn;
function spawn(makeGenerator) {
    Q.done(Q.async(makeGenerator)());
}

// FIXME: Remove this interface once ES6 generators are in SpiderMonkey.
/**
 * Throws a ReturnValue exception to stop an asynchronous generator.
 *
 * This interface is a stop-gap measure to support generator return
 * values in older Firefox/SpiderMonkey.  In browsers that support ES6
 * generators like Chromium 29, just use "return" in your generator
 * functions.
 *
 * @param value the return value for the surrounding generator
 * @throws ReturnValue exception with the value.
 * @example
 * // ES6 style
 * Q.async(function* () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      return foo + bar;
 * })
 * // Older SpiderMonkey style
 * Q.async(function () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      Q.return(foo + bar);
 * })
 */
Q["return"] = _return;
function _return(value) {
    throw new QReturnValue(value);
}

/**
 * The promised function decorator ensures that any promise arguments
 * are settled and passed as values (`this` is also settled and passed
 * as a value).  It will also ensure that the result of a function is
 * always a promise.
 *
 * @example
 * var add = Q.promised(function (a, b) {
 *     return a + b;
 * });
 * add(Q.resolve(a), Q.resolve(B));
 *
 * @param {function} callback The function to decorate
 * @returns {function} a function that has been decorated.
 */
Q.promised = promised;
function promised(callback) {
    return function () {
        return spread([this, all(arguments)], function (self, args) {
            return callback.apply(self, args);
        });
    };
}

/**
 * sends a message to a value in a future turn
 * @param object* the recipient
 * @param op the name of the message operation, e.g., "when",
 * @param args further arguments to be forwarded to the operation
 * @returns result {Promise} a promise for the result of the operation
 */
Q.dispatch = dispatch;
function dispatch(object, op, args) {
    var deferred = defer();
    nextTick(function () {
        resolve(object).promiseDispatch(deferred.resolve, op, args);
    });
    return deferred.promise;
}

/**
 * Constructs a promise method that can be used to safely observe resolution of
 * a promise for an arbitrarily named method like "propfind" in a future turn.
 *
 * "dispatcher" constructs methods like "get(promise, name)" and "set(promise)".
 */
Q.dispatcher = dispatcher;
function dispatcher(op) {
    return function (object) {
        var args = array_slice(arguments, 1);
        return dispatch(object, op, args);
    };
}

/**
 * Gets the value of a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to get
 * @return promise for the property value
 */
Q.get = dispatcher("get");

/**
 * Sets the value of a property in a future turn.
 * @param object    promise or immediate reference for object object
 * @param name      name of property to set
 * @param value     new value of property
 * @return promise for the return value
 */
Q.set = dispatcher("set");

/**
 * Deletes a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to delete
 * @return promise for the return value
 */
Q["delete"] = // XXX experimental
Q.del = dispatcher("delete");

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param value     a value to post, typically an array of
 *                  invocation arguments for promises that
 *                  are ultimately backed with `resolve` values,
 *                  as opposed to those backed with URLs
 *                  wherein the posted value can be any
 *                  JSON serializable object.
 * @return promise for the return value
 */
// bound locally because it is used by other methods
var post = Q.post = dispatcher("post");
Q.mapply = post; // experimental

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param ...args   array of invocation arguments
 * @return promise for the return value
 */
Q.send = send;
Q.invoke = send; // synonyms
Q.mcall = send; // experimental
function send(value, name) {
    var args = array_slice(arguments, 2);
    return post(value, name, args);
}

/**
 * Applies the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param args      array of application arguments
 */
Q.fapply = fapply;
function fapply(value, args) {
    return dispatch(value, "apply", [void 0, args]);
}

/**
 * Calls the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q["try"] = fcall; // XXX experimental
Q.fcall = fcall;
function fcall(value) {
    var args = array_slice(arguments, 1);
    return fapply(value, args);
}

/**
 * Binds the promised function, transforming return values into a fulfilled
 * promise and thrown errors into a rejected one.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q.fbind = fbind;
function fbind(value) {
    var args = array_slice(arguments, 1);
    return function fbound() {
        var allArgs = args.concat(array_slice(arguments));
        return dispatch(value, "apply", [this, allArgs]);
    };
}

/**
 * Requests the names of the owned properties of a promised
 * object in a future turn.
 * @param object    promise or immediate reference for target object
 * @return promise for the keys of the eventually settled object
 */
Q.keys = dispatcher("keys");

/**
 * Turns an array of promises into a promise for an array.  If any of
 * the promises gets rejected, the whole array is rejected immediately.
 * @param {Array*} an array (or promise for an array) of values (or
 * promises for values)
 * @returns a promise for an array of the corresponding values
 */
// By Mark Miller
// http://wiki.ecmascript.org/doku.php?id=strawman:concurrency&rev=1308776521#allfulfilled
Q.all = all;
function all(promises) {
    return when(promises, function (promises) {
        var countDown = 0;
        var deferred = defer();
        array_reduce(promises, function (undefined, promise, index) {
            var snapshot;
            if (
                isPromise(promise) &&
                (snapshot = promise.inspect()).state === "fulfilled"
            ) {
                promises[index] = snapshot.value;
            } else {
                ++countDown;
                when(promise, function (value) {
                    promises[index] = value;
                    if (--countDown === 0) {
                        deferred.resolve(promises);
                    }
                }, deferred.reject);
            }
        }, void 0);
        if (countDown === 0) {
            deferred.resolve(promises);
        }
        return deferred.promise;
    });
}

/**
 * Waits for all promises to be settled, either fulfilled or
 * rejected.  This is distinct from `all` since that would stop
 * waiting at the first rejection.  The promise returned by
 * `allResolved` will never be rejected.
 * @param promises a promise for an array (or an array) of promises
 * (or values)
 * @return a promise for an array of promises
 */
Q.allResolved = deprecate(allResolved, "allResolved", "allSettled");
function allResolved(promises) {
    return when(promises, function (promises) {
        promises = array_map(promises, resolve);
        return when(all(array_map(promises, function (promise) {
            return when(promise, noop, noop);
        })), function () {
            return promises;
        });
    });
}

Q.allSettled = allSettled;
function allSettled(values) {
    return when(values, function (values) {
        return all(array_map(values, function (value, i) {
            return when(
                value,
                function (fulfillmentValue) {
                    values[i] = { state: "fulfilled", value: fulfillmentValue };
                    return values[i];
                },
                function (reason) {
                    values[i] = { state: "rejected", reason: reason };
                    return values[i];
                }
            );
        })).thenResolve(values);
    });
}

/**
 * Captures the failure of a promise, giving an oportunity to recover
 * with a callback.  If the given promise is fulfilled, the returned
 * promise is fulfilled.
 * @param {Any*} promise for something
 * @param {Function} callback to fulfill the returned promise if the
 * given promise is rejected
 * @returns a promise for the return value of the callback
 */
Q["catch"] = // XXX experimental
Q.fail = fail;
function fail(promise, rejected) {
    return when(promise, void 0, rejected);
}

/**
 * Attaches a listener that can respond to progress notifications from a
 * promise's originating deferred. This listener receives the exact arguments
 * passed to ``deferred.notify``.
 * @param {Any*} promise for something
 * @param {Function} callback to receive any progress notifications
 * @returns the given promise, unchanged
 */
Q.progress = progress;
function progress(promise, progressed) {
    return when(promise, void 0, void 0, progressed);
}

/**
 * Provides an opportunity to observe the settling of a promise,
 * regardless of whether the promise is fulfilled or rejected.  Forwards
 * the resolution to the returned promise when the callback is done.
 * The callback can return a promise to defer completion.
 * @param {Any*} promise
 * @param {Function} callback to observe the resolution of the given
 * promise, takes no arguments.
 * @returns a promise for the resolution of the given promise when
 * ``fin`` is done.
 */
Q["finally"] = // XXX experimental
Q.fin = fin;
function fin(promise, callback) {
    return when(promise, function (value) {
        return when(callback(), function () {
            return value;
        });
    }, function (exception) {
        return when(callback(), function () {
            return reject(exception);
        });
    });
}

/**
 * Terminates a chain of promises, forcing rejections to be
 * thrown as exceptions.
 * @param {Any*} promise at the end of a chain of promises
 * @returns nothing
 */
Q.done = done;
function done(promise, fulfilled, rejected, progress) {
    var onUnhandledError = function (error) {
        // forward to a future turn so that ``when``
        // does not catch it and turn it into a rejection.
        nextTick(function () {
            makeStackTraceLong(error, promise);

            if (Q.onerror) {
                Q.onerror(error);
            } else {
                throw error;
            }
        });
    };

    // Avoid unnecessary `nextTick`ing via an unnecessary `when`.
    var promiseToHandle = fulfilled || rejected || progress ?
        when(promise, fulfilled, rejected, progress) :
        promise;

    if (typeof process === "object" && process && process.domain) {
        onUnhandledError = process.domain.bind(onUnhandledError);
    }
    fail(promiseToHandle, onUnhandledError);
}

/**
 * Causes a promise to be rejected if it does not get fulfilled before
 * some milliseconds time out.
 * @param {Any*} promise
 * @param {Number} milliseconds timeout
 * @param {String} custom error message (optional)
 * @returns a promise for the resolution of the given promise if it is
 * fulfilled before the timeout, otherwise rejected.
 */
Q.timeout = timeout;
function timeout(promise, ms, msg) {
    var deferred = defer();
    var timeoutId = setTimeout(function () {
        deferred.reject(new Error(msg || "Timed out after " + ms + " ms"));
    }, ms);

    when(promise, function (value) {
        clearTimeout(timeoutId);
        deferred.resolve(value);
    }, function (exception) {
        clearTimeout(timeoutId);
        deferred.reject(exception);
    }, deferred.notify);

    return deferred.promise;
}

/**
 * Returns a promise for the given value (or promised value) after some
 * milliseconds.
 * @param {Any*} promise
 * @param {Number} milliseconds
 * @returns a promise for the resolution of the given promise after some
 * time has elapsed.
 */
Q.delay = delay;
function delay(promise, timeout) {
    if (timeout === void 0) {
        timeout = promise;
        promise = void 0;
    }

    var deferred = defer();

    when(promise, undefined, undefined, deferred.notify);
    setTimeout(function () {
        deferred.resolve(promise);
    }, timeout);

    return deferred.promise;
}

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided as an array, and returns a promise.
 *
 *      Q.nfapply(FS.readFile, [__filename])
 *      .then(function (content) {
 *      })
 *
 */
Q.nfapply = nfapply;
function nfapply(callback, args) {
    var nodeArgs = array_slice(args);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());

    fapply(callback, nodeArgs).fail(deferred.reject);
    return deferred.promise;
}

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided individually, and returns a promise.
 *
 *      Q.nfcall(FS.readFile, __filename)
 *      .then(function (content) {
 *      })
 *
 */
Q.nfcall = nfcall;
function nfcall(callback/*, ...args */) {
    var nodeArgs = array_slice(arguments, 1);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());

    fapply(callback, nodeArgs).fail(deferred.reject);
    return deferred.promise;
}

/**
 * Wraps a NodeJS continuation passing function and returns an equivalent
 * version that returns a promise.
 *
 *      Q.nfbind(FS.readFile, __filename)("utf-8")
 *      .then(console.log)
 *      .done()
 *
 */
Q.nfbind = nfbind;
Q.denodeify = Q.nfbind; // synonyms
function nfbind(callback/*, ...args */) {
    var baseArgs = array_slice(arguments, 1);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());

        fapply(callback, nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
}

Q.nbind = nbind;
function nbind(callback, thisArg /*, ... args*/) {
    var baseArgs = array_slice(arguments, 2);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());

        function bound() {
            return callback.apply(thisArg, arguments);
        }

        fapply(bound, nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
}

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback with a given array of arguments, plus a provided callback.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param {Array} args arguments to pass to the method; the callback
 * will be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.npost = npost;
Q.nmapply = npost; // synonyms
function npost(object, name, args) {
    var nodeArgs = array_slice(args || []);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());

    post(object, name, nodeArgs).fail(deferred.reject);
    return deferred.promise;
}

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback, forwarding the given variadic arguments, plus a provided
 * callback argument.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param ...args arguments to pass to the method; the callback will
 * be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nsend = nsend;
Q.ninvoke = Q.nsend; // synonyms
Q.nmcall = Q.nsend; // synonyms
function nsend(object, name /*, ...args*/) {
    var nodeArgs = array_slice(arguments, 2);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    post(object, name, nodeArgs).fail(deferred.reject);
    return deferred.promise;
}

Q.nodeify = nodeify;
function nodeify(promise, nodeback) {
    if (nodeback) {
        promise.then(function (value) {
            nextTick(function () {
                nodeback(null, value);
            });
        }, function (error) {
            nextTick(function () {
                nodeback(error);
            });
        });
    } else {
        return promise;
    }
}

// All code before this point will be filtered from stack traces.
var qEndingLine = captureLine();

return Q;

});

})(require("__browserify_process"))
},{"__browserify_process":115}],100:[function(require,module,exports){
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



},{"underscore":9}],109:[function(require,module,exports){
(function(){var TreeNode = require('./TreeNode'),
  RootNode = require('./RootNode'),
  Backbone = require('backbone'),
  NodeView = require('../view/NodeView.js'),
  _ = require('underscore');

/*
 If you want to bypass the plugin detection system (i.e not use EventsView.js)
 just remove EventsView = require... above and add to all the Events typed node:
 var EventsView = require( {path to the plugin view} );  as a global var
 pluginView: EventsView, as an instance var
 to create the view just do: new this.pluginView(params);
 */
/**
 * Holder for EventsNode
 * @type {*}
 */
var EventsNode = module.exports = TreeNode.implement(
  function (parentStreamNode) {
    TreeNode.call(this, parentStreamNode.treeMap, parentStreamNode);
    this.events = {};
    this.trashedEvents = {};
    this.eventDisplayed = null;
    this.eventView = null;
    this.model  = null;
    this.size = 0;
  },
  {
    className: 'EventsNode',
    aggregated: false,
    getChildren: function () {
      return null;
    },

    eventEnterScope: function (event, reason, callback) {
      this.size++;
      event.streamName =
        this.parent.connectionNode.connection.datastore.getStreamById(event.streamId).name;
      this.events[event.id] = event;
      if (!this.eventView) {
        this._createEventView();
      } else {
        this.eventView.eventEnter(event);
      }

      if (callback) {
        callback(null);
      }
    },
    eventLeaveScope: function (event, reason, callback) {
      if (this.events[event.id]) {
        this.size--;
        delete this.events[event.id];
        if (this.eventView) {
          this.eventView.eventLeave(event);
        }
      }
    },
    onDateHighLighted: function (time) {
      if (this.eventView) {
        this.eventView.OnDateHighlightedChange(time);
      }
    },
    /*jshint -W098 */
    eventChange: function (event, reason, callback) {
      this.events[event.id] = event;
      //console.log('eventChange', event);
      if (this.eventView) {
        this.eventView.eventChange(event);
      }

      if (callback) {
        callback(null);
      }
    },

    _refreshViewModel: function (recursive) {
      if (!this.model) {
        var BasicModel = Backbone.Model.extend({ });
        this.model = new BasicModel({
          containerId: this.parent.uniqueId,
          id: this.uniqueId,
          className: this.className,
          width: this.width,
          height: this.height,
          x: this.x,
          y: this.y,
          depth: this.depth,
          color: this.parent.stream.color,
          weight: this.getWeight(),
          content: this.events || this.stream || this.connection,
          eventView: this.eventView,
          streamId: this.parent.stream.id,
          streamName: this.parent.stream.name,
          connectionId: this.parent.connectionNode.id
        });
      } else {
        // TODO For now empty nodes (i.e streams) are not displayed
        // but we'll need to display them to create event, drag drop ...
        /*if (this.getWeight() === 0) {
         if (this.model) {
         this.model.set('width', 0);
         this.model.set('height', 0);
         }
         return;
         } */
        this.model.set('containerId', this.parent.uniqueId);
        this.model.set('id', this.uniqueId);
        this.model.set('name', this.className);
        this.model.set('width', this.width);
        this.model.set('height', this.height);
        this.model.set('x', this.x);
        this.model.set('y', this.y);
        this.model.set('depth', this.depth);
        this.model.set('weight', this.getWeight());
        this.model.set('streamId', this.parent.stream.id);
        this.model.set('connectionId', this.parent.connectionNode.id);
        if (this.eventView) {
          this.eventView.refresh({
            width: this.width,
            height: this.height
          });
        }
      }
      if (recursive && this.getChildren()) {
        _.each(this.getChildren(), function (child) {
          child._refreshViewModel(true);
        });
      }
    },

    _createEventView: function () {
      this.eventView = new this.pluginView(this.events, {
        width: this.width,
        height: this.height,
        id: this.uniqueId,
        treeMap: this.treeMap,
        stream: this.parent.stream
      }, this);
    },
    /**
     * Called on drag and drop
     * @param nodeId
     * @param streamId
     * @param connectionId
     */
    dragAndDrop: function (nodeId, streamId, connectionId) {

      if (!nodeId || !streamId || !connectionId) {
        return this;
      }

      var otherNode =  this.treeMap.getNodeById(nodeId, streamId, connectionId);
      var thisNode = this;

      if (thisNode.isVirtual() || otherNode.isVirtual()) {
        throw new Error('Creating virtual node out of virtual nodes currently not allowed.');
      }
      if (otherNode === thisNode) {
        throw new Error('Creating virtual node with the same node not allowed.');
      }

      this.treeMap.requestAggregationOfNodes(thisNode, otherNode);
    },
    isVirtual: function () {
      return (true && this.parent.stream.virtual);
    },
    getVirtual: function () {
      console.log('getVirtual', this.parent.stream.virtual);
      return this.parent.stream.virtual;
    },

    getSettings: function () {
      console.log('getSettings');
    }


  });


EventsNode.acceptThisEventType = function () {
  throw new Error('EventsNode.acceptThisEventType nust be overriden');
};





})()
},{"../view/NodeView.js":69,"./RootNode":19,"./TreeNode":38,"backbone":30,"underscore":9}],116:[function(require,module,exports){
(function(){/* global window, google, document */
/*jshint -W084 */
/*jshint -W089 */
/**
 * @name MarkerClusterer for Google Maps v3
 * @version version 1.0.1
 * @author Luke Mahe
 * @fileoverview
 * The library creates and manages per-zoom-level clusters for large amounts of
 * markers.
 * <br/>
 * This is a v3 implementation of the
 * <a href="http://gmaps-utility-library-dev.googlecode.com/svn/tags/markerclusterer/"
 * >v2 MarkerClusterer</a>.
 */

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


/**
 * A Marker Clusterer that clusters markers.
 *
 * @param {google.maps.Map} map The Google map to attach to.
 * @param {Array.<google.maps.Marker>=} opt_markers Optional markers to add to
 *   the cluster.
 * @param {Object=} opt_options support the following options:
 *     'gridSize': (number) The grid size of a cluster in pixels.
 *     'maxZoom': (number) The maximum zoom level that a marker can be part of a
 *                cluster.
 *     'zoomOnClick': (boolean) Whether the default behaviour of clicking on a
 *                    cluster is to zoom into it.
 *     'averageCenter': (boolean) Wether the center of each cluster should be
 *                      the average of all markers in the cluster.
 *     'minimumClusterSize': (number) The minimum number of markers to be in a
 *                           cluster before the markers are hidden and a count
 *                           is shown.
 *     'styles': (object) An object that has style properties:
 *       'url': (string) The image url.
 *       'height': (number) The image height.
 *       'width': (number) The image width.
 *       'anchor': (Array) The anchor position of the label text.
 *       'textColor': (string) The text color.
 *       'textSize': (number) The text size.
 *       'backgroundPosition': (string) The position of the backgound x, y.
 * @constructor
 * @extends google.maps.OverlayView
 */
var MarkerClusterer = module.exports = function (map, opt_markers, opt_options) {
  // MarkerClusterer implements google.maps.OverlayView interface. We use the
  // extend function to extend MarkerClusterer with google.maps.OverlayView
  // because it might not always be available when the code is defined so we
  // look for it at the last possible moment. If it doesn't exist now then
  // there is no point going ahead :)
  this.extend(MarkerClusterer, google.maps.OverlayView);
  this.map_ = map;

  /**
   * @type {Array.<google.maps.Marker>}
   * @private
   */
  this.markers_ = [];

  /**
   *  @type {Array.<Cluster>}
   */
  this.clusters_ = [];

  this.sizes = [53, 56, 66, 78, 90];

  /**
   * @private
   */
  this.styles_ = [];

  /**
   * @type {boolean}
   * @private
   */
  this.ready_ = false;

  var options = opt_options || {};

  /**
   * @type {number}
   * @private
   */
  this.gridSize_ = options.gridSize || 60;

  /**
   * @private
   */
  this.minClusterSize_ = options.minimumClusterSize || 2;


  /**
   * @type {?number}
   * @private
   */
  this.maxZoom_ = options.maxZoom || null;

  this.styles_ = options.styles || [];

  /**
   * @type {string}
   * @private
   */
  this.imagePath_ = options.imagePath ||
    this.MARKER_CLUSTER_IMAGE_PATH_;

  /**
   * @type {string}
   * @private
   */
  this.imageExtension_ = options.imageExtension ||
    this.MARKER_CLUSTER_IMAGE_EXTENSION_;

  /**
   * @type {boolean}
   * @private
   */
  this.zoomOnClick_ = true;

  if (options.zoomOnClick !== undefined) {
    this.zoomOnClick_ = options.zoomOnClick;
  }

  /**
   * @type {boolean}
   * @private
   */
  this.averageCenter_ = false;

  if (options.averageCenter !== undefined) {
    this.averageCenter_ = options.averageCenter;
  }

  this.setupStyles_();

  this.setMap(map);

  /**
   * @type {number}
   * @private
   */
  this.prevZoom_ = this.map_.getZoom();

  // Add the map event listeners
  var that = this;
  google.maps.event.addListener(this.map_, 'zoom_changed', function () {
    // Determines map type and prevent illegal zoom levels
    var zoom = that.map_.getZoom();
    var minZoom = that.map_.minZoom || 0;
    var maxZoom = Math.min(that.map_.maxZoom || 100,
      that.map_.mapTypes[that.map_.getMapTypeId()].maxZoom);
    zoom = Math.min(Math.max(zoom, minZoom), maxZoom);

    if (that.prevZoom_ !== zoom) {
      that.prevZoom_ = zoom;
      that.resetViewport();
    }
  });

  google.maps.event.addListener(this.map_, 'idle', function () {
    that.redraw();
  });

  // Finally, add the markers
  if (opt_markers && (opt_markers.length || Object.keys(opt_markers).length)) {
    this.addMarkers(opt_markers, false);
  }
};


/**
 * The marker cluster image path.
 *
 * @type {string}
 * @private
 */
MarkerClusterer.prototype.MARKER_CLUSTER_IMAGE_PATH_ =
  'https://google-maps-utility-library-v3.googlecode.com/svn/trunk/markerclusterer/' +
    'images/m';


/**
 * The marker cluster image path.
 *
 * @type {string}
 * @private
 */
MarkerClusterer.prototype.MARKER_CLUSTER_IMAGE_EXTENSION_ = 'png';


/**
 * Extends a objects prototype by anothers.
 *
 * @param {Object} obj1 The object to be extended.
 * @param {Object} obj2 The object to extend with.
 * @return {Object} The new extended object.
 * @ignore
 */
MarkerClusterer.prototype.extend = function (obj1, obj2) {
  return (function (object) {
    for (var property in object.prototype) {
      this.prototype[property] = object.prototype[property];
    }
    return this;
  }).apply(obj1, [obj2]);
};


/**
 * Implementaion of the interface method.
 * @ignore
 */
MarkerClusterer.prototype.onAdd = function () {
  this.setReady_(true);
};

/**
 * Implementaion of the interface method.
 * @ignore
 */
MarkerClusterer.prototype.draw = function () {};

/**
 * Sets up the styles object.
 *
 * @private
 */
MarkerClusterer.prototype.setupStyles_ = function () {
  if (this.styles_.length) {
    return;
  }

  for (var i = 0, size; size = this.sizes[i]; i++) {
    this.styles_.push({
      url: this.imagePath_ + (i + 1) + '.' + this.imageExtension_,
      height: size,
      width: size
    });
  }
};

/**
 *  Fit the map to the bounds of the markers in the clusterer.
 */
MarkerClusterer.prototype.fitMapToMarkers = function () {
  var markers = this.getMarkers();
  var bounds = new google.maps.LatLngBounds();
  for (var i = 0, marker; marker = markers[i]; i++) {
    bounds.extend(marker.getPosition());
  }

  this.map_.fitBounds(bounds);
};


/**
 *  Sets the styles.
 *
 *  @param {Object} styles The style to set.
 */
MarkerClusterer.prototype.setStyles = function (styles) {
  this.styles_ = styles;
};


/**
 *  Gets the styles.
 *
 *  @return {Object} The styles object.
 */
MarkerClusterer.prototype.getStyles = function () {
  return this.styles_;
};


/**
 * Whether zoom on click is set.
 *
 * @return {boolean} True if zoomOnClick_ is set.
 */
MarkerClusterer.prototype.isZoomOnClick = function () {
  return this.zoomOnClick_;
};

/**
 * Whether average center is set.
 *
 * @return {boolean} True if averageCenter_ is set.
 */
MarkerClusterer.prototype.isAverageCenter = function () {
  return this.averageCenter_;
};


/**
 *  Returns the array of markers in the clusterer.
 *
 *  @return {Array.<google.maps.Marker>} The markers.
 */
MarkerClusterer.prototype.getMarkers = function () {
  return this.markers_;
};


/**
 *  Returns the number of markers in the clusterer
 *
 *  @return {Number} The number of markers.
 */
MarkerClusterer.prototype.getTotalMarkers = function () {
  return this.markers_.length;
};


/**
 *  Sets the max zoom for the clusterer.
 *
 *  @param {number} maxZoom The max zoom level.
 */
MarkerClusterer.prototype.setMaxZoom = function (maxZoom) {
  this.maxZoom_ = maxZoom;
};


/**
 *  Gets the max zoom for the clusterer.
 *
 *  @return {number} The max zoom level.
 */
MarkerClusterer.prototype.getMaxZoom = function () {
  return this.maxZoom_;
};


/**
 *  The function for calculating the cluster icon image.
 *
 *  @param {Array.<google.maps.Marker>} markers The markers in the clusterer.
 *  @param {number} numStyles The number of styles available.
 *  @return {Object} A object properties: 'text' (string) and 'index' (number).
 *  @private
 */
MarkerClusterer.prototype.calculator_ = function (markers, numStyles) {
  var index = 0;
  var count = markers.length;
  var dv = count;
  while (dv !== 0) {
    dv = parseInt(dv / 10, 10);
    index++;
  }

  index = Math.min(index, numStyles);
  return {
    text: count,
    index: index
  };
};


/**
 * Set the calculator function.
 *
 * @param {function (Array, number)} calculator The function to set as the
 *     calculator. The function should return a object properties:
 *     'text' (string) and 'index' (number).
 *
 */
MarkerClusterer.prototype.setCalculator = function (calculator) {
  this.calculator_ = calculator;
};


/**
 * Get the calculator function.
 *
 * @return {function (Array, number)} the calculator function.
 */
MarkerClusterer.prototype.getCalculator = function () {
  return this.calculator_;
};


/**
 * Add an array of markers to the clusterer.
 *
 * @param {Array.<google.maps.Marker>} markers The markers to add.
 * @param {boolean=} opt_nodraw Whether to redraw the clusters.
 */
MarkerClusterer.prototype.addMarkers = function (markers, opt_nodraw) {
  var marker;
  if (markers.length) {
    for (var i = 0; marker = markers[i]; i++) {
      this.pushMarkerTo_(marker);
    }
  } else if (Object.keys(markers).length) {
    for (marker in markers) {
      this.pushMarkerTo_(markers[marker]);
    }
  }
  if (!opt_nodraw) {
    this.redraw();
  }
};


/**
 * Pushes a marker to the clusterer.
 *
 * @param {google.maps.Marker} marker The marker to add.
 * @private
 */
MarkerClusterer.prototype.pushMarkerTo_ = function (marker) {
  marker.isAdded = false;
  if (marker.draggable) {
    // If the marker is draggable add a listener so we update the clusters on
    // the drag end.
    var that = this;
    google.maps.event.addListener(marker, 'dragend', function () {
      marker.isAdded = false;
      that.repaint();
    });
  }
  this.markers_.push(marker);
};


/**
 * Adds a marker to the clusterer and redraws if needed.
 *
 * @param {google.maps.Marker} marker The marker to add.
 * @param {boolean=} opt_nodraw Whether to redraw the clusters.
 */
MarkerClusterer.prototype.addMarker = function (marker, opt_nodraw) {
  this.pushMarkerTo_(marker);
  if (!opt_nodraw) {
    this.redraw();
  }
};


/**
 * Removes a marker and returns true if removed, false if not
 *
 * @param {google.maps.Marker} marker The marker to remove
 * @return {boolean} Whether the marker was removed or not
 * @private
 */
MarkerClusterer.prototype.removeMarker_ = function (marker) {
  var index = -1;
  if (this.markers_.indexOf) {
    index = this.markers_.indexOf(marker);
  } else {
    for (var i = 0, m; m = this.markers_[i]; i++) {
      if (m === marker) {
        index = i;
        break;
      }
    }
  }

  if (index === -1) {
    // Marker is not in our list of markers.
    return false;
  }

  marker.setMap(null);

  this.markers_.splice(index, 1);

  return true;
};


/**
 * Remove a marker from the cluster.
 *
 * @param {google.maps.Marker} marker The marker to remove.
 * @param {boolean=} opt_nodraw Optional boolean to force no redraw.
 * @return {boolean} True if the marker was removed.
 */
MarkerClusterer.prototype.removeMarker = function (marker, opt_nodraw) {
  var removed = this.removeMarker_(marker);

  if (!opt_nodraw && removed) {
    this.resetViewport();
    this.redraw();
    return true;
  } else {
    return false;
  }
};


/**
 * Removes an array of markers from the cluster.
 *
 * @param {Array.<google.maps.Marker>} markers The markers to remove.
 * @param {boolean=} opt_nodraw Optional boolean to force no redraw.
 */
MarkerClusterer.prototype.removeMarkers = function (markers, opt_nodraw) {
  var removed = false;

  for (var i = 0, marker; marker = markers[i]; i++) {
    var r = this.removeMarker_(marker);
    removed = removed || r;
  }

  if (!opt_nodraw && removed) {
    this.resetViewport();
    this.redraw();
    return true;
  }
};


/**
 * Sets the clusterer's ready state.
 *
 * @param {boolean} ready The state.
 * @private
 */
MarkerClusterer.prototype.setReady_ = function (ready) {
  if (!this.ready_) {
    this.ready_ = ready;
    this.createClusters_();
  }
};


/**
 * Returns the number of clusters in the clusterer.
 *
 * @return {number} The number of clusters.
 */
MarkerClusterer.prototype.getTotalClusters = function () {
  return this.clusters_.length;
};


/**
 * Returns the google map that the clusterer is associated with.
 *
 * @return {google.maps.Map} The map.
 */
MarkerClusterer.prototype.getMap = function () {
  return this.map_;
};


/**
 * Sets the google map that the clusterer is associated with.
 *
 * @param {google.maps.Map} map The map.
 */
MarkerClusterer.prototype.setMap = function (map) {
  this.map_ = map;
};


/**
 * Returns the size of the grid.
 *
 * @return {number} The grid size.
 */
MarkerClusterer.prototype.getGridSize = function () {
  return this.gridSize_;
};


/**
 * Sets the size of the grid.
 *
 * @param {number} size The grid size.
 */
MarkerClusterer.prototype.setGridSize = function (size) {
  this.gridSize_ = size;
};


/**
 * Returns the min cluster size.
 *
 * @return {number} The grid size.
 */
MarkerClusterer.prototype.getMinClusterSize = function () {
  return this.minClusterSize_;
};

/**
 * Sets the min cluster size.
 *
 * @param {number} size The grid size.
 */
MarkerClusterer.prototype.setMinClusterSize = function (size) {
  this.minClusterSize_ = size;
};


/**
 * Extends a bounds object by the grid size.
 *
 * @param {google.maps.LatLngBounds} bounds The bounds to extend.
 * @return {google.maps.LatLngBounds} The extended bounds.
 */
MarkerClusterer.prototype.getExtendedBounds = function (bounds) {
  var projection = this.getProjection();

  // Turn the bounds into latlng.
  var tr = new google.maps.LatLng(bounds.getNorthEast().lat(),
    bounds.getNorthEast().lng());
  var bl = new google.maps.LatLng(bounds.getSouthWest().lat(),
    bounds.getSouthWest().lng());

  // Convert the points to pixels and the extend out by the grid size.
  var trPix = projection.fromLatLngToDivPixel(tr);
  trPix.x += this.gridSize_;
  trPix.y -= this.gridSize_;

  var blPix = projection.fromLatLngToDivPixel(bl);
  blPix.x -= this.gridSize_;
  blPix.y += this.gridSize_;

  // Convert the pixel points back to LatLng
  var ne = projection.fromDivPixelToLatLng(trPix);
  var sw = projection.fromDivPixelToLatLng(blPix);

  // Extend the bounds to contain the new bounds.
  bounds.extend(ne);
  bounds.extend(sw);

  return bounds;
};


/**
 * Determins if a marker is contained in a bounds.
 *
 * @param {google.maps.Marker} marker The marker to check.
 * @param {google.maps.LatLngBounds} bounds The bounds to check against.
 * @return {boolean} True if the marker is in the bounds.
 * @private
 */
MarkerClusterer.prototype.isMarkerInBounds_ = function (marker, bounds) {
  return bounds.contains(marker.getPosition());
};


/**
 * Clears all clusters and markers from the clusterer.
 */
MarkerClusterer.prototype.clearMarkers = function () {
  this.resetViewport(true);

  // Set the markers a empty array.
  this.markers_ = [];
};


/**
 * Clears all existing clusters and recreates them.
 * @param {boolean} opt_hide To also hide the marker.
 */
MarkerClusterer.prototype.resetViewport = function (opt_hide) {
  // Remove all the clusters
  for (var i = 0, cluster; cluster = this.clusters_[i]; i++) {
    cluster.remove();
  }

  // Reset the markers to not be added and to be invisible.
  for (var j = 0, marker; marker = this.markers_[j]; j++) {
    marker.isAdded = false;
    if (opt_hide) {
      marker.setMap(null);
    }
  }

  this.clusters_ = [];
};

/**
 *
 */
MarkerClusterer.prototype.repaint = function () {
  var oldClusters = this.clusters_.slice();
  this.clusters_.length = 0;
  this.resetViewport();
  this.redraw();

  // Remove the old clusters.
  // Do it in a timeout so the other clusters have been drawn first.
  window.setTimeout(function () {
    for (var i = 0, cluster; cluster = oldClusters[i]; i++) {
      cluster.remove();
    }
  }, 0);
};


/**
 * Redraws the clusters.
 */
MarkerClusterer.prototype.redraw = function () {
  this.createClusters_();
};


/**
 * Calculates the distance between two latlng locations in km.
 * @see http://www.movable-type.co.uk/scripts/latlong.html
 *
 * @param {google.maps.LatLng} p1 The first lat lng point.
 * @param {google.maps.LatLng} p2 The second lat lng point.
 * @return {number} The distance between the two points in km.
 * @private
 */
MarkerClusterer.prototype.distanceBetweenPoints_ = function (p1, p2) {
  if (!p1 || !p2) {
    return 0;
  }

  var R = 6371; // Radius of the Earth in km
  var dLat = (p2.lat() - p1.lat()) * Math.PI / 180;
  var dLon = (p2.lng() - p1.lng()) * Math.PI / 180;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(p1.lat() * Math.PI / 180) * Math.cos(p2.lat() * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c;
  return d;
};


/**
 * Add a marker to a cluster, or creates a new cluster.
 *
 * @param {google.maps.Marker} marker The marker to add.
 * @private
 */
MarkerClusterer.prototype.addToClosestCluster_ = function (marker) {
  var distance = 40000; // Some large number
  var clusterToAddTo = null;
  //var pos = marker.getPosition();
  var cluster;
  for (var i = 0; cluster = this.clusters_[i]; i++) {
    var center = cluster.getCenter();
    if (center) {
      var d = this.distanceBetweenPoints_(center, marker.getPosition());
      if (d < distance) {
        distance = d;
        clusterToAddTo = cluster;
      }
    }
  }

  if (clusterToAddTo && clusterToAddTo.isMarkerInClusterBounds(marker)) {
    clusterToAddTo.addMarker(marker);
  } else {
    cluster = new Cluster(this);
    cluster.addMarker(marker);
    this.clusters_.push(cluster);
  }
};


/**
 * Creates the clusters.
 *
 * @private
 */
MarkerClusterer.prototype.createClusters_ = function () {
  if (!this.ready_) {
    return;
  }

  // Get our current map view bounds.
  // Create a new bounds object so we don't affect the map.
  var mapBounds = new google.maps.LatLngBounds(this.map_.getBounds().getSouthWest(),
    this.map_.getBounds().getNorthEast());
  var bounds = this.getExtendedBounds(mapBounds);

  for (var i = 0, marker; marker = this.markers_[i]; i++) {
    if (!marker.isAdded && this.isMarkerInBounds_(marker, bounds)) {
      this.addToClosestCluster_(marker);
    }
  }
};


/**
 * A cluster that contains markers.
 *
 * @param {MarkerClusterer} markerClusterer The markerclusterer that this
 *     cluster is associated with.
 * @constructor
 * @ignore
 */
function Cluster(markerClusterer) {
  this.markerClusterer_ = markerClusterer;
  this.map_ = markerClusterer.getMap();
  this.gridSize_ = markerClusterer.getGridSize();
  this.minClusterSize_ = markerClusterer.getMinClusterSize();
  this.averageCenter_ = markerClusterer.isAverageCenter();
  this.center_ = null;
  this.markers_ = [];
  this.bounds_ = null;
  this.clusterIcon_ = new ClusterIcon(this, markerClusterer.getStyles(),
    markerClusterer.getGridSize());
}

/**
 * Determins if a marker is already added to the cluster.
 *
 * @param {google.maps.Marker} marker The marker to check.
 * @return {boolean} True if the marker is already added.
 */
Cluster.prototype.isMarkerAlreadyAdded = function (marker) {
  if (this.markers_.indexOf) {
    return this.markers_.indexOf(marker) !== -1;
  } else {
    for (var i = 0, m; m = this.markers_[i]; i++) {
      if (m === marker) {
        return true;
      }
    }
  }
  return false;
};


/**
 * Add a marker the cluster.
 *
 * @param {google.maps.Marker} marker The marker to add.
 * @return {boolean} True if the marker was added.
 */
Cluster.prototype.addMarker = function (marker) {
  if (this.isMarkerAlreadyAdded(marker)) {
    return false;
  }

  if (!this.center_) {
    this.center_ = marker.getPosition();
    this.calculateBounds_();
  } else {
    if (this.averageCenter_) {
      var l = this.markers_.length + 1;
      var lat = (this.center_.lat() * (l - 1) + marker.getPosition().lat()) / l;
      var lng = (this.center_.lng() * (l - 1) + marker.getPosition().lng()) / l;
      this.center_ = new google.maps.LatLng(lat, lng);
      this.calculateBounds_();
    }
  }

  marker.isAdded = true;
  this.markers_.push(marker);

  var len = this.markers_.length;
  if (len < this.minClusterSize_ && marker.getMap() !== this.map_) {
    // Min cluster size not reached so show the marker.
    marker.setMap(this.map_);
  }

  if (len === this.minClusterSize_) {
    // Hide the markers that were showing.
    for (var i = 0; i < len; i++) {
      this.markers_[i].setMap(null);
    }
  }

  if (len >= this.minClusterSize_) {
    marker.setMap(null);
  }

  this.updateIcon();
  return true;
};


/**
 * Returns the marker clusterer that the cluster is associated with.
 *
 * @return {MarkerClusterer} The associated marker clusterer.
 */
Cluster.prototype.getMarkerClusterer = function () {
  return this.markerClusterer_;
};


/**
 * Returns the bounds of the cluster.
 *
 * @return {google.maps.LatLngBounds} the cluster bounds.
 */
Cluster.prototype.getBounds = function () {
  var bounds = new google.maps.LatLngBounds(this.center_, this.center_);
  var markers = this.getMarkers();
  for (var i = 0, marker; marker = markers[i]; i++) {
    bounds.extend(marker.getPosition());
  }
  return bounds;
};


/**
 * Removes the cluster
 */
Cluster.prototype.remove = function () {
  this.clusterIcon_.remove();
  this.markers_.length = 0;
  delete this.markers_;
};


/**
 * Returns the center of the cluster.
 *
 * @return {number} The cluster center.
 */
Cluster.prototype.getSize = function () {
  return this.markers_.length;
};


/**
 * Returns the center of the cluster.
 *
 * @return {Array.<google.maps.Marker>} The cluster center.
 */
Cluster.prototype.getMarkers = function () {
  return this.markers_;
};


/**
 * Returns the center of the cluster.
 *
 * @return {google.maps.LatLng} The cluster center.
 */
Cluster.prototype.getCenter = function () {
  return this.center_;
};


/**
 * Calculated the extended bounds of the cluster with the grid.
 *
 * @private
 */
Cluster.prototype.calculateBounds_ = function () {
  var bounds = new google.maps.LatLngBounds(this.center_, this.center_);
  this.bounds_ = this.markerClusterer_.getExtendedBounds(bounds);
};


/**
 * Determines if a marker lies in the clusters bounds.
 *
 * @param {google.maps.Marker} marker The marker to check.
 * @return {boolean} True if the marker lies in the bounds.
 */
Cluster.prototype.isMarkerInClusterBounds = function (marker) {
  return this.bounds_.contains(marker.getPosition());
};


/**
 * Returns the map that the cluster is associated with.
 *
 * @return {google.maps.Map} The map.
 */
Cluster.prototype.getMap = function () {
  return this.map_;
};


/**
 * Updates the cluster icon
 */
Cluster.prototype.updateIcon = function () {
  var zoom = this.map_.getZoom();
  var mz = this.markerClusterer_.getMaxZoom();

  if (mz && zoom > mz) {
    // The zoom is greater than our max zoom so show all the markers in cluster.
    for (var i = 0, marker; marker = this.markers_[i]; i++) {
      marker.setMap(this.map_);
    }
    return;
  }

  if (this.markers_.length < this.minClusterSize_) {
    // Min cluster size not yet reached.
    this.clusterIcon_.hide();
    return;
  }

  var numStyles = this.markerClusterer_.getStyles().length;
  var sums = this.markerClusterer_.getCalculator()(this.markers_, numStyles);
  this.clusterIcon_.setCenter(this.center_);
  this.clusterIcon_.setSums(sums);
  this.clusterIcon_.show();
};


/**
 * A cluster icon
 *
 * @param {Cluster} cluster The cluster to be associated with.
 * @param {Object} styles An object that has style properties:
 *     'url': (string) The image url.
 *     'height': (number) The image height.
 *     'width': (number) The image width.
 *     'anchor': (Array) The anchor position of the label text.
 *     'textColor': (string) The text color.
 *     'textSize': (number) The text size.
 *     'backgroundPosition: (string) The background postition x, y.
 * @param {number=} opt_padding Optional padding to apply to the cluster icon.
 * @constructor
 * @extends google.maps.OverlayView
 * @ignore
 */
function ClusterIcon(cluster, styles, opt_padding) {
  cluster.getMarkerClusterer().extend(ClusterIcon, google.maps.OverlayView);

  this.styles_ = styles;
  this.padding_ = opt_padding || 0;
  this.cluster_ = cluster;
  this.center_ = null;
  this.map_ = cluster.getMap();
  this.div_ = null;
  this.sums_ = null;
  this.visible_ = false;

  this.setMap(this.map_);
}


/**
 * Triggers the clusterclick event and zoom's if the option is set.
 */
ClusterIcon.prototype.triggerClusterClick = function () {
  var markerClusterer = this.cluster_.getMarkerClusterer();

  // Trigger the clusterclick event.
  google.maps.event.trigger(markerClusterer, 'clusterclick', this.cluster_);

  if (markerClusterer.isZoomOnClick()) {
    // Zoom into the cluster.
    this.map_.fitBounds(this.cluster_.getBounds());
  }
};


/**
 * Adding the cluster icon to the dom.
 * @ignore
 */
ClusterIcon.prototype.onAdd = function () {
  this.div_ = document.createElement('DIV');
  if (this.visible_) {
    var pos = this.getPosFromLatLng_(this.center_);
    this.div_.style.cssText = this.createCss(pos);
    this.div_.innerHTML = this.sums_.text;
  }

  var panes = this.getPanes();
  panes.overlayMouseTarget.appendChild(this.div_);

  var that = this;
  google.maps.event.addDomListener(this.div_, 'click', function () {
    that.triggerClusterClick();
  });
};


/**
 * Returns the position to place the div dending on the latlng.
 *
 * @param {google.maps.LatLng} latlng The position in latlng.
 * @return {google.maps.Point} The position in pixels.
 * @private
 */
ClusterIcon.prototype.getPosFromLatLng_ = function (latlng) {
  var pos = this.getProjection().fromLatLngToDivPixel(latlng);
  pos.x -= parseInt(this.width_ / 2, 10);
  pos.y -= parseInt(this.height_ / 2, 10);
  return pos;
};


/**
 * Draw the icon.
 * @ignore
 */
ClusterIcon.prototype.draw = function () {
  if (this.visible_) {
    var pos = this.getPosFromLatLng_(this.center_);
    this.div_.style.top = pos.y + 'px';
    this.div_.style.left = pos.x + 'px';
  }
};


/**
 * Hide the icon.
 */
ClusterIcon.prototype.hide = function () {
  if (this.div_) {
    this.div_.style.display = 'none';
  }
  this.visible_ = false;
};


/**
 * Position and show the icon.
 */
ClusterIcon.prototype.show = function () {
  if (this.div_) {
    var pos = this.getPosFromLatLng_(this.center_);
    this.div_.style.cssText = this.createCss(pos);
    this.div_.style.display = '';
  }
  this.visible_ = true;
};


/**
 * Remove the icon from the map
 */
ClusterIcon.prototype.remove = function () {
  this.setMap(null);
};


/**
 * Implementation of the onRemove interface.
 * @ignore
 */
ClusterIcon.prototype.onRemove = function () {
  if (this.div_ && this.div_.parentNode) {
    this.hide();
    this.div_.parentNode.removeChild(this.div_);
    this.div_ = null;
  }
};


/**
 * Set the sums of the icon.
 *
 * @param {Object} sums The sums containing:
 *   'text': (string) The text to display in the icon.
 *   'index': (number) The style index of the icon.
 */
ClusterIcon.prototype.setSums = function (sums) {
  this.sums_ = sums;
  this.text_ = sums.text;
  this.index_ = sums.index;
  if (this.div_) {
    this.div_.innerHTML = sums.text;
  }

  this.useStyle();
};


/**
 * Sets the icon to the the styles.
 */
ClusterIcon.prototype.useStyle = function () {
  var index = Math.max(0, this.sums_.index - 1);
  index = Math.min(this.styles_.length - 1, index);
  var style = this.styles_[index];
  this.url_ = style.url;
  this.height_ = style.height;
  this.width_ = style.width;
  this.textColor_ = style.textColor;
  this.anchor_ = style.anchor;
  this.textSize_ = style.textSize;
  this.backgroundPosition_ = style.backgroundPosition;
};


/**
 * Sets the center of the icon.
 *
 * @param {google.maps.LatLng} center The latlng to set as the center.
 */
ClusterIcon.prototype.setCenter = function (center) {
  this.center_ = center;
};


/**
 * Create the css text based on the position of the icon.
 *
 * @param {google.maps.Point} pos The position.
 * @return {string} The css style text.
 */
ClusterIcon.prototype.createCss = function (pos) {
  var style = [];
  style.push('background-image:url(' + this.url_ + ');');
  var backgroundPosition = this.backgroundPosition_ ? this.backgroundPosition_ : '0 0';
  style.push('background-position:' + backgroundPosition + ';');

  if (typeof this.anchor_ === 'object') {
    if (typeof this.anchor_[0] === 'number' && this.anchor_[0] > 0 &&
      this.anchor_[0] < this.height_) {
      style.push('height:' + (this.height_ - this.anchor_[0]) +
        'px; padding-top:' + this.anchor_[0] + 'px;');
    } else {
      style.push('height:' + this.height_ + 'px; line-height:' + this.height_ +
        'px;');
    }
    if (typeof this.anchor_[1] === 'number' && this.anchor_[1] > 0 &&
      this.anchor_[1] < this.width_) {
      style.push('width:' + (this.width_ - this.anchor_[1]) +
        'px; padding-left:' + this.anchor_[1] + 'px;');
    } else {
      style.push('width:' + this.width_ + 'px; text-align:center;');
    }
  } else {
    style.push('height:' + this.height_ + 'px; line-height:' +
      this.height_ + 'px; width:' + this.width_ + 'px; text-align:center;');
  }

  var txtColor = this.textColor_ ? this.textColor_ : 'black';
  var txtSize = this.textSize_ ? this.textSize_ : 11;

  style.push('cursor:pointer; top:' + pos.y + 'px; left:' +
    pos.x + 'px; color:' + txtColor + '; position:absolute; font-size:' +
    txtSize + 'px; font-family:Arial,sans-serif; font-weight:bold');
  return style.join('');
};


// Export Symbols for Closure
// If you are not going to compile with closure then you can remove the
// code below.
window.MarkerClusterer = MarkerClusterer;
MarkerClusterer.prototype.addMarker = MarkerClusterer.prototype.addMarker;
MarkerClusterer.prototype.addMarkers = MarkerClusterer.prototype.addMarkers;
MarkerClusterer.prototype.clearMarkers =
  MarkerClusterer.prototype.clearMarkers;
MarkerClusterer.prototype.fitMapToMarkers =
  MarkerClusterer.prototype.fitMapToMarkers;
MarkerClusterer.prototype.getCalculator =
  MarkerClusterer.prototype.getCalculator;
MarkerClusterer.prototype.getGridSize =
  MarkerClusterer.prototype.getGridSize;
MarkerClusterer.prototype.getExtendedBounds =
  MarkerClusterer.prototype.getExtendedBounds;
MarkerClusterer.prototype.getMap = MarkerClusterer.prototype.getMap;
MarkerClusterer.prototype.getMarkers = MarkerClusterer.prototype.getMarkers;
MarkerClusterer.prototype.getMaxZoom = MarkerClusterer.prototype.getMaxZoom;
MarkerClusterer.prototype.getStyles = MarkerClusterer.prototype.getStyles;
MarkerClusterer.prototype.getTotalClusters =
  MarkerClusterer.prototype.getTotalClusters;
MarkerClusterer.prototype.getTotalMarkers =
  MarkerClusterer.prototype.getTotalMarkers;
MarkerClusterer.prototype.redraw = MarkerClusterer.prototype.redraw;
MarkerClusterer.prototype.removeMarker =
  MarkerClusterer.prototype.removeMarker;
MarkerClusterer.prototype.removeMarkers =
  MarkerClusterer.prototype.removeMarkers;
MarkerClusterer.prototype.resetViewport =
  MarkerClusterer.prototype.resetViewport;
MarkerClusterer.prototype.repaint =
  MarkerClusterer.prototype.repaint;
MarkerClusterer.prototype.setCalculator =
  MarkerClusterer.prototype.setCalculator;
MarkerClusterer.prototype.setGridSize =
  MarkerClusterer.prototype.setGridSize;
MarkerClusterer.prototype.setMaxZoom =
  MarkerClusterer.prototype.setMaxZoom;
MarkerClusterer.prototype.onAdd = MarkerClusterer.prototype.onAdd;
MarkerClusterer.prototype.draw = MarkerClusterer.prototype.draw;

Cluster.prototype.getCenter = Cluster.prototype.getCenter;
Cluster.prototype.getSize = Cluster.prototype.getSize;
Cluster.prototype.getMarkers = Cluster.prototype.getMarkers;

ClusterIcon.prototype.onAdd = ClusterIcon.prototype.onAdd;
ClusterIcon.prototype.draw = ClusterIcon.prototype.draw;
ClusterIcon.prototype.onRemove = ClusterIcon.prototype.onRemove;

Object.keys = Object.keys || function (o) {
  var result = [];
  for (var name in o) {
    if (o.hasOwnProperty(name)) {
      result.push(name);
    }
  }
  return result;
};

})()
},{}],105:[function(require,module,exports){
(function(){/* global $ */
var Marionette = require('backbone.marionette'),
  _ = require('underscore'),
  //Model = require('../../../numericals/TimeSeriesModel.js'),
  ChartModel = require('../../../numericals/ChartModel.js'),
  ChartView = require('../../../numericals/ChartView.js');


module.exports = Marionette.ItemView.extend({
  type: 'Numerical',
  template: '#template-detail-content-numerical-edit',
  itemViewContainer: '#detail-content',
  ui: {
    selColor: '#detailed-view-chart-color',
    selStyle: '#detailed-view-chart-style',
    selOperation: '#detailed-view-chart-operation',
    selInterval: '#detailed-view-chart-interval',
    selFitting: '#detailed-view-chart-fitting',
    butOk: '#detailed-view-chart-ok',
    butCancel: '#detailed-view-chart-cancel'
  },
  chartView: null,
  chartViewModel: null,
  rendered: false,
  collection: null,
  edited: null,
  old: null,
  color: null,
  style: null,
  transform: null,
  interval: null,
  initialize: function () {
    this.listenTo(this.model, 'change:collection', this.prepareCollection.bind(this));
    this.listenTo(this.model, 'change:event', this.highlightEvent.bind(this));
    this.edited = this.model.get('edited');
    this.old = {
      color: this.edited.get('color'),
      style: this.edited.get('style'),
      transform: this.edited.get('transform'),
      interval: this.edited.get('interval'),
      fitting: this.edited.get('fitting')
    };
  },
  onRender: function () {
    $(this.itemViewContainer).html(this.el);
    if (this.chartView) {
      this.chartView.model.set('collection', this.collection);
    } else {
      this.prepareCollection();
      this.chartViewModel = new ChartModel({
          container: '#detail-chart-container-edit',
          view: null,
          requiresDim: false,
          collection: this.model.get('collection'),
          highlighted: false,
          highlightedTime: null,
          allowPieChart: false,
          singleNumberAsText: false,
          dimensions: null,
          legendStyle: 'list', // Legend style: 'list', 'table'
          legendButton: true,  // A button in the legend
          legendButtonContent: [],
          legendShow: true,     // Show legend or not
          legendContainer: '#legend-container-edit', //false or a a selector
          legendExtras: true,   // use extras in the legend
          onClick: false,
          onHover: true,
          onDnD: false,
          editPoint: true,
          allowPan: false,      // Allows navigation through the chart
          allowZoom: false,     // Allows zooming on the chart
          xaxis: true,
          showNodeCount: false
        });

      this.ui.selColor.css({'background-color': this.edited.get('color')});
      this.chartView = new ChartView({model: this.chartViewModel});
      this.ui.selColor.bind('change', this.editorChange.bind(this));
      this.ui.selStyle.bind('change', this.editorChange.bind(this));
      this.ui.selOperation.bind('change', this.editorChange.bind(this));
      this.ui.selInterval.bind('change', this.editorChange.bind(this));
      this.ui.selFitting.bind('change', this.editorChange.bind(this));
      this.ui.butOk.on('click', function () {
        this.trigger('ready', this.edited);
      }.bind(this));
      this.ui.butCancel.on('click', function () {
        this.edited.set('color', this.old.color);
        this.edited.set('style', this.old.style);
        this.edited.set('transform', this.old.transform);
        this.edited.set('interval', this.old.interval);
        this.edited.set('fitting', this.old.fitting);
        this.trigger('cancel');
      }.bind(this));
    }

    if ($('#detail-chart-container-edit').length !== 0) {
      this.updateEditor();
      if (this.chartView) { this.chartView.unbind(); }
      this.chartView.render();
      this.chartView.on('eventEdit', this.onValueEdited.bind(this));
      this.highlightEvent();
      this.rendered = true;
    }
  },
  debounceRender: _.debounce(function () {
    if (!this.rendered) {
      if (this.chartView) { this.chartView.unbind(); }
      this.render();
      this.highlightEvent();
      this.chartView.on('eventEdit', this.onValueEdited.bind(this));
    }
  }, 1000),
  onValueEdited: function (event) {
    this.trigger('eventEdit', event);
  },
  editorChange: function () {
    if (this.ui.selColor[0].selectedIndex > -1) {
      this.color = this.ui.selColor[0].options[this.ui.selColor[0].selectedIndex].value;
      this.ui.selColor.css({'background-color': this.color});
    }
    if (this.ui.selStyle[0].selectedIndex > -1) {
      this.style = this.ui.selStyle[0].options[this.ui.selStyle[0].selectedIndex].value;
    }
    if (this.ui.selOperation[0].selectedIndex > -1) {
      this.transform = this.ui.selOperation[0].options[this.ui.selOperation[0].selectedIndex].value;
    }
    if (this.ui.selInterval[0].selectedIndex > -1) {
      this.interval = this.ui.selInterval[0].options[this.ui.selInterval[0].selectedIndex].value;
    }
    this.fitting = this.ui.selFitting.prop('checked');


    this.edited.set('color', this.color);
    this.edited.set('style', this.style);
    this.edited.set('transform', this.transform);
    this.edited.set('interval', this.interval);
    this.edited.set('fitting', this.fitting);

    if (this.edited.get('style') !== 'line') {
      this.ui.selFitting.prop('disabled', true);
      this.ui.selFitting.prop('checked', false);
      this.model.get('edited').set('fitting', false);
    } else {
      this.ui.selFitting.prop('disabled', false);
    }

    if (this.chartView) { this.chartView.unbind(); }
    this.chartView.render();
    this.chartView.on('eventEdit', this.onValueEdited.bind(this));
  },
  highlightEvent: function () {
    if (this.chartView && this.model.get('event')) {
      this.chartView.highlightEvent(this.model.get('event'));
    }
  },
  prepareCollection: function () {
    this.collection = this.model.get('collection');
  },
  onClose: function () {
    this.chartView.close();
    this.chartView = null;
    $(this.itemViewContainer).empty();
  },
  updateEditor: function () {
    var i;
    var found = false;
    var options = this.ui.selColor[0].options;
    for (i = 0; i < options.length; ++i) {
      if (options[i].value === this.model.get('edited').get('color')) {
        this.ui.selColor[0].selectedIndex = i;
        found = true;
        break;
      }
    }
    if (!found) {
      if (this.model.get('edited').get('color')) {
        $(this.ui.selColor).css({
          'background-color': this.model.get('edited').get('color')
        });
      }
    }

    options = this.ui.selStyle[0].options;
    for (i = 0; i < options.length; ++i) {
      if (options[i].value === this.model.get('edited').get('style')) {
        this.ui.selStyle[0].selectedIndex = i;
        break;
      }
    }
    options = this.ui.selOperation[0].options;
    for (i = 0; i < options.length; ++i) {
      if (options[i].value === this.model.get('edited').get('transform')) {
        this.ui.selOperation[0].selectedIndex = i;
        break;
      }
    }
    options = this.ui.selInterval[0].options;
    for (i = 0; i < options.length; ++i) {
      if (options[i].value === this.model.get('edited').get('interval')) {
        this.ui.selInterval[0].selectedIndex = i;
        break;
      }
    }

    if (this.edited.get('style') !== 'line') {
      this.ui.selFitting.prop('disabled', true);
      this.model.get('edited').set('fitting', false);
    } else {
      this.ui.selFitting.prop('disabled', false);
    }

    if (this.edited.get('style') === 'point' ||
      this.edited.get('style') === 'bar') {
      this.ui.selFitting.prop('disabled', true);
      this.ui.selFitting.prop('checked', false);
      this.model.get('edited').set('fitting', false);
    } else {
      this.ui.selFitting.prop('disabled', false);
    }
    this.ui.selFitting.prop('checked', true && this.model.get('edited').get('fitting'));
  }
});
})()
},{"../../../numericals/ChartModel.js":86,"../../../numericals/ChartView.js":85,"backbone.marionette":32,"underscore":9}],106:[function(require,module,exports){
(function(){/* global $ */
var Marionette = require('backbone.marionette'),
  _ = require('underscore'),
  //Model = require('../../../numericals/TimeSeriesModel.js'),
  ChartModel = require('../../../numericals/ChartModel.js'),
  ChartView = require('../../../numericals/ChartView.js');


module.exports = Marionette.ItemView.extend({
  type: 'Numerical',
  template: '#template-detail-content-numerical-general',
  itemViewContainer: '#detail-content',
  chartView: null,
  rendered: false,
  initialize: function () {
    this.listenTo(this.model, 'change:collection', this.render.bind(this));
    this.listenTo(this.model, 'change:event', this.highlightEvent.bind(this));
  },
  onRender: function () {
    $(this.itemViewContainer).html(this.el);

    if (this.chartView) {
      this.chartView.model.set('collection', this.model.get('collection'));
    } else {
      this.chartView = new ChartView({model:
        new ChartModel({
          container: '#detail-chart-container-general',
          view: null,
          requiresDim: false,
          collection: this.model.get('collection'),
          highlighted: false,
          highlightedTime: null,
          allowPieChart: false,
          singleNumberAsText: false,
          dimensions: null,
          legendStyle: 'list', // Legend style: 'list', 'table'
          legendButton: true,  // A button in the legend
          legendButtonContent: this.model.get('virtual') ? ['remove', 'edit'] : ['edit'],
          legendShow: true,     // Show legend or not
          legendContainer: '#legend-container-general', //false or a a selector
          legendExtras: true,   // use extras in the legend
          onClick: false,
          onHover: true,
          onDnD: false,
          allowPan: true,      // Allows navigation through the chart
          allowZoom: true,     // Allows zooming on the chart
          panZoomButton: true,
          xaxis: true,
          editPoint: false,
          showNodeCount: false
        })});

      this.chartView.on('remove', function (m) {
        this.trigger('remove', m);
      }.bind(this));

      this.chartView.on('edit', function (m) {
        this.trigger('edit', m);
      }.bind(this));

      this.chartView.on('duplicate', function (m) {
        this.trigger('duplicate', m);
      }.bind(this));
    }

    if ($('#detail-chart-container-general').length !== 0) {
      this.chartView.render();
      this.highlightEvent();
      this.rendered = true;
    }
  },
  debounceRender: _.debounce(function () {
    if (!this.rendered) {
      this.render();
      this.highlightEvent();
    }
  }, 1000),

  highlightEvent: function () {
    if (this.chartView && this.model.get('event')) {
      this.chartView.highlightEvent(this.model.get('event'));
    }
  },
  onClose: function () {
    this.chartView.close();
    this.chartView = null;
    $(this.itemViewContainer).empty();
  }
});
})()
},{"../../../numericals/ChartModel.js":86,"../../../numericals/ChartView.js":85,"backbone.marionette":32,"underscore":9}],103:[function(require,module,exports){
(function(){//     Backbone.js 1.0.0

//     (c) 2010-2013 Jeremy Ashkenas, DocumentCloud Inc.
//     Backbone may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://backbonejs.org

(function(){

  // Initial Setup
  // -------------

  // Save a reference to the global object (`window` in the browser, `exports`
  // on the server).
  var root = this;

  // Save the previous value of the `Backbone` variable, so that it can be
  // restored later on, if `noConflict` is used.
  var previousBackbone = root.Backbone;

  // Create local references to array methods we'll want to use later.
  var array = [];
  var push = array.push;
  var slice = array.slice;
  var splice = array.splice;

  // The top-level namespace. All public Backbone classes and modules will
  // be attached to this. Exported for both the browser and the server.
  var Backbone;
  if (typeof exports !== 'undefined') {
    Backbone = exports;
  } else {
    Backbone = root.Backbone = {};
  }

  // Current version of the library. Keep in sync with `package.json`.
  Backbone.VERSION = '1.0.0';

  // Require Underscore, if we're on the server, and it's not already present.
  var _ = root._;
  if (!_ && (typeof require !== 'undefined')) _ = require('underscore');

  // For Backbone's purposes, jQuery, Zepto, Ender, or My Library (kidding) owns
  // the `$` variable.
  Backbone.$ = root.jQuery || root.Zepto || root.ender || root.$;

  // Runs Backbone.js in *noConflict* mode, returning the `Backbone` variable
  // to its previous owner. Returns a reference to this Backbone object.
  Backbone.noConflict = function() {
    root.Backbone = previousBackbone;
    return this;
  };

  // Turn on `emulateHTTP` to support legacy HTTP servers. Setting this option
  // will fake `"PUT"` and `"DELETE"` requests via the `_method` parameter and
  // set a `X-Http-Method-Override` header.
  Backbone.emulateHTTP = false;

  // Turn on `emulateJSON` to support legacy servers that can't deal with direct
  // `application/json` requests ... will encode the body as
  // `application/x-www-form-urlencoded` instead and will send the model in a
  // form param named `model`.
  Backbone.emulateJSON = false;

  // Backbone.Events
  // ---------------

  // A module that can be mixed in to *any object* in order to provide it with
  // custom events. You may bind with `on` or remove with `off` callback
  // functions to an event; `trigger`-ing an event fires all callbacks in
  // succession.
  //
  //     var object = {};
  //     _.extend(object, Backbone.Events);
  //     object.on('expand', function(){ alert('expanded'); });
  //     object.trigger('expand');
  //
  var Events = Backbone.Events = {

    // Bind an event to a `callback` function. Passing `"all"` will bind
    // the callback to all events fired.
    on: function(name, callback, context) {
      if (!eventsApi(this, 'on', name, [callback, context]) || !callback) return this;
      this._events || (this._events = {});
      var events = this._events[name] || (this._events[name] = []);
      events.push({callback: callback, context: context, ctx: context || this});
      return this;
    },

    // Bind an event to only be triggered a single time. After the first time
    // the callback is invoked, it will be removed.
    once: function(name, callback, context) {
      if (!eventsApi(this, 'once', name, [callback, context]) || !callback) return this;
      var self = this;
      var once = _.once(function() {
        self.off(name, once);
        callback.apply(this, arguments);
      });
      once._callback = callback;
      return this.on(name, once, context);
    },

    // Remove one or many callbacks. If `context` is null, removes all
    // callbacks with that function. If `callback` is null, removes all
    // callbacks for the event. If `name` is null, removes all bound
    // callbacks for all events.
    off: function(name, callback, context) {
      var retain, ev, events, names, i, l, j, k;
      if (!this._events || !eventsApi(this, 'off', name, [callback, context])) return this;
      if (!name && !callback && !context) {
        this._events = {};
        return this;
      }

      names = name ? [name] : _.keys(this._events);
      for (i = 0, l = names.length; i < l; i++) {
        name = names[i];
        if (events = this._events[name]) {
          this._events[name] = retain = [];
          if (callback || context) {
            for (j = 0, k = events.length; j < k; j++) {
              ev = events[j];
              if ((callback && callback !== ev.callback && callback !== ev.callback._callback) ||
                  (context && context !== ev.context)) {
                retain.push(ev);
              }
            }
          }
          if (!retain.length) delete this._events[name];
        }
      }

      return this;
    },

    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    trigger: function(name) {
      if (!this._events) return this;
      var args = slice.call(arguments, 1);
      if (!eventsApi(this, 'trigger', name, args)) return this;
      var events = this._events[name];
      var allEvents = this._events.all;
      if (events) triggerEvents(events, args);
      if (allEvents) triggerEvents(allEvents, arguments);
      return this;
    },

    // Tell this object to stop listening to either specific events ... or
    // to every object it's currently listening to.
    stopListening: function(obj, name, callback) {
      var listeners = this._listeners;
      if (!listeners) return this;
      var deleteListener = !name && !callback;
      if (typeof name === 'object') callback = this;
      if (obj) (listeners = {})[obj._listenerId] = obj;
      for (var id in listeners) {
        listeners[id].off(name, callback, this);
        if (deleteListener) delete this._listeners[id];
      }
      return this;
    }

  };

  // Regular expression used to split event strings.
  var eventSplitter = /\s+/;

  // Implement fancy features of the Events API such as multiple event
  // names `"change blur"` and jQuery-style event maps `{change: action}`
  // in terms of the existing API.
  var eventsApi = function(obj, action, name, rest) {
    if (!name) return true;

    // Handle event maps.
    if (typeof name === 'object') {
      for (var key in name) {
        obj[action].apply(obj, [key, name[key]].concat(rest));
      }
      return false;
    }

    // Handle space separated event names.
    if (eventSplitter.test(name)) {
      var names = name.split(eventSplitter);
      for (var i = 0, l = names.length; i < l; i++) {
        obj[action].apply(obj, [names[i]].concat(rest));
      }
      return false;
    }

    return true;
  };

  // A difficult-to-believe, but optimized internal dispatch function for
  // triggering events. Tries to keep the usual cases speedy (most internal
  // Backbone events have 3 arguments).
  var triggerEvents = function(events, args) {
    var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2];
    switch (args.length) {
      case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx); return;
      case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1); return;
      case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2); return;
      case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); return;
      default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args);
    }
  };

  var listenMethods = {listenTo: 'on', listenToOnce: 'once'};

  // Inversion-of-control versions of `on` and `once`. Tell *this* object to
  // listen to an event in another object ... keeping track of what it's
  // listening to.
  _.each(listenMethods, function(implementation, method) {
    Events[method] = function(obj, name, callback) {
      var listeners = this._listeners || (this._listeners = {});
      var id = obj._listenerId || (obj._listenerId = _.uniqueId('l'));
      listeners[id] = obj;
      if (typeof name === 'object') callback = this;
      obj[implementation](name, callback, this);
      return this;
    };
  });

  // Aliases for backwards compatibility.
  Events.bind   = Events.on;
  Events.unbind = Events.off;

  // Allow the `Backbone` object to serve as a global event bus, for folks who
  // want global "pubsub" in a convenient place.
  _.extend(Backbone, Events);

  // Backbone.Model
  // --------------

  // Backbone **Models** are the basic data object in the framework --
  // frequently representing a row in a table in a database on your server.
  // A discrete chunk of data and a bunch of useful, related methods for
  // performing computations and transformations on that data.

  // Create a new model with the specified attributes. A client id (`cid`)
  // is automatically generated and assigned for you.
  var Model = Backbone.Model = function(attributes, options) {
    var defaults;
    var attrs = attributes || {};
    options || (options = {});
    this.cid = _.uniqueId('c');
    this.attributes = {};
    _.extend(this, _.pick(options, modelOptions));
    if (options.parse) attrs = this.parse(attrs, options) || {};
    if (defaults = _.result(this, 'defaults')) {
      attrs = _.defaults({}, attrs, defaults);
    }
    this.set(attrs, options);
    this.changed = {};
    this.initialize.apply(this, arguments);
  };

  // A list of options to be attached directly to the model, if provided.
  var modelOptions = ['url', 'urlRoot', 'collection'];

  // Attach all inheritable methods to the Model prototype.
  _.extend(Model.prototype, Events, {

    // A hash of attributes whose current and previous value differ.
    changed: null,

    // The value returned during the last failed validation.
    validationError: null,

    // The default name for the JSON `id` attribute is `"id"`. MongoDB and
    // CouchDB users may want to set this to `"_id"`.
    idAttribute: 'id',

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Return a copy of the model's `attributes` object.
    toJSON: function(options) {
      return _.clone(this.attributes);
    },

    // Proxy `Backbone.sync` by default -- but override this if you need
    // custom syncing semantics for *this* particular model.
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Get the value of an attribute.
    get: function(attr) {
      return this.attributes[attr];
    },

    // Get the HTML-escaped value of an attribute.
    escape: function(attr) {
      return _.escape(this.get(attr));
    },

    // Returns `true` if the attribute contains a value that is not null
    // or undefined.
    has: function(attr) {
      return this.get(attr) != null;
    },

    // Set a hash of model attributes on the object, firing `"change"`. This is
    // the core primitive operation of a model, updating the data and notifying
    // anyone who needs to know about the change in state. The heart of the beast.
    set: function(key, val, options) {
      var attr, attrs, unset, changes, silent, changing, prev, current;
      if (key == null) return this;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      options || (options = {});

      // Run validation.
      if (!this._validate(attrs, options)) return false;

      // Extract attributes and options.
      unset           = options.unset;
      silent          = options.silent;
      changes         = [];
      changing        = this._changing;
      this._changing  = true;

      if (!changing) {
        this._previousAttributes = _.clone(this.attributes);
        this.changed = {};
      }
      current = this.attributes, prev = this._previousAttributes;

      // Check for changes of `id`.
      if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];

      // For each `set` attribute, update or delete the current value.
      for (attr in attrs) {
        val = attrs[attr];
        if (!_.isEqual(current[attr], val)) changes.push(attr);
        if (!_.isEqual(prev[attr], val)) {
          this.changed[attr] = val;
        } else {
          delete this.changed[attr];
        }
        unset ? delete current[attr] : current[attr] = val;
      }

      // Trigger all relevant attribute changes.
      if (!silent) {
        if (changes.length) this._pending = true;
        for (var i = 0, l = changes.length; i < l; i++) {
          this.trigger('change:' + changes[i], this, current[changes[i]], options);
        }
      }

      // You might be wondering why there's a `while` loop here. Changes can
      // be recursively nested within `"change"` events.
      if (changing) return this;
      if (!silent) {
        while (this._pending) {
          this._pending = false;
          this.trigger('change', this, options);
        }
      }
      this._pending = false;
      this._changing = false;
      return this;
    },

    // Remove an attribute from the model, firing `"change"`. `unset` is a noop
    // if the attribute doesn't exist.
    unset: function(attr, options) {
      return this.set(attr, void 0, _.extend({}, options, {unset: true}));
    },

    // Clear all attributes on the model, firing `"change"`.
    clear: function(options) {
      var attrs = {};
      for (var key in this.attributes) attrs[key] = void 0;
      return this.set(attrs, _.extend({}, options, {unset: true}));
    },

    // Determine if the model has changed since the last `"change"` event.
    // If you specify an attribute name, determine if that attribute has changed.
    hasChanged: function(attr) {
      if (attr == null) return !_.isEmpty(this.changed);
      return _.has(this.changed, attr);
    },

    // Return an object containing all the attributes that have changed, or
    // false if there are no changed attributes. Useful for determining what
    // parts of a view need to be updated and/or what attributes need to be
    // persisted to the server. Unset attributes will be set to undefined.
    // You can also pass an attributes object to diff against the model,
    // determining if there *would be* a change.
    changedAttributes: function(diff) {
      if (!diff) return this.hasChanged() ? _.clone(this.changed) : false;
      var val, changed = false;
      var old = this._changing ? this._previousAttributes : this.attributes;
      for (var attr in diff) {
        if (_.isEqual(old[attr], (val = diff[attr]))) continue;
        (changed || (changed = {}))[attr] = val;
      }
      return changed;
    },

    // Get the previous value of an attribute, recorded at the time the last
    // `"change"` event was fired.
    previous: function(attr) {
      if (attr == null || !this._previousAttributes) return null;
      return this._previousAttributes[attr];
    },

    // Get all of the attributes of the model at the time of the previous
    // `"change"` event.
    previousAttributes: function() {
      return _.clone(this._previousAttributes);
    },

    // Fetch the model from the server. If the server's representation of the
    // model differs from its current attributes, they will be overridden,
    // triggering a `"change"` event.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === void 0) options.parse = true;
      var model = this;
      var success = options.success;
      options.success = function(resp) {
        if (!model.set(model.parse(resp, options), options)) return false;
        if (success) success(model, resp, options);
        model.trigger('sync', model, resp, options);
      };
      wrapError(this, options);
      return this.sync('read', this, options);
    },

    // Set a hash of model attributes, and sync the model to the server.
    // If the server returns an attributes hash that differs, the model's
    // state will be `set` again.
    save: function(key, val, options) {
      var attrs, method, xhr, attributes = this.attributes;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (key == null || typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      // If we're not waiting and attributes exist, save acts as `set(attr).save(null, opts)`.
      if (attrs && (!options || !options.wait) && !this.set(attrs, options)) return false;

      options = _.extend({validate: true}, options);

      // Do not persist invalid models.
      if (!this._validate(attrs, options)) return false;

      // Set temporary attributes if `{wait: true}`.
      if (attrs && options.wait) {
        this.attributes = _.extend({}, attributes, attrs);
      }

      // After a successful server-side save, the client is (optionally)
      // updated with the server-side state.
      if (options.parse === void 0) options.parse = true;
      var model = this;
      var success = options.success;
      options.success = function(resp) {
        // Ensure attributes are restored during synchronous saves.
        model.attributes = attributes;
        var serverAttrs = model.parse(resp, options);
        if (options.wait) serverAttrs = _.extend(attrs || {}, serverAttrs);
        if (_.isObject(serverAttrs) && !model.set(serverAttrs, options)) {
          return false;
        }
        if (success) success(model, resp, options);
        model.trigger('sync', model, resp, options);
      };
      wrapError(this, options);

      method = this.isNew() ? 'create' : (options.patch ? 'patch' : 'update');
      if (method === 'patch') options.attrs = attrs;
      xhr = this.sync(method, this, options);

      // Restore attributes.
      if (attrs && options.wait) this.attributes = attributes;

      return xhr;
    },

    // Destroy this model on the server if it was already persisted.
    // Optimistically removes the model from its collection, if it has one.
    // If `wait: true` is passed, waits for the server to respond before removal.
    destroy: function(options) {
      options = options ? _.clone(options) : {};
      var model = this;
      var success = options.success;

      var destroy = function() {
        model.trigger('destroy', model, model.collection, options);
      };

      options.success = function(resp) {
        if (options.wait || model.isNew()) destroy();
        if (success) success(model, resp, options);
        if (!model.isNew()) model.trigger('sync', model, resp, options);
      };

      if (this.isNew()) {
        options.success();
        return false;
      }
      wrapError(this, options);

      var xhr = this.sync('delete', this, options);
      if (!options.wait) destroy();
      return xhr;
    },

    // Default URL for the model's representation on the server -- if you're
    // using Backbone's restful methods, override this to change the endpoint
    // that will be called.
    url: function() {
      var base = _.result(this, 'urlRoot') || _.result(this.collection, 'url') || urlError();
      if (this.isNew()) return base;
      return base + (base.charAt(base.length - 1) === '/' ? '' : '/') + encodeURIComponent(this.id);
    },

    // **parse** converts a response into the hash of attributes to be `set` on
    // the model. The default implementation is just to pass the response along.
    parse: function(resp, options) {
      return resp;
    },

    // Create a new model with identical attributes to this one.
    clone: function() {
      return new this.constructor(this.attributes);
    },

    // A model is new if it has never been saved to the server, and lacks an id.
    isNew: function() {
      return this.id == null;
    },

    // Check if the model is currently in a valid state.
    isValid: function(options) {
      return this._validate({}, _.extend(options || {}, { validate: true }));
    },

    // Run validation against the next complete set of model attributes,
    // returning `true` if all is well. Otherwise, fire an `"invalid"` event.
    _validate: function(attrs, options) {
      if (!options.validate || !this.validate) return true;
      attrs = _.extend({}, this.attributes, attrs);
      var error = this.validationError = this.validate(attrs, options) || null;
      if (!error) return true;
      this.trigger('invalid', this, error, _.extend(options || {}, {validationError: error}));
      return false;
    }

  });

  // Underscore methods that we want to implement on the Model.
  var modelMethods = ['keys', 'values', 'pairs', 'invert', 'pick', 'omit'];

  // Mix in each Underscore method as a proxy to `Model#attributes`.
  _.each(modelMethods, function(method) {
    Model.prototype[method] = function() {
      var args = slice.call(arguments);
      args.unshift(this.attributes);
      return _[method].apply(_, args);
    };
  });

  // Backbone.Collection
  // -------------------

  // If models tend to represent a single row of data, a Backbone Collection is
  // more analagous to a table full of data ... or a small slice or page of that
  // table, or a collection of rows that belong together for a particular reason
  // -- all of the messages in this particular folder, all of the documents
  // belonging to this particular author, and so on. Collections maintain
  // indexes of their models, both in order, and for lookup by `id`.

  // Create a new **Collection**, perhaps to contain a specific type of `model`.
  // If a `comparator` is specified, the Collection will maintain
  // its models in sort order, as they're added and removed.
  var Collection = Backbone.Collection = function(models, options) {
    options || (options = {});
    if (options.url) this.url = options.url;
    if (options.model) this.model = options.model;
    if (options.comparator !== void 0) this.comparator = options.comparator;
    this._reset();
    this.initialize.apply(this, arguments);
    if (models) this.reset(models, _.extend({silent: true}, options));
  };

  // Default options for `Collection#set`.
  var setOptions = {add: true, remove: true, merge: true};
  var addOptions = {add: true, merge: false, remove: false};

  // Define the Collection's inheritable methods.
  _.extend(Collection.prototype, Events, {

    // The default model for a collection is just a **Backbone.Model**.
    // This should be overridden in most cases.
    model: Model,

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // The JSON representation of a Collection is an array of the
    // models' attributes.
    toJSON: function(options) {
      return this.map(function(model){ return model.toJSON(options); });
    },

    // Proxy `Backbone.sync` by default.
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Add a model, or list of models to the set.
    add: function(models, options) {
      return this.set(models, _.defaults(options || {}, addOptions));
    },

    // Remove a model, or a list of models from the set.
    remove: function(models, options) {
      models = _.isArray(models) ? models.slice() : [models];
      options || (options = {});
      var i, l, index, model;
      for (i = 0, l = models.length; i < l; i++) {
        model = this.get(models[i]);
        if (!model) continue;
        delete this._byId[model.id];
        delete this._byId[model.cid];
        index = this.indexOf(model);
        this.models.splice(index, 1);
        this.length--;
        if (!options.silent) {
          options.index = index;
          model.trigger('remove', model, this, options);
        }
        this._removeReference(model);
      }
      return this;
    },

    // Update a collection by `set`-ing a new list of models, adding new ones,
    // removing models that are no longer present, and merging models that
    // already exist in the collection, as necessary. Similar to **Model#set**,
    // the core operation for updating the data contained by the collection.
    set: function(models, options) {
      options = _.defaults(options || {}, setOptions);
      if (options.parse) models = this.parse(models, options);
      if (!_.isArray(models)) models = models ? [models] : [];
      var i, l, model, attrs, existing, sort;
      var at = options.at;
      var sortable = this.comparator && (at == null) && options.sort !== false;
      var sortAttr = _.isString(this.comparator) ? this.comparator : null;
      var toAdd = [], toRemove = [], modelMap = {};

      // Turn bare objects into model references, and prevent invalid models
      // from being added.
      for (i = 0, l = models.length; i < l; i++) {
        if (!(model = this._prepareModel(models[i], options))) continue;

        // If a duplicate is found, prevent it from being added and
        // optionally merge it into the existing model.
        if (existing = this.get(model)) {
          if (options.remove) modelMap[existing.cid] = true;
          if (options.merge) {
            existing.set(model.attributes, options);
            if (sortable && !sort && existing.hasChanged(sortAttr)) sort = true;
          }

        // This is a new model, push it to the `toAdd` list.
        } else if (options.add) {
          toAdd.push(model);

          // Listen to added models' events, and index models for lookup by
          // `id` and by `cid`.
          model.on('all', this._onModelEvent, this);
          this._byId[model.cid] = model;
          if (model.id != null) this._byId[model.id] = model;
        }
      }

      // Remove nonexistent models if appropriate.
      if (options.remove) {
        for (i = 0, l = this.length; i < l; ++i) {
          if (!modelMap[(model = this.models[i]).cid]) toRemove.push(model);
        }
        if (toRemove.length) this.remove(toRemove, options);
      }

      // See if sorting is needed, update `length` and splice in new models.
      if (toAdd.length) {
        if (sortable) sort = true;
        this.length += toAdd.length;
        if (at != null) {
          splice.apply(this.models, [at, 0].concat(toAdd));
        } else {
          push.apply(this.models, toAdd);
        }
      }

      // Silently sort the collection if appropriate.
      if (sort) this.sort({silent: true});

      if (options.silent) return this;

      // Trigger `add` events.
      for (i = 0, l = toAdd.length; i < l; i++) {
        (model = toAdd[i]).trigger('add', model, this, options);
      }

      // Trigger `sort` if the collection was sorted.
      if (sort) this.trigger('sort', this, options);
      return this;
    },

    // When you have more items than you want to add or remove individually,
    // you can reset the entire set with a new list of models, without firing
    // any granular `add` or `remove` events. Fires `reset` when finished.
    // Useful for bulk operations and optimizations.
    reset: function(models, options) {
      options || (options = {});
      for (var i = 0, l = this.models.length; i < l; i++) {
        this._removeReference(this.models[i]);
      }
      options.previousModels = this.models;
      this._reset();
      this.add(models, _.extend({silent: true}, options));
      if (!options.silent) this.trigger('reset', this, options);
      return this;
    },

    // Add a model to the end of the collection.
    push: function(model, options) {
      model = this._prepareModel(model, options);
      this.add(model, _.extend({at: this.length}, options));
      return model;
    },

    // Remove a model from the end of the collection.
    pop: function(options) {
      var model = this.at(this.length - 1);
      this.remove(model, options);
      return model;
    },

    // Add a model to the beginning of the collection.
    unshift: function(model, options) {
      model = this._prepareModel(model, options);
      this.add(model, _.extend({at: 0}, options));
      return model;
    },

    // Remove a model from the beginning of the collection.
    shift: function(options) {
      var model = this.at(0);
      this.remove(model, options);
      return model;
    },

    // Slice out a sub-array of models from the collection.
    slice: function(begin, end) {
      return this.models.slice(begin, end);
    },

    // Get a model from the set by id.
    get: function(obj) {
      if (obj == null) return void 0;
      return this._byId[obj.id != null ? obj.id : obj.cid || obj];
    },

    // Get the model at the given index.
    at: function(index) {
      return this.models[index];
    },

    // Return models with matching attributes. Useful for simple cases of
    // `filter`.
    where: function(attrs, first) {
      if (_.isEmpty(attrs)) return first ? void 0 : [];
      return this[first ? 'find' : 'filter'](function(model) {
        for (var key in attrs) {
          if (attrs[key] !== model.get(key)) return false;
        }
        return true;
      });
    },

    // Return the first model with matching attributes. Useful for simple cases
    // of `find`.
    findWhere: function(attrs) {
      return this.where(attrs, true);
    },

    // Force the collection to re-sort itself. You don't need to call this under
    // normal circumstances, as the set will maintain sort order as each item
    // is added.
    sort: function(options) {
      if (!this.comparator) throw new Error('Cannot sort a set without a comparator');
      options || (options = {});

      // Run sort based on type of `comparator`.
      if (_.isString(this.comparator) || this.comparator.length === 1) {
        this.models = this.sortBy(this.comparator, this);
      } else {
        this.models.sort(_.bind(this.comparator, this));
      }

      if (!options.silent) this.trigger('sort', this, options);
      return this;
    },

    // Figure out the smallest index at which a model should be inserted so as
    // to maintain order.
    sortedIndex: function(model, value, context) {
      value || (value = this.comparator);
      var iterator = _.isFunction(value) ? value : function(model) {
        return model.get(value);
      };
      return _.sortedIndex(this.models, model, iterator, context);
    },

    // Pluck an attribute from each model in the collection.
    pluck: function(attr) {
      return _.invoke(this.models, 'get', attr);
    },

    // Fetch the default set of models for this collection, resetting the
    // collection when they arrive. If `reset: true` is passed, the response
    // data will be passed through the `reset` method instead of `set`.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === void 0) options.parse = true;
      var success = options.success;
      var collection = this;
      options.success = function(resp) {
        var method = options.reset ? 'reset' : 'set';
        collection[method](resp, options);
        if (success) success(collection, resp, options);
        collection.trigger('sync', collection, resp, options);
      };
      wrapError(this, options);
      return this.sync('read', this, options);
    },

    // Create a new instance of a model in this collection. Add the model to the
    // collection immediately, unless `wait: true` is passed, in which case we
    // wait for the server to agree.
    create: function(model, options) {
      options = options ? _.clone(options) : {};
      if (!(model = this._prepareModel(model, options))) return false;
      if (!options.wait) this.add(model, options);
      var collection = this;
      var success = options.success;
      options.success = function(resp) {
        if (options.wait) collection.add(model, options);
        if (success) success(model, resp, options);
      };
      model.save(null, options);
      return model;
    },

    // **parse** converts a response into a list of models to be added to the
    // collection. The default implementation is just to pass it through.
    parse: function(resp, options) {
      return resp;
    },

    // Create a new collection with an identical list of models as this one.
    clone: function() {
      return new this.constructor(this.models);
    },

    // Private method to reset all internal state. Called when the collection
    // is first initialized or reset.
    _reset: function() {
      this.length = 0;
      this.models = [];
      this._byId  = {};
    },

    // Prepare a hash of attributes (or other model) to be added to this
    // collection.
    _prepareModel: function(attrs, options) {
      if (attrs instanceof Model) {
        if (!attrs.collection) attrs.collection = this;
        return attrs;
      }
      options || (options = {});
      options.collection = this;
      var model = new this.model(attrs, options);
      if (!model._validate(attrs, options)) {
        this.trigger('invalid', this, attrs, options);
        return false;
      }
      return model;
    },

    // Internal method to sever a model's ties to a collection.
    _removeReference: function(model) {
      if (this === model.collection) delete model.collection;
      model.off('all', this._onModelEvent, this);
    },

    // Internal method called every time a model in the set fires an event.
    // Sets need to update their indexes when models change ids. All other
    // events simply proxy through. "add" and "remove" events that originate
    // in other collections are ignored.
    _onModelEvent: function(event, model, collection, options) {
      if ((event === 'add' || event === 'remove') && collection !== this) return;
      if (event === 'destroy') this.remove(model, options);
      if (model && event === 'change:' + model.idAttribute) {
        delete this._byId[model.previous(model.idAttribute)];
        if (model.id != null) this._byId[model.id] = model;
      }
      this.trigger.apply(this, arguments);
    }

  });

  // Underscore methods that we want to implement on the Collection.
  // 90% of the core usefulness of Backbone Collections is actually implemented
  // right here:
  var methods = ['forEach', 'each', 'map', 'collect', 'reduce', 'foldl',
    'inject', 'reduceRight', 'foldr', 'find', 'detect', 'filter', 'select',
    'reject', 'every', 'all', 'some', 'any', 'include', 'contains', 'invoke',
    'max', 'min', 'toArray', 'size', 'first', 'head', 'take', 'initial', 'rest',
    'tail', 'drop', 'last', 'without', 'indexOf', 'shuffle', 'lastIndexOf',
    'isEmpty', 'chain'];

  // Mix in each Underscore method as a proxy to `Collection#models`.
  _.each(methods, function(method) {
    Collection.prototype[method] = function() {
      var args = slice.call(arguments);
      args.unshift(this.models);
      return _[method].apply(_, args);
    };
  });

  // Underscore methods that take a property name as an argument.
  var attributeMethods = ['groupBy', 'countBy', 'sortBy'];

  // Use attributes instead of properties.
  _.each(attributeMethods, function(method) {
    Collection.prototype[method] = function(value, context) {
      var iterator = _.isFunction(value) ? value : function(model) {
        return model.get(value);
      };
      return _[method](this.models, iterator, context);
    };
  });

  // Backbone.View
  // -------------

  // Backbone Views are almost more convention than they are actual code. A View
  // is simply a JavaScript object that represents a logical chunk of UI in the
  // DOM. This might be a single item, an entire list, a sidebar or panel, or
  // even the surrounding frame which wraps your whole app. Defining a chunk of
  // UI as a **View** allows you to define your DOM events declaratively, without
  // having to worry about render order ... and makes it easy for the view to
  // react to specific changes in the state of your models.

  // Creating a Backbone.View creates its initial element outside of the DOM,
  // if an existing element is not provided...
  var View = Backbone.View = function(options) {
    this.cid = _.uniqueId('view');
    this._configure(options || {});
    this._ensureElement();
    this.initialize.apply(this, arguments);
    this.delegateEvents();
  };

  // Cached regex to split keys for `delegate`.
  var delegateEventSplitter = /^(\S+)\s*(.*)$/;

  // List of view options to be merged as properties.
  var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events'];

  // Set up all inheritable **Backbone.View** properties and methods.
  _.extend(View.prototype, Events, {

    // The default `tagName` of a View's element is `"div"`.
    tagName: 'div',

    // jQuery delegate for element lookup, scoped to DOM elements within the
    // current view. This should be prefered to global lookups where possible.
    $: function(selector) {
      return this.$el.find(selector);
    },

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // **render** is the core function that your view should override, in order
    // to populate its element (`this.el`), with the appropriate HTML. The
    // convention is for **render** to always return `this`.
    render: function() {
      return this;
    },

    // Remove this view by taking the element out of the DOM, and removing any
    // applicable Backbone.Events listeners.
    remove: function() {
      this.$el.remove();
      this.stopListening();
      return this;
    },

    // Change the view's element (`this.el` property), including event
    // re-delegation.
    setElement: function(element, delegate) {
      if (this.$el) this.undelegateEvents();
      this.$el = element instanceof Backbone.$ ? element : Backbone.$(element);
      this.el = this.$el[0];
      if (delegate !== false) this.delegateEvents();
      return this;
    },

    // Set callbacks, where `this.events` is a hash of
    //
    // *{"event selector": "callback"}*
    //
    //     {
    //       'mousedown .title':  'edit',
    //       'click .button':     'save'
    //       'click .open':       function(e) { ... }
    //     }
    //
    // pairs. Callbacks will be bound to the view, with `this` set properly.
    // Uses event delegation for efficiency.
    // Omitting the selector binds the event to `this.el`.
    // This only works for delegate-able events: not `focus`, `blur`, and
    // not `change`, `submit`, and `reset` in Internet Explorer.
    delegateEvents: function(events) {
      if (!(events || (events = _.result(this, 'events')))) return this;
      this.undelegateEvents();
      for (var key in events) {
        var method = events[key];
        if (!_.isFunction(method)) method = this[events[key]];
        if (!method) continue;

        var match = key.match(delegateEventSplitter);
        var eventName = match[1], selector = match[2];
        method = _.bind(method, this);
        eventName += '.delegateEvents' + this.cid;
        if (selector === '') {
          this.$el.on(eventName, method);
        } else {
          this.$el.on(eventName, selector, method);
        }
      }
      return this;
    },

    // Clears all callbacks previously bound to the view with `delegateEvents`.
    // You usually don't need to use this, but may wish to if you have multiple
    // Backbone views attached to the same DOM element.
    undelegateEvents: function() {
      this.$el.off('.delegateEvents' + this.cid);
      return this;
    },

    // Performs the initial configuration of a View with a set of options.
    // Keys with special meaning *(e.g. model, collection, id, className)* are
    // attached directly to the view.  See `viewOptions` for an exhaustive
    // list.
    _configure: function(options) {
      if (this.options) options = _.extend({}, _.result(this, 'options'), options);
      _.extend(this, _.pick(options, viewOptions));
      this.options = options;
    },

    // Ensure that the View has a DOM element to render into.
    // If `this.el` is a string, pass it through `$()`, take the first
    // matching element, and re-assign it to `el`. Otherwise, create
    // an element from the `id`, `className` and `tagName` properties.
    _ensureElement: function() {
      if (!this.el) {
        var attrs = _.extend({}, _.result(this, 'attributes'));
        if (this.id) attrs.id = _.result(this, 'id');
        if (this.className) attrs['class'] = _.result(this, 'className');
        var $el = Backbone.$('<' + _.result(this, 'tagName') + '>').attr(attrs);
        this.setElement($el, false);
      } else {
        this.setElement(_.result(this, 'el'), false);
      }
    }

  });

  // Backbone.sync
  // -------------

  // Override this function to change the manner in which Backbone persists
  // models to the server. You will be passed the type of request, and the
  // model in question. By default, makes a RESTful Ajax request
  // to the model's `url()`. Some possible customizations could be:
  //
  // * Use `setTimeout` to batch rapid-fire updates into a single request.
  // * Send up the models as XML instead of JSON.
  // * Persist models via WebSockets instead of Ajax.
  //
  // Turn on `Backbone.emulateHTTP` in order to send `PUT` and `DELETE` requests
  // as `POST`, with a `_method` parameter containing the true HTTP method,
  // as well as all requests with the body as `application/x-www-form-urlencoded`
  // instead of `application/json` with the model in a param named `model`.
  // Useful when interfacing with server-side languages like **PHP** that make
  // it difficult to read the body of `PUT` requests.
  Backbone.sync = function(method, model, options) {
    var type = methodMap[method];

    // Default options, unless specified.
    _.defaults(options || (options = {}), {
      emulateHTTP: Backbone.emulateHTTP,
      emulateJSON: Backbone.emulateJSON
    });

    // Default JSON-request options.
    var params = {type: type, dataType: 'json'};

    // Ensure that we have a URL.
    if (!options.url) {
      params.url = _.result(model, 'url') || urlError();
    }

    // Ensure that we have the appropriate request data.
    if (options.data == null && model && (method === 'create' || method === 'update' || method === 'patch')) {
      params.contentType = 'application/json';
      params.data = JSON.stringify(options.attrs || model.toJSON(options));
    }

    // For older servers, emulate JSON by encoding the request into an HTML-form.
    if (options.emulateJSON) {
      params.contentType = 'application/x-www-form-urlencoded';
      params.data = params.data ? {model: params.data} : {};
    }

    // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
    // And an `X-HTTP-Method-Override` header.
    if (options.emulateHTTP && (type === 'PUT' || type === 'DELETE' || type === 'PATCH')) {
      params.type = 'POST';
      if (options.emulateJSON) params.data._method = type;
      var beforeSend = options.beforeSend;
      options.beforeSend = function(xhr) {
        xhr.setRequestHeader('X-HTTP-Method-Override', type);
        if (beforeSend) return beforeSend.apply(this, arguments);
      };
    }

    // Don't process data on a non-GET request.
    if (params.type !== 'GET' && !options.emulateJSON) {
      params.processData = false;
    }

    // If we're sending a `PATCH` request, and we're in an old Internet Explorer
    // that still has ActiveX enabled by default, override jQuery to use that
    // for XHR instead. Remove this line when jQuery supports `PATCH` on IE8.
    if (params.type === 'PATCH' && window.ActiveXObject &&
          !(window.external && window.external.msActiveXFilteringEnabled)) {
      params.xhr = function() {
        return new ActiveXObject("Microsoft.XMLHTTP");
      };
    }

    // Make the request, allowing the user to override any Ajax options.
    var xhr = options.xhr = Backbone.ajax(_.extend(params, options));
    model.trigger('request', model, xhr, options);
    return xhr;
  };

  // Map from CRUD to HTTP for our default `Backbone.sync` implementation.
  var methodMap = {
    'create': 'POST',
    'update': 'PUT',
    'patch':  'PATCH',
    'delete': 'DELETE',
    'read':   'GET'
  };

  // Set the default implementation of `Backbone.ajax` to proxy through to `$`.
  // Override this if you'd like to use a different library.
  Backbone.ajax = function() {
    return Backbone.$.ajax.apply(Backbone.$, arguments);
  };

  // Backbone.Router
  // ---------------

  // Routers map faux-URLs to actions, and fire events when routes are
  // matched. Creating a new one sets its `routes` hash, if not set statically.
  var Router = Backbone.Router = function(options) {
    options || (options = {});
    if (options.routes) this.routes = options.routes;
    this._bindRoutes();
    this.initialize.apply(this, arguments);
  };

  // Cached regular expressions for matching named param parts and splatted
  // parts of route strings.
  var optionalParam = /\((.*?)\)/g;
  var namedParam    = /(\(\?)?:\w+/g;
  var splatParam    = /\*\w+/g;
  var escapeRegExp  = /[\-{}\[\]+?.,\\\^$|#\s]/g;

  // Set up all inheritable **Backbone.Router** properties and methods.
  _.extend(Router.prototype, Events, {

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Manually bind a single named route to a callback. For example:
    //
    //     this.route('search/:query/p:num', 'search', function(query, num) {
    //       ...
    //     });
    //
    route: function(route, name, callback) {
      if (!_.isRegExp(route)) route = this._routeToRegExp(route);
      if (_.isFunction(name)) {
        callback = name;
        name = '';
      }
      if (!callback) callback = this[name];
      var router = this;
      Backbone.history.route(route, function(fragment) {
        var args = router._extractParameters(route, fragment);
        callback && callback.apply(router, args);
        router.trigger.apply(router, ['route:' + name].concat(args));
        router.trigger('route', name, args);
        Backbone.history.trigger('route', router, name, args);
      });
      return this;
    },

    // Simple proxy to `Backbone.history` to save a fragment into the history.
    navigate: function(fragment, options) {
      Backbone.history.navigate(fragment, options);
      return this;
    },

    // Bind all defined routes to `Backbone.history`. We have to reverse the
    // order of the routes here to support behavior where the most general
    // routes can be defined at the bottom of the route map.
    _bindRoutes: function() {
      if (!this.routes) return;
      this.routes = _.result(this, 'routes');
      var route, routes = _.keys(this.routes);
      while ((route = routes.pop()) != null) {
        this.route(route, this.routes[route]);
      }
    },

    // Convert a route string into a regular expression, suitable for matching
    // against the current location hash.
    _routeToRegExp: function(route) {
      route = route.replace(escapeRegExp, '\\$&')
                   .replace(optionalParam, '(?:$1)?')
                   .replace(namedParam, function(match, optional){
                     return optional ? match : '([^\/]+)';
                   })
                   .replace(splatParam, '(.*?)');
      return new RegExp('^' + route + '$');
    },

    // Given a route, and a URL fragment that it matches, return the array of
    // extracted decoded parameters. Empty or unmatched parameters will be
    // treated as `null` to normalize cross-browser behavior.
    _extractParameters: function(route, fragment) {
      var params = route.exec(fragment).slice(1);
      return _.map(params, function(param) {
        return param ? decodeURIComponent(param) : null;
      });
    }

  });

  // Backbone.History
  // ----------------

  // Handles cross-browser history management, based on either
  // [pushState](http://diveintohtml5.info/history.html) and real URLs, or
  // [onhashchange](https://developer.mozilla.org/en-US/docs/DOM/window.onhashchange)
  // and URL fragments. If the browser supports neither (old IE, natch),
  // falls back to polling.
  var History = Backbone.History = function() {
    this.handlers = [];
    _.bindAll(this, 'checkUrl');

    // Ensure that `History` can be used outside of the browser.
    if (typeof window !== 'undefined') {
      this.location = window.location;
      this.history = window.history;
    }
  };

  // Cached regex for stripping a leading hash/slash and trailing space.
  var routeStripper = /^[#\/]|\s+$/g;

  // Cached regex for stripping leading and trailing slashes.
  var rootStripper = /^\/+|\/+$/g;

  // Cached regex for detecting MSIE.
  var isExplorer = /msie [\w.]+/;

  // Cached regex for removing a trailing slash.
  var trailingSlash = /\/$/;

  // Has the history handling already been started?
  History.started = false;

  // Set up all inheritable **Backbone.History** properties and methods.
  _.extend(History.prototype, Events, {

    // The default interval to poll for hash changes, if necessary, is
    // twenty times a second.
    interval: 50,

    // Gets the true hash value. Cannot use location.hash directly due to bug
    // in Firefox where location.hash will always be decoded.
    getHash: function(window) {
      var match = (window || this).location.href.match(/#(.*)$/);
      return match ? match[1] : '';
    },

    // Get the cross-browser normalized URL fragment, either from the URL,
    // the hash, or the override.
    getFragment: function(fragment, forcePushState) {
      if (fragment == null) {
        if (this._hasPushState || !this._wantsHashChange || forcePushState) {
          fragment = this.location.pathname;
          var root = this.root.replace(trailingSlash, '');
          if (!fragment.indexOf(root)) fragment = fragment.substr(root.length);
        } else {
          fragment = this.getHash();
        }
      }
      return fragment.replace(routeStripper, '');
    },

    // Start the hash change handling, returning `true` if the current URL matches
    // an existing route, and `false` otherwise.
    start: function(options) {
      if (History.started) throw new Error("Backbone.history has already been started");
      History.started = true;

      // Figure out the initial configuration. Do we need an iframe?
      // Is pushState desired ... is it available?
      this.options          = _.extend({}, {root: '/'}, this.options, options);
      this.root             = this.options.root;
      this._wantsHashChange = this.options.hashChange !== false;
      this._wantsPushState  = !!this.options.pushState;
      this._hasPushState    = !!(this.options.pushState && this.history && this.history.pushState);
      var fragment          = this.getFragment();
      var docMode           = document.documentMode;
      var oldIE             = (isExplorer.exec(navigator.userAgent.toLowerCase()) && (!docMode || docMode <= 7));

      // Normalize root to always include a leading and trailing slash.
      this.root = ('/' + this.root + '/').replace(rootStripper, '/');

      if (oldIE && this._wantsHashChange) {
        this.iframe = Backbone.$('<iframe src="javascript:0" tabindex="-1" />').hide().appendTo('body')[0].contentWindow;
        this.navigate(fragment);
      }

      // Depending on whether we're using pushState or hashes, and whether
      // 'onhashchange' is supported, determine how we check the URL state.
      if (this._hasPushState) {
        Backbone.$(window).on('popstate', this.checkUrl);
      } else if (this._wantsHashChange && ('onhashchange' in window) && !oldIE) {
        Backbone.$(window).on('hashchange', this.checkUrl);
      } else if (this._wantsHashChange) {
        this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
      }

      // Determine if we need to change the base url, for a pushState link
      // opened by a non-pushState browser.
      this.fragment = fragment;
      var loc = this.location;
      var atRoot = loc.pathname.replace(/[^\/]$/, '$&/') === this.root;

      // If we've started off with a route from a `pushState`-enabled browser,
      // but we're currently in a browser that doesn't support it...
      if (this._wantsHashChange && this._wantsPushState && !this._hasPushState && !atRoot) {
        this.fragment = this.getFragment(null, true);
        this.location.replace(this.root + this.location.search + '#' + this.fragment);
        // Return immediately as browser will do redirect to new url
        return true;

      // Or if we've started out with a hash-based route, but we're currently
      // in a browser where it could be `pushState`-based instead...
      } else if (this._wantsPushState && this._hasPushState && atRoot && loc.hash) {
        this.fragment = this.getHash().replace(routeStripper, '');
        this.history.replaceState({}, document.title, this.root + this.fragment + loc.search);
      }

      if (!this.options.silent) return this.loadUrl();
    },

    // Disable Backbone.history, perhaps temporarily. Not useful in a real app,
    // but possibly useful for unit testing Routers.
    stop: function() {
      Backbone.$(window).off('popstate', this.checkUrl).off('hashchange', this.checkUrl);
      clearInterval(this._checkUrlInterval);
      History.started = false;
    },

    // Add a route to be tested when the fragment changes. Routes added later
    // may override previous routes.
    route: function(route, callback) {
      this.handlers.unshift({route: route, callback: callback});
    },

    // Checks the current URL to see if it has changed, and if it has,
    // calls `loadUrl`, normalizing across the hidden iframe.
    checkUrl: function(e) {
      var current = this.getFragment();
      if (current === this.fragment && this.iframe) {
        current = this.getFragment(this.getHash(this.iframe));
      }
      if (current === this.fragment) return false;
      if (this.iframe) this.navigate(current);
      this.loadUrl() || this.loadUrl(this.getHash());
    },

    // Attempt to load the current URL fragment. If a route succeeds with a
    // match, returns `true`. If no defined routes matches the fragment,
    // returns `false`.
    loadUrl: function(fragmentOverride) {
      var fragment = this.fragment = this.getFragment(fragmentOverride);
      var matched = _.any(this.handlers, function(handler) {
        if (handler.route.test(fragment)) {
          handler.callback(fragment);
          return true;
        }
      });
      return matched;
    },

    // Save a fragment into the hash history, or replace the URL state if the
    // 'replace' option is passed. You are responsible for properly URL-encoding
    // the fragment in advance.
    //
    // The options object can contain `trigger: true` if you wish to have the
    // route callback be fired (not usually desirable), or `replace: true`, if
    // you wish to modify the current URL without adding an entry to the history.
    navigate: function(fragment, options) {
      if (!History.started) return false;
      if (!options || options === true) options = {trigger: options};
      fragment = this.getFragment(fragment || '');
      if (this.fragment === fragment) return;
      this.fragment = fragment;
      var url = this.root + fragment;

      // If pushState is available, we use it to set the fragment as a real URL.
      if (this._hasPushState) {
        this.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);

      // If hash changes haven't been explicitly disabled, update the hash
      // fragment to store history.
      } else if (this._wantsHashChange) {
        this._updateHash(this.location, fragment, options.replace);
        if (this.iframe && (fragment !== this.getFragment(this.getHash(this.iframe)))) {
          // Opening and closing the iframe tricks IE7 and earlier to push a
          // history entry on hash-tag change.  When replace is true, we don't
          // want this.
          if(!options.replace) this.iframe.document.open().close();
          this._updateHash(this.iframe.location, fragment, options.replace);
        }

      // If you've told us that you explicitly don't want fallback hashchange-
      // based history, then `navigate` becomes a page refresh.
      } else {
        return this.location.assign(url);
      }
      if (options.trigger) this.loadUrl(fragment);
    },

    // Update the hash location, either replacing the current entry, or adding
    // a new one to the browser history.
    _updateHash: function(location, fragment, replace) {
      if (replace) {
        var href = location.href.replace(/(javascript:|#).*$/, '');
        location.replace(href + '#' + fragment);
      } else {
        // Some browsers require that `hash` contains a leading #.
        location.hash = '#' + fragment;
      }
    }

  });

  // Create the default Backbone.history.
  Backbone.history = new History;

  // Helpers
  // -------

  // Helper function to correctly set up the prototype chain, for subclasses.
  // Similar to `goog.inherits`, but uses a hash of prototype properties and
  // class properties to be extended.
  var extend = function(protoProps, staticProps) {
    var parent = this;
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && _.has(protoProps, 'constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ return parent.apply(this, arguments); };
    }

    // Add static properties to the constructor function, if supplied.
    _.extend(child, parent, staticProps);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    var Surrogate = function(){ this.constructor = child; };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate;

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) _.extend(child.prototype, protoProps);

    // Set a convenience property in case the parent's prototype is needed
    // later.
    child.__super__ = parent.prototype;

    return child;
  };

  // Set up inheritance for the model, collection, router, view and history.
  Model.extend = Collection.extend = Router.extend = View.extend = History.extend = extend;

  // Throw an error when a URL is needed, and none is supplied.
  var urlError = function() {
    throw new Error('A "url" property or function must be specified');
  };

  // Wrap an optional error callback with a fallback error event.
  var wrapError = function (model, options) {
    var error = options.error;
    options.error = function(resp) {
      if (error) error(model, resp, options);
      model.trigger('error', model, resp, options);
    };
  };

}).call(this);

})()
},{"underscore":9}],110:[function(require,module,exports){
(function(){/* global window, $ */

var _ = require('underscore'),
  DetailView = require('../detailed/Controller.js'),
  ChartView = require('./ChartView.js'),
  ChartModel = require('./ChartModel.js'),
  TsCollection = require('./TimeSeriesCollection.js'),
  TsModel = require('./TimeSeriesModel.js'),
  Settings = require('./utils/ChartSettings.js');


var NumericalsPlugin = module.exports = function (events, params, node) {

  this.seriesCollection = null;

  /* Base event containers */
  this.eventsToAdd = [];
  this.eventsToRem = [];
  this.eventsToCha = [];

  this.debounceRefresh = _.debounce(function () {
    this.refreshCollection();
  }, 1000);

  this.debounceResize = _.debounce(function () {
    this.resize();
  }, 1500);

  this.events = {};
  this.highlightedTime = Infinity;
  this.modelView = null;
  this.view = null;
  this.eventDisplayed = null;
  this.container = null;
  this.needToRender = null;
  this.datas = {};
  this.streamIds = {};
  this.eventsNode = node;
  this.hasDetailedView = false;
  this.$modal = $('#pryv-modal').on('hidden.bs.modal', function () {
    if (this.detailedView) {
      this.detailedView.close();
      this.detailedView = null;
    }
  }.bind(this));
  _.extend(this, params);

  for (var e in events) {
    if (events.hasOwnProperty(e)) {
      this.eventEnter(events[e]);
    }
  }
  $(window).resize(this.debounceRefresh.bind(this));

};
NumericalsPlugin.prototype.eventEnter = function (event) {
  this.streamIds[event.streamId] = event;
  this.events[event.id] = event;
  if (!this.datas[event.streamId]) {
    this.datas[event.streamId] = {};
  }
  if (!this.datas[event.streamId][event.type]) {
    this.datas[event.streamId][event.type] = {};
  }
  this.datas[event.streamId][event.type][event.id] = event;
  this.needToRender = true;
  if (this.hasDetailedView) {
    this.treeMap.addEventsDetailedView(event);
  }
  this.eventsToAdd.push(event);
  this.debounceRefresh();
};

NumericalsPlugin.prototype.eventLeave = function (event) {
  if (this.events[event.id]) {
    delete this.events[event.id];
    delete this.datas[event.streamId][event.type][event.id];
    this.needToRender = true;
    if (this.hasDetailedView) {
      this.treeMap.deleteEventDetailedView(event);
    }
    this.eventsToRem.push(event);
    this.debounceRefresh();
  }
};

NumericalsPlugin.prototype.eventChange = function (event) {
  if (this.events[event.id]) {
    this.events[event.id] = event;
    this.datas[event.streamId][event.type][event.id] = event;
    this.needToRender = true;
    if (this.hasDetailedView) {
      this.treeMap.updateEventDetailedView(event);
    }
    this.eventsToCha.push(event);
    this.debounceRefresh();
  }
};

NumericalsPlugin.prototype.OnDateHighlightedChange = function (time) {
  if (time) {
    this.highlightedTime = time;
  }
  if (this.view) {
    this.view.onDateHighLighted(time);
  }
  if (this.hasDetailedView) {
    this.treeMap.highlightDateDetailedView(this.highlightedTime);
  }
};

NumericalsPlugin.prototype.render = function (container) {
  this.container = container;
  this.needToRender = true;
  this.debounceRefresh();
};
NumericalsPlugin.prototype.refresh = function (object) {
  _.extend(this, object);
  this.needToRender = true;
  this.debounceRefresh();
};

NumericalsPlugin.prototype.close = function () {
  if (this.view) {
    this.view.close();
  }

  delete this.modelView;
  delete this.view;
  this.view = null;
  this.events = null;
  this.datas = null;
  this.highlightedTime = Infinity;
  this.modelView = null;
  this.eventDisplayed = null;
  this.needToRender = false;
};


NumericalsPlugin.prototype.refreshCollection = function () {
  if (this.seriesCollection === null) {
    this.seriesCollection = new TsCollection([], {type: 'any'});
  }

  var eventsToAdd = this.eventsToAdd;
  var eventsToRem = this.eventsToRem;
  var eventsToCha = this.eventsToCha;

  var eventsModel;
  var events;
  var matching;

  this.eventsToAdd = [];
  this.eventsToRem = [];
  this.eventsToCha = [];

  var i;
  var eIter;

  // Process those to add
  for (i = 0; i < eventsToAdd.length; ++i) {
    var filter = {
      connectionId: eventsToAdd[i].connection.id,
      streamId: eventsToAdd[i].streamId,
      type: eventsToAdd[i].type
    };


      // find corresponding model
    matching = this.seriesCollection.where(filter);
    if (matching && matching.length !== 0) {
      eventsModel = matching[0];
      eventsModel.get('events').push(eventsToAdd[i]);
    } else {
      var s = new Settings(eventsToAdd[i].stream,
        eventsToAdd[i].type, this.eventsNode.parent.stream.virtual);
      eventsModel = new TsModel({
        events: [eventsToAdd[i]],
        connectionId: eventsToAdd[i].connection.id,
        streamId: eventsToAdd[i].streamId,
        streamName: eventsToAdd[i].stream.name,
        type: eventsToAdd[i].type,
        category: 'any',
        virtual: this.eventsNode.parent.stream.virtual,
        color: s.get('color'),
        style: s.get('style'),
        transform: s.get('transform'),
        interval: s.get('interval'),
        fitting: s.get('fitting')
      });
      this.seriesCollection.add(eventsModel);
    }
  }

  // Process those to remove
  for (i = 0; i < eventsToRem.length; ++i) {
      // find corresponding model
    matching = this.seriesCollection.where({
      connectionId: eventsToRem[i].connection.id,
      streamId: eventsToRem[i].streamId,
      type: eventsToRem[i].type
    });
    if (matching && matching.length !== 0) {
      eventsModel = matching[0];
      events = eventsModel.get('events');
      var events_new = [];
      for (eIter = 0; eIter < events.length; ++eIter) {
        if (events[eIter].id !== eventsToRem[i].id) {
          events_new.push(events[eIter]);
        }
      }
      if (events_new.length === 0) {
        this.seriesCollection.remove(eventsModel);
      } else {
        eventsModel.set('events', events_new);
      }
    }
  }


  // Process those to change
  for (i = 0; i < eventsToCha.length; ++i) {
    // find corresponding model
    matching = this.seriesCollection.where({
      connectionId: eventsToCha[i].connection.id,
      streamId: eventsToCha[i].streamId,
      type: eventsToCha[i].type
    });
    if (matching && matching.length !== 0) {
      eventsModel = matching[0];
      events = eventsModel.get('events');
      for (eIter = 0; eIter < events.length; ++eIter) {
        if (events[eIter].id === eventsToCha[i].id) {
          events[eIter] = eventsToCha[i];
        }
      }
    }
  }


  if ((!this.modelView || !this.view) && this.seriesCollection.length !== 0 && this.container) {
    this.modelView = new ChartModel({
        container: '#' + this.container,
        view: null,
        requiresDim: true,
        collection: this.seriesCollection,
        highlighted: false,
        highlightedTime: null,
        allowPieChart: false,
        dimensions: this.computeDimensions(),
        legendStyle: 'table', // Legend style: 'list', 'table'
        legendButton: false,  // A button in the legend
        legendShow: 'size',     // Show legend or not
        legendExtras: true,   // use extras in the legend
        onClick: true,
        onHover: true,
        onDnD: true,
        allowPan: false,      // Allows navigation through the chart
        allowZoom: false,     // Allows zooming on the chart
        panZoomButton: false,
        xaxis: false
      });
    if (typeof(document) !== 'undefined')  {
      this.view = new ChartView({model: this.modelView});
      this.modelView.set('dimensions', this.computeDimensions());
      $('#' + this.container).resize(function () {
        this.debounceResize.bind(this);
      }.bind(this));
      this.view.render();
      this.view.onDateHighLighted(this.highlightedTime);
      this.view.on('chart:dropped', this.onDragAndDrop.bind(this));
      this.view.on('chart:resize', this.resize.bind(this));
      this.view.on('nodeClicked', function () {
        if (!this.detailedView) {
          this.detailedView = new DetailView(this.$modal);
        }
        this.detailedView.addEvents(this.events);
        this.detailedView.show();
        this.detailedView.highlightDate(this.highlightedTime);
        this.detailedView.virtual = this.eventsNode.parent.stream.virtual;
      }.bind(this));
    }
  } else if (this.view) {
    this.view.render();
    this.view.onDateHighLighted(this.highlightedTime);
    this.debounceResize();
  }

};


NumericalsPlugin.prototype._findEventToDisplay = function () {
  if (this.highlightedTime === Infinity) {
    var oldestTime = 0;
    _.each(this.events, function (event) {
      if (event.time >= oldestTime) {
        oldestTime = event.time;
        this.eventDisplayed = event;
      }
    }, this);

  } else {
    var timeDiff = Infinity, debounceRefresh = 0;
    _.each(this.events, function (event) {
      debounceRefresh = Math.abs(event.time - this.highlightedTime);
      if (debounceRefresh <= timeDiff) {
        timeDiff = debounceRefresh;
        this.eventDisplayed = event;
      }
    }, this);
  }
};


/**
 * Propagates the drag and drop event further up to the TreeMap controller
 * @param nodeId
 * @param streamId
 * @param connectionId
 */
NumericalsPlugin.prototype.onDragAndDrop = function (nodeId, streamId, connectionId) {
  this.eventsNode.dragAndDrop(nodeId, streamId, connectionId);
};

NumericalsPlugin.prototype.computeDimensions = function () {
  var chartSizeWidth = null;
  var chartSizeHeight = null;

  if (this.width !== null) {
    chartSizeWidth = this.width;
  } else if ($('#' + this.container).length)  {
    chartSizeWidth = $('#' + this.container).width();
  } else if ($('#' + this.container).length)  {
    chartSizeWidth = parseInt($('#' + this.container).prop('style').width.split('px')[0], 0);
  }

  if (this.height !== null) {
    chartSizeHeight = this.height;
  } else if ($('#' + this.container).length)  {
    chartSizeHeight = $('#' + this.container).height();
  } else if ($('#' + this.container).length)  {
    chartSizeHeight = parseInt($('#' + this.container).prop('style').height.split('px')[0], 0);
  }

  return {width: chartSizeWidth, height: chartSizeHeight};
};

NumericalsPlugin.prototype.resize = function () {
  this.modelView.set('dimensions', this.computeDimensions());
  this.modelView.set('container', '#' + this.container);
  this.view.resize();
};

})()
},{"../detailed/Controller.js":20,"./ChartModel.js":86,"./ChartView.js":85,"./TimeSeriesCollection.js":87,"./TimeSeriesModel.js":88,"./utils/ChartSettings.js":41,"underscore":9}],108:[function(require,module,exports){
var _ = require('underscore'),
  GenericsView = require('./View.js'),
  CommonModel = require('../common/Model.js');

module.exports = CommonModel.implement(
  function (events, params) {
    CommonModel.call(this, events, params);
    this.typeView = GenericsView;
    this.eventDisplayed = null;
    this.modelContent = {};
  },
  {
    beforeRefreshModelView: function () {
      this.modelContent = {
        content: this.eventDisplayed.content,
        description: this.eventDisplayed.description,
        id: this.eventDisplayed.id,
        modified: this.eventDisplayed.modified,
        streamId: this.eventDisplayed.streamId,
        tags: this.eventDisplayed.tags,
        time: this.eventDisplayed.time,
        type: this.eventDisplayed.type,
        eventsNbr: _.size(this.events)
      };
    }
  }
);
},{"../common/Model.js":118,"./View.js":117,"underscore":9}],114:[function(require,module,exports){
var _ = require('underscore'),
  NotesView = require('./View.js'),
  CommonModel = require('../common/Model.js');

module.exports = CommonModel.implement(
  function (events, params) {
    CommonModel.call(this, events, params);
    this.typeView = NotesView;
    this.eventDisplayed = null;
    this.modelContent = {};
  },
  {
    beforeRefreshModelView: function () {
      this.modelContent = {
        content: this.eventDisplayed.content,
        description: this.eventDisplayed.description,
        id: this.eventDisplayed.id,
        modified: this.eventDisplayed.modified,
        streamId: this.eventDisplayed.streamId,
        tags: this.eventDisplayed.tags,
        time: this.eventDisplayed.time,
        type: this.eventDisplayed.type,
        eventsNbr: _.size(this.events)
      };
    }
  }
);
},{"../common/Model.js":118,"./View.js":119,"underscore":9}],113:[function(require,module,exports){
var _ = require('underscore'),
  TweetView = require('./View.js'),
  CommonModel = require('../common/Model.js');

module.exports = CommonModel.implement(
  function (events, params) {
    CommonModel.call(this, events, params);
    this.typeView = TweetView;
    this.eventDisplayed = null;
    this.modelContent = {};
  },
  {
    beforeRefreshModelView: function () {
      this.modelContent = {
        content: this.eventDisplayed.content,
        description: this.eventDisplayed.description,
        id: this.eventDisplayed.id,
        modified: this.eventDisplayed.modified,
        streamId: this.eventDisplayed.streamId,
        tags: this.eventDisplayed.tags,
        time: this.eventDisplayed.time,
        type: this.eventDisplayed.type,
        width: this.width,
        height: this.height,
        eventsNbr: _.size(this.events)
      };
    }
  }
);
},{"../common/Model.js":118,"./View.js":120,"underscore":9}],111:[function(require,module,exports){
var _ = require('underscore'),
  PicturesView = require('./View.js'),
  CommonModel = require('../common/Model.js');

module.exports = CommonModel.implement(
  function (events, params) {
    CommonModel.call(this, events, params);
    this.typeView = PicturesView;
    this.eventDisplayed = null;
    this.modelContent = {};
  },
  {
    beforeRefreshModelView: function () {
      this.modelContent = {
        content: this.eventDisplayed.content,
        description: this.eventDisplayed.description,
        id: this.eventDisplayed.id,
        modified: this.eventDisplayed.modified,
        streamId: this.eventDisplayed.streamId,
        tags: this.eventDisplayed.tags,
        time: this.eventDisplayed.time,
        type: this.eventDisplayed.type,
        picUrl: this.eventDisplayed.getPicturePreview(this.width, this.height),
        eventsNbr: _.size(this.events)
      };
    }
  }
);
},{"../common/Model.js":118,"./View.js":121,"underscore":9}],112:[function(require,module,exports){
var _ = require('underscore'),
  PositionsView = require('./View.js'),
  CommonModel = require('../common/Model.js');

module.exports = CommonModel.implement(
  function (events, params) {
    CommonModel.call(this, events, params);
    this.typeView = PositionsView;
    this.modelContent = {};
    this.positions = [];
  },

  {
    OnDateHighlightedChange: function (time) {
      this.highlightedTime = time;
      if (this.view) {
        this.view.onDateHighLighted(time);
      }
      if (this.detailedView) {
        this.detailedView.highlightDate(this.highlightedTime);
      }
    },

    _findEventToDisplay: function () {},

    beforeRefreshModelView: function () {
      // if (this.positions.length !== _.size(this.events)) {
      this.positions = [];
      _.each(this.events, function (event) {
        this.positions.push(event);
      }, this);
      this.positions = this.positions.sort(function (a, b) {
        return a.time <= b.time ? -1 : 1;
      });
      //  }
      this.modelContent = {
        positions: this.positions,
        posWidth: this.width,
        posHeight: this.height,
        id: this.id,
        eventsNbr: this.positions.length
      };
    }
  }
);
},{"../common/Model.js":118,"./View.js":122,"underscore":9}],102:[function(require,module,exports){
(function(){(function (root, factory) {
  if (typeof exports === 'object') {

    var underscore = require('underscore');
    var backbone = require('backbone');

    module.exports = factory(underscore, backbone);

  } else if (typeof define === 'function' && define.amd) {

    define(['underscore', 'backbone'], factory);

  } 
}(this, function (_, Backbone) {
  "use strict";

  Backbone.Wreqr = (function(Backbone, Marionette, _){
  "use strict";
  var Wreqr = {};

  // Handlers
// --------
// A registry of functions to call, given a name

Wreqr.Handlers = (function(Backbone, _){
  "use strict";
  
  // Constructor
  // -----------

  var Handlers = function(options){
    this.options = options;
    this._wreqrHandlers = {};
    
    if (_.isFunction(this.initialize)){
      this.initialize(options);
    }
  };

  Handlers.extend = Backbone.Model.extend;

  // Instance Members
  // ----------------

  _.extend(Handlers.prototype, Backbone.Events, {

    // Add multiple handlers using an object literal configuration
    setHandlers: function(handlers){
      _.each(handlers, function(handler, name){
        var context = null;

        if (_.isObject(handler) && !_.isFunction(handler)){
          context = handler.context;
          handler = handler.callback;
        }

        this.setHandler(name, handler, context);
      }, this);
    },

    // Add a handler for the given name, with an
    // optional context to run the handler within
    setHandler: function(name, handler, context){
      var config = {
        callback: handler,
        context: context
      };

      this._wreqrHandlers[name] = config;

      this.trigger("handler:add", name, handler, context);
    },

    // Determine whether or not a handler is registered
    hasHandler: function(name){
      return !! this._wreqrHandlers[name];
    },

    // Get the currently registered handler for
    // the specified name. Throws an exception if
    // no handler is found.
    getHandler: function(name){
      var config = this._wreqrHandlers[name];

      if (!config){
        throw new Error("Handler not found for '" + name + "'");
      }

      return function(){
        var args = Array.prototype.slice.apply(arguments);
        return config.callback.apply(config.context, args);
      };
    },

    // Remove a handler for the specified name
    removeHandler: function(name){
      delete this._wreqrHandlers[name];
    },

    // Remove all handlers from this registry
    removeAllHandlers: function(){
      this._wreqrHandlers = {};
    }
  });

  return Handlers;
})(Backbone, _);

  // Wreqr.CommandStorage
// --------------------
//
// Store and retrieve commands for execution.
Wreqr.CommandStorage = (function(){
  "use strict";

  // Constructor function
  var CommandStorage = function(options){
    this.options = options;
    this._commands = {};

    if (_.isFunction(this.initialize)){
      this.initialize(options);
    }
  };

  // Instance methods
  _.extend(CommandStorage.prototype, Backbone.Events, {

    // Get an object literal by command name, that contains
    // the `commandName` and the `instances` of all commands
    // represented as an array of arguments to process
    getCommands: function(commandName){
      var commands = this._commands[commandName];

      // we don't have it, so add it
      if (!commands){

        // build the configuration
        commands = {
          command: commandName, 
          instances: []
        };

        // store it
        this._commands[commandName] = commands;
      }

      return commands;
    },

    // Add a command by name, to the storage and store the
    // args for the command
    addCommand: function(commandName, args){
      var command = this.getCommands(commandName);
      command.instances.push(args);
    },

    // Clear all commands for the given `commandName`
    clearCommands: function(commandName){
      var command = this.getCommands(commandName);
      command.instances = [];
    }
  });

  return CommandStorage;
})();

  // Wreqr.Commands
// --------------
//
// A simple command pattern implementation. Register a command
// handler and execute it.
Wreqr.Commands = (function(Wreqr){
  "use strict";

  return Wreqr.Handlers.extend({
    // default storage type
    storageType: Wreqr.CommandStorage,

    constructor: function(options){
      this.options = options || {};

      this._initializeStorage(this.options);
      this.on("handler:add", this._executeCommands, this);

      var args = Array.prototype.slice.call(arguments);
      Wreqr.Handlers.prototype.constructor.apply(this, args);
    },

    // Execute a named command with the supplied args
    execute: function(name, args){
      name = arguments[0];
      args = Array.prototype.slice.call(arguments, 1);

      if (this.hasHandler(name)){
        this.getHandler(name).apply(this, args);
      } else {
        this.storage.addCommand(name, args);
      }

    },

    // Internal method to handle bulk execution of stored commands
    _executeCommands: function(name, handler, context){
      var command = this.storage.getCommands(name);

      // loop through and execute all the stored command instances
      _.each(command.instances, function(args){
        handler.apply(context, args);
      });

      this.storage.clearCommands(name);
    },

    // Internal method to initialize storage either from the type's
    // `storageType` or the instance `options.storageType`.
    _initializeStorage: function(options){
      var storage;

      var StorageType = options.storageType || this.storageType;
      if (_.isFunction(StorageType)){
        storage = new StorageType();
      } else {
        storage = StorageType;
      }

      this.storage = storage;
    }
  });

})(Wreqr);

  // Wreqr.RequestResponse
// ---------------------
//
// A simple request/response implementation. Register a
// request handler, and return a response from it
Wreqr.RequestResponse = (function(Wreqr){
  "use strict";

  return Wreqr.Handlers.extend({
    request: function(){
      var name = arguments[0];
      var args = Array.prototype.slice.call(arguments, 1);

      return this.getHandler(name).apply(this, args);
    }
  });

})(Wreqr);

  // Event Aggregator
// ----------------
// A pub-sub object that can be used to decouple various parts
// of an application through event-driven architecture.

Wreqr.EventAggregator = (function(Backbone, _){
  "use strict";
  var EA = function(){};

  // Copy the `extend` function used by Backbone's classes
  EA.extend = Backbone.Model.extend;

  // Copy the basic Backbone.Events on to the event aggregator
  _.extend(EA.prototype, Backbone.Events);

  return EA;
})(Backbone, _);


  return Wreqr;
})(Backbone, Backbone.Marionette, _);

  return Backbone.Wreqr; 

}));


})()
},{"backbone":103,"underscore":9}],104:[function(require,module,exports){
// Backbone.BabySitter
// -------------------
// v0.0.6
//
// Copyright (c)2013 Derick Bailey, Muted Solutions, LLC.
// Distributed under MIT license
//
// http://github.com/babysitterjs/backbone.babysitter

(function (root, factory) {
  if (typeof exports === 'object') {

    var underscore = require('underscore');
    var backbone = require('backbone');

    module.exports = factory(underscore, backbone);

  } else if (typeof define === 'function' && define.amd) {

    define(['underscore', 'backbone'], factory);

  } 
}(this, function (_, Backbone) {
  "option strict";

  // Backbone.ChildViewContainer
// ---------------------------
//
// Provide a container to store, retrieve and
// shut down child views.

Backbone.ChildViewContainer = (function(Backbone, _){
  
  // Container Constructor
  // ---------------------

  var Container = function(views){
    this._views = {};
    this._indexByModel = {};
    this._indexByCustom = {};
    this._updateLength();

    _.each(views, this.add, this);
  };

  // Container Methods
  // -----------------

  _.extend(Container.prototype, {

    // Add a view to this container. Stores the view
    // by `cid` and makes it searchable by the model
    // cid (and model itself). Optionally specify
    // a custom key to store an retrieve the view.
    add: function(view, customIndex){
      var viewCid = view.cid;

      // store the view
      this._views[viewCid] = view;

      // index it by model
      if (view.model){
        this._indexByModel[view.model.cid] = viewCid;
      }

      // index by custom
      if (customIndex){
        this._indexByCustom[customIndex] = viewCid;
      }

      this._updateLength();
    },

    // Find a view by the model that was attached to
    // it. Uses the model's `cid` to find it.
    findByModel: function(model){
      return this.findByModelCid(model.cid);
    },

    // Find a view by the `cid` of the model that was attached to
    // it. Uses the model's `cid` to find the view `cid` and
    // retrieve the view using it.
    findByModelCid: function(modelCid){
      var viewCid = this._indexByModel[modelCid];
      return this.findByCid(viewCid);
    },

    // Find a view by a custom indexer.
    findByCustom: function(index){
      var viewCid = this._indexByCustom[index];
      return this.findByCid(viewCid);
    },

    // Find by index. This is not guaranteed to be a
    // stable index.
    findByIndex: function(index){
      return _.values(this._views)[index];
    },

    // retrieve a view by it's `cid` directly
    findByCid: function(cid){
      return this._views[cid];
    },

    // Remove a view
    remove: function(view){
      var viewCid = view.cid;

      // delete model index
      if (view.model){
        delete this._indexByModel[view.model.cid];
      }

      // delete custom index
      _.any(this._indexByCustom, function(cid, key) {
        if (cid === viewCid) {
          delete this._indexByCustom[key];
          return true;
        }
      }, this);

      // remove the view from the container
      delete this._views[viewCid];

      // update the length
      this._updateLength();
    },

    // Call a method on every view in the container,
    // passing parameters to the call method one at a
    // time, like `function.call`.
    call: function(method){
      this.apply(method, _.tail(arguments));
    },

    // Apply a method on every view in the container,
    // passing parameters to the call method one at a
    // time, like `function.apply`.
    apply: function(method, args){
      _.each(this._views, function(view){
        if (_.isFunction(view[method])){
          view[method].apply(view, args || []);
        }
      });
    },

    // Update the `.length` attribute on this container
    _updateLength: function(){
      this.length = _.size(this._views);
    }
  });

  // Borrowing this code from Backbone.Collection:
  // http://backbonejs.org/docs/backbone.html#section-106
  //
  // Mix in methods from Underscore, for iteration, and other
  // collection related features.
  var methods = ['forEach', 'each', 'map', 'find', 'detect', 'filter', 
    'select', 'reject', 'every', 'all', 'some', 'any', 'include', 
    'contains', 'invoke', 'toArray', 'first', 'initial', 'rest', 
    'last', 'without', 'isEmpty', 'pluck'];

  _.each(methods, function(method) {
    Container.prototype[method] = function() {
      var views = _.values(this._views);
      var args = [views].concat(_.toArray(arguments));
      return _[method].apply(_, args);
    };
  });

  // return the public API
  return Container;
})(Backbone, _);

  return Backbone.ChildViewContainer; 

}));


},{"backbone":103,"underscore":9}],118:[function(require,module,exports){
(function(){/* global $*/
var _ = require('underscore'),
  Backbone = require('backbone');
var Model = module.exports = function (events, params) {
  this.verbose = false;
  this.events = {};
  this.modelContent = {};
  _.each(events, function (event) {
    this.events[event.id] = event;
  }, this);
  this.highlightedTime = Infinity;
  this.modelView = null;
  this.view = null;
  this.eventDisplayed = null;
  this.container = null;
  this.needToRender = null;
  this.typeView = null;
  this.animationIn = null;
  this.animationOut = null;
  this.hasDetailedView = false;
  _.extend(this, params);
  this.debounceRefresh = _.debounce(function () {
    if (!_.isEmpty(this.events)) {
      this._refreshModelView();
    }
  }, 100);
  this.debounceRefresh();
};

Model.implement = function (constructor, members) {
  var newImplementation = constructor;
  if (typeof Object.create === 'undefined') {
    Object.create = function (prototype) {
      function C() { }
      C.prototype = prototype;
      return new C();
    };
  }
  newImplementation.prototype = Object.create(this.prototype);
  _.extend(newImplementation.prototype, members);
  newImplementation.implement = this.implement;
  return newImplementation;
};

_.extend(Model.prototype, {
  eventEnter: function (event) {
    if (this.events[event.id] && this.verbose) {
      console.log(this.container, 'eventEnter: this eventId already exist:', event.id,
        'current:', this.events[event.id], 'new:', event);
    }
    this.events[event.id] = event;
    if (this.hasDetailedView) {
      this.treeMap.addEventsDetailedView(event);
    }

    this.debounceRefresh();
  },
  eventLeave: function (event) {
    if (!this.events[event.id] && this.verbose) {
      console.log(this.container, 'eventLeave: this eventId dont exist:', event.id,
        'event:', event);
    }
    delete this.events[event.id];
    if (this.hasDetailedView) {
      this.treeMap.deleteEventDetailedView(event);
    }
    //if (!_.isEmpty(this.events)) {
    this.debounceRefresh();
    //}
  },
  eventChange: function (event) {
    if (!this.events[event.id] && this.verbose) {
      console.log(this.container, 'eventChange: this eventId dont exist:', event.id,
        'event:', event);
    }
    this.events[event.id] = event;
    if (this.hasDetailedView) {
      this.treeMap.updateEventDetailedView(event);
    }
    this.debounceRefresh();
  },
  OnDateHighlightedChange: function (time) {
    this.animationIn = time < this.highlightedTime ? 'fadeInLeftBig' : 'fadeInRightBig';
    this.animationOut = time < this.highlightedTime ? 'fadeOutRightBig' : 'fadeOutLeftBig';
    this.highlightedTime = time;
    if (this.hasDetailedView) {
      this.treeMap.highlightDateDetailedView(this.highlightedTime);
    }
    this.debounceRefresh();
  },
  render: function (container) {
    this.container = container;
    if (this.view) {
      this.view.renderView(this.container, this.animationIn);
    } else {
      this.needToRender = true;
    }
  },
  refresh: function (newParams) {
    _.extend(this, newParams);
    this.debounceRefresh();
  },
  close: function () {
    if (this.view) {
      this.view.close(this.animationOut);
    }
    this.view = null;
    this.events = null;
    this.highlightedTime = Infinity;
    this.modelView = null;
    this.eventDisplayed = null;
  },
  beforeRefreshModelView: function () {},
  afterRefreshModelView: function () {},
  _refreshModelView: function () {
    this._findEventToDisplay();
    this.beforeRefreshModelView();
    if (!this.modelView) {
      var BasicModel = Backbone.Model.extend({});
      this.modelView = new BasicModel({});
    }

    // Update the model
    _.each(_.keys(this.modelContent), function (key) {
      this.modelView.set(key, this.modelContent[key]);
    }, this);

    if (!this.view) {
      if (typeof(document) !== 'undefined')  {
        this.view = new this.typeView({model: this.modelView});
        this.view.on('nodeClicked', function () {
          if (!this.hasDetailedView) {
            this.hasDetailedView = true;
            var $modal =  $('#pryv-modal').on('hidden.bs.modal', function () {
              this.treeMap.closeDetailedView();
              this.hasDetailedView = false;
            }.bind(this));
            this.treeMap.initDetailedView($modal, this.events, this.highlightedTime, this.view.$el);
          }
        }.bind(this));
      }
    }
    this.view.off('nodeClicked');
    this.view.on('nodeClicked', function () {
      if (!this.hasDetailedView) {
        this.hasDetailedView = true;
        var $modal =  $('#pryv-modal').on('hidden.bs.modal', function () {
          this.treeMap.closeDetailedView();
          this.hasDetailedView = false;
        }.bind(this));
        this.treeMap.initDetailedView($modal, this.events, this.highlightedTime, this.view.$el);
      }
    }.bind(this));
    if (this.needToRender) {
      this.view.renderView(this.container, this.animationIn);
      this.needToRender = false;
    }
    this.afterRefreshModelView();
  },

  _findEventToDisplay: function () {
    if (this.highlightedTime === Infinity) {
      var oldestTime = 0;
      _.each(this.events, function (event) {
        if (event.time >= oldestTime) {
          oldestTime = event.time;
          this.eventDisplayed = event;
        }
      }, this);

    } else {
      var timeDiff = Infinity, debounceRefresh = 0;
      _.each(this.events, function (event) {
        debounceRefresh = Math.abs(event.time - this.highlightedTime);
        if (debounceRefresh <= timeDiff) {
          timeDiff = debounceRefresh;
          this.eventDisplayed = event;
        }
      }, this);
    }
  }

});
})()
},{"backbone":30,"underscore":9}],117:[function(require,module,exports){
(function(){/* global $ */
var  Marionette = require('backbone.marionette');

module.exports = Marionette.ItemView.extend({
  template: '#genericsView',
  container: null,
  animation: null,
  initialize: function () {
    this.listenTo(this.model, 'change', this.change);
    this.$el.css('height', '100%');
    this.$el.css('width', '100%');
    this.$el.addClass('animated node');
  },
  change: function () {
    $('#' + this.container).removeClass('animated ' + this.animation);
    this.animation = 'tada';
    this.render();
  },
  renderView: function (container) {
    this.container = container;
    this.animation = 'bounceIn';
    this.render();
  },
  onRender: function () {
    if (this.container) {
      $('#' + this.container).removeClass('animated fadeIn');
      $('#' + this.container).html(this.el);
      $('#' + this.container).bind('click', function () {
        this.trigger('nodeClicked');
      }.bind(this));
      $('#' + this.container).addClass('animated ' + this.animation);
      setTimeout(function () {
        $('#' + this.container).removeClass('animated ' + this.animation);
      }.bind(this), 1000);
    }
  },
  close: function () {
    this.remove();
  }
});
})()
},{"backbone.marionette":32}],119:[function(require,module,exports){
(function(){/* global $ */
var  Marionette = require('backbone.marionette');

module.exports = Marionette.ItemView.extend({
  template: '#notesView',
  container: null,
  animation: null,
  initialize: function () {
    this.listenTo(this.model, 'change', this.change);
    this.$el.css('height', '100%');
    this.$el.css('width', '100%');
    this.$el.addClass('animated node singleNote ');

  },
  change: function () {
    $('#' + this.container).removeClass('animated ' + this.animation);
    this.animation = 'tada';
    this.$el.attr('id', this.model.get('id'));
    this.render();
  },
  renderView: function (container) {
    this.container = container;
    this.animation = 'bounceIn';
    this.render();
  },
  onRender: function () {
    if (this.container) {
      $('#' + this.container).removeClass('animated fadeIn');
      $('#' + this.container).html(this.el);
      $('#' + this.container).bind('click', function () {
        this.trigger('nodeClicked');
      }.bind(this));
      $('#' + this.container).addClass('animated ' + this.animation);
      setTimeout(function () {
        $('#' + this.container).removeClass('animated ' + this.animation);
      }.bind(this), 1000);
    }
  },
  close: function () {
    this.remove();
  }
});
})()
},{"backbone.marionette":32}],121:[function(require,module,exports){
(function(){/* global $ */
var  Marionette = require('backbone.marionette');

module.exports = Marionette.ItemView.extend({
  template: '#picturesView',
  container: null,
  animation: null,
  currentId: null,
  initialize: function () {
    this.listenTo(this.model, 'change', this.change);
    this.$el.css('height', '100%');
    this.$el.css('width', '100%');
    this.$el.addClass('animated node');

  },
  change: function () {
    if (!this.currentId || this.currentId !== this.model.get('id')) {
      $('#' + this.container).removeClass('animated ' + this.animation);
      this.animation = 'tada';
      this.$el.attr('id', this.model.get('id'));
      this.currentId = this.model.get('id');
    } else {
      this.animation = null;
    }
    this.render();
  },
  renderView: function (container) {
    this.container = container;
    this.animation = 'bounceIn';
    this.currentId = this.model.get('id');
    this.render();
  },
  onRender: function () {
    if (this.container) {
      this.$el.css(
        {'background': 'url(' + this.model.get('picUrl') + ') no-repeat center center',
          '-webkit-background-size': 'cover',
          '-moz-background-size': 'cover',
          '-o-background-size': 'cover',
          'background-size': 'cover'
        });
      $('#' + this.container).removeClass('animated fadeIn');
      $('#' + this.container).html(this.el);
      $('#' + this.container).bind('click', function () {
        this.trigger('nodeClicked');
      }.bind(this));
      if (this.animation) {
        $('#' + this.container).addClass('animated ' + this.animation);
        setTimeout(function () {
          $('#' + this.container).removeClass('animated ' + this.animation);
        }.bind(this), 1000);
      }
    }
  },
  close: function () {
    this.remove();
  }
});
})()
},{"backbone.marionette":32}],120:[function(require,module,exports){
(function(){/* global $ */
var  Marionette = require('backbone.marionette');

module.exports = Marionette.ItemView.extend({
  template: '#tweetView',
  container: null,
  animation: null,
  templateHelpers: {
    getUrl: function () {
      var id = this.content.id,
      screenName = this.content['screen-name'],
      date = new Date(this.time * 1000);
      return '<a href="https://twitter.com/' + screenName + '/status/' + id + '"' +
        'data-datetime="' + date.toISOString() + '">' + date.toLocaleDateString() + '</a>';
    }
  },
  initialize: function () {
    this.listenTo(this.model, 'change:content', this.change);
    this.$el.css('height', '100%');
    this.$el.css('width', '100%');
    this.$el.addClass('animated node');
  },
  change: function () {
    $('#' + this.container).removeClass('animated ' + this.animation);
    this.animation = 'tada';
    this.render();
  },
  renderView: function (container) {
    this.container = container;
    this.animation = 'bounceIn';
    this.render();
  },
  onRender: function () {
    if (this.container) {
      $('#' + this.container).removeClass('animated fadeIn');
      $('#' + this.container).html(this.el);
      $('#' + this.container).bind('click', function () {
        this.trigger('nodeClicked');
      }.bind(this));
      $('#' + this.container).addClass('animated ' + this.animation);
      setTimeout(function () {
        $('#' + this.container).removeClass('animated ' + this.animation);
      }.bind(this), 1000);
    }
  },
  close: function () {
    this.remove();
  }
});
})()
},{"backbone.marionette":32}],122:[function(require,module,exports){
(function(){/* global document, $ */
var  Marionette = require('backbone.marionette'),
  MapLoader = require('google-maps'),
  _ = require('underscore'),
  MarkerClusterer = require('./utility/markerclusterer.js');

module.exports = Marionette.ItemView.extend({
  template: '#positionsView',
  mapLoaded: false,
  mapOtions : {},
  bounds: null,
  paths: {},
  gmaps: null,
  map: null,
  container: null,
  markers: null,
  highlightedMarker: null,
  highlightedTime: Infinity,
  positions: null,
  highlightedPosition: null,

  initialize: function () {

    this.positions = this.model.get('positions');
    MapLoader.KEY = 'AIzaSyCWRjaX1-QcCqSK-UKfyR0aBpBwy6hYK5M';
    MapLoader.load().then(function (google) {
      this.gmaps = google.maps;
      if (this.waitingForInitMap) {
        this.waitingForInitMap = false;
        this._initMap();
      }
      if (this.waitingForDrawingMap) {
        this.waitingForDrawingMap = false;
        this._drawMap(document.getElementById('map-canvas-' + this.model.get('id')));
      }
    }.bind(this));

    this.listenTo(this.model, 'change:positions', this.changePos);
    this.listenTo(this.model, 'change:posWidth', this.resize);
    this.listenTo(this.model, 'change:posHeight', this.resize);
    this.$el.css('height', '100%');
    this.$el.css('width', '100%');
    this.$el.addClass('animated node');
  },
  resize: function () {
    if (this.map && this.bounds) {
      var timer = setInterval(function () {
        this.gmaps.event.trigger(this.map, 'resize');
      }.bind(this), 100);
      setTimeout(function () {
        clearInterval(timer);
        this.map.fitBounds(this.bounds);
        var listener = this.gmaps.event.addListener(this.map, 'idle', function () {
          if (this.map.getZoom() > 10) {
            this.map.setZoom(10);
          }
          this.gmaps.event.removeListener(listener);
        }.bind(this));
      }.bind(this), 1000);
    }
  },
  changePos: function () {
    this.positions = this.model.get('positions');
    this.model.set('eventsNbr', this.positions.length);
    this.render();
  },
  renderView: function (container) {
    this.container = container;
    this.render();
  },
  onBeforeRender: function () {
    this._initMap();
  },
  onRender: function () {
    if (this.container) {
      $('#' + this.container).append(this.el);
      $('#' + this.container).bind('click', function () {
        this.trigger('nodeClicked');
      }.bind(this));
    }
    this._drawMap(document.getElementById('map-canvas-' + this.model.get('id')));
  },
  _initMap: function () {
    if (!this.gmaps) {
      this.waitingForInitMap = true;
      return;
    }
    var geopoint;
    this.markers = [];
    this.paths = {};
    this.mapOptions =  {
      zoom: 10,
      zoomControl: false,
      mapTypeControl: false,
      scaleControl: false,
      streetViewControl: false,
      overviewMapControl: false,
      scrollwheel: true,
      mapTypeId: this.gmaps.MapTypeId.ROADMAP
    };
    _.each(this.positions, function (p) {
      geopoint = new this.gmaps.LatLng(p.content.latitude, p.content.longitude);
      this.markers.push(new this.gmaps.Marker({
        position: geopoint,
        visible: false
      }));
      if (!this.bounds) {
        this.bounds = new this.gmaps.LatLngBounds(geopoint, geopoint);
        this.mapOptions.center = geopoint;
      } else {
        this.bounds.extend(geopoint);
      }
      if (!this.paths[p.streamId]) { this.paths[p.streamId] = []; }
      this.paths[p.streamId].push(geopoint);
    }, this);
  },
  _drawMap: function ($container) {
    if (!$container) {
      return;
    }
    if (!this.gmaps) {
      this.waitingForDrawingMap = true;
      return;
    }
    this.map = new this.gmaps.Map($container, this.mapOptions);
    this.gmaps.event.trigger(this.map, 'resize');
    this.map.fitBounds(this.bounds);
    var listener = this.gmaps.event.addListener(this.map, 'idle', function () {
      if (this.map.getZoom() > 10) {
        this.map.setZoom(10);
      }
      this.gmaps.event.removeListener(listener);
    }.bind(this));
    var gPath, gMarker;
    _.each(this.paths, function (path) {
      if (path.length > 1) {
        gPath = new this.gmaps.Polyline({
          path: path,
          strokeColor: this._generateRandomColor(),
          strokeOpacity: 1.0,
          strokeWeight: 6
        });
        gPath.setMap(this.map);
      } else {
        gMarker = new this.gmaps.Marker({
          position: path[0]
        });
        gMarker.setMap(this.map);
      }
    }, this);
    gMarker = new MarkerClusterer(this.map, this.markers);
  },
  _generateRandomColor: function () {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++) {
      color += letters[Math.round(Math.random() * 15)];
    }
    return color;
  },
  onDateHighLighted : function (time) {
    this.highlightedTime = time;
    var positionToShow = null;

    var timeDiff = Infinity, temp = 0, highlightTime = this.highlightedTime;
    _.each(this.positions, function (position) {
      temp = Math.abs(position.time - highlightTime);
      if (temp <= timeDiff) {
        timeDiff = temp;
        positionToShow = position;
      }
    });
    if (this.highlightedPosition !== positionToShow) {
      if (this.highlightedMarker && this.map) {
        this.highlightedMarker.setMap(null);
      }

      var geopoint =  new this.gmaps.LatLng(positionToShow.content.latitude,
        positionToShow.content.longitude);
      this.highlightedMarker = new this.gmaps.Marker({
        position: geopoint
      });
      if (this.map) {
        this.highlightedMarker.setMap(this.map);
        this.map.panTo(geopoint);
      }
      this.highlightedPosition = positionToShow;
    }
    return positionToShow;
  },
  close: function () {
    this.remove();
  }
});
})()
},{"./utility/markerclusterer.js":116,"backbone.marionette":32,"google-maps":89,"underscore":9}]},{},["3XoGqR"])
;