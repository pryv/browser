/* global $, window, i18n */
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
        urlInfo = Pryv.utility.urls.parseClientURL(url),
        params = urlInfo.parseQuery(),
        sharingTokens = urlInfo.parseSharingTokens();
    if (params && params.auth) {
      this.$auth.val(params.auth);
    } else if (sharingTokens && sharingTokens.length > 0) {
      this.$auth.val(sharingTokens.join(','));
    }

  },
  initialize: function () {
    this.listenTo(this.collection, 'change', this.debounceRender);
    //this.listenTo(this.collection, 'change', this.bindClick);
    $(this.container).append('<h5 data-i18n="slices.labels.followedSlices"></h5>' +

      '<table class="table" >' +
      '<thead><tr><th data-i18n="slices.labels.name"></th>' +
      '<th data-i18n="slices.labels.link"></th><th></th></tr></thead>' +
      '<tbody id="bookmark-list"></tbody>' +
      '</table>' +
      '<button class="btn btn-default btn-sm" id="add-slice">' +
      ' <i class="fa fa-plus"></i> ' +
      '<span data-i18n="slices.actions.addNewFollowedSlice"></span></button>' +
      '<form class="form-inline" id="add-bookmark" role="form">' +
      '<div class="form-group">' +
      ' <label class="sr-only" for="add-bookmark-url">url</label>' +
      ' <input type="url" class="form-control" id="add-bookmark-url" ' +
      'data-i18n="[placeholder]slices.labels.linkPlaceholder" required>' +
      '</div> ' +
      '<div class="form-group">' +
        '<label class="sr-only" for="add-bookmark-name">Name</label>' +
        '<input type="text" class="form-control" id="add-bookmark-name" ' +
      'data-i18n="[placeholder]slices.labels.namePlaceholder" required>' +
      '</div>' +
      '<div class="form-group">' +
        ' <label class="sr-only" for="add-bookmark-auth">token</label>' +
        ' <input type="text" class="form-control" id="add-bookmark-auth" placeholder="Token(s)">' +
      '</div> ' +
      ' <button type="submit" id ="add-bookmark-btn" class="btn btn-default">' +
      '<span data-i18n="common.actions.add"></span> ' +
      '<i class="fa fa-spinner fa-spin"></i></button>  ' +
      '' +
      ' </form>');
    this.$url = $('#add-bookmark-url');
    this.$auth = $('#add-bookmark-auth');
    this.$name = $('#add-bookmark-name');
    this.$btn = $('#add-bookmark-btn');
    this.$form = $('#add-bookmark');
    this.$spin = $('#add-bookmark-btn .fa-spin');
    this.$spin.hide();
    this.$form.toggle();
    this.$addSlice = $('#add-slice');
    this.$addSlice.click(function () {
      this.$form.toggle();
      this.$addSlice.toggle();
    }.bind(this));
    this.$form.bind('change paste keyup', function () {
      this.$btn.removeClass('btn-danger btn-success').addClass('btn-default');
    }.bind(this));
    this.$url.bind('change paste keyup', this._findAuthFromUrl.bind(this));
    this.$form.submit(function (e) {
      e.preventDefault();
      var auths = this.$auth.val().split(','),
        url = this.$url.val(),
        name = this.$name.val(),
        sameNameExtension = '',
        i = 0;
      this.$spin.show();
      this.$btn.removeClass('btn-pryv-alizarin');
      auths.forEach(function (auth) {
        this.trigger('bookmark:add', url, auth, name + sameNameExtension);
        i += 1;
        sameNameExtension = '-' + i;
      }.bind(this));
    }.bind(this));
  },
  endAddBookmark: function (error) {
    this.$spin.hide();
    if (error) {
      var errorId;
      console.log(error.id);
      switch (error.id) {
        case 'slice-unknown':
        case 'API_UNREACHEABLE':
          errorId = 'slice-unknown';
          break;
        case 'item-already-exists':
          errorId = 'slice-already-exists';
          break;
        default:
          errorId = 'slice-unknown';
          break;
      }
      window.PryvBrowser.showAlert(this.container, i18n.t('error.followedSlice.add.' + errorId));
      this.$btn.removeClass('btn-success').addClass('btn-pryv-alizarin');
    } else {
      this.$btn.removeClass('btn-pryv-alizarin').addClass('btn-success');
    }
  },
  appendHtml: function (collectionView, itemView) {
    $(this.itemViewContainer).append(itemView.el);
  },
  onRender: function () {
    $('body').i18n();
  },
  onBeforeClose: function () {
    $(this.container).empty();
    return true;
  },
  debounceRender: _.debounce(function () {
    this.render();
  }, 10)
});
