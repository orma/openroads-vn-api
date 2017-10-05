'use strict'

var Boom = require('boom');

var knex = require('../connection.js');
var api = 'http://localhost:4000/';
var flattenDeep = require('lodash').flattenDeep;
var groupBy = require('lodash').groupBy;
var includes = require('lodash').includes;
var assign = require('lodash').assign;
var reduce = require('lodash').reduce;
Promise = require('bluebird');
module.exports = [
  /**
   * @api {get} /properties  Way Properties by VProMMs id
   * @apiGroup Misc
   * @apiName VProMMsProps
   * @apiVersion 0.1.0
   *
   * @apiSuccess {Object} with nested objects for each of the keys in the query string. If no query string is passed, nested objects are blank
   *
   * @apiExample {curl} Example Usage:
   *    curl http://localhost:4000/properties
   *    curl http://localhost:4000/properties?key=source,iri_mean
   *
   * @apiSuccessExample {json} Success-Response:
   *  {
   *    'vpromms_id': {
   *      'source': 'RoadLab',
   *      'iri_mean': 3.42
   *     }
   *  },
   *  ...
   */
  {
    method: 'GET',
    path: '/properties',
    handler: function (req, res) {
      knex('current_way_tags')
        .where('k', 'or_vpromms')
        .distinct('v')
        .select('v')
        .map(entry => entry.v)
      .then((ids) => {
        return knex.select('way_id')
          .from('current_way_tags')
          .whereIn('v', ids)
        .then((wayIds) => {
          wayIds = flattenDeep(wayIds);
          wayIds = wayIds.map((wayId) => { return wayId.way_id; });
          return knex.select('*')
            .from('current_way_tags')
            .whereIn('way_id', wayIds)
          .then((results) => {
            results = groupBy(
              results,
              (result) => {
                return result.way_id
              }
            )
            const finResults = {};
            Object.keys(results).map((key) => {
              let vpromms = results[key].filter((resultObj) => {
                return (resultObj.k === 'or_vpromms' && resultObj.v !== '');
              })[0]
              if (vpromms) {
                let data;
                if (req.query.keys) {
                  const desired = req.query.keys.split(',');
                  data = results[key].filter((resultObj) => {
                    return includes(desired, resultObj.k);
                  }).map((data) => {
                    const key = data.k
                    const val = data.v
                    const returnObj = {};
                    returnObj[key] = val;
                    return returnObj;
                  })
                } else {
                  data = {};
                }
                data = reduce(data, (dataObj, d) => {
                  return assign(dataObj, d)
                }, {})
                vpromms = vpromms.v;
                finResults[vpromms] = data;
              }
            });
            res(finResults);
          });
        })
      })
    }
  }
];
