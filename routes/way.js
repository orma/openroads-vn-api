'use strict';
var Boom = require('boom');

var knex = require('../connection');
var queryWays = require('../services/query-ways');
var XML = require('../services/xml');
var log = require('../services/log');
var Node = require('../models/node-model');
var bbox = require('@turf/bbox');
var point = require('@turf/helpers').point;
var fc = require('@turf/helpers').featureCollection;
var Promise = require('bluebird');

function serveSingleWay(req, res) {
  var wayId = parseInt(req.params.wayId || '', 10);
  if (!wayId || isNaN(wayId)) {
    return res(Boom.badRequest('Way ID must be a non-zero number'));
  }

  queryWays(knex, wayId)
  .then(function (result) {
    var xmlDoc = XML.write({
      ways: Node.withTags(result.ways, result.waytags, 'way_id')
    });
    var response = res(xmlDoc.toString());
    response.type('text/xml');
  })
  .catch(function (err) {
    log.error(err);
    return res(Boom.wrap(err));
  });
}

// convert to decimal degree lat/lon
function nodeCoordinates (node) {
  return [
    parseInt(node.longitude, 10) / 10000000,
    parseInt(node.latitude, 10) / 10000000
  ];
}

function singleWayBBOX(req, res) {
  var vprommsId = req.params.vprommsId;
  if (vprommsId.length < 10) {
    return res(Boom.badRequest('VProMMs id must be atleast 10 digits'));
  }
  // get way_id for row where where the 'v' column matches vprommsId;
  knex('current_way_tags')
  .where('v', vprommsId)
  .then(function (result) {
    // get nodes of that way, then return bbox that surround those nodes
    queryWays(knex, result[0].way_id)
    .then(function (result) {
      // make points from each way node, then use those points to make a bbox
      Promise.map(result.nodes, function (node) {
        return point(nodeCoordinates(node));
      })
      .then(function (points) {
        points = fc(points);
        const bboxRes = {};
        bboxRes[vprommsId] = bbox(points);
        res(bboxRes);
      });
    });
  })
  .catch(function (err) {
    log.error(err);
    return res(Boom.wrap(err));
  });
}

module.exports = [
  /**
   * @api {get} /xml/way/:wayId/[full] Get way by ID
   * @apiGroup Features
   * @apiName XmlWay
   * @apiDescription Returns OSM XML of requested Way along with full
   * representation of nodes in that way. Appending `/full` to the endpoint
   * returns the same result.
   * @apiVersion 0.1.0
   *
   * @apiParam {Number} id Way ID.
   *
   * @apiSuccess {XML} way Relation
   * @apiSuccess {String} way.id Entity ID
   * @apiSuccess {String} way.visible Whether entity can be rendered
   * @apiSuccess {String} way.version Number of edits made to this entity
   * @apiSuccess {String} way.changeset Most recent changeset
   * @apiSuccess {String} way.timestamp Most recent edit
   * @apiSuccess {String} way.user User that created entity
   * @apiSuccess {String} way.uid User ID that created entity
   * @apiSuccess {String} way.lat Entity latitude
   * @apiSuccess {String} way.lon Entity longitude
   *
   * @apiExample {curl} Example Usage:
   *    curl http://localhost:4000/xml/way/26
   *
   *
   * @apiSuccessExample {xml} Success-Response:
   *  <osm version="6" generator="OpenRoads">
   *    <node id="27" visible="true" version="1" changeset="0" timestamp="Wed Mar 11 2015 09:38:41 GMT+0000 (UTC)" user="OpenRoads" uid="1" lat="9.787903" lon="123.939617"/>
   *    <node id="28" visible="true" version="1" changeset="0" timestamp="Wed Mar 11 2015 09:38:41 GMT+0000 (UTC)" user="OpenRoads" uid="1" lat="9.788083" lon="123.939679"/>
   *    <way id="26" visible="true" version="1" changeset="0" timestamp="Wed Mar 11 2015 09:38:41 GMT+0000 (UTC)" user="OpenRoads" uid="1">
   *      <nd ref="27"/>
   *      <nd ref="28"/>
   *      <tag k="highway" v="unclassified"/>
   *      <tag k="or_rdclass" v="barangay"/>
   *    </way>
   *  </osm>
   */
  {
    method: 'GET',
    path: '/xml/way/{wayId}/full',
    handler: serveSingleWay
  },
  {
    method: 'GET',
    path: '/xml/way/{wayId}',
    handler: serveSingleWay
  },
  {
    method: 'GET',
    path: '/xml/way/{vprommsId}/bbox',
    handler: singleWayBBOX
  }
];
