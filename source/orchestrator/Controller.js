
var Controller = module.exports = function () {
  this.treeMap = null;
  this.menu = null;
};

Controller.prototype.setTreeMap = function (treemap) {
  this.treeMap = treemap;
};

Controller.prototype.onDragAndDrop =
  function (thisNode, thatNodeId, thatStreamId, thatConnectionId) {
  var thatNode = this.treeMap.getNodeById(thatNodeId, thatStreamId, thatConnectionId);
  console.log('Controller', thatNode);
  //this.showFusionDialog(thatNodeId.data, thatNode.data, function () {}.bind(this));

};

Controller.prototype.showFusionDialog =
  function () {
  console.log('Controller:', 'Show fusion dialog');
};


