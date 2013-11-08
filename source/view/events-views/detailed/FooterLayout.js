var Marionette = require('backbone.marionette');

module.exports = Marionette.Layout.extend({
  template: '#template-footer',
  ui: {
    count: '#detail-count strong',
    filters: '#filters a',
    container: '#modal-detail-footer'
  }
});