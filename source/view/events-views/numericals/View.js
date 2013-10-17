/* global document, $ */
var  Marionette = require('backbone.marionette'),
  _ = require('underscore'),
  d3 = require('d3');

module.exports = Marionette.ItemView.extend({
  template: '#notesView',
  container: null,
  lines: null,
  graphs: [],
  currentGraph: null,
  currentTag: {},
  highlightedTime: Infinity,
  margin: null,
  prevChartWidth: 0,
  prevChartHeight: 0,
  updateTransistionMS: 750,
  initialize: function () {
    this.listenTo(this.model, 'change:width', this.change);
    this.listenTo(this.model, 'change:height', this.change);
    this.lines = this.model.get('datas');
    this.$el.css('height', '100%');
    this.$el.css('width', '100%');
    this.$el.addClass('animated  bounceIn');
    this.margin = {
      top: 10,
      right: 10,
      bottom: 20,
      left: 40
    };
  },
  change: function () {
    this.updateChart(this.currentGraph, false);
  },
  onDateHighLighted: function (time) {
    this.highlightedTime = time;
    var graphToShow = this.findGraphToShow();
    if (graphToShow !== this.currentGraph) {
      this.currentGraph.hide(function () {
        graphToShow.show(function () {
          this.currentGraph = graphToShow;
          this.updateChart(this.currentGraph, false);
        }.bind(this));
      }.bind(this));
    }
  },
  renderView: function (container) {
    this.container = container;
    this.render();
  },
  render: function () {
    this.close();
    if (this.container) {


      _.each(this.lines, function (type) {
        var graph = {};
        var uniqueId = _.uniqueId('graph');
        $('#' + this.container).append('<div id="' + uniqueId + '"></div>');
        var xScale, yScale, xAxis, yAxis, line, sourceData;
        sourceData = _.toArray(type);
        var chartSvg = d3.select('#' + uniqueId).append('svg')
          .append('g')
          .attr('class', 'chartContainer')
          .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');

        // create the x axis container
        chartSvg.append('g')
          .attr('class', 'x axis');

        // create the y axis container
        chartSvg.append('g')
          .attr('class', 'y axis');
        xScale = d3.time.scale()
          .domain(d3.extent(sourceData, function (d) { return d.time; }));

        yScale = d3.scale.linear()
          .domain([0, d3.max(sourceData, function (d) { return d.content; })]);

        xAxis = d3.svg.axis()
          .scale(xScale)
          .orient('bottom');

        yAxis = d3.svg.axis()
          .scale(yScale)
          .orient('left');

        // declare a new line
        line = d3.svg.line()
          .x(function (d) { return xScale(d.time); })
          .y(function (d) { return yScale(d.content); })
          .interpolate('linear');

        graph.serial = uniqueId;
        graph.chartSvg = chartSvg;
        graph.sourceData = sourceData;
        graph.xScale = xScale;
        graph.yScale = yScale;
        graph.xAxis = xAxis;
        graph.yAxis = yAxis;
        graph.line = line;
        graph.show = function (callback) {
          $('#' + this.serial).show('fast', callback);
          return this;
        };
        graph.hide = function (callback) {
          $('#' + this.serial).hide('fast', callback);
          return this;
        };
        this.updateChart(graph, true);
        graph.hide();
        this.graphs.push(graph);

      }, this);
      this.currentGraph  = this.findGraphToShow().show();
    }
  },
  updateChart: function (graph, init) {
    // get the height and width subtracting the padding
    var chartWidth = this.model.get('width') - this.margin.left - this.margin.right;

    var chartHeight = this.model.get('height') - this.margin.top - this.margin.bottom;

    // only update if chart size has changed
    if ((this.prevChartWidth !== chartWidth) ||
      (this.prevChartHeight !== chartHeight))
    {
      this.prevChartWidth = chartWidth;
      this.prevChartHeight = chartHeight;

      //set the width and height of the SVG element
      graph.chartSvg.attr('width', chartWidth + this.margin.left + this.margin.right)
        .attr('height', chartHeight + this.margin.top + this.margin.bottom);

      // ranges are based on the width and height available so reset
      graph.xScale.range([0, chartWidth]);
      graph.yScale.range([chartHeight, 0]);

      if (init)
      {
        // if first run then just display axis with no transition
        graph.chartSvg.select('.x')
          .attr('transform', 'translate(0,' + chartHeight + ')')
          .call(graph.xAxis);

        graph.chartSvg.select('.y')
          .call(graph.yAxis);
      }
      else
      {
        // for subsequent updates use a transistion to animate the axis to the new position
        var t =  graph.chartSvg.transition().duration(this.updateTransistionMS);

        t.select('.x')
          .attr('transform', 'translate(0,' + chartHeight + ')')
          .call(graph.xAxis);

        t.select('.y')
          .call(graph.yAxis);
      }

      // bind up the data to an array of circles
      var circle =  graph.chartSvg.selectAll('circle')
        .data(graph.sourceData);

      // if already existing then transistion each circle to its new position
      circle.transition()
        .duration(this.updateTransistionMS)
        .attr('cx', function (d) { return  graph.xScale(d.time); })
        .attr('cy', function (d) { return  graph.yScale(d.content); });

      // if new circle then just display
      circle.enter().append('circle')
        .attr('cx', function (d) { return  graph.xScale(d.time); })
        .attr('cy', function (d) { return  graph.yScale(d.content); })
        .attr('r', 3)
        .attr('class', 'circle');

      // bind up the data to the line
      var lines =  graph.chartSvg.selectAll('.line')
        .data([graph.sourceData]); // needs to be an array (size of 1 for our data) of arrays

      // transistion to new position if already exists
      lines.transition()
        .duration(this.updateTransistionMS)
        .attr('d', graph.line);

      // add line if not already existing
      lines.enter().append('path')
        .attr('class', 'line')
        .attr('d', graph.line);
    }
  },
  findGraphToShow: function () {
    var graphToShow = null;
    if (this.highlightedTime === Infinity) {
      var oldestTime = 0;
      _.each(this.graphs, function (graph) {
        _.each(graph.sourceData, function (data) {
          if (data.time > oldestTime) {
            oldestTime = data.time;
            graphToShow = graph;
          }
        });
      });

    } else {
      var timeDiff = Infinity, temp = 0, highlightTime = this.highlightedTime;
      _.each(this.graphs, function (graph) {
        _.each(graph.sourceData, function (data) {
          temp = Math.abs(data.time - highlightTime);
          if (temp <= timeDiff) {
            timeDiff = temp;
            graphToShow = graph;
          }
        });

      });
    }
    return graphToShow;
  },
  close: function () {
    if (this.container) {
      $('#' + this.container).empty();
      this.graphs = [];
      this.currentGraph = null;
    }
  }
});