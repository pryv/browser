var _ = require('underscore'),
  PicturesView = require('./View.js'),
  CommonModel = require('../common/Model.js');

module.exports = CommonModel.implement(
  function (events, params) {
    CommonModel.call(this, events, params);
    this.typeView = PicturesView;
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
        picUrl: this.eventDisplayed.attachmentsUrl,
        eventsNbr: _.size(this.events)
      };
    }
  }
);