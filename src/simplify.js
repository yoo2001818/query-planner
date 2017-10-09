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
        break;
      case '$gt':
        break;
      case '$gte':
        break;
      case '$in':
        break;
      case '$lt':
        break;
      case '$lte':
        break;
      case '$ne':
        break;
      case '$nin':
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
