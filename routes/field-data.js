'use strict';

var knex = require('../connection.js');
var Boom = require('boom');
var groupGeometriesById = require('../services/field-data').groupGeometriesById;
var makeGeomsFC = require('../services/field-data').makeGeomsFC;

module.exports = [
  {
    /**
     * @api {get} /field/ids List of VProMMs ids with field data
     * @apiGroup Field
     * @apiName Field ids
     * @apiDescription Returns a list of VPromms ids with field data
     * @apiVersion 0.1.0
     *
     * @apiExample {curl} Example Usage:
     *   curl http://localhost:4000/field/ids
     * @apiSuccessExample {array} Success-Response:
     *   ["024BX00040","022BX00029", ...]
     */
    method: 'GET',
    path: '/field/ids',
    handler: function (req, res) {
      knex('field_data_geometries')
      .distinct('road_id')
      .select('road_id as id')
      .whereNotNull('road_id')
      .then(roads => res(roads.map(road => road.id)));
    }
  },
  {
    /**
     * @api {get} /field/roads/total
     * @apiGroup Field
     * @apiName List Field Data road counts at province and district level
     * @apiDescription Returns list of field data road counts for a specific admin level
     * @apiVersion 0.1.0
     *
     * @apiParam {string} level admin level
     *
     * @apiSuccess {array} array of objects with vpromms and field road count
     *
     * @apiSuccessExample {JSON} Example Usage:
     *  curl http://localhost:4000/field/roads/total?level=district
     *
     * @apiSuccessExample {JSON} Success-Response
     * [{
     *    "total_roads": "137",
     *    "admin": "21YD"
     *  },
     *  {
     *    "total_roads": "28",
     *    "admin": "21TH"
     *  },
     *  {
     *    "total_roads": "127",
     *    "admin": "21TT"
     *  },
     *  {
     *    "total_roads": "39",
     *    "admin": "02BX"
     *  },
     *  ...
     * ]
     *
    */
    method: 'GET',
    path: '/field/roads/total',
    handler: function (req, res) {
      const districtQuery = req.query.level === 'district' ? ', SUBSTRING(road_id, 4, 2)' : '';
      knex.raw(`
        SELECT COUNT(DISTINCT road_id) as total_roads, CONCAT(SUBSTRING(road_id, 0, 3)${districtQuery}) as admin
        FROM field_data_geometries
        WHERE (CONCAT(SUBSTRING(road_id, 0, 3)${districtQuery}) <> '')
        GROUP BY admin;
      `)
      .then(adminRoadNum => res(adminRoadNum.rows));
    }
  }
];

