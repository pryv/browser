
var _ = require('underscore');
var Pryv = require('pryv');


//TODO write all add / remove connection logic

var ConnectionsHandler = module.exports = function (browser) {
  this.browser = browser;
  this.connections = {};
  this.serialCounter = 0;
};


ConnectionsHandler.prototype.add = function (connection) {
  var serialId = 'N' + this.serialCounter++;
  this.connections[serialId] = connection;
  return serialId;
};


/**
 * Inititalize connection (can be called several time without risks..
 * @param done
 */
ConnectionsHandler.prototype.initConnections = function (done) {

  var toDo = _.keys(this.connections).length;
  function doneOne() {
    toDo--;
    if (toDo <= 0) { done(); }
  }

  _.each(this.connections, function (conn, serialId) { // loop thru connections..
    conn.useLocalStorage(function (error, accessInfo) {
      // TODO correctly deal with this error
      if (error) { console.log(error); }
      doneOne();
    });
  });
};

