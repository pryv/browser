var Backbone = require('backbone');

module.exports = Backbone.Model.extend({
  defaults: {
    events: [],
    highlightedTime: null,
    container: null,
    allowPieChart: false,
    view: null,
    highlighted: false,
    dimensions: null,

    /* Events control */
    onClick: null,
    onHover: null,
    onDnD: null,

    allowPan: null,
    allowZoom: null,

    useExtras: null,

    xaxis: null
  },

  setHighlighted: function (highlight) {
    this.set('highlighted', highlight);
  },

  onChartClicked: function () {
    var events = this.get('events');
    if (events.length === 1) {
      events[0].style = this.allowPieChart ? (++events[0].style) % 3 : (++events[0].style) % 2;
    }
  }
});