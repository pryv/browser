var _ = require('underscore'),
  TweetView = require('./View.js'),
  CommonModel = require('../common/Model.js');

module.exports = CommonModel.implement(
  function (events, params) {
    CommonModel.call(this, events, params);
    this.typeView = TweetView;
    this.eventDisplayed = null;
    this.modelContent = {};
  },
  {
    beforeRefreshModelView: function () {
      this.modelContent = {
        content: this.eventDisplayed.content,
        description: this.eventDisplayed.description,
        id: this.eventDisplayed.id,
        modified: this.eventDisplayed.modified,
        streamId: this.eventDisplayed.streamId,
        tags: this.eventDisplayed.tags,
        time: this.eventDisplayed.time,
        type: this.eventDisplayed.type,
        width: this.width,
        height: this.height,
        eventsNbr: _.size(this.events)
      };
    }
  }
);