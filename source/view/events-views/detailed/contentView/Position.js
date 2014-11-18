/* global $, document*/
var Marionette = require('backbone.marionette'),
    MapLoader = require('google-maps'),
    streamUtils = require('../../../../utility/streamUtils'),
    _ = require('underscore');

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
  positions: null,
  bounds: null,
  paths: null,
  markers: null,
  ui: {
    li: 'li.editable',
    edit: '.edit'
  },
  initialize: function () {
    this.positions = this.model.get('collection');
    this.listenTo(this.model, 'change', this.actualizePosition);
    this.listenTo(this.model, 'collectionChanged', this.render);
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
  editOn: function () {
    if (this.marker) {
      this.marker.setDraggable(true);
      this.marker.setTitle('Drag me!');
    }
  },
  editOff: function () {
    if (this.marker) {
      this.marker.setDraggable(false);
      this.marker.setTitle('');
    }
  },
  _initMap: function () {
    var geopoint;
    this.markers = [];
    this.paths = {};
    this.mapOptions =  {
      zoom: 10,
      zoomControl: false,
      mapTypeControl: false,
      scaleControl: false,
      streetViewControl: false,
      overviewMapControl: false,
      scrollwheel: true,
      mapTypeId: this.google.maps.MapTypeId.ROADMAP
    };
    this.positions.each(function (p) {
      p = p.get('event');
      geopoint = new this.google.maps.LatLng(p.content.latitude, p.content.longitude);
      this.markers.push(new this.google.maps.Marker({
        position: geopoint,
        visible: false
      }));
      if (!this.bounds) {
        this.bounds = new this.google.maps.LatLngBounds(geopoint, geopoint);
        this.mapOptions.center = geopoint;
      } else {
        this.bounds.extend(geopoint);
      }
      if (!this.paths[p.streamId]) {
        this.paths[p.streamId] = [];
        geopoint.pathColor = streamUtils.getColor(p.stream);
      }
      this.paths[p.streamId].push(geopoint);
    }.bind(this));
  },
  _drawMap: function () {
    if (!this.google.maps) {
      return;
    }
    //this.map = new this.gmaps.Map($container, this.mapOptions);
    //this.gmaps.event.trigger(this.map, 'resize');
    this.map.fitBounds(this.bounds);
    /*var listener = this.gmaps.event.addListener(this.map, 'idle', function () {
      if (this.map.getZoom() > 10) {
        this.map.setZoom(10);
      }
      this.gmaps.event.removeListener(listener);
    }.bind(this));*/
    var gPath, gMarker;
    _.each(this.paths, function (path) {
      if (path.length > 1) {
        gPath = new this.google.maps.Polyline({
          path: path,
          strokeColor: path[0].pathColor,
          strokeOpacity: 1.0,
          strokeWeight: 6
        });
        gPath.setMap(this.map);
      } else {
        gMarker = new this.google.maps.Marker({
          position: path[0]
        });
        gMarker.setMap(this.map);
      }
    }, this);
    //gMarker = new MarkerClusterer(this.map, this.markers);
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
            position: new this.google.maps.LatLng(lat, lng)
          });
          this._initMap();
          this._drawMap();
          this.google.maps.event.addListener(this.marker, 'dragend', function (evt) {
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
          $('#modal-left-content').on('editing:on', this.editOn.bind(this));
          $('#modal-left-content').on('editing:off', this.editOff.bind(this));
          if ($('#modal-left-content').hasClass('editing')) {
            this.editOn();
          } else {
            this.editOff();
          }
          this.map.setCenter(this.marker.position);
          this.marker.setMap(this.map);
        }
      }.bind(this), 1000);

    }
  }
});
