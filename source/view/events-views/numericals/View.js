/* global $ */
var  Marionette = require('backbone.marionette'),
  _ = require('underscore');


module.exports = Marionette.ItemView.extend({
  nodeContainer: null,
  plotContainer: null,
  animation: null,
  //datas: null,
  currentDay: null,
  date: null,
  plot: null,
  options: null,
  series: null,
  width: null,
  height: null,
  typeChanger: null,

  initialize: function () {
    this.listenTo(this.model, 'change:datas', this.initSeries);
    this.listenTo(this.model, 'change:width', this.resize);
    this.listenTo(this.model, 'change:height', this.resize);
    this.currentDay = [];
    this.date = Infinity;
    this.options = {
      grid: {
        hoverable: true,
        clickable: true,
        borderWidth: 0,
        minBorderMargin: 5
      },
      xaxes: [ { show: false } ],
      yaxes: []
    };
    this.series = [];
    this.typeChanger = 0;
    this.initSeries();
  },

  /*
  triggers: {
    'click .graphContainer canvas': 'graphClicked',
    'dragstart .graphContainer': 'graphDragStart'
  },*/

  // type = ['lines' -> 0, 'bars' -> 1, 'pies' -> 2];
  initSeries: function () {
    //console.log(this.container, 'initSeries');
    var data = this.model.get('datas');

    var dataMapper = function (d) {
      return _.map(d, function (e) {
        return [e.time, e.content];
      });
    };

    // We store the data as an object containing
    // its type and the label and the preformated
    // data for the graph
    this.series = [];
    for (var i = 0; i < data.length; ++i) {
      if (data[i].length > 0) {
        this.series.push({
            data: dataMapper(data[i]),
            label: data[i][0].type,
            type: 0
          });
      }
    }

    if (this.container) {
      $('#' + this.container).empty();
      $('#' + this.container).unbind();
      this.renderView(this.container);
    }
  },

  renderView: function (container) {
    this.container = container;
    this.animation = 'bounceIn';
    this.plotContainer = this.container + '-graph';
    var plotContainerDiv = '<div id="' + this.plotContainer +
      '" class="graphContainer" draggable="true"></div>';
    this.computeSize();
    $('#' + this.container).unbind();
    if ($('#' + this.plotContainer).length === 0) {
      $('#' + this.container).html(plotContainerDiv);
    } else {
      $('#' + this.plotContainer).empty();
    }

    $('#' + this.plotContainer).css({
      top: 0,
      left: 0,
      width: this.width,
      height: this.height,
      visible: 'hidden'
    });


    // Arranging data such that it can be used with multiple axes
    var plotData = [];
    for (var i = 0; i < this.series.length; ++i) {
      this.options.yaxes.push({ show: false});
      plotData.push({
        data: this.series[i].data,
        label: this.series[i].label,
        yaxis: (i + 1)
      });

      // Configuration of the series representation
      switch (this.series[i].type) {
      case 0:
        plotData[i].lines = { show: true };
        plotData[i].points = { show: true };
        break;
      case 1:
        plotData[i].bars = { show: true };
        break;
      case 2:
        plotData[i].pie = { show: true };
        break;
      default:
        plotData[i].lines = { show: true };
        plotData[i].points = { show: true };
        break;
      }
    }

    // Builds the plot
    this.plot = $.plot($('#' + this.plotContainer), plotData, this.options);

    // Drang and Drop bindings
    $('#' + this.plotContainer).bind('dragstart', this.onDragStart.bind(this));
    $('#' + this.plotContainer).bind('dragenter', this.onDragEnter.bind(this));
    $('#' + this.plotContainer).bind('dragover', this.onDragOver.bind(this));
    $('#' + this.plotContainer).bind('dragleave', this.onDragLeave.bind(this));
    $('#' + this.plotContainer).bind('drop', this.onDrop.bind(this));
    $('#' + this.plotContainer).bind('dragend', this.onDragEnd.bind(this));

    // Hover signal
    $('#' + this.container).bind('plothover', function (event, pos, item) {
      if (item) {
        var id = this.container + '-tooltip' + item.seriesIndex + '-' + item.dataIndex;
        if (!$('#' + id).length) {
          var labelValue = item.datapoint[1].toFixed(2);
          var clazz = 'hover';
          var coords = this.computeCoordinates(0, item.seriesIndex, item.datapoint[1],
            item.datapoint[0]);
          this.showTooltip(id, clazz, labelValue, coords.top + 10, coords.left + 10);
        }
      } else {
        $('#' + this.container + ' .tooltip.hover').remove();
      }
    }.bind(this));

    $('#' + this.container).bind('plotclick', this.changeGraph.bind(this));

    // Highlighting current date.
    this.onDateHighLighted(this.date);
  },

  computeCoordinates: function (xAxis, yAxis, xPoint, yPoint) {
    var yAxes = this.plot.getYAxes();
    var xAxes = this.plot.getXAxes();
    var coordY = yAxes[yAxis].p2c(xPoint);
    var coordX = xAxes[xAxis].p2c(yPoint);
    return { top: coordY, left: coordX};
  },

  showTooltip: function (id, clazz, data, top, left) {
    if ($('#' + id).length !== 0) {
      return;
    }
    /* TODO:
    * Positioning such that the label doesn't go outside of its container
    * with overflow: visible
    * */
    var tooltip = '<div id="' + id + '" class="tooltip ' + clazz + '">' + data + '</div>';

    if ($('#' + id).length === 0) {
      $('#' + this.plotContainer).append(tooltip);
    }
    $('#' + id).css({top: top, left: left}).fadeIn(1500);
  },

  onDateHighLighted: function (date) {
    /* TODO:
     * Implement point search in log(n)
     * */

    this.date = date;

    for (var k = 0; k < this.series.length; k++) {
      var distance = null;
      var best = 0;
      for (var m = 0; m < this.series[k].data.length; m++) {
        if (distance === null || Math.abs(date - this.series[k].data[m][0]) < distance) {
          distance = Math.abs(date - this.series[k].data[m][0]);
          best = m;
        } else { break; }
      }


      var id = this.container + '-tooltip' + k + '-' + best;
      var idOld = this.container + '-tooltip' + k + '-' + this.currentDay[k];
      this.currentDay[k] = best;
      var labelValue = this.series[k].data[best][1].toFixed(2);
      var clazz = 'highlighted';
      var coords = this.computeCoordinates(0, k, this.series[k].data[best][1],
        this.series[k].data[best][0]);

      // remove the old label
      $('#' + idOld).remove();

      // insert the new label
      this.showTooltip(id, clazz, labelValue, coords.top + 10, coords.left + 10);

    }
  },

  computeSize: function () {

    if ($('#' + this.container).length)  {
      this.width = parseInt($('#' + this.container).prop('style').width.split('px')[0], 0);
    } else if (this.model.get('width') !== null) {
      this.width = this.model.get('width');
    }

    if ($('#' + this.container).length)  {
      this.height = parseInt($('#' + this.container).prop('style').height.split('px')[0], 0);
    } else if (this.model.get('height') !== null) {
      this.height = this.model.get('height');
    }

  },

  resize: function () {
    if (this.container) {
      $('#' + this.container + ' .tooltip').remove();
      this.computeSize();
      this.renderView(this.container);
    }
  },

  changeGraph: function () {
    if (this.container) {
      $('#' + this.container).empty('');
      $('#' + this.container).unbind();

      var mod = this.series.length === 1 ? 3 : 2;
      for (var i = 0; i < this.series.length; ++i) {
        this.series[i].type++;
        if (this.series[i].type !== mod) {
          break;
        } else {
          this.series[i].type = 0;
        }
      }

      this.renderView(this.container);
    }

  },


  /* ***********************
   * Drag and Drop Functions
   */

  /* Called when this object is starts being dragged */
  onDragStart: function (e) {
    e.originalEvent.dataTransfer.setData('node_id', this.container);
    $('.graphContainer').addClass('animated shake');
  },

  /* Fires when a dragged element enters this' scope */
  onDragEnter: function () {
  },

  /* Fires when a dragged element is over this' scope */
  onDragOver: function (e) {
    e.preventDefault();
  },

  /* Fires when a dragged element leaves this' scope */
  onDragLeave: function () {
  },

  /* Called when this object is stops being dragged */
  onDragEnd: function () {
    $('.graphContainer').removeClass('animated shake');
  },

  /* Called when an element is dropped on it */
  onDrop: function (e) {
    e.stopPropagation();
    e.preventDefault();

    var droppedID = e.originalEvent.dataTransfer.getData('node_id');
    console.log(this.container, 'received', droppedID);
  },



  close: function () {
    //console.log(this.container, 'close');
    $('#' + this.container).empty('');
    $('#' + this.container).unbind();
  }
});
