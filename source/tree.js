/*global require, window*/
// ---------- helpers that should be  adapted to BackBone fashion ----------- //

var Model = require('./Model.js');


//----- test -------//
/*jshint -W098 */
exports.main = function (STAGING) {

  var model = new Model(STAGING);
  window.pryvBrowser = model;
};