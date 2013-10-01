

var RootNode = require('./RootNode.js');
var BrowserFilter = require('../browser/BrowserFilter.js');

var _ = require('underscore');

var TreeMap = module.exports = function (browser) {
  this.browser = browser;
  this.root = new RootNode();



  //----------- init the browser with all events --------//
  this.browser.activeFilter.getAllEvents(
    function (events) { // we receive events by batches
      _.each(events, function (event) {
        this.root.eventEnterScope(event, null, function (error) {
          if (error) {  throw new Error(error); }
        });

      }, this);
    }.bind(this),
    function () { // called when done
      this.root.renderView();

    }.bind(this));

  //--------- register the TreeMap event Listener ----------//
  var self = this;
  this.browser.activeFilter.addEventListener(BrowserFilter.SIGNAL.EVENT.SCOPE_ENTER,
    function (content) {
      _.each(content.events, function (event) {
        console.log('add ' + event.id);
        self.root.eventEnterScope(event, content.reason, function () {});
      });
    }
  );
  this.browser.activeFilter.addEventListener(BrowserFilter.SIGNAL.EVENT.SCOPE_LEAVE,
    this.root.eventLeaveScope);
  this.browser.activeFilter.addEventListener(BrowserFilter.SIGNAL.EVENT.CHANGE,
    this.root.eventChange);
};


TreeMap.prototype.destroy = function () {
  this.browser.activeFilter.removeEventListener('eventEnterScope', this.root.eventEnterScope);
  this.browser.activeFilter.removeEventListener('eventLeaveScope', this.root.eventLeaveScope);
  this.browser.activeFilter.removeEventListener('eventChange', this.root.eventChange);
};

