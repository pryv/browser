/* global $, FormData */
var Marionette = require('backbone.marionette'),
  _ = require('underscore'),
  Model = require('../../draganddrop/TimeSeriesModel.js'),
  Collection = require('../../draganddrop/TimeSeriesCollection.js'),
  ChartModel = require('../../draganddrop/ChartModel.js'),
  ChartView = require('../../draganddrop/ChartView.js');


module.exports = Marionette.ItemView.extend({
  type: 'Picture',
  template: '#template-detail-content-numerical',
  itemViewContainer: '#detail-content',
  addAttachmentContainer: '#add-attachment',
  addAttachmentId: 0,
  attachmentId: {},
  collection: new Collection([], {type: 'All'}),
  chartView: null,
  ui: {
    li: 'li.editable',
    edit: '.edit'
  },
  initialize: function () {
    this.listenTo(this.model, 'change', this.debounceRender.bind(this));
  },
  onRender: function () {
    this.updateCollection();
    $(this.itemViewContainer).html(this.el);
    $('#detail-legend', $(this.itemViewContainer)).css({height: '35px'});
    $('#detail-chart-container', $(this.itemViewContainer)).css({height: '360px'});

    if (this.chartView) {
      this.chartView.model.set('collection', this.collection);
    } else {
      this.chartView = new ChartView({model:
        new ChartModel({
          container: '#detail-chart-container',
          view: null,
          requiresDim: false,
          collection: this.collection,
          highlighted: false,
          highlightedTime: null,
          allowPieChart: false,
          dimensions: null,
          legendStyle: 'list', // Legend style: 'list', 'table'
          legendButton: true,  // A button in the legend
          legendButtonContent: ['edit', 'duplicate', 'remove'],
          legendShow: true,     // Show legend or not
          legendContainer: '#detail-legend', //false or a a selector
          legendExtras: true,   // use extras in the legend
          onClick: false,
          onHover: false,
          onDnD: false,
          allowPan: false,      // Allows navigation through the chart
          allowZoom: false,     // Allows zooming on the chart
          xaxis: true
        })});

      this.chartView.on('remove', function (m) {
        this.chartView.model.get('collection').remove(m);
      }.bind(this));

      this.chartView.on('edit', function (m) {
        console.log('edit', m);
      }.bind(this));

      this.chartView.on('duplicate', function (m) {
        var model = new Model({
          events: m.get('events'),
          connectionId: m.get('connectionId'),
          streamId: m.get('streamId'),
          streamName: m.get('streamName'),
          type: m.get('type'),
          category: m.get('category')
        });
        this.chartView.model.get('collection').add(model);
      }.bind(this));
    }



    if ($('#detail-chart-container').length !== 0) {
      this.chartView.render();
    }
  },
  addAttachment: function () {
    var id = 'attachment-' + this.addAttachmentId;
    var html = '<li><input type="file" id="' + id + '"></li>';
    this.addAttachmentId++;
    $(this.addAttachmentContainer).append(html);
    $('#' + id).bind('change', this._onFileAttach.bind(this));
  },
  _onFileAttach : function (e)	{
    var file = new FormData(),
      keys = this.model.get('event').attachments ? _.keys(this.model.get('event').attachments) :
        [e.target.files[0].name];
    e.target.disabled = true;
    file.append(keys[0].split('.')[0], e.target.files[0]);
    this.model.addAttachment(file);
  },
  getSrc: function () {
    var event = this.model.get('event'),
      attachments = event.attachments;
    if (attachments) {
      var keys = _.keys(attachments);
      return event.url + '/' + attachments[keys[0]].fileName + '?auth=' + event.connection.auth;
    } else {
      return '';
    }
  },
  getAlt: function () {
    var event = this.model.get('event'),
      attachments = event.attachments;
    if (attachments) {
      var keys = _.keys(attachments);
      return keys[0];
    } else {
      return '';
    }
  },
  /* jshint -W098, -W061 */
  updateEvent: function ($elem) {
    var event = this.model.get('event'),
      key = ($($elem).attr('id')).replace('edit-', '').replace('-', '.'),
      value = $($elem).val().trim();
    eval('event.' + key + ' = value');
    this.completeEdit($($elem).parent());
    this.render();

  },
  completeEdit: function ($elem) {
    $($elem).removeClass('editing');
  },
  updateCollection: function () {
    if (!this.collection) {
      this.collection = new Collection([], {type: 'All'});
    }
    //this.collection.empty();
    var myCol = this.collection;
    this.model.get('collection').each(function (e) {
      var ev = e.get('event');
      var connectionId = ev.connection.id;
      var streamId = ev.streamId;
      var streamName = ev.stream.name;
      var type = ev.type;

      var filter = {
        connectionId: connectionId,
        streamId: streamId,
        type: type
      };

      var matching = myCol.where(filter);

      if (matching && matching.length !== 0) {
        matching[0].get('events').push(ev);
      } else {
        myCol.add(new Model({
            events: [ev],
            connectionId: connectionId,
            streamId: streamId,
            streamName: streamName,
            type: type,
            category: 'any'
          })
        );
      }
    });
  },
  debounceRender: _.debounce(function () {
    this.render();
  }, 1000)
});