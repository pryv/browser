/* global $ */
var  Marionette = require('backbone.marionette');
/* TODO This a the view for each node, with dynamic animation
 we can't re-render on change because animation would no be done
 If the model is a event Node we must include a new typed view
 */
module.exports = Marionette.ItemView.extend({
  template: '#onboardingView',
  container: '#onboarding',
  className: 'onboarding',
  connection: null,
  onRender: function () {
    $(this.container).html(this.$el);
    $('#onboarding-add').click(function () {
      this.trigger('clickAdd');
    }.bind(this));
    $('#onboarding-connect').click(function () {
      this.trigger('clickConnect');
    }.bind(this));
    $('#onboarding-skip').click(function () {
      this.trigger('clickSkip');
    }.bind(this));
    $('.carousel').carousel({
      interval: false,
      wrap: false
    });
    $('#onboarding').removeClass('hidden');
    $('body').i18n();
  }
});