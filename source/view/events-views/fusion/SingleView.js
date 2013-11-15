/* global $ */
var Marionette = require('backbone.marionette'),
  _ = require('underscore');

module.exports = Marionette.ItemView.extend({
  template: '#template-fusion-graph',
  container: '#modal-left-content',
  templateHelpers: function () {
    /*
    return {
      showContent: function () {
        return this.objectToHtml('content', this.model.get('event').content);
      }.bind(this)
    };*/
  },
  initialize: function () {
    this.listenTo(this.model, 'change', this.render);

  },


  onRender: function () {

    //console.log('attaching chart');

    var myModel = this.model.get('event');
    if (!myModel) {
      return;
    }

    $('#modal-left-content').css({
      width: '100%',
      height: '100%'
    });

    var res = myModel.type.split('/');
    var plotContainer = 'fusion' + myModel.streamId + res[0] + res[1];
    var plotContainerDiv = '<div id="' + plotContainer +
      '" class="graphContainer"></div>';

    //console.log('plotcontainer', plotContainer);
    //console.log('plotContainerDiv', plotContainerDiv);








    $('#modal-left-content').empty();
    $('#modal-left-content').html(plotContainerDiv);

    //console.log($('#' + plotContainer));
    $('#' + plotContainer).css({
      top: 0,
      left: 0,
      width: '100%',
      height: '40%'
    });
    //$(this.container).html(this.el);


    //console.log(myModel);

    var data = myModel.elements;
    //console.log('onredere - data', data);
    var dataMapper = function (d) {
      return _.map(d, function (e) {
        return [e.time, e.content];
      });
    };


    var series = [];
    for (var i = 0; i < data.length; ++i) {
      series.push({
        data: dataMapper(data),
        label: myModel.type,
        type: 0
      });
    }

    var options = {
      grid: {
        hoverable: true,
        clickable: true,
        borderWidth: 0,
        minBorderMargin: 5
      },
      xaxes: [ { show: false } ],
      yaxes: []
    };

    //console.log('series', series);
    var plotData = [];
    for (i = 0; i < series.length; ++i) {
      options.yaxes.push({ show: false});
      plotData.push({
        data: series[i].data,
        label: series[i].label
      });
    }



    //console.log('plotContainer', $('#' + plotContainer));
    //console.log('plotData', plotData);
    //console.log('options', options);

    this.plot = $.plot($('#' + plotContainer), plotData, options);



  },

  objectToHtml: function (key, object) {
    var result = '';
    if (_.isObject(object)) {
      result += '<ul>' + key;
      _.each(_.keys(object), function (k) {
        result += this.objectToHtml(k, object[k]);
      }.bind(this));
      result += '</ul>';
      return result;
    } else {
      return '<li>' + key + ': <label>' + object + '</label></li>';
    }
  }
});