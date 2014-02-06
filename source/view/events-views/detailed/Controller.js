/* global $, window */
var _ = require('underscore'),
  Collection = require('./EventCollection.js'),
  Model = require('./EventModel.js'),
  ListView = require('./ListView.js'),
  CommonView = require('./CommonView.js'),
  GenericContentView = require('./contentView/Generic.js'),
  TweetContentView = require('./contentView/Tweet.js'),
  NoteContentView = require('./contentView/Note.js'),
  NumericalContentView = require('./contentView/numercial/Controller.js'),
  PictureContentView = require('./contentView/Picture.js'),
  PositionContentView = require('./contentView/Position.js'),
  CreationView = require('./contentView/Creation.js');
var Controller = module.exports = function ($modal, connections) {
  this.events = {};
  this.eventsToAdd = [];
  this.connection = connections;
  this.newEvent = null;
  this.collection =  new Collection();
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
  $(window).resize(this.resizeModal);
};

_.extend(Controller.prototype, {
  show: function () {
    this.$modal.modal();
    if (!this.listView) {
      this.commonView = new CommonView({model: new Model({})});
      this.listView = new ListView({
        collection: this.collection
      });
      this.listView.on('itemview:date:clicked', function (evt) {
        this.collection.setCurrentElement(evt.model);
        this.updateSingleView(this.collection.getCurrentElement());
      }.bind(this));
    }
    /*jshint -W101 */
    $(this.container).append('<div class="modal-header">  ' +
      '        <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button> ' +
      '        <h4 class="modal-title" id="myModalLabel">Detailed View</h4>' +
      '        <div class="modal-close"></div> ' +
      '    </div>      ' +
      '<div class="modal-panel-left"><div id="modal-left-content"><div id="detail-content"></div><div id="detail-common"></div></div></div>');
    this.listView.render();
    if (!_.isEmpty(this.events)) {
      this.commonView.render();
    }
    this.resizeModal();
    $(this.$modal).keydown(function (e) {
      if ($('.editing').length !== 0) {
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
    $('div').remove('.modal-panel-left, .modal-panel-right, .modal-header');
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
    if (event.streamId) {
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
      if (model.get('event').type !== 'Creation') {
        this.commonView.model.set('event', model.get('event'));
      }
      var newContentView = this._getContentView(model);
      if (this.contentView === null || this.contentView.type !== newContentView.type) {
        if (this.contentView !== null) {
          this.contentView.close();
          this.contentView.off();
        }
        this.contentView = new newContentView.view({model: new Model({collection:
          this.collection})});
        this.contentView.on('previous', function () {
          this.updateSingleView(this.collection.prev().getCurrentElement());
        }.bind(this));
        this.contentView.on('next', function () {
          this.updateSingleView(this.collection.next().getCurrentElement());
        }.bind(this));
        if (newContentView.type === 'Creation') {
          $('.modal-panel-right').hide();
          this.contentView.connection = this.connection;
          this.commonView.close();
          var currentElement = this.collection.getCurrentElement();
          if (currentElement) {
            // The creation view was called while a detailed view is open
            // we preset the stream;
            this.contentView.streamId = currentElement.get('event').streamId;
            this.contentView.connectionId = currentElement.get('event').connection.serialId;
          }
          this.contentView.on('endOfSelection', function () {
            $('.modal-panel-right').show();
            this.addEvents(this.newEvent.get('event'));
            this.commonView.model.set('event', this.newEvent.get('event'));
            this.commonView.model.set('collection', this.collection);
            this.commonView.render();
            this.updateSingleView(this.newEvent);
          }.bind(this));
        }
        this.contentView.render();
      }
      this.contentView.model.set('event', model.get('event'));
      this.contentView.model.set('collection', this.collection);
    }
  },
  createNewEvent: function () {
    this.newEvent = new Model({event: this._defaultEvent()});
    this.updateSingleView(this.newEvent);
  },
  _defaultEvent: function () {
    var result = {};
    result.type = 'Creation';
    result.time = new Date().getTime() / 1000;
    result.tags = [];
    result.content = null;
    result.desctiption = '';
    return result;
  },
  _getContentView: function (model) {
    var eventType = model.get('event').type;
    if (eventType === 'note/txt' || eventType === 'note/text') {
      return {type: 'Note', view: NoteContentView};
    } else if (eventType === 'picture/attached') {
      return {type: 'Picture', view: PictureContentView};
    } else if (eventType === 'position/wgs84') {
      return {type: 'Position', view: PositionContentView};
    } else if (eventType === 'message/twitter') {
      return {type: 'Tweet', view: TweetContentView};
    } else if (eventType === 'Creation') {
      return {type: 'Creation', view: CreationView};
    } else if (this.eventIsNumerical(eventType)) {
      return {type: 'Numerical', view: NumericalContentView};
    } else {
      return {type: 'Generic', view: GenericContentView};
    }
  },
  resizeModal: _.debounce(function () {
    $('.modal-panel-left').css({
      width: $('.modal-content').width() - $('.modal-panel-right').width()
    });
  }.bind(this), 1000),
  eventIsNumerical: function (e) {
    var eventTypeClass = e.split('/')[0];
    return (
      eventTypeClass === 'money' ||
        eventTypeClass === 'absorbed-dose' ||
        eventTypeClass === 'absorbed-dose-equivalent' ||
        eventTypeClass === 'absorbed-dose-rate' ||
        eventTypeClass === 'absorbed-dose-rate' ||
        eventTypeClass === 'area' ||
        eventTypeClass === 'capacitance' ||
        eventTypeClass === 'catalytic-activity' ||
        eventTypeClass === 'count' ||
        eventTypeClass === 'data-quantity' ||
        eventTypeClass === 'density' ||
        eventTypeClass === 'dynamic-viscosity' ||
        eventTypeClass === 'electric-charge' ||
        eventTypeClass === 'electric-charge-line-density' ||
        eventTypeClass === 'electric-current' ||
        eventTypeClass === 'electrical-conductivity' ||
        eventTypeClass === 'electromotive-force' ||
        eventTypeClass === 'energy' ||
        eventTypeClass === 'force' ||
        eventTypeClass === 'length' ||
        eventTypeClass === 'luminous-intensity' ||
        eventTypeClass === 'mass' ||
        eventTypeClass === 'mol' ||
        eventTypeClass === 'power' ||
        eventTypeClass === 'pressure' ||
        eventTypeClass === 'speed' ||
        eventTypeClass === 'temperature' ||
        eventTypeClass === 'volume'
      );
  }
});