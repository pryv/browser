var _ = require('underscore'),
  PositionsView = require('./View.js'),
  CommonModel = require('../common/Model.js');

module.exports = CommonModel.implement(
  function (events, params) {
    CommonModel.call(this, events, params);
    this.typeView = PositionsView;
    this.modelContent = {};
    this.positions = [];
  },

  {
    OnDateHighlightedChange: function (time) {
      this.highlightedTime = time;
      if (this.view) {
        this.view.onDateHighLighted(time);
      }
    },

    _findEventToDisplay: function () {},

    beforeRefreshModelView: function () {
      if (this.positions.length !== _.size(this.events)) {
        this.positions = [];
        _.each(this.events, function (event) {
          this.positions.push(event);
        }, this);
        this.positions = _.sortBy(this.positions, function (p) { return p.time; });
      }
      this.modelContent = {
        positions: this.positions,
        posWidth: this.width,
        posHeight: this.height,
        id: this.id,
        eventsNbr: _.size(this.events)
      };
    }
  }
);