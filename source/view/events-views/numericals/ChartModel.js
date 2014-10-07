var Backbone = require('backbone');

var ChartModel = {
  defaults: {
    // TODO: review those fields

    container: null,
    view: null,

    requiresDim: false,

    collection: null,

    highlighted: false,
    highlightedTime: null,

    allowPieChart: false,

    singleNumberAsText: true,

    // Chart dimensions
    dimensions: null,

    // Legend style
    legendStyle: 'table', // Legend style: 'list', 'table'
    legendButton: false,  // A button in the legend
    legendButtonCount: [ 'edit', 'duplicate', 'remove' ],
    legendShow: true,     // Show legend on size/true/false
    legendExtras: true,   // use extras in the legend

    /* Events control */
    onClick: null,
    onHover: null,
    onDnD: null,

    /**
     * Allow zooming & panning via subchart control.
     */
    enableNavigation: false,

    // Display X-axis
    xaxis: null,

    // Editable point mode
    editPoint: false,

    // Show node count
    showNodeCount: true
  }
};

ChartModel.initialize = function () {
  this.on('remove', function () {
    console.log('model: remove received');
  });
};

ChartModel.setHighlighted = function (highlight) {
  this.set('highlighted', highlight);
};

module.exports = Backbone.Model.extend(ChartModel);
