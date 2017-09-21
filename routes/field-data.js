'use strict';

var knex = require('../connection.js');
var Boom = require('boom');
var fc = require('@turf/helpers').featureCollection;
var map = require('lodash').map;
var groupBy = require('lodash').groupBy;

module.exports = [
  {
     /**
   * @api {get} /field/{id}/geometries Field Data geometries with particular vProMMs id
   * @apiGroup Field
   * @apiVersion 0.1.0
   *
   * @apiParam {Number} vProMMSid road id
   * 
   * @apiSuccess {Array} FeatureCollections feature collections of geometries unique to source (either RoadLabPro or RouteShoot)
   *
   * @apiExample {curl} Example Usage:
   *    curl http://localhost:4000/field/101010/geometries
   *
   * @apiSuccessExample {json} Success-Response:
   * [
   *   {
   *     type: 'FeatureCollection',
   *     features: [
   *       { type: 'Point',
   *         coordinates: [ 10.809003, 54.097834 ],
   *         properties: { source: 'RoadLabPro' }
   *       },
   *       { type: 'Point',
   *         coordinates: [ 10.810003, 54.097834 ],
   *         properties: { source: 'RoadLabPro' }
   *       }
   *     ]
   *   },
   *   {
   *     type: 'FeatureCollection',
   *     features: [
   *       { type: 'Point',
   *         coordinates: [ 10.809003, 54.097834 ],
   *         properties: { source: 'RouteShoot' }
   *       },
   *       { type: 'Point',
   *         coordinates: [ 10.814003, 54.097834 ],
   *         properties: { source: 'RouteShoot' }
   *       }
   *     ]
   *   }
   * ]
   */
    method: 'GET',
    path: '/field/{id}/geometries',
    handler: function (req, res) {
      // get the vpromms id supplied in request parameters
      const id = req.params.id;
      // select records with matching id from field_data_geometries
      knex('field_data_geometries')
      .where({road_id: id})
      .select('type as source', knex.raw(`ST_AsGeoJSON(geom) as geometry`))
      .then(geoms => {
        // group results by source
        geoms = groupBy(geoms, 'source');
        // transform each group into a feature collection of geometries in that group.
        geoms = map(geoms, (s, k) => {
          s = map(s, (o, i) => {
            // make properties object from query's source prop.
            let props = {properties: {source: o.source}};
            // parse ST_ASGeoJSON text as geometry.
            let geom = JSON.parse(o.geometry);
            // return props and geom as a single object
            return Object.assign(geom, props);
          });
          // return s, now a list of features, as a feature collection.
          console.log(fc(s))
          return fc(s);
        });
        // serve feature collections as a response
        res(geoms);
      })
      .catch(e => {
        // deal with any errors
        console.log(e);
        res(Boom.wrap(e));
      });
    }
  }
];
