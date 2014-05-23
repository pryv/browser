var _ = require('underscore'),
  TweetsView = require('./View.js'),
  CommonModel = require('../common/Model.js');
var minWidth = 300;
var minHeight = 200;
var maxWidth = 300;
var maxHeight = 200;
module.exports = CommonModel.implement(
  function (events, params) {
    CommonModel.call(this, events, params);
    this.typeView = TweetsView;
    this.eventDisplayed = null;
    this.modelContent = {};
    this.nbrDisplayW = -1;
    this.nbrDisplayH = -1;
    this.change = false;
  },

  {
    _howManyEventsCanBeDisplayed: function () {
      if (this.width < minWidth || this.height < minHeight) {
        this.nbrDisplayW = 1;
        this.nbrDisplayH = 1;
      }
      if (Math.ceil(this.width / maxWidth) !== this.nbrDisplayW ||
        Math.ceil(this.height / maxHeight) !== this.nbrDisplayH) {
        this.nbrDisplayW = Math.ceil(this.width / maxWidth);
        this.nbrDisplayH = Math.ceil(this.height / maxHeight);
      }
    },
    _findEventToDisplay: function () {
      this._howManyEventsCanBeDisplayed();
      this.eventsToDisplay = [];
      // sort events oldest first, latest last
      var events = _.sortBy(_.toArray(this.events), function (event) {
        return event.time;
      });
      var nbrEventToDisplay = this.nbrDisplayW * this.nbrDisplayH;
      if (events.length < nbrEventToDisplay) {
        this.nbrDisplayW = Math.ceil(Math.sqrt(events.length));
        this.nbrDisplayH = Math.ceil(events.length / this.nbrDisplayW);
        nbrEventToDisplay = events.length;
      }
      if (this.highlightedTime === Infinity) {
        this.eventsToDisplay = events.splice(events.length - nbrEventToDisplay);
      } else {
        //find nearest event
        var nearestIndex = 0;
        var timeDiff = Infinity;
        var nextTimeDiff = 0;
        for (var i = 0; i < events.length; i++) {
          nextTimeDiff = Math.abs(events[i].time - this.highlightedTime);
          if (nextTimeDiff <= timeDiff) {
            timeDiff = nextTimeDiff;
            nearestIndex = i;
          } else {
            break;
          }
        }
        this.eventsToDisplay.push(events[nearestIndex]);
        var beforeIndex = nearestIndex - 1;
        var afterIndex = nearestIndex + 1;
        for (var j = 0; j < nbrEventToDisplay - 1; j++) {
          if (!events[beforeIndex]) {
            this.eventsToDisplay.push(events[afterIndex]);
            afterIndex++;
          } else if (!events[afterIndex]) {
            this.eventsToDisplay.unshift(events[beforeIndex]);
            beforeIndex--;
          } else if (this.highlightedTime - events[beforeIndex].time >
            events[afterIndex].time - this.highlightedTime) {
            this.eventsToDisplay.push(events[afterIndex]);
            afterIndex++;
          } else {
            this.eventsToDisplay.unshift(events[beforeIndex]);
            beforeIndex--;
          }
        }

      }
    },
    beforeRefreshModelView: function () {
      for (var i = 0; i < this.eventsToDisplay.length; ++i) {
        var denomW = i >= (this.nbrDisplayH - 1) * this.nbrDisplayW &&
          this.eventsToDisplay.length % this.nbrDisplayW !== 0 ?
          this.eventsToDisplay.length % this.nbrDisplayW:
          this.nbrDisplayW;

        var border = 0;
        var width = (100 - (border * (denomW - 1))) / denomW;
        var left = (Math.floor(i % this.nbrDisplayW)) * (width + border);
        var height = (100 - (border * (this.nbrDisplayH - 1))) / this.nbrDisplayH;
        var top = (Math.floor(i / this.nbrDisplayW)) * (height + border);
        this.eventsToDisplay[i].width = width * this.width / 100.0;
        this.eventsToDisplay[i].height = height * this.height / 100.0;
        this.eventsToDisplay[i].top = top * this.height / 100.0;
        this.eventsToDisplay[i].left = left * this.width / 100.0;
      }

      this.modelContent = {
        events: this.eventsToDisplay,
        eventsNbr: _.size(this.events),
        change: this.change
      };
      this.change = !this.change;
    }
  }
);