/* global $ */
var _ = require('underscore'),
  Collection = require('./Collection.js'),
  Model = require('./Model.js'),
  ListView = require('./ListView.js');
var Controller = module.exports = function ($modal, loggedConnection, sharingsConnections, target) {
  this.loggedConnection = loggedConnection;
  this.collection =  new Collection();
  this.listView = null;
  this.$modal = $modal;
  this.target = target;
  this.container = '.modal-content';
  this.addSharings(sharingsConnections);
};

_.extend(Controller.prototype, {
  show: function () {
    this.$modal.modal({currentTarget: this.target});
    $(this.container).empty().hide();
    setTimeout(function () {
      $(this.container).fadeIn();
    }.bind(this), 500);
    if (!this.listView) {
      this.listView = new ListView({
        collection: this.collection
      });
      this.listView.on('subscription:add', this._createSubscription.bind(this));
    }
    this.listView.render();
  },
  close: function () {
    this.listView.close();
    if (this.collection) {
      this.collection.reset();
      this.collection = null;
    }
  },
  addSharings: function (sharings) {
    if (!Array.isArray(sharings)) {
      sharings = [sharings];
    }
    sharings.forEach(function (sharing) {
      sharing.url = sharing.id.replace(/\?auth.*$/, '')
        .replace(/\.in/, '.li')
        .replace(/\.io/, '.me');
      sharing.url += '#/sharings/' + sharing.auth;
      var m = new Model({
        connection: sharing
      });
      this.collection.add(m);
    }.bind(this));
  },
  _createSubscription: function (subscriptions) {
    var subNumber = subscriptions.length;
    subscriptions.forEach(function (model) {
      var connection = model.get('connection');
      if (connection.name && connection.auth && connection.url) {
        this.loggedConnection.bookmarks.create(
          {url: connection.url, accessToken: connection.auth, name: connection.name},
          function (error) {
          if (!error) {
            subNumber -= 1;
            if (subNumber === 0) {
              this.close();
              this.$modal.modal('hide');
            }
          } else {
            model.set('error', error);
          }
        }.bind(this));
      }
    }.bind(this));
  }
});