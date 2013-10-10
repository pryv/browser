/* global document */
var  Marionette = require('backbone.marionette'),
  MapLoader = require('google-maps'),
  _ = require('underscore'),
  MarkerClusterer = require('./utility/markerclusterer.js');

module.exports = Marionette.ItemView.extend({
  template: '#positionsView',
  mapLoaded: false,
  mapOtions : {},
  bounds: null,
  paths: {},
  map: null,
  markers: null,

  initialize: function () {
    MapLoader.KEY = 'AIzaSyCWRjaX1-QcCqSK-UKfyR0aBpBwy6hYK5M';
    MapLoader.load().then(function (google) {
      this.gmaps = google.maps;
      if (this.waitingForInitMap) {
        this.waitingForInitMap = false;
        this._initMap();
      }
      if (this.waitingForDrawingMap) {
        this.waitingForDrawingMap = false;
        this._drawMap(document.getElementById('map-canvas-' + this.model.get('id')));
      }
    }.bind(this));

    this.listenTo(this.model, 'change', this.render);
    this.$el.css('height', '100%');
    this.$el.css('width', '100%');
  },

  renderView: function () {

    this.render();
  },
  onBeforeRender: function () {
    this._initMap();
  },
  onRender: function () {
    this._drawMap(document.getElementById('map-canvas-' + this.model.get('id')));
  },
  _initMap: function () {
    if (!this.gmaps) {
      this.waitingForInitMap = true;
      return;
    }
    var positions = this.model.get('positions'),
      geopoint;
    this.markers = [];
    this.paths = {};
    this.mapOptions =  {
      zoom: 8,
      scrollwheel: true,
      mapTypeId: this.gmaps.MapTypeId.ROADMAP
    };
    _.each(positions, function (p) {
      geopoint = new this.gmaps.LatLng(p.content.latitude, p.content.longitude);
      this.markers.push(new this.gmaps.Marker({
        position: geopoint,
        visible: false
      }));
      if (!this.bounds) {
        this.bounds = new this.gmaps.LatLngBounds(geopoint, geopoint);
        this.mapOptions.center = geopoint;
      } else {
        this.bounds.extend(geopoint);
      }
      if (!this.paths[p.streamId]) { this.paths[p.streamId] = []; }
      this.paths[p.streamId].push(geopoint);
    }, this);
  },
  _drawMap: function ($container) {
    if (!this.gmaps) {
      this.waitingForDrawingMap = true;
      return;
    }
    this.map = new this.gmaps.Map($container, this.mapOptions);
    this.map.fitBounds(this.bounds);
    var gPath, gMarker;
    _.each(this.paths, function (path) {
      if (path.length > 1) {
        gPath = new this.gmaps.Polyline({
          path: path,
          strokeColor: this._generateRandomColor(),
          strokeOpacity: 1.0,
          strokeWeight: 6
        });
        gPath.setMap(this.map);
      } else {
        gMarker = new this.gmaps.Marker({
          position: path[0]
        });
        gMarker.setMap(this.map);
      }
    }, this);
    gMarker = new MarkerClusterer(this.map, this.markers);
  },
  _generateRandomColor: function () {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++) {
      color += letters[Math.round(Math.random() * 15)];
    }
    return color;
  },
  close: function () {
    this.remove();
  }
});