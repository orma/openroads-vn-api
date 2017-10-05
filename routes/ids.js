'use strict';

var knex = require('../connection.js');

module.exports = [
  /**
   * @api {get} /properties/roads/ids All road IDs
   * @apiGroup Properties
   *
   * @apiSuccess {Array} ids IDs
   *
   * @apiExample {curl} Example Usage:
   *    curl http://localhost:4000/properties/roads/ids
   *
   * @apiSuccessExample {json} Success-Response:
   *  [
   *    "001ZZ33333",
   *    "123AB87654",
   *    "987NA00001"
   *  ]
   */
  {
    method: 'GET',
    path: '/properties/roads/ids',
    handler: function (req, res) {
      knex('road_properties')
        .select('id')
        .map(entry => entry.id)
      .then(res);
    }
  }
];
