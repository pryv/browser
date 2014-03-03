/* global $ */
var  Marionette = require('backbone.marionette');
/* TODO This a the view for each node, with dynamic animation
 we can't re-render on change because animation would no be done
 If the model is a event Node we must include a new typed view
 */
module.exports = Marionette.ItemView.extend({
  template: '#onboardingView',
  container: '#tree',
  connection: null,
  onRender: function () {
    $(this.container).html(this.$el);
    $('#onboarding-form').submit(function (e) {
      e.preventDefault();
      $('#onboarding-form .fa-spin').show();
      var streamName = $('#onboarding-input-name').val().trim();
      if (streamName && streamName.length > 0 && this.connection) {
        this.connection.streams.create({name: streamName}, function (error) {
          $('#onboarding-form .fa-spin').hide();
          if (!error) {
            this.trigger('done');
          }
        }.bind(this));
      }
    }.bind(this));
  }
});