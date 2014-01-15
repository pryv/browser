/* global window */

var Backbone = require('backbone');

module.exports = Backbone.Model.extend({
  defaults: {
    events: [],
    connectionId: null,
    streamId: null,
    streamName: null,
    type: null,
    category: null,

    color: null,
    style: null,
    transform: null,
    interval: null
  },
  sortData: function () {
    this.get('events').sort(function (a, b) {
      if (a.time < b.time) { return -1; }
      if (b.time < a.time) { return 1; }
      return 0;
    });
  },
  set: function (attr, options) {
    Backbone.Model.prototype.set.call(this, attr, options);
    if (this.supports_html5_storage() &&
      (attr === 'color' ||
      attr === 'style' ||
      attr === 'transform' ||
      attr === 'interval')) {
      window.localStorage.setItem(this.get('streamId') + '.' +
        this.get('type') + '.' + attr, options);
    }

  },
  get: function (attr) {
    var r = Backbone.Model.prototype.get.call(this, attr);
    if (this.supports_html5_storage() && (attr === 'color' ||
        attr === 'style' ||
        attr === 'transform' ||
        attr === 'interval')) {
      r = window.localStorage.getItem(this.get('streamId') + '.' +
        this.get('type') + '.' + attr);
    }
    return r;
  },
  supports_html5_storage: function () {
    try {
      return 'localStorage' in window && window.localStorage !== null;
    } catch (e) {
      return false;
    }
  }
});