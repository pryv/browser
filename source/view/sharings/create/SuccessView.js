var Marionette = require('backbone.marionette');

module.exports = Marionette.ItemView.extend({
  template: '#success-sharings-template',
  className: 'create-sharing full-height',
  templateHelpers: function () {
    return {
      getUrl: function () {
        var url = this.connection.id.replace(/\?auth.*$/, '');
        url = url.replace(/:443/, '');
        url += '#/sharings/' + this.token;
        return url;
      }.bind(this)
    };
  },
  ui: {
    label: 'label',
    checkbox: 'input[type=checkbox]'
  },
  initialize: function () {
    this.connection = this.options.connection;
    this.name = this.options.name;
    this.token = this.options.token;
  }
});