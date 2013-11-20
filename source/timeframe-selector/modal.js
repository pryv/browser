
var Backbone = require('backbone');

module.exports = Backbone.View.extend({
  /* Variables */
  id: '#modal',
  $modal: null,
  /* Methods */
  render: function () {
    this.setElement(this.id);
    this.$el.html(this.template());
    this.$modal = this.$(this.modalId).modal();
    this.delegateEvents();
    return this;
  },
  close: function () {
    this.undelegateEvents();
    this.$modal.modal('hide');
  }
});

