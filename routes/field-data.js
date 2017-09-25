'use strict';

var knex = require('../connection.js');
var Boom = require('boom');
var groupGeometriesById = require('../services/field-data').groupGeometriesById;
var makeGeomsFC = require('../services/field-data').makeGeomsFC;
var mapExistingIds = require('../services/field-data').mapExistingIds;

module.exports = [
  {
  /**
   * @api {get} /field/{ids}/geometries Field Data by source
   * @apiGroup Field
   * @apiName FieldGeometries
   * @apiDescription Returns list of each road id's field data, either as a feature collection, or object with data grouped by source (either RoadLabPro or RouteShoot)
   * @apiVersion 0.1.0
   *
   * @apiExample {curl} Example Usage:
   *    curl http://localhost:4000/field/024LC00002,024LC00001/geometries?grouped=true
   *
   * @apiSuccessExample {json} Success-Response:
   *  [
   *    {
   *      '024LC00002' : [
   *        {
   *          type: "FeatureCollection",
   *          features: [
   *            {
   *              type: 'Line',
   *              coordinates: [...]
   *            }
   *          ],
   *          properties: {
   *            source: 'RoadLabPro',
   *            vProMMs: '024LC00002'
   *          }
   *        },
   *        {
   *          type: "FeatureCollection",
   *          features: [
   *            {
   *              type: 'Line',
   *              coordinates: [...]
   *            }
   *          ],
   *          properties: {
   *            source: 'RouteShoot',
   *            vProMMs: '024LC00002'
   *          }
   *        }
   *      ],
   *    },
   *    {
   *      '024LC00001' : [
   *        {
   *          type: "FeatureCollection",
   *          features: [
   *            {
   *              type: 'Line',
   *              coordinates: [...]
   *            }
   *          ],
   *          properties: {
   *            source: 'RoadLabPro',
   *            vProMMs: '024LC00001'
   *          }
   *        },
   *        {
   *          type: "FeatureCollection",
   *          features: [
   *            {
   *              type: 'Line',
   *              coordinates: [...]
   *            }
   *          ],
   *          properties: {
   *            source: 'RouteShoot',
   *            vProMMs: '024LC00001'
   *          }
   *        }
   *      ]
   *    }
   *  ]
   *
   * @apiExample {curl} Example Usage:
   *    curl http://localhost:4000/field/024LC00002,024LC00001/geometries?grouped=false
   *
   * @apiSuccessExample {json} Success-Response:
   *   { type: "FeatureCollection",
   *     features: [
   *       { type: "Point",
   *         coordinates: [ 10.9003, 54.07834 ],
   *         properties: { road_id: "024LC00001", source: "RoadLabPro" } },
   *       { type: "Point",
   *         coordinates: [ 10.8003, 54.09834 ],
   *         properties: { road_id: "024LC00002", source: "RouteShoot" } }
   *     ]
   *   }
   *
   */
    method: 'GET',
    path: '/field/{ids}/geometries',
    handler: function (req, res) {
      // get the vpromms id supplied in request parameters
      const ids = req.params.ids.split(',');
      const grouped = (req.query.grouped == 'true');
      const download = (req.query.download == 'true');
      // select roads with
      knex('field_data_geometries')
      .whereIn('road_id', ids)
      .select('type as source', 'road_id', knex.raw(`ST_AsGeoJSON(geom) as geometry`))
      .then(geoms => {
        // if the query asks for geometries grouped, then provide them as so. if not, just return a feature collection of all records.
        geoms = grouped ? groupGeometriesById(geoms) : makeGeomsFC(geoms);
        if (download) {
          return res(JSON.stringify(geoms))
          .header('Content-Type', 'text/json')
          .header('Content-Disposition', `attachment; filename=${ids.join('-')}.geojson`);
        }
        res(geoms)
        .header('Content-Type', 'text/json');
      })
      .catch(e => {
        // deal with any errors
        console.log(e);
        res(Boom.wrap(e));
      });
    }
  },
  {
   /**
    * @api {get} /field/{ids}/exists Indicate vpromms id uses field data
    * @apiGroup Field
    * @apiName Field Exists
    * @apiDescription Returns list of objects for each provided road id, where each object indicates if it has attached field data
    * @apiVersion 0.1.0
    *
    * @apiExample {curl} Example Usage:
    *    curl http://localhost:4000/field/024LC00002,024LC00001/exists
    *
    * @apiSuccessExample {json} Success-Response:
    *  [{'024LC00002': true}, {'024LC00001': false}]
    *
    */
    method: 'GET',
    path: '/field/{ids}/exists',
    handler: function (req, res) {
      const ids = req.params.ids.split(',');
      knex('field_data_geometries')
      .whereIn('road_id', ids)
      .select('road_id')
      .then(existingIds => {
        existingIds = mapExistingIds(existingIds, ids);
        res(existingIds)
      });
    }
  }
];

