
var BrowserFilter = require('./browser/BrowserFilter.js');

var ConnectionsHandler = require('./browser/ConnectionsHandler.js');

var TreeMap = require('./tree/TreeMap.js');


var Browser = module.exports = function () {


  this.connections = new ConnectionsHandler(this);
  this.activeFilter = new BrowserFilter(this);
  this.treemap = new TreeMap(this);


  this.connections.initConnections(function () {
    var batch = this.activeFilter.startBatch();
    this.activeFilter.showConnection('fredos');
    this.activeFilter.showConnection('perki');
    batch.done();
  }.bind(this));

};




