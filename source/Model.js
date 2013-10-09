
var BrowserFilter = require('./model/BrowserFilter.js');

var ConnectionsHandler = require('./model/ConnectionsHandler.js');

var TreeMap = require('./tree/TreeMap.js');
var Pryv = require('pryv');


module.exports = function () {
  // create connection handler and filter
  this.connections = new ConnectionsHandler(this);
  this.activeFilter = new BrowserFilter(this);

  // add fredos to Connections
  var fredosSerial =
    this.connections.add(new Pryv.Connection('fredos71', 'VVTi1NMWDM', {domain : 'pryv.in'}));

  // tell the filter we want to show this connection
  this.activeFilter.addConnection(fredosSerial);

  // create the TreeMap
  this.treemap = new TreeMap(this);

  // create streams and add them to filter
  //this.connections.add(new Pryv.Connection('jordane', 'eTpAijAyD5', {domain : 'pryv.in'}));
  var perki1Serial =
    this.connections.add(new Pryv.Connection('perkikiki', 'Ve-U8SCASM', {domain : 'pryv.in'}));
  var perki2Serial =
    this.connections.add(new Pryv.Connection('perkikiki', 'PVriN2MuJ9', {domain : 'pryv.in'}));

  // activate them in batch in the filter
  var batch = this.activeFilter.startBatch();
  this.activeFilter.addConnection(perki1Serial, batch);
  this.activeFilter.addConnection(perki2Serial, batch);
  batch.done();


  var streams = [];
  var perki1 =  this.connections.get(perki1Serial);
  perki1.useLocalStorage(function () {
    var stream =  perki1.streams.getById('00e9ee8505063cef39b9c6642cd52da21739ac24');
    streams.push(stream);
  });

  setTimeout(function () {
    //this.activeFilter.showOnlyStreams(streams);
  }, 8000);


};



