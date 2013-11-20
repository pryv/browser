var Backbone = require('backbone');

module.exports = Backbone.Model.extend({
  defaults: {
    events: [],
    highlightedTime: null,
    container: null,
    allowPieChart: false,
    view: null,
    highlighted: false
  },


  /*
  getTimeDifference: function (time) {
    return Math.abs(time - this.get('event').time);
  },
  isTrashed: function () {
    return this.get('event').trashed;
  }, */
  setHighlighted: function (highlight) {
    this.set('highlighted', highlight);
  },

  onChartClicked: function () {
    var events = this.get('events');
    if (events.length === 1) {
      events[0].style = this.allowPieChart ? (++events[0].style) % 3 : (++events[0].style) % 2;
      //this.view.render();
    }
  }

});