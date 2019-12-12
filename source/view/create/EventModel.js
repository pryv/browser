/* global FormData */
var Backbone = require('backbone');
var superagent = require('superagent');
var url = require('url');

var serviceInfoUrl = 'https://reg.pryv.me/service/info'; // TODO
var apiUrl = null;

module.exports = Backbone.Model.extend({
  defaults: {
    event: null
  },
  save: function () {
    var event = this.get('event'),
      file = event.file;
    if (file) {
      this.get('event').addAttachment(file, function () {
        //  console.log('trash event callback', arguments);
      });
    }
    event.update(function () {
      //  console.log('update event callback', arguments);
    });
  },
  create: function (callback, progressCallback) {
    var event = this.get('event');
    var file = event.file;

    if(file) {
      createEventWithAttachment(event, file, callback, progressCallback);
    } else {
      createEvent(event, callback);
    }
  },
  addAttachment: function (file) {
    var data = new FormData();
    data.append(file.name.split('.')[0], file);
    this.get('event').file = data;
    this.get('event').previewFile = file;
  },
  removeAttachment: function (fileName, callback) {
    this.get('event').removeAttachment(fileName, callback);
  }
});

function fetchServiceInfo(callback) {
  if(apiUrl !== null) {
    console.log('api url already set to ', apiUrl);
    return callback(null, apiUrl);
  }

  console.log('Fetching service info on ', serviceInfoUrl);
  superagent.get(serviceInfoUrl)
    .then(function (res) {
      var apiUrlRes = res.body.api;
      if(apiUrlRes === null) { // TODO ==
        return callback(new Error('Unknown error while creating event'), null);
      }
      apiUrl = apiUrlRes;
      return callback(null, apiUrl);
    })
    .catch(function (error) {
      console.log('error : ', error);
      return callback(error, null);
    });
}

function createEvent(event, callback) {
  if(apiUrl === null) { // TODO ==
    fetchServiceInfo(function(error) {
      if(error) {
        return callback(error);
      }
      createEvent(event, callback);
    });

    return;
  }
  var endpoint = url.resolve(apiUrl.replace('{username}', event.connection.username), 'events');

  console.log('Creating event on ' + endpoint, event);
  var token = event.connection.auth;
  delete event.connection;
  superagent.post(endpoint)
    .set('Authorization', token)
    .set('Content-Type', 'application/json')
    .send(event)
    .then(function(res) {
      if(res.body && res.body.event && res.body.event.id) {
        console.log('Event created with id : ', res.body.event.id);
        return callback(null, res.body.event);
      } else {
        return callback(new Error('Unknown error while creating event'));
      }
    })
    .catch(function (error) {
      console.log('error : ', error);
      return callback(error);
    });
}

function createEventWithAttachment(event, file, callback, progressCallback) {
  if(apiUrl === null) { // TODO ==
    fetchServiceInfo(function(error) {
      if(error) {
        return callback(error);
      }
      createEventWithAttachment(event, file, callback, progressCallback);
    });

    return;
  }
  var endpoint = url.resolve(apiUrl.replace('{username}', event.connection.username), 'events');
  var token = event.connection.auth;

  console.log('creating event with attachment on ' + endpoint);
  delete event.connection;
  delete event.attachment;
  delete event.file;
  delete event.previewFile;

  var req = superagent.post(endpoint);
  req.set('Authorization', token);
  req.field('event', JSON.stringify(event));

  var fileName;
  file.forEach(function(element) {
    req.attach('', element);
    fileName = element.name; // We only have one file, we can save the filename
  });

  req.on('progress', progressCallback);
  req.then(function (res) {
      res.body.event.attachments.forEach(function (attachment) {
        if(attachment.fileName.indexOf(fileName) > -1) {
          console.log('File id ' + attachment.id + ' attached to event id ' + res.body.event.id);
        }
      });
      return callback(null, res.body.event);
    })
    .catch(function (error) {
      console.log('error : ', error);
      return callback(error);
    });
}