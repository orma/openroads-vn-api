'use strict';

const assert = require('assert');
const utils = require('../../util/road-id-utils');

describe('road ID utilities', () => {
  it('retrieves a road ID when it is in the path', () => {
    const path = '/foo/123AB12345/baz.csv';
    const knownRoadIds = ['123AB12345', '987ZZ98765'];
    const roadId = utils.getRoadIdFromPath(path, knownRoadIds);
    assert.equal(roadId, '123AB12345');
  });

  it('retrieves the road ID deepest in the path', () => {
    const path = '/foo/987ZZ98765/123AB12345/baz.csv';
    const knownRoadIds = ['123AB12345', '987ZZ98765'];
    const roadId = utils.getRoadIdFromPath(path, knownRoadIds);
    assert.equal(roadId, '123AB12345');
  });

  it('retrieves no road ID when none is present', () => {
    const path = '/foo/123AB12345/baz.csv';
    const knownRoadIds = ['987ZZ98765'];
    const roadId = utils.getRoadIdFromPath(path, knownRoadIds);
    assert.equal(roadId, null);
  });
});
