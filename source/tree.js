/*global require*/
// ---------- helpers that should be  adapted to BackBone fashion ----------- //

var _ = require('underscore');
var Backbone = require('backbone');

var Pryv = require('pryv');

var RootNode = require('./tree/RootNode.js');



//----- test -------//
exports.main = function () {

  var connections = {
    fredos : new Pryv.Connection('fredos71', 'VVTi1NMWDM', {domain : 'pryv.in'}),
    perki1 :  new Pryv.Connection('perkikiki', 'Ve-U8SCASM', {domain : 'pryv.in'}),
    //jordane:  new Pryv.Connection('jordane', 'eTpAijAyD5', {domain : 'pryv.in'}),
    perki : new Pryv.Connection('perkikiki', 'PVriN2MuJ9', {domain : 'pryv.in'})
  };


  var nullFilter = new Pryv.Filter({limit : 200});

  var rootNode = new RootNode();
  var eventsArr = [];

  var eventsListener = {};
  // Mixin
  _.extend(eventsListener, Backbone.Events);
  eventsListener.on('eventLeave', rootNode.eventLeaveScope, rootNode);
  var waiting = 0;
  function doneOne(info) {
    console.log(waiting + ' done ' + info);
    waiting--;
    if (waiting > 0) {
      return 0;
    }
   // rootNode._createView();

    setTimeout(function () {
      var start = new Date().getTime();

      eventsListener.trigger('eventLeave', _.initial(eventsArr, 300));
      //rootNode.eventLeaveScope(eventsArr);

      console.log(rootNode._debugTree());
      var end = new Date().getTime();
      var time = end - start;
      console.log('Delete Execution time: ' + time);
    }, 2000);
    setTimeout(function () {
      var start = new Date().getTime();
      rootNode.eventEnterScope(_.initial(eventsArr, 300));
      //rootNode.eventEnterScope(eventsArr);

      console.log(rootNode._debugTree());
      var end = new Date().getTime();
      var time = end - start;
      console.log('Add Execution time: ' + time);
    }, 4000);
   // console.log(JSON.stringify(rootNode._debugTree(), null, 4));
  }


  waiting += _.keys(connections).length;
  _.each(connections, function (conn, connName) { // loop thru connections..
    conn.useLocalStorage(function (error, accessInfo) {

      if (error) { console.log(error); }

      //waiting += 1;
      conn.events.get(nullFilter, null, function (error, events) {
       // waiting += 1;
        rootNode.eventEnterScope(events);
        eventsArr = _.union(eventsArr, events);
        doneOne('Connection ' + conn.shortId);
      /*  _.each(events, function (event) {

          rootNode.eventEnterScope(event, null, function (error, result) {
            if (error) {  throw new Error(error); }
            doneOne('event' + event.id);
          });
        });    */
       // doneOne('allevents');
      });

    });
  });
};