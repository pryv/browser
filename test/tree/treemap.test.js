/* global describe, it */
var BrowserFilter = require('../../source/model/BrowserFilter.js'),
    ConnectionsHandler = require('../../source/model/ConnectionsHandler.js'),
    Pryv = require('pryv'),
    RootNode = require('../../source/tree/RootNode.js'),
    SIGNAL = require('../../source/model/Messages').BrowserFilter.SIGNAL,
    _ = require('underscore'),
    should = require('should'),
    nock = require('nock');
var dataEvent = [{attachments:{filename1:{fileName:"filename1.jpeg",type:"image/jpeg",size:1e3}},modified:10,streamId:"substreamId10",tags:[],time:10,type:"picture/attached",id:"picutre1"},{attachments:{filename2:{fileName:"filename2.jpeg",type:"image/jpeg",size:1e3}},modified:11,streamId:"substreamId10",tags:[],time:11,type:"picture/attached",id:"picutre2"},{attachments:{},content:42,description:"",modified:12,streamId:"substreamId10",tags:[],time:12,type:"mass/kg",id:"generic1"},{attachments:{},content:51,description:"",modified:13,streamId:"substreamId10",tags:[],time:13,type:"money/aud",id:"generic2"},{attachments:{},content:13,description:"",modified:14,streamId:"substreamId10",tags:[],time:14,type:"angle/deg",id:"generic3"},{attachments:{},content:55,description:"",modified:15,streamId:"substreamId10",tags:[],time:15,type:"mass/kg",id:"generic4"},{attachments:{},content:99,description:"",modified:16,streamId:"substreamId10",tags:[],time:16,type:"money/aud",id:"generic5"},{attachments:{},content:180,description:"",modified:17,streamId:"streamId1",tags:[],time:17,type:"angle/deg",id:"generic6"},{attachments:{},content:20,description:"",modified:18,streamId:"streamId1",tags:[],time:18,type:"mass/kg",id:"generic7"},{attachments:{},content:66,description:"",modified:19,streamId:"streamId1",tags:[],time:19,type:"money/aud",id:"generic8"},{content:{longitude:5,latitude:45},description:"",modified:20,streamId:"streamId0",tags:[],time:20,type:"position/wgs84",id:"position1"},{content:{longitude:6,latitude:46},description:"",modified:21,streamId:"streamId0",tags:[],time:21,type:"position/wgs84",id:"position2"},{content:{longitude:7,latitude:47},description:"",modified:22,streamId:"streamId0",tags:[],time:22,type:"position/wgs84",id:"position3"},{content:{longitude:8,latitude:48},description:"",modified:23,streamId:"streamId0",tags:[],time:23,type:"position/wgs84",id:"position4"},{content:{longitude:9,latitude:49},description:"",modified:24,streamId:"streamId0",tags:[],time:24,type:"position/wgs84",id:"position5"},{content:{longitude:10,latitude:50},description:"",modified:25,streamId:"streamId0",tags:[],time:25,type:"position/wgs84",id:"position6"},{content:"Note1",modified:26,streamId:"streamId0",tags:[],time:26,type:"note/txt",id:"note1"},{content:"Note2",modified:27,streamId:"streamId0",tags:[],time:27,type:"note/txt",id:"note2"},{content:"Note3",modified:28,streamId:"streamId0",tags:[],time:28,type:"note/txt",id:"note3"},{content:"Note4",modified:29,streamId:"streamId0",tags:[],time:29,type:"note/txt",id:"note4"}];
var dataStream = [{clientData:{color:"color_0",colorClass:"color0"},name:"Stream0",parentId:null,id:"streamId0",children:[]},{clientData:{color:"color_1",colorClass:"color1"},name:"Stream1",parentId:null,id:"streamId1",children:[{clientData:{color:"color_1_0",colorClass:"color1_0"},name:"SubStream1_0",parentId:"streamId1",id:"substreamId10",children:[]}]}];
var connectionId = 'https://user-test.pryv.in:443/?auth=token';
describe('Treemap', function () {

  describe('Non aggregated tree map', function () {

    it('should build a correct tree map', function (done) {
      nock('https://user-test.pryv.in')
        .get('/access-info')
        .reply(200, '{"type":"personal","name":"pryv-explorer"}')
        .get('/streams?state=all')
        .reply(200, dataStream)
        .get('/events?limit=2000')
        .reply(200, dataEvent);

      var connections = new ConnectionsHandler();
      var activeFilter = new BrowserFilter({connections: connections});
      var conn = connections.add(new Pryv.Connection('user-test', 'token', {domain : 'pryv.in'}));
      activeFilter.addConnection(conn);
      var root = new RootNode();
      root.width = 100;
      root.height = 50;
      root.offset = 0;
      root.margin = 0;
      root.minWidth = 0;
      root.minHeight = 0;
      activeFilter.addEventListener(SIGNAL.EVENT_SCOPE_ENTER,
        function (content) {
          content.events.length.should.eql(20);
          _.each(content.events, function (event) {
            root.eventEnterScope(event, content.reason, function () {});
          });
         // root._createView();
          root._generateChildrenTreemap(
            root.x,
            root.y,
            root.width,
            root.height,
            true);
          root._refreshViewModel(true);
          _.size(root.connectionNodes).should.eql(1);
          var connNode = root.connectionNodes[connectionId];
          connNode.width.should.eql(100);
          connNode.height.should.eql(50);
          root.getWeight().should.eql(5);
          connNode.getWeight().should.eql(5);
          _.size(connNode.streamNodes).should.eql(3);
          var stream0 = connNode.streamNodes['streamId0'];
          var stream1 = connNode.streamNodes['streamId1'];
          var stream2 = connNode.streamNodes['substreamId10'];
          stream0.getAllEvents().length.should.eql(10);
          stream1.getAllEvents().length.should.eql(10);
          stream2.getAllEvents().length.should.eql(7);
          _.size(stream0.eventsNodes).should.eql(2);
          _.size(stream1.eventsNodes).should.eql(1);
          _.size(stream2.eventsNodes).should.eql(2);
          _.size(stream0.eventsNodesAggregated ).should.eql(0);
          _.size(stream1.eventsNodesAggregated ).should.eql(0);
          _.size(stream2.eventsNodesAggregated ).should.eql(0);
          stream0.width.should.eql(40);
          stream0.height.should.eql(50);
          stream0.x.should.eql(60);
          stream0.y.should.eql(0);
          stream1.width.should.eql(60);
          stream1.height.should.eql(50);
          stream1.x.should.eql(0);
          stream1.y.should.eql(0);
          stream2.width.should.eql(40);
          stream2.height.should.eql(50);
          stream2.x.should.eql(0);
          stream2.y.should.eql(0);
          var event01 =  stream0.eventsNodes['NotesEventsNode'];
          var event02 =  stream0.eventsNodes['PositionsEventsNode'];
          var event11 =  stream1.eventsNodes['GenericEventsNode'];
          var event101 =  stream2.eventsNodes['PicturesEventsNode'];
          var event102 =  stream2.eventsNodes['GenericEventsNode'];
          _.size(event01.events).should.eql(4);
          _.size(event02.events).should.eql(6);
          _.size(event11.events).should.eql(3);
          _.size(event101.events).should.eql(2);
          _.size(event102.events).should.eql(5);
          event01.eventsNbr.should.eql(4);
          event02.eventsNbr.should.eql(6);
          event11.eventsNbr.should.eql(3);
          event101.eventsNbr.should.eql(2);
          event102.eventsNbr.should.eql(5);
          done();
        }
      );
    });
  });
  describe('Aggregated tree map', function () {
    it('should build a correct aggregated tree map', function (done) {
      nock('https://user-test.pryv.in')
        .get('/access-info')
        .reply(200, '{"type":"personal","name":"pryv-explorer"}')
        .get('/streams?state=all')
        .reply(200, dataStream)
        .get('/events?limit=2000')
        .reply(200, dataEvent);

      var connections = new ConnectionsHandler();
      var activeFilter = new BrowserFilter({connections: connections});
      var conn = connections.add(new Pryv.Connection('user-test', 'token', {domain : 'pryv.in'}));
      activeFilter.addConnection(conn);
      var root = new RootNode();
      root.width = 100;
      root.height = 50;
      root.offset = 0;
      root.margin = 0;
      root.minWidth = 300;
      root.minHeight = 300;
      activeFilter.addEventListener(SIGNAL.EVENT_SCOPE_ENTER,
        function (content) {
          content.events.length.should.eql(20);
          _.each(content.events, function (event) {
            root.eventEnterScope(event, content.reason, function () {});
          });
         // root._createView();
          root._generateChildrenTreemap(
            root.x,
            root.y,
            root.width,
            root.height,
            true);
          root._refreshViewModel(true);
          _.size(root.connectionNodes).should.eql(1);
          var connNode = root.connectionNodes[connectionId];
          connNode.width.should.eql(100);
          connNode.height.should.eql(50);
          root.getWeight().should.eql(4);
          connNode.getWeight().should.eql(4);
          _.size(connNode.streamNodes).should.eql(3);
          var stream0 = connNode.streamNodes['streamId0'];
          var stream1 = connNode.streamNodes['streamId1'];
          var stream2 = connNode.streamNodes['substreamId10'];
          stream0.getAllEvents().length.should.eql(10);
          stream1.getAllEvents().length.should.eql(10);
          stream2.getAllEvents().length.should.eql(7);
          _.size(stream0.eventsNodes).should.eql(2);
          _.size(stream1.eventsNodes).should.eql(1);
          _.size(stream2.eventsNodes).should.eql(2);
          //stream2 is aggregated with stream1
          _.size(stream0.eventsNodesAggregated).should.eql(2);
          _.size(stream1.eventsNodesAggregated).should.eql(2);
          _.size(stream2.eventsNodesAggregated).should.eql(0);
          stream0.width.should.eql(40);
          stream0.height.should.eql(50);
          stream0.x.should.eql(60);
          stream0.y.should.eql(0);
          stream1.width.should.eql(60);
          stream1.height.should.eql(50);
          stream1.x.should.eql(0);
          stream1.y.should.eql(0);
          //stream2 is aggregated with stream1
          should.not.exist(stream2.width);
          should.not.exist(stream2.height);
          stream2.x.should.eql(0);
          stream2.y.should.eql(0);
          var event01 =  stream0.eventsNodes['NotesEventsNode'];
          var event02 =  stream0.eventsNodes['PositionsEventsNode'];
          var event11 =  stream1.eventsNodes['GenericEventsNode'];
          var event101 =  stream2.eventsNodes['PicturesEventsNode'];
          var event102 =  stream2.eventsNodes['GenericEventsNode'];
          _.size(event01.events).should.eql(4);
          _.size(event02.events).should.eql(6);
          _.size(event11.events).should.eql(3);
          _.size(event101.events).should.eql(2);
          _.size(event102.events).should.eql(5);
          event01.eventsNbr.should.eql(4);
          event02.eventsNbr.should.eql(6);
          event11.eventsNbr.should.eql(3);
          event101.eventsNbr.should.eql(2);
          event102.eventsNbr.should.eql(5);

          //aggregation
          event01 =  stream0.eventsNodesAggregated['NotesEventsNode'];
          event02 =  stream0.eventsNodesAggregated['PositionsEventsNode'];
          event11 =  stream1.eventsNodesAggregated['GenericEventsNode'];
          var event12 =  stream1.eventsNodesAggregated['PicturesEventsNode'];
          event101 =  stream2.eventsNodesAggregated['PicturesEventsNode'];
          event102 =  stream2.eventsNodesAggregated['GenericEventsNode'];
          should.not.exist(event101);
          should.not.exist(event102);
          should.exists(event12);
          _.size(event01.events).should.eql(4);
          _.size(event02.events).should.eql(6);
          _.size(event11.events).should.eql(8);
          _.size(event12.events).should.eql(2);
          event01.eventsNbr.should.eql(4);
          event02.eventsNbr.should.eql(6);
          event11.eventsNbr.should.eql(8);
          event12.eventsNbr.should.eql(2);
          done();
        }
      );
    });

  });


});
