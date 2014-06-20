/* global $, i18n, window */
var _ = require('underscore'),
    Collection = require('./EventCollection.js'),
    Model = require('./EventModel.js'),
    ListView = require('./ListView.js'),
    CommonView = require('./CommonView.js'),
    BatchActionView = require('./BatchActionView.js'),
    GenericContentView = require('./contentView/Generic.js'),
    TweetContentView = require('./contentView/Tweet.js'),
    NoteContentView = require('./contentView/Note.js'),
    NumericalContentView = require('./contentView/numercial/Controller.js'),
    PictureContentView = require('./contentView/Picture.js'),
    PositionContentView = require('./contentView/Position.js'),
    CreationView = require('./contentView/Creation.js');

var EVENTS_PER_SCROLL = 20;

var Controller = module.exports = function ($modal, connections, stream, target) {
  this.events = {};
  this.eventsToAdd = [];
  this.eventsToAddToListView = [];
  this.connection = connections;
  this.stream = stream;
  this.newEvent = null;
  this.collection =  new Collection();
  this.listViewcollection =  new Collection();
  this.highlightedDate = null;
  this.listView = null;
  this.commonView = null;
  this.contentView = null;
  this.batchActionView = null;
  this.$modal = $modal;
  this.target = target;
  this.container = '.modal-content';
  var once = true;
  this.debounceAdd = _.debounce(function () {
    if (!this.collection) {
      this.collection = new Collection();
    }
    this.collection.add(this.eventsToAdd, {sort: false});
    this.collection.sort();
    this.eventsToAddToListView = _.sortBy(this.eventsToAddToListView, function (model) {
      return -model.get('event').time;
    });
    if (!this.listViewcollection) {
      this.listViewcollection = new Collection();
    }
    this.listViewcollection.add(this.eventsToAddToListView.splice(0, EVENTS_PER_SCROLL),
      {sort: false});
    this.eventsToAdd = [];
    if (once && this.highlightedDate) {
      this.highlightDate(this.highlightedDate);
      once = false;
    }

    $('#myModalLabel').html(this._getModalTitle());
  }.bind(this), 100);
  $(window).resize(this.resizeModal);
};

