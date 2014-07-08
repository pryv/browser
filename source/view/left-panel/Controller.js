/* global $ */
var Marionette = require('backbone.marionette'),
  FilterByStreamView = require('./FilterByStream.js'),
  ActionsView = require('./Actions.js'),
  _ = require('underscore');

var Layout = Marionette.Layout.extend({
  template: '#left-panel-template',

  regions: {
    filterByStream: '#filter-by-stream',
    actions: '#actions'
  },
  initialize: function () {
    this.$el =  $('.menu-panel');
  }
});
var Controller = module.exports  = {};

var view = null,
  filterByStreamView = null,
  actionsView = null,
  connectionsNumber = {
    logged: 0,
    sharings: 0,
    bookmarks: 0,
    public: 0
  };
Controller.render = function (MainModel) {
  if (!view || !filterByStreamView) {
    if (!view) {
      view = new Layout();
      view.render();
      actionsView = new ActionsView();
      view.actions.show(actionsView);
    }
    if (!filterByStreamView) {
      filterByStreamView = new FilterByStreamView({MainModel: MainModel});
      view.filterByStream.show(filterByStreamView);
    }
  } else if (view && filterByStreamView && isConnectionsNumberChange(MainModel)) {
    /*view.render();
    view.actions.show(actionsView);*/
    view.filterByStream.show(filterByStreamView);
  }



};

var isConnectionsNumberChange = function (MainModel) {
  // hack: need to have an onStream change and onConnection change;
  var logged = 0;
  if (MainModel.loggedConnection && MainModel.loggedConnection.datastore) {
    logged = _.size(MainModel.loggedConnection.datastore.getStreams());
  }
  var pub = 0;
  if (MainModel.publicConnection && MainModel.publicConnection.datastore) {
    pub = _.size(MainModel.publicConnection.datastore.getStreams());
  }
  var sharings = 0;
  _.each(MainModel.sharingsConnections, function (connection) {
    if (connection.datastore) {
      sharings += _.size(connection.datastore.getStreams());
    }
  });
  var bookmarks = 0;
  _.each(MainModel.bookmakrsConnections, function (connection) {
    if (connection.datastore) {
      bookmarks += _.size(connection.datastore.getStreams());
    }
  });
  var res = !(connectionsNumber.logged === logged &&
    connectionsNumber.public === pub &&
    connectionsNumber.sharings === sharings &&
    connectionsNumber.bookmarks === bookmarks
    );
  connectionsNumber.logged = logged;
  connectionsNumber.public = pub;
  connectionsNumber.sharings = sharings;
  connectionsNumber.bookmarks = bookmarks;
  return res;
};
