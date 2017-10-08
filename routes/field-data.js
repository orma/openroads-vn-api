'use strict';

var knex = require('../connection.js');
var Boom = require('boom');
var groupGeometriesById = require('../services/field-data').groupGeometriesById;
var makeGeomsFC = require('../services/field-data').makeGeomsFC;
var mapExistingIds = require('../services/field-data').mapExistingIds;

module.exports = [
  {
  /**
   * @api {get} /field/geometries/{id} Returns array of feature collections, each with field data from a particular source (either RoadLabPro or RouteShoot)
   * @apiGroup Field
   * @apiName FieldGeometries
   * @apiParam {string} id VProMMs Id
   * @apiParam {string} grouped true/false string. When true, serve back geometries grouped by source. When false, serve a single Feature Collection.
   * @apiParam {string} download true/false string.  When true, serves data with headers to allow download. When false, no download headers are included.
   * @apiDescription Returns VProMMs id's field data
   * @apiVersion 0.1.0
   *
   * @apiExample {curl} Example Usage:
   *    curl http://localhost:4000/field/geometries/214YD00064?grouped=true
   *
   * @apiSuccessExample {json} Success-Response:
   *   [
   *     {
   *       "type":"FeatureCollection",
   *       "features":[
   *         {
   *           "properties":{"road_id":"214YD00064","source":"RoadLabPro"},
   *           "geometry":{"type":"LineString","coordinates":[...]}
   *         }
   *       ]
   *     },
   *     {
   *       "type":"FeatureCollection",
   *       "features":[
   *         {
   *           "properties":{"road_id":"214YD00064","source":"RouteShoot"},
   *           "geometry":{"type":"LineString","coordinates":[...]}
   *         }
   *       ]
   *     }
   *   ]
   * @apiExample {curl} Example Usage:
   *    curl http://localhost:4000/field/geometries/214YD00064?grouped=false
   *
   * @apiSuccessExample {json} Success-Response:
   *   {
   *     "type":"FeatureCollection",
   *     "features":[
   *       {
   *         "properties":{"road_id":"214YD00064","source":"RoadLabPro"},
   *         "geometry":{"type":"LineString","coordinates":[...]}
   *       },
   *       {
   *         "properties":{"road_id":"214YD00064","source":"RouteShoot"},
   *         "geometry":{"type":"LineString","coordinates":[...]}
   *       }
   *     ]
   *   }
   *
   */
    method: 'GET',
    path: '/field/geometries/{id}',
    handler: function (req, res) {
      const id = req.params.id;
      const grouped = (req.query.grouped == 'true');
      const download = (req.query.download == 'true');
      knex('field_data_geometries')
      .where({'road_id': id})
      .select('type as source', 'road_id', knex.raw(`ST_AsGeoJSON(geom) as geometry`))
      .then(geoms => {
        geoms = grouped ? groupGeometriesById(geoms) : makeGeomsFC(geoms);
        if (download) {
          return res(JSON.stringify(geoms))
          .header('Content-Type', 'text/json')
          .header('Content-Disposition', `attachment; filename=${id}.geojson`);
        }
        res(geoms);
      })
      .catch(e => {
        console.log(e);
        res(Boom.wrap(e));
      });
    }
  },
  {
   /**
    * @api {get} /field/{ids}/exists Indicate if VProMMs ids' have field data in the database
    * @apiGroup Field
    * @apiName Field Exists
    * @apiParam {string} ids string representation of ids for which to search related field data
    * @apiDescription Returns list of VProMMs ids for which field data was found
    * @apiVersion 0.1.0
    *
    * @apiExample {curl} Example Usage:
    *    curl http://localhost:4000/field/024LC00002,024LC00001/exists
    *
    * @apiSuccessExample {json} Success-Response:
    *  ['024LC00002']
    *
    */
    method: 'GET',
    path: '/field/{ids}/exists',
    handler: function (req, res) {
      const ids = req.params.ids.split(',');
      knex('field_data_geometries')
      .whereIn('road_id', ids)
      .select('road_id')
      .then(existingFieldData => {
        const existingIds = existingFieldData.map(record => record.road_id);
        // return only ids that have field data in db.
        res(ids.reduce((accum, id) => {
          if (existingIds.indexOf(id) !== -1) { accum.push(id); }
          return accum; }, []
        ));
      });
    },
  },
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

