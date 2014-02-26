/* global $ */
var Marionette = require('backbone.marionette'),
  ItemView = require('./BookmarkItemView.js'),
  Pryv = require('pryv'),
  _ = require('underscore');

module.exports = Marionette.CompositeView.extend({
  template: '#template-bookmarkListCompositeView',
  container: '.sharings',
  itemView: ItemView,
  itemViewContainer: '#bookmark-list',
  $url: null,
  $auth: null,
  $name: null,
  $tick: null,
  $form: null,
  _findAuthFromUrl: function () {

    var url = this.$url.val(),
      params = Pryv.utility.getParamsFromUrl(url),
      sharings = Pryv.utility.getSharingsFromUrl(url);
    if (params && params.auth) {
      this.$auth.val(params.auth);
    } else if (sharings && sharings.length > 0) {
      this.$auth.val(sharings.join(','));
    }

  },
  initialize: function () {
    this.listenTo(this.collection, 'change', this.debounceRender);
    //this.listenTo(this.collection, 'change', this.bindClick);
    $(this.container).append('<h1>Followed slices</h1>' +
      '<details><summary>Follow a new slice</summary>' +
      '<form class="form-inline" id="add-bookmark" role="form">' +
      '<div class="form-group">' +
        '<label class="sr-only" for="add-bookmark-name">Name</label>' +
        '<input type="text" class="form-control" id="add-bookmark-name" placeholder="Name">' +
      '</div>' +
      '<div class="form-group">' +
        ' <label class="sr-only" for="add-bookmark-url">url</label>' +
        ' <input type="url" class="form-control" id="add-bookmark-url" placeholder="Link">' +
      '</div> ' +
      '<div class="form-group">' +
        ' <label class="sr-only" for="add-bookmark-auth">url</label>' +
        ' <input type="text" class="form-control" id="add-bookmark-auth" placeholder="Token(s)">' +
      '</div> ' +
      ' <button type="submit" id ="add-bookmark-btn" class="btn btn-default">Follow</button>  ' +
      '' +
     ' </form>' +
      '</details>' +
      '<table class="table table-striped" >' +
      '<thead><tr><th>Name</th><th>Link</th><th></th></tr></thead>' +
      '<tbody id="bookmark-list"></tbody>' +
      '</table>');
    this.$url = $('#add-bookmark-url');
    this.$auth = $('#add-bookmark-auth');
    this.$name = $('#add-bookmark-name');
    this.$btn = $('#add-bookmark-btn');
    this.$form = $('#add-bookmark');
    this.$form.bind('change paste keyup', function () {
      this.$btn.removeClass('btn-danger').addClass('btn-default');
    }.bind(this));
    this.$url.bind('change paste keyup', this._findAuthFromUrl.bind(this));
    this.$form.submit(function (e) {
      e.preventDefault();
      var auths = this.$auth.val().split(','),
        url = this.$url.val(),
        name = this.$name.val(),
        sameNameExtension = '',
        i = 0;
      auths.forEach(function (auth) {
        this.trigger('bookmark:add', url, auth, name + sameNameExtension);
        i += 1;
        sameNameExtension = '-' + i;
      }.bind(this));
    }.bind(this));
  },
  endAddBookmark: function (error) {
    if (error) {
      this.$btn.removeClass('btn-default btn-success').addClass('btn-danger');
    } else {
      this.$btn.removeClass('btn-default btn-danger').addClass('btn-success');
    }
  },
  appendHtml: function (collectionView, itemView) {
    $(this.itemViewContainer).append(itemView.el);
  },
  onRender: function () {
    $('details').details();
  },
  onBeforeClose: function () {
    $(this.container).empty();
    return true;
  },
  debounceRender: _.debounce(function () {
    this.render();
  }, 10)
});
