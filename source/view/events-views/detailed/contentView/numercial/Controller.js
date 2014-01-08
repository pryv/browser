/* global window */
var Marionette = require('backbone.marionette'),
  _ = require('underscore'),
  Model = require('../../../numericals/TimeSeriesModel.js'),
  Collection = require('../../../numericals/TimeSeriesCollection.js'),
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
  initialize: function () {
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
      this.view.bind('edited', this.editedSeriesEvent.bind(this));
    }
    this.debounceChildRender();
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
        c.add(new Model({
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
    // save changes made on the series
    this.viewType = Sev;
    this.prepareSingleEditModel(m);
    this.view.unbind();
    this.view.close();
    this.render();
  },
  editedSeriesEvent: function () {
    // TODO: implement

    this.viewType = Gcv;
    this.view.unbind();

  },
  duplicateSeriesEvent: function () {
    // TODO: implement

    // directly enter edit mode
    this.viewType = Gcv;
    this.view.unbind();

  },
  removeSeriesEvent: function () {
    // TODO: implement
  },
  collectionChanged: function () {
    this.updateCollection();
    this.render();
  },
  prepareSingleEditModel: function (m) {
    var c = new Collection([], {type: 'All'});
    c.add(m);
    this.viewModel = new Model({
      collection: c
    });
  },
  prepareGeneralConfigModel: function () {
    this.viewModel = new Model({
      collection: this.collection
    });
  },
  debounceChildRender: _.debounce(function () {
    this.view.render();
  }, 1000)
});