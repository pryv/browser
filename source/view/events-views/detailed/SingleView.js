/* global $ */
var Marionette = require('backbone.marionette'),
  _ = require('underscore');

module.exports = Marionette.ItemView.extend({
  template: '#template-detail-full',
  container: '#modal-left-content',
  templateHelpers: function () {
    return {
      showContent: function () {
        return this.objectToHtml('content', this.model.get('event').content);
      }.bind(this)
    };
  },
  initialize: function () {
    this.listenTo(this.model, 'change', this.render);

  },
  onRender: function () {
    $(this.container).html(this.el);
  },
  objectToHtml: function (key, object) {
    var result = '';
    if (_.isObject(object)) {
      result += '<ul>' + key;
      _.each(_.keys(object), function (k) {
        result += this.objectToHtml(k, object[k]);
      }.bind(this));
      result += '</ul>';
      return result;
    } else {
      return '<li>' + key + ': <label>' + object + '</label></li>';
    }
  }
});