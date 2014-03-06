/* global window */
var Marionette = require('backbone.marionette'),
  _ = require('underscore'),
  Model = require('../../../numericals/TimeSeriesModel.js'),
  Collection = require('../../../numericals/TimeSeriesCollection.js'),
  Settings = require('../../../numericals/utils/ChartSettings.js'),
  Sev = require('./SingleEditView.js'),
  Gcv = require('./GeneralConfigView.js');

module.exports = Marionette.ItemView.extend({
  type: 'Numerical',
  template: '#template-detail-content-numerical-general',
  itemViewContainer: '#detail-content',
  //addAttachmentContainer: '#add-attachment',
  //addAttachmentId: 0,
  //attachmentId: {},
  collection: new Collection([], {type: 'All'}),
  view: null,
  viewModel: null,
  viewType: Gcv,
  rendered: false,
  needToRender: null,
  firstRender: null,
  virtual: null,
  initialize: function () {
    this.firstRender = true;
    this.listenTo(this.model, 'change:collection', this.collectionChanged.bind(this));
    this.listenTo(this.model, 'change:event', this.highlightEvent.bind(this));
    this.updateCollection();
    this.prepareGeneralConfigModel();
    window.addEventListener('resize', this.debounceChildRender.bind(this));
  },
  highlightEvent: function () {
    this.viewModel.set('event', this.model.get('event'));
  },
  onRender: function () {
    this.view = new this.viewType({model: this.viewModel});

    if (this.viewType === Gcv) {
      this.view.bind('edit', this.editSeriesEvent.bind(this));
      this.view.bind('duplicate', this.duplicateSeriesEvent.bind(this));
      this.view.bind('remove', this.removeSeriesEvent.bind(this));
    } else if (this.viewType === Sev) {
      this.view.bind('ready', this.readySeriesEvent.bind(this));
      this.view.bind('cancel', this.cancelSeriesEvent.bind(this));
      this.view.bind('eventEdit', this.eventEdited.bind(this));
    }
    if (this.firstRender) {
      this.firstRender = false;
      this.debounceChildRender();
    } else {
      this.view.render();
    }
  },
  updateCollection: function () {
    if (!this.collection) {
      this.collection = new Collection([], {type: 'All'});
    }

    var c = this.collection;
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

      var m = c.where(filter);
      if (m && m.length !== 0) {
        for (var i = 0; i < m.length; ++i) {
          if (_.indexOf(m[i].get('events'), ev) === -1) {
            m[i].get('events').push(ev);
          }
        }
      } else {
        var s = new Settings(ev.stream, ev.type, this.model.get('virtual'));
        c.add(new Model({
            events: [ev],
            connectionId: connectionId,
            stream: ev.stream,
            streamId: streamId,
            streamName: streamName,
            type: type,
            category: 'any',
            virtual: this.model.get('virtual'),
            color: s.get('color'),
            style: s.get('style'),
            transform: s.get('transform'),
            interval: s.get('interval'),
            fitting: s.get('fitting')
          })
        );
      }
    }.bind(this));
  },
  onClose: function () {
    this.view.close();
    this.view = null;
    this.viewType = Gcv;
    this.viewModel = null;
    this.collection.reset();
    this.collection = null;
    this.rendered = null;
    this.needToRender = null;
  },
  editSeriesEvent: function (m) {

    this.closeChild();
    this.viewType = Sev;
    this.prepareSingleEditModel(m);
    this.render();
  },
  cancelSeriesEvent: function () {
    this.closeChild();
    this.viewType = Gcv;
    this.prepareGeneralConfigModel();
    this.render();
  },
  eventEdited: function (event) {
    var c = this.model.get('collection');
    var submitter = function () {
      this.collectionChanged.bind(this);
    }.bind(this);

    for (var i = 0; i < c.length; ++i) {
      var current = c.at(i);
      var e = current.get('event');
      if (e.id === event.eventId) {
        e.content = event.value;
        current.save(submitter);
        break;
      }
    }


  },
  readySeriesEvent: function (m) {
    var s = new Settings(m.get('stream'), m.get('type'), m.get('virtual'));
    s.set('color', m.get('color'));
    s.set('style', m.get('style'));
    s.set('transform', m.get('transform'));
    s.set('interval', m.get('interval'));
    s.set('fitting', m.get('fitting'));

    this.closeChild();
    this.viewType = Gcv;
    this.prepareGeneralConfigModel();
    this.render();
  },
  duplicateSeriesEvent: function (m) {

    this.closeChild();
    this.viewType = Gcv;
    var model = new Model({
      events: m.get('events'),
      connectionId: m.get('connectionId'),
      streamId: m.get('streamId'),
      streamName: m.get('streamName'),
      type: m.get('type'),
      category: m.get('category')
    });
    this.collection.add(model);
    this.prepareGeneralConfigModel();
    this.render();
  },
  removeSeriesEvent: function (m) {
    var virtual = this.model.get('virtual');
    var streamId = m.get('streamId');
    var type = m.get('type');
    var filters = virtual.filters;
    var newFilter = [];
    for (var i = 0; i < filters.length; ++i) {
      if (!(filters[i].streamId === streamId &&
        filters[i].type === type)) {
        newFilter.push(filters[i]);
      }
    }
    virtual.filters = newFilter;



    this.closeChild();
    this.viewType = Gcv;
    this.collection.remove(m);
    this.prepareGeneralConfigModel();
    this.render();
  },
  collectionChanged: function () {
    // TODO: depends on view type
    this.updateCollection();
    if (this.view) {
      this.view.unbind();
      this.view.close();
    }
    this.render();
  },
  prepareSingleEditModel: function (m) {
    this.viewModel = new Model({
      collection: this.collection,
      edited: m
    });
  },
  prepareGeneralConfigModel: function () {
    this.viewModel = new Model({
      collection: this.collection,
      virtual: this.model.get('virtual')
    });
  },
  closeChild: function () {
    this.view.unbind();
    this.view.close();
  },
  debounceChildRender: _.debounce(function () {
    this.view.render();
  }, 1000)
});