_.extend(Controller.prototype, {
  show: function () {
    this.$modal.modal({currentTarget: this.target});
    $(this.container).empty().hide();
    setTimeout(function () {
      $(this.container).fadeIn();
    }.bind(this), 500);
    if (!this.listView) {
      this.commonView = new CommonView({model: new Model({})});
      this.listView = new ListView({
        collection: this.listViewcollection
      });
      this.listView.on('showMore', this.debounceAdd.bind(this));
      this.listView.on('itemview:item:checked', function () {
        this.updateBatchActionView();
      }.bind(this));
      this.listView.on('itemview:date:clicked', function (evt) {
        this.collection.setCurrentElement(evt.model);
        this.listViewcollection.setCurrentElement(evt.model);
        this.updateSingleView(this.collection.getCurrentElement());
      }.bind(this));
    }
    /* jshint -W101 */
    $(this.container).append('<div class="modal-header">' +
      '  <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button> ' +
      '  <h4 class="modal-title" id="myModalLabel">' + this._getModalTitle() + '</h4>' +
      '  <div class="modal-close"></div>' +
      '</div>' +
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
        this.listViewcollection.prev();
        return false;
      }
      if (e.which === RIGHT_KEY || e.which === DOWN_KEY) {
        this.updateSingleView(this.collection.next().getCurrentElement());
        this.listViewcollection.next();
        return false;
      }
    }.bind(this));
    $('body').i18n();
  },

  close: function () {
    if (this.commonView && this.contentView) {
      if (this.commonView) {this.commonView.close(); this.commonView = null; }
      if (this.contentView) {this.contentView.close(); this.contentView = null; }
      $(this.container).empty();
      if (this.collection) {this.collection.reset(); }
      this.collection = null;
      if (this.listViewcollection) {this.listViewcollection.reset(); }
      this.listViewcollection = null;
      this.events = {};
      $(this.$modal).unbind('keydown');
      $('#pryv-modal').hide().removeClass('in').attr('aria-hidden', 'true');
      $('.modal-backdrop').remove();
      this.$modal.trigger('hidden.bs.modal');
    }
  },
  updateBatchActionView: function () {
    if (!this.batchActionView) {
      this.batchActionView = new BatchActionView({collection: this.collection});
      this.batchActionView.render();
      this.batchActionView.on('close', function () {
        this.batchActionView.close();
        this.batchActionView = null;
      }.bind(this));
    } else {
      this.batchActionView.render();
    }
  },
  getEventById: function (event) {
    return [this.collection.getEventById(event.id),
      this.listViewcollection.getEventById(event.id)];
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
    if (!this.listViewcollection) {
      this.listViewcollection = new Collection();
    }
    _.each(event, function (e) {
      var m = new Model({
        event: e
      });
      this.events[e.id] = e;
      this.eventsToAdd.push(m);
      this.eventsToAddToListView.push(m);
    }, this);
    this.debounceAdd();
  },

  deleteEvent: function (event) {
    delete this.events[event.id];
    var currentElement = this.collection.getCurrentElement();
    if (currentElement.get('event').id === event.id) {
      var next = this.collection.next().getCurrentElement();
      if (next.get('event').id === event.id) {
        next = this.collection.prev().getCurrentElement();
        if (next.get('event').id === event.id) {
          return this.close();
        }
      }
      this.updateSingleView(next);
    }
    var toDelete = this.getEventById(event);
    if (toDelete.length > 0) {
      toDelete.forEach(function (e) {e.destroy(); });
    }
  },

  updateEvent: function (event) {
    this.events[event.id] = event;
    var toUpdate = this.getEventById(event);
    if (toUpdate.length > 0) {
      _.each(toUpdate, function (e) {e.set('event', event); e.trigger('change:content'); });
      this.collection.sort();
      this.listViewcollection.sort();
      this.commonView.model.trigger('change');
      this.contentView.model.trigger('change');
    }
  },

  highlightDate: function (time) {
    this.highlightedDate = time;
    var model = this.collection.highlightEvent(time);
    this.listViewcollection.highlightEvent(time);
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
          this.collection, virtual: this.virtual})});
        this.contentView.on('previous', function () {
          this.updateSingleView(this.collection.prev().getCurrentElement());
          this.listViewcollection.prev();
        }.bind(this));
        this.contentView.on('next', function () {
          this.updateSingleView(this.collection.next().getCurrentElement());
          this.listViewcollection.next();
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

  /* jshint -W101 */
  // TODO (this & next method): type-specific stuff must be properly abstracted in type plugins
  // follow up: https://trello.com/c/0P6lmhsS/299-as-a-dev-i-need-event-type-specific-components-to-be-properly-abstracted
  _getContentView: function (model) {
    var evt = model.get('event');
    var t = evt.type;
    if (t === 'note/txt' || t === 'note/text') {
      return {type: 'Note', view: NoteContentView};
    } else if (t === 'picture/attached') {
      return {type: 'Picture', view: PictureContentView};
    } else if (t === 'position/wgs84') {
      return {type: 'Position', view: PositionContentView};
    } else if (t === 'message/twitter') {
      return {type: 'Tweet', view: TweetContentView};
    } else if (t === 'Creation') {
      return {type: 'Creation', view: CreationView};
    } else if (window.PryvBrowser.eventTypes.isNumerical(evt)) {
      return {type: 'Numerical', view: NumericalContentView};
    } else {
      return {type: 'Generic', view: GenericContentView};
    }
  },
  _getModalTitle: function () {
    var eModel = this.collection.length > 0 ? this.collection.getCurrentElement() : null;
    var evt = eModel ? eModel.get('event') : null;
    var t = evt ? evt.type : null;
    var tKey;
    if (t === 'note/txt' || t === 'note/text') {
      tKey = 'note';
    } else if (t === 'picture/attached') {
      tKey = 'picture';
    } else if (t === 'position/wgs84') {
      tKey = 'position';
    } else if (t === 'message/twitter') {
      tKey = 'message';
    } else if (window.PryvBrowser.eventTypes.isNumerical(evt)) {
      tKey = 'numerical';
    } else {
      tKey = 'generic';
    }
    $('#myModalLabel').html(i18n.t('events.common.labels.detailViewTitle', {
      count: this.collection.length,
      type: i18n.t('events.' + tKey + '.labels.items'),
      stream: this.stream.name
    }));
  },

  resizeModal: _.debounce(function () {
    $('.modal-panel-left').css({
      width: $('.modal-content').width() - $('.modal-panel-right').width()
    });
  }.bind(this), 1000)
});
