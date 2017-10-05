'use strict';

var knex = require('../connection.js');
var Boom = require('boom');
var groupGeometriesById = require('../services/field-data').groupGeometriesById;
var makeGeomsFC = require('../services/field-data').makeGeomsFC;
var mapExistingIds = require('../services/field-data').mapExistingIds;

module.exports = [
  {
  /**
   * @api {get} /field/geometries/{id} Field Data for VProMMs Ids
   * @apiGroup Field
   * @apiName FieldGeometries
   * @apiParam {string} ids string representation of a list of VProMMs ids list
   * @apiParam {string} grouped true/false string that when true serves back a VProMMs Ids' geometries grouped by source. When false, GeoJSONs are not grouped
   * @apiParam {string} download true/false string that when true makes api serves data with headers that allow download. WHen false, no additional headers are added to the response.
   * @apiDescription Returns list of each VProMMs id's field data. This can be served either as a feature collection, or object with data grouped by source (RoadLabPro or RouteShoot)
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
   *       { type: "Line",
   *         coordinates: [...],
   *         properties: { road_id: "024LC00001", source: "RoadLabPro" } },
   *       { type: "Line",
   *         coordinates: [...],
   *         properties: { road_id: "024LC00002", source: "RouteShoot" } }
   *     ]
   *   }
   *
   */
    method: 'GET',
    path: '/field/geometries/{id}',
    handler: function (req, res) {
      // get the vpromms id supplied in request parameters
      const id = req.params.id;
      // get the boolean representations of grouped and download to guide how to serve the field data
      const grouped = (req.query.grouped == 'true');
      const download = (req.query.download == 'true');
      // select roads from field_data_geometries where ids are in ${ids}
      knex('field_data_geometries')
      .where({'road_id': id})
      .select('type as source', 'road_id', knex.raw(`ST_AsGeoJSON(geom) as geometry`))
      .then(geoms => {
        // if the query asks for geometries grouped, use groupGeometriesById to provide them as so. if not, just return a feature collection of all records using makeGeomsFC.
        geoms = grouped ? groupGeometriesById(geoms) : makeGeomsFC(geoms);
        // if download param supplied, serve back geoms with correct headers for download
        if (download) {
          return res(JSON.stringify(geoms))
          .header('Content-Type', 'text/json')
          .header('Content-Disposition', `attachment; filename=${ids.join('-')}.geojson`);
        }
        // when not so, do not apply download headers
        res(geoms);
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
    * @api {get} /field/{ids}/exists Indicate if VProMMs ids' have related field data in the database
    * @apiGroup Field
    * @apiName Field Exists
    * @apiParam {string} ids string representation of ids for which to search related field data
    * @apiDescription Returns list of objects for each provided road id, where each object indicates if an id has attached field data in the database.
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
      // generate list from string representation in request params
      const ids = req.params.ids.split(',');
      // select from field_data_geometries road ids that are in ids list
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
    }
  }
];

