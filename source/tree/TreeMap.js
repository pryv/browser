

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

  this.eventLeaveScope = function (content) {
    _.each(content.events, function (event) {
      this.root.eventLeaveScope(event, content.reason, function () {});
    }, this);
    this.root._generateChildrenTreemap(this.root.x,
      this.root.y,
      this.root.width,
      this.root.height,
      true);
    this.root._refreshViewModel(true);
  }.bind(this);

  this.eventChange = function (/*context*/) {

  }.bind(this);

  this.browser.activeFilter.triggerForAllCurrentEvents(this.eventEnterScope);
//--------- register the TreeMap event Listener ----------//
  this.browser.activeFilter.addEventListener(BrowserFilter.SIGNAL.EVENT.SCOPE_ENTER,
    this.eventEnterScope
  );
  this.browser.activeFilter.addEventListener(BrowserFilter.SIGNAL.EVENT.SCOPE_LEAVE,
    this.eventLeaveScope);
  this.browser.activeFilter.addEventListener(BrowserFilter.SIGNAL.EVENT.CHANGE,
    this.eventChange);
};


TreeMap.prototype.destroy = function () {
  this.browser.activeFilter.removeEventListener(BrowserFilter.SIGNAL.EVENT.SCOPE_ENTER,
    this.eventEnterScope);
  this.browser.activeFilter.removeEventListener(BrowserFilter.SIGNAL.EVENT.SCOPE_LEAVE,
    this.eventLeaveScope);
  this.browser.activeFilter.removeEventListener(BrowserFilter.SIGNAL.EVENT.CHANGE,
    this.eventChange);
};

