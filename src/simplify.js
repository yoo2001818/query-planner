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

export default function simplify(
  tree, names = [], type = 'and', inverted = false,
) {
  if (typeof tree !== 'object') {
    return ranges.eq([tree]);
  }
  let lastKey = null;
  const keys = [];
  const children = [];
  function addConstraint(names, range) {
    let nameStr = joinName(names);
    if (keys[nameStr] == null) keys[nameStr] = range;
    else keys[nameStr] = ranges.and(keys[nameStr], range);
  }
  for (let key in tree) {
    switch (key) {
      case '$eq':
        addConstraint(names, ranges.eq([tree[key]]));
        break;
      case '$gt':
        addConstraint(names, ranges.gt(tree[key]));
        break;
      case '$gte':
        addConstraint(names, ranges.gt(tree[key], true));
        break;
      case '$in':
        addConstraint(names, ranges.eq(tree[key]));
        break;
      case '$lt':
        addConstraint(names, ranges.lt(tree[key]));
        break;
      case '$lte':
        addConstraint(names, ranges.lt(tree[key], true));
        break;
      case '$ne':
        addConstraint(names, ranges.neq([tree[key]]));
        break;
      case '$nin':
        addConstraint(names, ranges.neq(tree[key]));
        break;
      case '$not':
        // A AND B = !(!A OR !B)
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
