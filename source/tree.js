/*global require*/
// ---------- helpers that should be  adapted to BackBone fashion ----------- //

var _ = require('underscore');
var Backbone = require('backbone');




//----- test -------//
exports.main = function () {




  var rootNode = new RootNode();
  var eventsArr = [];

  var eventsListener = {};
  // Mixin
  _.extend(eventsListener, Backbone.Events);
  eventsListener.on('eventLeave', rootNode.eventLeaveScope);
  var waiting = 0;
  function doneOne(info) {
    //console.log(waiting + ' done ' + info);
    waiting--;
    if (waiting > 0) {
      return 0;
    }
    rootNode._createView();

    setTimeout(function () {
      var start = new Date().getTime();

      eventsListener.trigger('eventLeave', eventsArr);
      console.log('done');
      var end = new Date().getTime();
      var time = end - start;
      console.log('Execution time: ' + time);
    }, 5000);
   // console.log(JSON.stringify(rootNode._debugTree(), null, 4));
  }


  waiting += _.keys(connections).length;
  _.each(connections, function (conn, connName) { // loop thru connections..
    conn.useLocalStorage(function (error, accessInfo) {

      if (error) { console.log(error); }

      waiting += 1;
      conn.events.get(nullFilter, null, function (error, events) {
        waiting += events.length;
        _.each(events, function (event) {
          eventsArr.push(event);
          rootNode.eventEnterScope(event, null, function (error, result) {
            if (error) {  throw new Error(error); }
            doneOne('event' + event.id);
          });
        });
        doneOne('allevents');
      });
      doneOne('Connection ' + conn.shortId);
    });
  });
};