var Marionette = require('backbone.marionette');

module.exports = Marionette.ItemView.extend({

  tagName: 'li',
  template: '#template-subscriptionItemView',
  ui: {
    checkbox: '.checkbox input',
    name: '.subscription-name'
  },
  initialize: function () {
    this.listenTo(this.model, 'change', this.render);

  },
  onRender: function () {
    this.ui.checkbox[0].checked = this.model.get('checked');
    this.ui.checkbox.bind('click', function () {
      this.model.set('checked', this.ui.checkbox[0].checked);
    }.bind(this));
    this.ui.name.val(this.model.get('connection').name);
    this.ui.name.bind('change paste keyup', function () {
      this.model.get('connection').name =  this.ui.name.val();
    }.bind(this));
  }
});