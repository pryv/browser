
var _ = require('underscore');
var Pryv = require('pryv');


//TODO write all add / remove connection logic

var ConnectionsHandler = module.exports = function(browser) {
  this.browser = browser;

  this.connections = {
    fredos : new Pryv.Connection('fredos71', 'VVTi1NMWDM', {domain : 'pryv.in'}),
    perki1 :  new Pryv.Connection('perkikiki', 'Ve-U8SCASM', {domain : 'pryv.in'}),
    //jordane:  new Pryv.Connection('jordane', 'eTpAijAyD5', {domain : 'pryv.in'}),
    perki : new Pryv.Connection('perkikiki', 'PVriN2MuJ9', {domain : 'pryv.in'})
  };
};



/**
 * Inititalize connection (can be called several time without risks..
 * @param done
 */
ConnectionsHandler.prototype.initConnections = function( done) {

  var toDo = _.keys(this.connections).length;
  function doneOne() {
    toDo--;
    if (toDo < 0) { done(); }
  }

  _.each(this.connections, function (conn, connName) { // loop thru connections..
    conn.useLocalStorage(function (error, accessInfo) {
      // TODO correctly deal with this error
      if (error) { console.log(error); }
      doneOne();
    });
  });
};

