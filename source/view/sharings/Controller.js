
var _ = require('underscore'),
  SharingCollection = require('./SharingCollection.js'),
  SharingModel = require('./SharingModel.js'),
  SharingListView = require('./SharingListView.js'),
  BookmarkCollection = require('./BookmarkCollection.js'),
  BookmarkModel = require('./BookmarkModel.js'),
  BookmarkListView = require('./BookmarkListView.js');
var Controller = module.exports = function ($modal, connection) {
  this.sharings = {};
  this.connection = connection;
  this.sharingCollection =  new SharingCollection();
  this.sharingListView = null;
  this.bookmarkCollection =  new BookmarkCollection();
  this.bookmarkListView = null;
  this.$modal = $modal;
  this.container = '.modal-content';
};

_.extend(Controller.prototype, {
  show: function () {
    this.$modal.modal();
    if (!this.sharingListView) {
      this.sharingListView = new SharingListView({
        collection: this.sharingCollection
      });
    }
    if (!this.bookmarkListView) {
      this.bookmarkListView = new BookmarkListView({
        collection: this.bookmarkCollection
      });
    }
    this.sharingListView.render();
    this.bookmarkListView.render();
    this.connection.accesses.get(function (error, result) {
      if (error) {
        console.error('GET ACCESSES:', error);
      } else {
        console.log('GER ACCESSES:', result);
        this.addSharings(result);
      }
    }.bind(this));
    this.connection.bookmarks.get(function (error, result) {
      if (error) {
        console.error('GET ACCESSES:', error);
      } else {
        console.log('GER ACCESSES:', result);
        this.addBookmarks(result);
      }
    }.bind(this));
  },
  close: function () {
    this.sharingListView.close();
    this.sharingCollection.reset();
    this.sharingCollection = null;
    this.sharings = {};
  },
  addSharings: function (sharings) {
    if (!Array.isArray(sharings)) {
      sharings = [sharings];
    }
    sharings.forEach(function (sharing) {
      var m = new SharingModel({
        sharing: sharing
      });
      this.sharingCollection.add(m);
    }.bind(this));
  },
  addBookmarks: function (bookmarks) {
    if (!Array.isArray(bookmarks)) {
      bookmarks = [bookmarks];
    }
    bookmarks.forEach(function (bookmark) {
      var m = new BookmarkModel({
        bookmark: bookmark
      });
      this.bookmarkCollection.add(m);
    }.bind(this));
  }
});