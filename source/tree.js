/*global require*/
// ---------- helpers that should be  adapted to BackBone fashion ----------- //

var _ = require('underscore');

var Pryv = require('pryv');

var RootNode = require('./tree/RootNode.js');



//----- test -------//


var connections = {
  //fredos : new Pryv.Connection('fredos71', 'VVTi1NMWDM', {domain : 'pryv.in'}),
  perki :  new Pryv.Connection('perkikiki', 'Ve-U8SCASM', {domain : 'pryv.in'})
  //jordane:  new Pryv.Connection('jordane', 'eTpAijAyD5', {domain : 'pryv.in'})
};


var nullFilter = new Pryv.Filter({limit : 2});

var rootNode = new RootNode();



var waiting = 0;
function doneOne(/*connName*/) {
  waiting--;
  if (waiting > 0) { return 0;  }
  console.log(JSON.stringify(rootNode._debugTree(), null, 4));
}


waiting += _.keys(connections).length;
_.each(connections, function (conn, connName) { // loop thru connections..
  conn.useLocalStorage(function (error, accessInfo) {

    if (error) { console.log(error); }
    conn.events.get(nullFilter, function (error, events) {

      waiting += events.length;

      _.each(events, function (event) {
        rootNode.eventEnterScope(event, null, function (error, result) { 
          if (error) {  throw new Error(error); }
          doneOne();
        });
      });

    });
    doneOne();
  });
});
