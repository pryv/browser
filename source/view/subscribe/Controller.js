/* global $, window, i18n */
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
  console.log(sharingsConnections);
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
      this.listView.on('close', this.close.bind(this));
    }
    this.listView.render();
  },
  close: function () {
    this.listView.close();
    if (this.collection) {
      this.collection.reset();
      this.collection = null;
    }
    $('#pryv-modal').hide().removeClass('in').attr('aria-hidden', 'true');
    $('.modal-backdrop').remove();
  },
  addSharings: function (sharings) {
    if (!Array.isArray(sharings)) {
      sharings = [sharings];
    }
    sharings.forEach(function (sharing) {
      console.log(sharing);
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
    var gotError = false;
    subscriptions.forEach(function (model) {
      var connection = model.get('connection');
      if (!connection.name || connection.name.length === 0) {
        connection.name = connection._accessInfo.name;
      }
      if (connection.name && connection.auth && connection.url) {
        // TODO appel API
        this.loggedConnection.bookmarks.create(
          {url: connection.url, accessToken: connection.auth, name: connection.name},
          function (error) {
            if (error) {
              window.PryvBrowser.showAlert(this.container,
                i18n.t('error.subscribeSlice.') + error.id);
              gotError = true;
            }
            model.set('error', error);
            model.set('created', !error);
            subNumber--;
            if (subNumber === 0) {
              this.listView.onCreateSubscriptionFinished(gotError);
            }

          }.bind(this));
      }
    }.bind(this));
  }
});