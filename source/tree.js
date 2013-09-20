/*global require*/
// ---------- helpers that should be  adapted to BackBone fashion ----------- //

var _ = require('underscore');

var Pryv = require('pryv');

var RootNode = require('./tree/RootNode.js');



//----- test -------//


var data = require('./../data/data.js');

var connections = {
  fredos : new Pryv.Connection('fredos71', 'VVTi1NMWDM', {domain : 'pryv.in'}),
  perki :  new Pryv.Connection('perkikiki', 'Ve-U8SCASM', {domain : 'pryv.in'})
};


var nullFilter = new Pryv.Filter({});

var rootNode = new RootNode();


var loading = 0;
function loaded(/*connName*/) {
  loading--;
  if (loading > 0) { return 0;  }
  console.log(JSON.stringify(rootNode._debugTree(), null, 4));
}


_.each(connections, function (conn, connName) {
  loading++;
  conn.accessInfo(function (error, accessInfo) {
    console.log('connected to ' + connName + ' ' + JSON.stringify(accessInfo));
    conn.events.get(nullFilter, function (error, events) {
      _.each(events, function (event) {
        var e = new Pryv.Event(conn, event);
        rootNode.eventEnterScope(e);
      });
      loaded(connName);
    });
  });
});


