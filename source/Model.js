/* global $ */
var MonitorsHandler = require('./model/MonitorsHandler.js');
var _ = require('underscore');
var ConnectionsHandler = require('./model/ConnectionsHandler.js');

var SIGNAL = require('./model/Messages').MonitorsHandler.SIGNAL;
var TreeMap = require('./tree/TreeMap.js');
var Controller = require('./orchestrator/Controller.js');
var Pryv = require('pryv');
var TimeLine = require('./timeframe-selector/timeframe-selector.js');

var Model = module.exports = function () {
  // create connection handler and filter
  this.onFiltersChanged = function () {
    console.log('onFiltersChanged', arguments);
    this.activeFilter.timeFrameLT = [arguments[0].from, arguments[0].to];
  };


  this.onDateHighlighted = _.throttle(function () {
    if (this.treemap) {
      this.treemap.onDateHighLighted(arguments[0].getTime() / 1000);
    }
  }, 100);


  this.connections = new ConnectionsHandler(this);
  this.activeFilter = new MonitorsHandler(this);
  this.activeFilter.addEventListener(SIGNAL.BATCH_BEGIN, function () {
    $('#logo-reload').addClass('loading');
  });
  this.activeFilter.addEventListener(SIGNAL.BATCH_DONE, function () {
    $('#logo-reload').removeClass('loading');
  });
  $('#logo-reload').click(function () {
    this.activeFilter.focusOnStreams(null);
  }.bind(this));
  this.timeView = new TimeLine();
  this.timeView.render();
  initTimeAndFilter(this.timeView, this.activeFilter);
  this.timeView.on('filtersChanged', this.onFiltersChanged, this);
  this.timeView.on('dateHighlighted', this.onDateHighlighted, this);
  this.timeView.on('dateMasked', this.onDateMasked, this);

  this.onDateMasked = function () {
    console.log('onDateMasked', arguments);
  };

  Pryv.eventTypes.loadExtras(function () {});


  // add fredos to Connections
  var fredosSerial =
    this.connections.add((new Pryv.Connection('fredos71', 'VVTi1NMWDM', {staging: true})));

  var batch = this.activeFilter.startBatch('adding connections');

  batch.addOnDoneListener('connloading', function () {

  }.bind(this));

  // tell the filter we want to show this connection
  this.activeFilter.addConnection(fredosSerial, batch);

  // create the TreeMap
  this.controller = new Controller();
  this.treemap = new TreeMap(this);
  this.controller.setTreeMap(this.treemap);


  var liveat = new Pryv.Connection('liveat', 'VPMy6VFfU9', {staging: true});
  var liveatId = this.connections.add(liveat);
  this.activeFilter.addConnection(liveatId, batch);

  /**
   // create streams and add them to filter
   //this.connections.add(new Pryv.Connection('jordane', 'eTpAijAyD5'));
   **/

  /* var perki1Serial =
   this.connections.add((new Pryv.Connection('perkikiki', 'Ve-U8SCASM',  {staging: true}));
   var perki2Serial =
   this.connections.add((new Pryv.Connection('perkikiki', 'PVriN2MuJ9',  {staging: true}));

   // activate them in batch in the filter

   //this.activeFilter.addConnection(perki1Serial, batch);
   this.activeFilter.addConnection(perki2Serial, batch);
   **/


  batch.done();

  setTimeout(function () {
    //this.activeFilter.focusOnConnections(liveat);
  }.bind(this), 10000);

};


/**
 * demo utility that set the timeFrame boundaries to the events displayed.
 */
Model.prototype.updateTimeFrameLimits = function () {
  (_.debounce(function () {
    var stats = this.activeFilter.stats(),
      currentLimit = {from: this.timeView.limitFrom, to: this.timeView.limitTo};
    console.log('updateLimits', stats, currentLimit);
    this.timeView.setLimit(stats.timeFrameLT[0], stats.timeFrameLT[1]);
  }.bind(this), 100))();
};


function initTimeAndFilter(timeView, filter) {
  var spanTime = 86400000,
    fromTime = new Date(),
    start = new Date(fromTime.getFullYear(), fromTime.getMonth(), fromTime.getDate());

  fromTime = new Date(start.getTime() - (spanTime * 365));
  var toTime = new Date(start.getTime() + spanTime - 1);
  filter.timeFrameLT = [fromTime, toTime];
  filter.set({
    limit: 20000
  });

  timeView.onFiltersChanged({
    from:     fromTime,
    to:       toTime
  });
}

