

var RootNode = require('./RootNode.js');
var BrowserFilter = require('../browser/BrowserFilter.js');

var _ = require('underscore');

var TreeMap = module.exports = function (browser) {
  this.browser = browser;
  this.root = new RootNode();



  //----------- init the browser with all events --------//
  this.eventEnterScope = function (content) {
    _.each(content.events, function (event) {
      this.root.eventEnterScope(event, content.reason, function () {});
    }, this);
    this.root._createView();
    this.root._generateChildrenTreemap(this.root.x,
      this.root.y,
      this.root.width,
      this.root.height,
      true);
    this.root._refreshViewModel(true);
  }.bind(this);

  this.browser.activeFilter.triggerForAllCurrentEvents(this.eventEnterScope);
  //--------- register the TreeMap event Listener ----------//
  this.browser.activeFilter.addEventListener(BrowserFilter.SIGNAL.EVENT.SCOPE_ENTER,
   this.eventEnterScope
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

