/* global $, window */
var _ = require('underscore'),
  Collection = require('./EventCollection.js'),
  Model = require('./EventModel.js'),
  ListView = require('./ListView.js'),
  CommonView = require('./CommonView.js'),
  ContentView = require('./contentView/Generic.js');
var Controller = module.exports = function ($modal, events) {
  this.events = {};
  this.eventsToAdd = [];
  this.collection = null;
  this.highlightedDate = null;
  this.listView = null;
  this.commonView = null;
  this.contentView = null;
  this.$modal = $modal;
  this.container = '.modal-content';
  this.debounceAdd = _.debounce(function () {
    this.collection.add(this.eventsToAdd, {sort: false});
    this.collection.sort();
    this.eventsToAdd = [];
    if (this.highlightedDate) {
      this.highlightDate(this.highlightedDate);
    }
  }.bind(this), 100);
  this.addEvents(events);
  $(window).resize(this.resizeModal);
};

_.extend(Controller.prototype, {
  show: function () {
    this.$modal.modal();
    if (!this.listView) {
      this.commonView = new CommonView({model: new Model({})});
      this.contentView = new ContentView({model: new Model({})});
      this.listView = new ListView({
        collection: this.collection
      });
      this.listView.on('itemview:date:clicked', function (evt) {
        this.collection.setCurrentElement(evt.model);
        this.updateSingleView(this.collection.getCurrentElement());
      }.bind(this));
    }
    /*jshint -W101 */
    $(this.container).append('<div class="modal-panel-left"><div id="modal-left-content"><div id="detail-content"></div><div id="detail-common"></div></div></div>');
    this.listView.render();
    this.commonView.render();
    this.contentView.render();
    this.resizeModal();
    $(this.$modal).keydown(function (e) {
      if ($('#detail-full .editing').length !== 0) {
        return true;
      }
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
    this.commonView.close();
    this.contentView.close();
    $('div').remove('.modal-panel-left');
    this.collection.reset();
    this.collection = null;
    this.events = {};
    $(this.$modal).unbind('keydown');
  },
  getEventById: function (event) {
    return this.collection.getEventById(event.id);
  },
  addEvents: function (event) {
    if (!event) {
      return;
    }
    if (event.id) {
      //we have only one event so we put it on a each for the next each
      event = [event];
    }
    if (!this.collection) {
      this.collection = new Collection();
    }
    _.each(event, function (e) {
      var m = new Model({
        event: e
      });
      this.events[e.id] = e;
      this.eventsToAdd.push(m);
    }, this);
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
      console.log('UPDATESINGLEVIEW', model);
      this.contentView.model.set('event', model.get('event'));
      this.commonView.model.set('event', model.get('event'));
    }
  },
  createNewEvent: function () {
    var m = new Model({event: this._defaultEvent()});
    this.eventsToAdd.push(m);
    this.debounceAdd();
    this.updateSingleView(m);
  },
  _defaultEvent: function () {
    var defaultProperties = ['streamId', 'time', 'duration', 'type', 'content',
        'tags', 'description', 'connection'],
      result = {};
    for (var i = 0; i < defaultProperties.length; i++) {
      result[defaultProperties[i]] = null;
    }
    return result;
  },
  resizeModal: _.debounce(function () {
    $('.modal-panel-left').css({
      width: $('.modal-content').width() - $('.modal-panel-right').width()
    });
  }.bind(this), 1000)
});