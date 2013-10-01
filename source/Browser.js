
var BrowserFilter = require('./browser/BrowserFilter.js');

var ConnectionsHandler = require('./browser/ConnectionsHandler.js');

var TreeMap = require('./tree/TreeMap.js');


var Browser = module.exports = function () {

  this.activeFilter = new BrowserFilter();
  this.treemap = new TreeMap(this);
  this.connections = new ConnectionsHandler(this);

  var batch = this.activeFilter.startBatch();
  this.activeFilter.showConnection('fredos71');
  this.activeFilter.showConnection('perki');
  batch.done();


};




