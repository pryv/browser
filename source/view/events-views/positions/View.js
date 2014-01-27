/* global document, $ */
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
  gmaps: null,
  map: null,
  container: null,
  markers: null,
  highlightedMarker: null,
  highlightedTime: Infinity,
  positions: null,
  highlightedPosition: null,
  triggers: {
    'click .aggregated-nbr-events': 'nodeClicked'
  },
  initialize: function () {

    this.positions = this.model.get('positions');
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

    this.listenTo(this.model, 'change:positions', this.changePos);
    this.listenTo(this.model, 'change:posWidth', this.resize);
    this.listenTo(this.model, 'change:posHeight', this.resize);
    this.$el.css('height', '100%');
    this.$el.css('width', '100%');
  },
  resize: function () {
    if (this.map && this.bounds) {
      var timer = setInterval(function () {
        this.gmaps.event.trigger(this.map, 'resize');
      }.bind(this), 100);
      setTimeout(function () {
        clearInterval(timer);
        this.map.fitBounds(this.bounds);
      }.bind(this), 1000);
    }
  },
  changePos: function () {
    this.positions = this.model.get('positions');
    this.model.set('eventsNbr', this.positions.length);
    this.render();
  },
  renderView: function (container) {
    this.container = container;
    this.render();
  },
  onBeforeRender: function () {
    this._initMap();
  },
  onRender: function () {
    if (this.container) {
      $('#' + this.container).append(this.el);
    }
    this._drawMap(document.getElementById('map-canvas-' + this.model.get('id')));
  },
  _initMap: function () {
    if (!this.gmaps) {
      this.waitingForInitMap = true;
      return;
    }
    var geopoint;
    this.markers = [];
    this.paths = {};
    this.mapOptions =  {
      zoom: 8,
      zoomControl: false,
      mapTypeControl: false,
      scaleControl: false,
      streetViewControl: false,
      overviewMapControl: false,
      scrollwheel: true,
      mapTypeId: this.gmaps.MapTypeId.ROADMAP
    };
    _.each(this.positions, function (p) {
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
    if (!$container) {
      return;
    }
    if (!this.gmaps) {
      this.waitingForDrawingMap = true;
      return;
    }
    this.map = new this.gmaps.Map($container, this.mapOptions);
    this.gmaps.event.trigger(this.map, 'resize');
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
  onDateHighLighted : function (time) {
    this.highlightedTime = time;
    var positionToShow = null;

    var timeDiff = Infinity, temp = 0, highlightTime = this.highlightedTime;
    _.each(this.positions, function (position) {
      temp = Math.abs(position.time - highlightTime);
      if (temp <= timeDiff) {
        timeDiff = temp;
        positionToShow = position;
      }
    });
    if (this.highlightedPosition !== positionToShow) {
      if (this.highlightedMarker && this.map) {
        this.highlightedMarker.setMap(null);
      }

      var geopoint =  new this.gmaps.LatLng(positionToShow.content.latitude,
        positionToShow.content.longitude);
      this.highlightedMarker = new this.gmaps.Marker({
        position: geopoint
      });
      if (this.map) {
        this.highlightedMarker.setMap(this.map);
        this.map.panTo(geopoint);
      }
      this.highlightedPosition = positionToShow;
    }
    return positionToShow;
  },
  close: function () {
    this.remove();
  }
});