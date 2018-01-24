'use strict';
var Boom = require('boom');

const {
  validate
} = require('fast-json-patch');
var knex = require('../connection');
var queryWays = require('../services/query-ways');
var XML = require('../services/xml');
var log = require('../services/log');
var Node = require('../models/node-model');
var bbox = require('@turf/bbox');
var point = require('@turf/helpers').point;
var flatten = require('lodash').flatten;
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
  var vprommsId = req.params.VProMMs_Id;
  if (vprommsId.length !== 10) {
    return res(Boom.badRequest('VProMMs id must be exactly 10 digits'));
  }
  // get way_id for row where where the 'v' column matches vprommsId;
  knex('current_way_tags')
  .where('v', vprommsId)
  .then(function (result) {
    // make points for each of the returned ways as mutiple ways can have the same VProMMs;
    Promise.map(result, (res) => {
      // get nodes of that way, then return bbox that surround those nodes
      return queryWays(knex, result[0].way_id)
      .then(function (result) {
        // make points from each way node, then use those points to make a bbox
        return Promise.map(result.nodes, function (node) {
          return point(nodeCoordinates(node));
        });
      });
    })
    .then(function (points) {
      points = fc(flatten(points));
      res(bbox(points));
    });
  })
  .catch(function (err) {
    log.error(err);
    return res(Boom.wrap(err));
  });
}

function patchVprommIdHandler(req, res) {
  var wayId = parseInt(req.params.wayId || '', 10);
  if (
    !validate(req.payload) ||
    !(req.payload.hasOwnProperty('vprommid'))
  ) {
    return res(Boom.badData());
  }
  return knex('current_way_tags')
    .where({
      way_id: wayId,
      k: 'or_vpromms'
    })
    .update({
      v: req.payload.vprommid
    })
  .then(function(response) {
    console.log(response);
    if (response === 0) {
      throw new Error('404');
      return response;
    }
    return res({ wayId: wayId }).type('application/json');
  })
  .catch(function(err) {
    if (err.constraint) {
      return res(Boom.conflict());
    }

    if (err.message === '404') {
      return res(Boom.notFound());
    }

    console.error('Error PATCH /way/tags/vprommid/{wayId}', err);
    return res(Boom.badImplementation());
  });
}

module.exports = [
  {
    /**
     * @api {get} /xml/way/:wayId/[full] Get way by ID
     * @apiGroup Features
     * @apiName XmlWay
     * @apiDescription Returns OSM XML of requested Way along with full
     * representation of nodes in that way.
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
    method: 'GET',
    path: '/xml/way/{wayId}/full',
    handler: serveSingleWay
  },
  {
    method: 'GET',
    path: '/way/{wayId}',
    handler: serveSingleWay
  },
  {
    /**
     * @api {get} /way/:vprommsId/bbox Get way bbox by VProMMs ID
     * @apiGroup bbox
     * @apiName WayBBox
     * @apiVersion 0.1.0
     *
     * @apiParam {String} VProMMs_Id way specific VProMMs id.
     *
     * @apiExample {curl} Example Usage:
     *    curl http://localhost:4000/way/214TT00081/bbox
     *
     *
     * @apiSuccessExample {json} Success-Response:
     *  {
     *    '214TT00081': [
     *      105.6763663,
     *      20.1874632,
     *      105.6839964,
     *      20.2027991
     *    ]
     *  }
     */
    method: 'GET',
    path: '/way/{VProMMs_Id}/bbox',
    handler: singleWayBBOX
  },
/**
   * @api {PATCH} /way/tags/vprommid/:way_id Patch current_way_tags with new VPRoMM ID
   * @apiGroup Properties
   * @apiName Patch current_way_tags with new VPRoMM ID
   * @apiVersion 0.3.0
   *
   * @apiParam {String} id way id
   * @apiParam {String} json-patch patch operations to apply new VPRoMM ID.  See https://tools.ietf.org/html/rfc6902 for spec details.
   *
   * @apiErrorExample {json} Error-Response
   *     Patch operations are invalid
   *     HTTP/1.1 422 Unprocessable Entity
   *     {
   *       error: "Unprocessable Entity"
   *     }
   *
   * @apiExample {curl} Example Usage:
   *  curl -X PATCH- H "Content-Type: application/json-patch+json" -d '214TT00039' http://localhost:4000/way/tags/vprommid/123
   */
  {
    method: 'PATCH',
    path: '/way/tags/vprommid/{wayId}',
    handler: patchVprommIdHandler
  }
];
