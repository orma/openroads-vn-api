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
  }
];

