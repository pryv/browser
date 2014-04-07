/*global $ */
var Marionette = require('backbone.marionette'),
  _ = require('underscore');

module.exports = Marionette.ItemView.extend({
  template: '#nav-settings-modal-template',
  ui: {
    a: 'a'
  },
  onRender: function () {
    this.ui.a.click(function (e) {
      this._removeActive();
      e.currentTarget.classList.add('active');
      this.trigger('showRegion', e.currentTarget.getAttribute('data-name'));
    }.bind(this));
    setTimeout(function () {$('body').i18n(); }, 100);
  },
  _removeActive: function () {
    _.each(this.ui.a, function (a) {
      a.classList.remove('active');
    });
  },
  activeRegion: function (regionName) {
    for (var i = 0 ; i < this.ui.a.length; i++) {
      if (this.ui.a[i].getAttribute('data-name') === regionName) {
        this._removeActive();
        this.ui.a[i].classList.add('active');
        break;
      }
    }
  }

});


