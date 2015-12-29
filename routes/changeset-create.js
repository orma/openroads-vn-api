'use strict';

var Boom = require('boom');

var knex = require('../connection.js');

module.exports = {
  /**
   * @api {put} /changeset/create Create a changeset
   * @apiGroup Changeset
   * @apiName CreateChangeset
   * @apiDescription Given a user and a user ID, create a new changeset and
   * return the newly created changeset ID.
   * @apiVersion 0.1.0
   *
   * @apiParam {Number} uid User ID
   * @apiParam {String} user User name
   *
   * @apiSuccess {Number} id Created changeset ID
   *
   * @apiExample {curl} Example Usage:
   *    curl -X PUT --data "uid=1&user=openroads" http://localhost:4000/changeset/create
   *
   * @apiSuccessExample {json} Success-Response:
   *  {"id":"1194"}
   */
  method: 'PUT',
  path: '/api/0.6/changeset/create',
  handler: function changesetCreate(req, res) {
    var now = new Date();

    // these would be attached from OAuth authorizations
    req.payload.uid = req.payload.uid || 1;
    req.payload.user = req.payload.user || 'placeholder';

    var changeset = req.payload.osm.changeset;
    var uid = req.payload.uid;
    var userName = req.payload.user;

    if (!uid || !userName) {
      return res(Boom.badRequest('A new changeset must include a user id and a username.'));
    }

    knex('users')
    .where('id', uid)
    .then(function (users) {
      if(users.length > 0)
        return uid;

      return knex('users')
      .insert({
        id: uid,
        display_name: userName,
        // TODO: we aren't using the following fields; they're just here to
        // cooperate w the database schema.
        email: uid + '@openroads.org',
        pass_crypt: '00000000000000000000000000000000',
        data_public: true,
        creation_time: new Date()
      });

    })
    .then(function () {
      // TODO do this in a transaction
      return knex('changesets')
        .returning('id')
        .insert({
          user_id: uid,
          created_at: now,
          closed_at: now,
          num_changes: 0
        })
        .then(function (ids) {
          if(ids.length < 1) {
            throw new Error('Could not add changeset to database.');
          }

          return ids[0];
        }).then(function(id) {
          var tags = changeset.tag.map(function(tag) {
            tag.changeset_id = id;

            return tag;
          });

          return knex('changeset_tags')
            .insert(tags)
            .then(function() {
              return res(id).type('text/plain');
            });
        });
    }).catch(function (err) {
      console.log(err);
      return res(Boom.wrap(err));
    });
  } // request handler
};
