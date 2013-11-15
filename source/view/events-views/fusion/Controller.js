/* global $, window */
var _ = require('underscore'),
  Collection = require('./EventCollection.js'),
  Model = require('./EventModel.js'),
  ListView = require('./ListView.js'),
  SingleView = require('./SingleView.js');
var Controller = module.exports = function ($modal, events) {
  //console.log('lalal');
  this.events = {};
  this.eventsToAdd = [];
  this.collection = null;
  this.highlightedDate = null;
  this.listView = null;
  this.singleView = null;
  this.$modal = $modal;
  this.debounceAdd = _.debounce(function () {
    this.collection.add(this.eventsToAdd, {sort: false});
    this.collection.sort();
    this.eventsToAdd = [];
    if (this.highlightedDate) {
      this.highlightDate(this.highlightedDate);
    }
    //console.log('debounce add', this.collection);
  }.bind(this), 100);

  var sorted = _.reduce(events, function (output, el) {
    var graphName = el.connection.id + '/' + el.streamId + '/' + el.type;
    if (! output[graphName]) {
      output[graphName] = {
        id: graphName,
        streamId: el.streamId,
        streamName: el.stream.name,
        connectionId: el.connection.id,
        type: el.type,
        elements: [],
        trashed: false,
        tags: el.tags
      };
    }
    output[graphName].elements.push({content: el.content, time: el.time});
    return output;
  }, { });

  //console.log(sorted);
  this.addEvents(sorted);
  $(window).resize(this.resizeModal);
};

_.extend(Controller.prototype, {
  show: function () {
    this.$modal.modal();
    if (!this.listView) {
      this.singleView = new SingleView({model: new Model({})});
      this.listView = new ListView({
        collection: this.collection
      });
      this.listView.on('itemview:date:clicked', function (evt) {
        console.log('jordane date:clicked');
        //console.log(evt);
        this.collection.setCurrentElement(evt.model);
        console.log(evt.model);
        this.updateSingleView(this.collection.getCurrentElement());
      }.bind(this));
    }
    this.listView.render();
    this.singleView.render();
    this.resizeModal();
    $(this.$modal).keydown(function (e) {
      var LEFT_KEY = 37;
      var UP_KEY = 38;
      var RIGHT_KEY = 39;
      var DOWN_KEY = 40;
      if (e.which === LEFT_KEY || e.which === UP_KEY) {
        this.updateSingleView(this.collection.prev().getCurrentElement());
        return false;
      }
      if (e.which === RIGHT_KEY || e.which === DOWN_KEY) {
        this.updateSingleView(this.collection.next().getCurrentElement());
        return false;
      }
    }.bind(this));
  },
  close: function () {
    this.collection.reset();
    this.collection = null;
    this.events = {};
    $(this.$modal).unbind('keydown');
    $('#detail-div').empty();
  },
  getEventById: function (event) {
    return this.collection.getEventById(event.id);
  },
  addEvents: function (event) {
    //console.log('addEvents', 'init');
    if (!event) {
      //console.log('addEvents', 'no event');
      return;
    }
    if (event.id) {
      //console.log('addEvents', 'has id, is alone');
      //we have only one event so we put it on a each for the next each
      event = [event];
    }
    if (!this.collection) {
      //console.log('addEvents', 'now collection');
      this.collection = new Collection();
    }
    _.each(event, function (e) {
      //console.log('addEvents', e);
      var m = new Model({
        event: e,
        selected: true,
        chartType: 0
      });
      this.events[e.id] = e;
      this.eventsToAdd.push(m);
    }, this);

    //console.log('addEvents - showing the collection', this.collection);
    this.debounceAdd();
  },
  deleteEvent: function (event) {
    delete this.events[event.id];
    var toDelete = this.getEventById(event);
    if (toDelete) {
      toDelete.destroy();
    }
  },
  updateEvent: function (event) {
    this.events[event.id] = event;
    var toUpdate = this.getEventById(event);
    if (toUpdate) {
      toUpdate.set('event', event);
      this.collection.sort();
    }
  },
  highlightDate: function (time) {
    this.highlightedDate = time;
    var model = this.collection.highlightEvent(time);
    this.updateSingleView(model);

  },
  updateSingleView: function (model) {
    if (model) {
      this.singleView.model.set('event', model.get('event'));
    }
  },
  resizeModal: _.debounce(function () {

    //var size = $('.modal-dialog').width() - $('.modal-panel-right').width();
    //console.log('resize modal', size);
    $('.modal-panel-left').css({
      width: $('.modal-dialog').width() - $('.modal-panel-right').width(),
      height: $('.modal-panel-left').height()
    });
  }.bind(this), 1000)
});