import * as ranges from './range';

// Simplifies, or rather, serializes the Mongo-DB style query to a node
// composed of operator type, queries, and children nodes.
//
// Since the database is not supposed to handle nested objects, i.e. pos.x,
// it should change these formats into a single key separated by .: 'pos.x'.
//

function joinName(names) {
  return names.join('.');
}

export default function simplify(tree, names = [], type = 'and') {
  if (typeof tree !== 'object') {
    return ranges.eq([tree]);
  }
  let lastKey = null;
  const keys = [];
  const children = [];
  for (let key in tree) {
    switch (key) {
      case '$eq':
        keys[joinName(names)] = ranges.and(
          keys[joinName(names)], ranges.eq([tree[key]]));
        break;
      case '$gt':
        keys[joinName(names)] = ranges.and(
          keys[joinName(names)], ranges.gt(tree[key]));
        break;
      case '$gte':
        keys[joinName(names)] = ranges.and(
          keys[joinName(names)], ranges.gt(tree[key], true));
        break;
      case '$in':
        keys[joinName(names)] = ranges.and(
          keys[joinName(names)], ranges.eq(tree[key]));
        break;
      case '$lt':
        keys[joinName(names)] = ranges.and(
          keys[joinName(names)], ranges.lt(tree[key]));
        break;
      case '$lte':
        keys[joinName(names)] = ranges.and(
          keys[joinName(names)], ranges.lt(tree[key], true));
        break;
      case '$ne':
        keys[joinName(names)] = ranges.and(
          keys[joinName(names)], ranges.neq([tree[key]]));
        break;
      case '$nin':
        keys[joinName(names)] = ranges.and(
          keys[joinName(names)], ranges.neq(tree[key]));
        break;
      case '$not':
        break;
      case '$nor':
        break;
      case '$and':
        break;
      case '$or':
        break;
      case '$exists':
        break;
      case '$type':
        break;
      case '$all':
        break;
      case '$elemMatch':
        break;
      case '$size':
        break;
      default:
        lastKey = key;
        break;
    }
  }
  return { type, keys, children };
}
