var  Marionette = require('backbone.marionette');

var NodeView = module.exports = Marionette.ItemView.extend({
  initialize: function () {
    this.listenTo(this.model, 'change', this.change);
  },
  change: function () {
    console.log('change');
    this.render();
  },
  render: function () {

    this.$el.css('background-color', this.getRandomColor());
    this.$el.addClass('node');
    this.$el.attr('id', this.model.get('id'));
   // this.$el.html(this.model.get('name'));
    if (this.model.get('containerId')) {
      this.$el.css('width', this.model.get('width') + '%');
      this.$el.css('height', this.model.get('height') + '%');
      $('#' + this.model.get('containerId')).append(this.$el);
      this.$el.addClass('animated  bounceIn');
    } else {
      this.$el.css('width', '100%');
      this.$el.css('height', '100%');
      $('#tree').html(this.$el);
    }
  },
  getRandomColor: function () {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++) {
      color += letters[Math.round(Math.random() * 15)];
    }
    return color;
  }
});