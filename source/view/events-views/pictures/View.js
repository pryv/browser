var  Marionette = require('backbone.marionette');

module.exports = Marionette.ItemView.extend({
  template: '#picturesView',
  container: null,
  imageWidth: null,
  imageHeight: null,
  $image: null,
  width: null,
  height: null,
  rendered: false,
  initialize: function () {
   // this.listenTo(this.model, 'change:width', this.resizeImage);
   // this.listenTo(this.model, 'change:height', this.resizeImage);
    this.listenTo(this.model, 'change:top', this.change);
    this.listenTo(this.model, 'change:left', this.change);
    this.listenTo(this.model, 'change:width', this.change);
    this.listenTo(this.model, 'change:height', this.change);
    this.$el.css('position', 'absolute');
    this.$el.addClass('animated  fadeInLeftBig node');

  },

  change: function () {
 /*   this.$el.removeClass('animated bounceIn');
    this.$el.addClass('animated  tada');
    this.imageWidth = null;
    this.imageHeight = null;      */

    this.$el.css({
      top: this.model.get('top') + '%',
      left: this.model.get('left') + '%',
      width: this.model.get('width') + '%',
      height: this.model.get('height') + '%'
    });
   // this.adjustImage();
    if (this.container && !this.rendered) {
      this.render();
    }
  },

  renderView: function (container) {
    this.rendered = false;
    if (container !== this.container) {
      this.rendered = false;
    }
    this.container = container;
    this.$el.css({
      top: this.model.get('top') + '%',
      left: this.model.get('left') + '%',
      width: this.model.get('width') + '%',
      height: this.model.get('height') + '%'
    });
    if (this.container && !this.rendered) {
      this.render();
    }

  },

  onRender: function () {
    this.$el.css(
      {'background': 'url(' + this.model.get('picUrl') + ') no-repeat center center',
        '-webkit-background-size': 'cover',
        '-moz-background-size': 'cover',
        '-o-background-size': 'cover',
        'background-size': 'cover'
      });


    if (this.container && !this.rendered) {
      $('#' + this.container).append(this.el);
      this.rendered = true;
    }
    /*  this.$image = this.$('img');
      this.$image.load(function () {
        if (!this.imageWidth && !this.imageHeight) {
          this.imageWidth = this.$image.width();
          this.imageHeight = this.$image.height();
        }
        this.resizeImage();
      }.bind(this));
      this.resizeImage();
      if (this.container) {
        $('#' + this.container).html(this.el);
      }      */
  },
  resizeImage: function () {
    if (!this.$image) {
      return;
    }
    this.width = $('#' + this.container).width() * this.model.get('width') / 100;
    this.height = $('#' + this.container).height() * this.model.get('height') / 100;
    var aspectRatio = this.imageWidth / this.imageHeight;
    console.log(this.container, this.width, this.height, this.imageWidth, this.imageHeight);
    if ((this.width / this.height) < aspectRatio) {
      this.$image
        .removeClass()
        .addClass('bgheight');
    } else {
      this.$image
        .removeClass()
        .addClass('bgwidth');
    }
    var currentWidth = this.$image.width();
    var currentHeight = this.$image.height();
    if (currentWidth >= this.width) {
      this.$image.css('margin-left', -(currentWidth - this.width) / 2 + 'px');
    }
    if (currentHeight >= this.height) {
      this.$image.css('margin-top', -(currentHeight - this.height) / 2 + 'px');
    }
  },
  adjustImage: function () {
    var that = this;
    if (this.imageWidth > 0 ||  this.imageHeight > 0) {
      _adjustCss();
    }
    function _adjustCss() {
      var cssAdjust = _computeCss(
        that.imageWidth,
        that.imageHeight,
        $('#' + that.container).width() * that.model.get('width') / 100,
        $('#' + this.container).height() * this.model.get('height') / 100
      );
      if (cssAdjust) {
        that.$image.css(cssAdjust);
      }
    }
    function _computeCss(imgW, imgH, divW, divH) {

      if (imgW <= 0 || imgH <= 0 || divW <= 0 || divH <= 0) {
        return;
      }
      var maxW = imgW * 2.5,
        maxH = imgH * 2.5,
        width = imgW,
        height = imgH,
        marginTop = 0,
        marginLeft = 0;

      if (maxW < divW && maxH < divH) {
        /* Image, even if stretched, is shorter in width and height. */
        width = maxW;
        height = maxH;
        marginTop = (divH - maxH) / 2;

      } else if (maxW < divW) {
        /* Image is shorter in width. */
        /* We have to adapt height to div. */
        height = divH;
        width = (imgW / imgH) * divH;

      } else if (maxH < divH) {
        /* Image is shorter in height. */
        /* We have to adapt to div width. */
        width = divW;
        height = (imgH / imgW) * divW;
        marginTop = (divH - height) / 2;

      } else {
        /* Stretched image is larger in width and height. */
        var diffH = maxH / divH,
          diffW = maxW / divW;

        if (diffH < diffW) {
          /* Resize to fit div height. */
          height = divH;
          width = (imgW / imgH) * divH;
          marginLeft = (divW - width) / 2;

        } else {
          /* Resize to fit div width, center vertically. */
          width = divW;
          height = (imgH / imgW) * divW;
          marginTop = (divH - height) / 2;

        }
      }

      return {
        'margin-top': marginTop,
        'margin-left': marginLeft,
        width: width,
        height: height
      };
    }
  },
  close: function () {
    this.$el.removeClass('animated fadeInLeftBig');
    this.$el.addClass('animated fadeOutRightBig');
    this.rendered = false;
    setTimeout(function () {this.remove(); }.bind(this), 1000);
  }
});