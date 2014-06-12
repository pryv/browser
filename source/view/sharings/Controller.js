/* global $, window, i18n */
var _ = require('underscore'),
  SharingCollection = require('./SharingCollection.js'),
  SharingModel = require('./SharingModel.js'),
  SharingListView = require('./SharingListView.js'),
  BookmarkCollection = require('./BookmarkCollection.js'),
  BookmarkModel = require('./BookmarkModel.js'),
  BookmarkListView = require('./BookmarkListView.js'),
  Pryv = require('pryv');
var Controller = module.exports = function ($modal, connection, target) {
  this.sharings = {};
  this.connection = connection;
  this.sharingCollection =  new SharingCollection();
  this.sharingListView = null;
  this.bookmarkCollection =  new BookmarkCollection();
  this.bookmarkListView = null;
  this.$modal = $modal;
  this.target = target;
  $('.modal-content').empty();
  $('.modal-content').prepend('<div class="modal-header">  ' +
    '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">' +
    '&times;</button> ' +
    '<h4 class="modal-title" id="myModalLabel" data-i18n="slices.labels.manageTitle"></h4>' +
    '<div class="modal-close"></div> ' +
    '</div><div id="modal-content"><div id="creation-content">' +
    '<div class="sharings container"></div></div>' +
    '<div id="creation-footer" class="col-md-12">' +
    '<button id="ok" class="btn btn-primary" ' +
    'data-dismiss="modal" data-i18n="common.actions.close"></button>' +
    '</div></div>');
  $('body').i18n();
  this.container = '.sharings';

};

_.extend(Controller.prototype, {
  show: function () {
    this.$modal.modal({currentTarget: this.target});
    $('.modal-content').hide();
    setTimeout(function () {
      $('.modal-content').fadeIn();
    }.bind(this), 500);
    if (!this.sharingListView) {
      this.sharingListView = new SharingListView({
        collection: this.sharingCollection
      });
    }
    if (!this.bookmarkListView) {
      this.bookmarkListView = new BookmarkListView({
        collection: this.bookmarkCollection
      });
      this.bookmarkListView.on('bookmark:add', this._createBookmark.bind(this));
      this.bookmarkListView.on('itemview:bookmark:delete', this._onDeleteBookmarkClick.bind(this));
      this.sharingListView.on('itemview:sharing:delete', this._onDeleteSharingClick.bind(this));
      this.sharingListView.on('itemview:sharing:update', this._onUpdateSharingClick.bind(this));
    }
    this.sharingListView.render();
    this.bookmarkListView.render();
    this.connection.accesses.get(function (error, result) {
      if (error) {
        console.error('GET ACCESSES:', error);
      } else {
        this.addSharings(result, this.connection);
      }
    }.bind(this));
    this.connection.bookmarks.get(function (error, result) {
      if (error) {
        console.error('GET ACCESSES:', error);
      } else {
        this.addBookmarks(result);
      }
    }.bind(this));
  },
  close: function () {
    this.sharingListView.close();
    this.sharingCollection.reset();
    $(this.container).remove();
    $('.modal-content').empty();
    this.sharingCollection = null;
    this.sharings = {};
  },
  addSharings: function (sharings, connection) {
    if (!Array.isArray(sharings)) {
      sharings = [sharings];
    }
    sharings.forEach(function (sharing) {
      if (sharing.type === 'shared') {
        var url = connection.id.replace(/\?auth.*$/, '');
        url = url.replace(/\.in/, '.li');
        url = url.replace(/\.io/, '.me');
        url += '#/sharings/' + sharing.token;
        sharing.url = url;
        var m = new SharingModel({
          sharing: sharing
        });
        this.sharingCollection.add(m);
      }
    }.bind(this));
  },
  addBookmarks: function (bookmarks) {
    console.log('addBookmarks', bookmarks);
    if (!Array.isArray(bookmarks)) {
      bookmarks = [bookmarks];
    }
    bookmarks.forEach(function (bookmark) {
      var url = bookmark.settings.url;
      url = url.replace(/\.in/, '.li');
      url = url.replace(/\.io/, '.me');
      bookmark.settings.url = url;
      var m = new BookmarkModel({
        bookmark: bookmark
      });
      this.bookmarkCollection.add(m);
    }.bind(this));
  },
  _createBookmark: function (url, auth, name) {
    if (url && auth && name) {
      var conn = new Pryv.Connection({
        url: url.replace('.li', '.in').replace('.me', '.io'),
        auth: auth
      });
      conn.accessInfo(function (error) {
        if (!error) {
          this.connection.bookmarks.create({url: url, accessToken: auth, name: name},
          function (error, result) {
            if (!error && result) {
              this.addBookmarks(result);
            }
            if (error) {
              console.error('Bookmarks creation error:', error);
            }
            this.bookmarkListView.endAddBookmark(error);
          }.bind(this));
        } else {
          this.bookmarkListView.endAddBookmark(error);
          console.warn('Bookmark dont exist', url, auth);
        }
      }.bind(this));
    }
    else {
      this.bookmarkListView.endAddBookmark({id: 'slice-unknown'});
    }
  },
  _onDeleteBookmarkClick: function (e, bookmarkModel) {
    this.connection.bookmarks.delete(bookmarkModel.get('bookmark').settings.bookmarkId,
    function (error) {
      if (!error) {
        this.bookmarkCollection.remove(bookmarkModel);
      } else { window.PryvBrowser.showAlert(this.container,
        i18n.t('error.followedSlice.delete.' + error.id));
        console.warn(error);
      }
    }.bind(this));
  },
  _onDeleteSharingClick: function (e, sharingModel) {
    this.connection.accesses.delete(sharingModel.get('sharing').id,
    function (err) {
      if (err) {
        // TODO: check actual error and handle it properly
        window.PryvBrowser.reportError(err, {
          component: 'slices management',
          action: 'delete shared access'
        });
        window.PryvBrowser.showAlert(this.container, i18n.t('common.messages.errUnexpected'));
        return;
      }
      this.sharingCollection.remove(sharingModel);
    }.bind(this));
  },
  _onUpdateSharingClick: function (e, view) {
    this.connection.accesses.update(view.model.get('sharing'), view.endUpdateSharing.bind(view));
  }
});
