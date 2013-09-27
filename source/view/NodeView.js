var  Marionette = require('backbone.marionette');

var NodeView = module.exports = Marionette.ItemView.extend({
  initialize: function () {
    this.listenTo(this.model, 'change', this.change);
    this.$el.css('background-color', this.getRandomColor());
    this.$el.addClass('node');
    this.$el.attr('id', this.model.get('id'));
  },
  triggers: {
    'click': 'click'
  },
  change: function () {
    this.$el.css('z-index', '1000');
    this.$el.css('display', 'block');
    this.$el.attr('weight', this.model.get('weight'));
    this.$el.attr('className', this.model.get('name'));
   // this.$el.html(this.model.get('name'));
    this.$el.css('width', this.model.get('width'));
    this.$el.css('height', this.model.get('height'));
    this.$el.css('left', this.model.get('x'));
    this.$el.css('top', this.model.get('y'));
  },
  renderView: function (display) {
    if (!display) {
      this.$el.css('display', 'none');
    }
    this.render();
  },
  render: function () {
    this.$el.css('z-index', this.model.get('depth'));
    this.$el.attr('weight', this.model.get('weight'));
    this.$el.attr('className', this.model.get('name'));
    this.$el.html(this.model.get('name'));
    this.$el.css('width', this.model.get('width'));
    this.$el.css('height', this.model.get('height'));
    this.$el.css('left', this.model.get('x'));
    this.$el.css('top', this.model.get('y'));
    $('#' + this.model.get('containerId')).append(this.$el);
    //this.$el.addClass('animated  fadeIn');

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