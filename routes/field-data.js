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
   * @apiGroup Fieldp
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
   *   {"101010":
   *     [
   *       {
   *         "type":"FeatureCollection",
   *         "features":[
   *           {"type":"Point",
   *            "coordinates":[10.809003,54.097834],
   *            "properties":{"source":"RoadLabPro"}},
   *           {"type":"Point",
   *            "coordinates":[10.810003,54.097834],
   *            "properties":{"source":"RoadLabPro"}}
   *         ]
   *       },
   *       {
   *         "type":"FeatureCollection",
   *         "features":[
   *           {"type":"Point",
   *            "coordinates":[10.809003,54.097834],
   *            "properties":{"source":"RouteShoot"}},
   *           {"type":"Point",
   *            "coordinates":[10.814003,54.097834],
   *            "properties":{"source":"RouteShoot"}}
   *          ]
   *        }
   *      ]
   *    },
   *    {"024LC00004":[{"type":"FeatureCollection","features":[{"type":"Point","coordinates":[10.94003,54.7834],"properties":{"source":"RouteShoot"}}]}]}]
   */
    method: 'GET',
    path: '/field/{ids}/geometries',
    handler: function (req, res) {
      // get the vpromms id supplied in request parameters
      const ids = req.params.ids.split(',');
      // select records with matching id from field_data_geometries
      knex('field_data_geometries')
      .whereIn('road_id', ids)
      .select('type as source', 'road_id', knex.raw(`ST_AsGeoJSON(geom) as geometry`))
      .then(geoms => {
        // group results by id
        geoms = groupBy(geoms, 'road_id');
        // map each id group into feature collections
        // where each feature collection includes geometries separated by source
        geoms = map(geoms, (id ,k) => {
          // group reponses by source
          id = groupBy(id, 'source');
          // for each source group, make a feature collection
          id = map(id, (s, i) => {
            // map each raw response (here s) to a feature collection
            s = map(s, (o, j) => {
              // make properties object from query's source prop.
              let props = {properties: {source: o.source}};
              // parse ST_ASGeoJSON text as geometry.
              let geom = JSON.parse(o.geometry);
              // return props and geom as a single object
              return Object.assign(geom, props);
            });
            return fc(s);
          });
          // put id into an object that has its actual id as its key
          const idGeom = {};
          idGeom[k] = id;
          // return that object.
          return idGeom;
        });
        // serve the response
        console.log(JSON.stringify(geoms));
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
