var Backbone = require('backbone');

module.exports = Backbone.Model.extend({
  defaults: {
    container: null,
    view: null,

    collection: null,

    highlighted: false,
    highlightedTime: null,

    allowPieChart: false,

    // Chart dimensions
    dimensions: null,

    // Legend style
    legendStyle: 'table', // Legend style: 'list', 'table'
    legendButton: false,  // A button in the legend
    legendShow: true,     // Show legend on size/true/false
    legendExtras: true,   // use extras in the legend

    /* Events control */
    onClick: null,
    onHover: null,
    onDnD: null,

    // Panning and Zooming
    allowPan: false,      // Allows navigation through the chart
    allowZoom: false,     // Allows zooming on the chart

    // Display X-axis
    xaxis: null,

    // Editable point mode
    editPoint: false
  },

  setHighlighted: function (highlight) {
    this.set('highlighted', highlight);
  },

  onChartClicked: function () {
    console.log('Chart clicked');
  }
});