var Backbone = require('backbone');
// var superagent = require('superagent');
// var url = require('url');

module.exports = Backbone.Model.extend({
  defaults: {
    event: null,
    collection: null,
    highlighted: false,
    checked: false
  },
  check: function (state) {
    if (this.isEditPermission) {
      this.set('checked', state);
    }
  },
  isEditPermission: function () {
    var event = this.get('event');
    if (!event.connection._accessInfo) {
      return false;
    }

    if (event.connection._accessInfo.type === 'personal') {
      return true;
    }
    if (event.connection._accessInfo.permissions &&
      event.connection._accessInfo.permissions[0].level !== 'read') {
      return true;
    } else {
      return false;
    }

    return false;
  },
  getTimeDifference: function (time) {
    return Math.abs(time - this.get('event').time);
  },
  isTrashed: function () {
    return this.get('event').trashed;
  },
  setHighlighted: function (highlight) {
    this.set('highlighted', highlight);
  },/*
  save: function (callback) {
    var event = this.get('event'),
      file = event.file;
    if (file) {
      this.get('event').addAttachment(file, callback);
    }
    event.update(callback);
  },
  create: function (callback, progressCallback) {
    console.log('ZZZ create from events-view/detailed');
    var serviceInfoUrl = 'https://reg.pryv.me/service/info'; // TODO

    var event = this.get('event');
    var file = event.file;

    fetchServiceInfo(serviceInfoUrl, function(error, apiUrl) {
      if(error) {
        return callback(error);
      }

      var endpoint = url.resolve(apiUrl.replace('{username}', event.connection.username), 'events');
      if(file) {
        createEventWithAttachment(endpoint, event, file, callback, progressCallback);
      } else {
        createEvent(endpoint, event, callback);
      }
    });
  },
  addAttachment: function (file) {
    this.get('event').file = file;
    console.log('addAttachment', file, this);
  },*/
  removeAttachment: function (fileName, callback) {
    this.get('event').removeAttachment(fileName, callback);
  },
  trash: function (callback) {
    this.get('event').trash(callback);
  }
});

// function fetchServiceInfo(serviceInfoUrl, callback) {
//   console.log('Fetching service info on ', serviceInfoUrl);
//   superagent.get(serviceInfoUrl)
//     .then(function (res) {
//       var apiUrl = res.body.api;
//       if(apiUrl === null) { // TODO ==
//         return callback(new Error('Unknown error while creating event'), null);
//       }
//       return callback(null, apiUrl);
//     })
//     .catch(function (error) {
//       console.log('error : ', error);
//       return callback(error, null);
//     });
// }

// function createEvent(endpoint, event, callback) {
//   console.log('Creating event on ' + endpoint, event);
//   var token = event.connection.auth;
//   delete event.connection;
//   superagent.post(endpoint)
//     .set('Authorization', token)
//     .set('Content-Type', 'application/json')
//     .send(event)
//     .then(function(res) {
//       if(res.body && res.body.event && res.body.event.id) {
//         console.log('Event created with id : ', res.body.event.id);
//         return callback(null, res.body.event);
//       } else {
//         return callback(new Error('Unknown error while creating event'));
//       }
//     })
//     .catch(function (error) {
//       console.log('error : ', error);
//       return callback(error);
//     });
// }

// function createEventWithAttachment(endpoint, event, file, callback, progressCallback) {
//   var token = event.connection.auth;

//   console.log('creating event with attachment on ' + endpoint);
//   delete event.connection;
//   delete event.attachment;
//   delete event.file;
//   delete event.previewFile;

//   var req = superagent.post(endpoint);
//   req.set('Authorization', token);
//   req.field('event', JSON.stringify(event));

//   var fileName;
//   file.forEach(function(element) {
//     req.attach('', element);
//     fileName = element.name; // We only have one file, we can save the filename
//   });

//   req.on('progress', progressCallback);
//   req.then(function (res) {
//       res.body.event.attachments.forEach(function (attachment) {
//         if(attachment.fileName.indexOf(fileName) > -1) {
//           console.log('File id ' + attachment.id + ' attached to event id ' + res.body.event.id);
//         }
//       });
//       return callback(null, res.body.event);
//     })
//     .catch(function (error) {
//       console.log('error : ', error);
//       return callback(error);
//     });
// }