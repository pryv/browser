/* global $, document*/
var Marionette = require('backbone.marionette'),
  MapLoader = require('google-maps');

module.exports = Marionette.ItemView.extend({
  type: 'Position',
  template: '#template-detail-content-position',
  tagName: 'div',
  id: 'map_canvas',
  itemViewContainer: '#detail-content',
  google: null,
  map: null,
  waitForGoogle: false,
  marker: null,
  ui: {
    li: 'li.editable',
    edit: '.edit'
  },
  initialize: function () {
    this.listenTo(this.model, 'change', this.actualizePosition);
    MapLoader.KEY = 'AIzaSyCWRjaX1-QcCqSK-UKfyR0aBpBwy6hYK5M';
    MapLoader.load().then(function (google) {
      this.google = google;
      if (this.waitForGoogle) {
        this.waitForGoogle = false;
        this.render();
      }
    }.bind(this));
  },
  actualizePosition: function () {
    if (!this.google) {
      this.waitForGoogle = true;
    } else {
      var lat = this.model.get('event').content.latitude,
        lng = this.model.get('event').content.longitude;
      this.marker.setPosition(new this.google.maps.LatLng(lat, lng));
      this.map.setCenter(this.marker.position);
    }
  },
  onRender: function () {
    if (!this.google) {
      this.waitForGoogle = true;
    } else {
      $(this.itemViewContainer).html(this.el);
      setTimeout(function () {
        if (this.model.get('event')) {
          if (!this.model.get('event').content) {
            this.model.get('event').content = {};
          }
          var lat = this.model.get('event').content.latitude || 46.51759,
            lng = this.model.get('event').content.longitude || 6.56267;
          this.map = new this.google.maps.Map(document.getElementById('map_canvas'), {
            zoom: 16,
            center: new this.google.maps.LatLng(lat, lng),
            mapTypeId: this.google.maps.MapTypeId.ROADMAP
          });
          var elevator = new this.google.maps.ElevationService();
          this.marker = new this.google.maps.Marker({
            position: new this.google.maps.LatLng(lat, lng),
            draggable: true
          });

          this.google.maps.event.addListener(this.marker, 'dragend', function (evt) {
            $('#submit-edit').show();
            var event = this.model.get('event');
            event.content.latitude = evt.latLng.lat();
            event.content.longitude = evt.latLng.lng();
            var positionalRequest = {
              'locations': [evt.latLng]
            };
            elevator.getElevationForLocations(positionalRequest, function (results, status) {
              if (status === this.google.maps.ElevationStatus.OK) {
                // Retrieve the first result
                if (results[0]) {
                  var event = this.model.get('event');
                  event.content.altitude = results[0].elevation;
                }
              }
            }.bind(this));
          }.bind(this));

          this.map.setCenter(this.marker.position);
          this.marker.setMap(this.map);
        }
      }.bind(this), 1000);

    }
  }
});