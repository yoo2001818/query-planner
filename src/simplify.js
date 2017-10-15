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

function merge(dest, value) {
  if (value.isAnd === dest.isAnd) {
    dest.keys.push.apply(dest.keys, value.keys);
    dest.children.push.apply(dest.children, value.children);
  } else {
    dest.children.push(value);
  }
}

export default function simplify(
  tree, names = [], isAnd = true, inverted = false,
) {
  let keys = [];
  let children = [];
  let entry = { isAnd, keys, children };
  function addConstraint(names, range) {
    let nameStr = joinName(names);
    let rangeVal = inverted ? ranges.not(range) : range;
    if (keys[nameStr] == null) {
      keys[nameStr] = rangeVal;
      return;
    }
    if (isAnd) {
      keys[nameStr] = ranges.and(keys[nameStr], rangeVal);
    } else {
      keys[nameStr] = ranges.or(keys[nameStr], rangeVal);
    }
  }
  if (Array.isArray(tree)) {
    addConstraint(names, ranges.eq(tree));
    return { isAnd, keys, children };
  }
  if (typeof tree !== 'object') {
    addConstraint(names, ranges.eq([tree]));
    return { isAnd, keys, children };
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
        // Thus, it needs to be OR, while being inverted.
        // This is applied to individual clauses too - everything needs to be
        // inverted.
        merge(entry, simplify(tree[key], names, !isAnd, !inverted));
        break;
      case '$nor':
        // !(A OR B).
        break;
      case '$and':
        // A AND B. Should be converted to OR if inverted.
        if (isAnd === !inverted) {
          // Merge keys and children
          tree[key].forEach(v => {
            merge(entry, simplify(v, names, !inverted, inverted));
          });
        } else {
          let newValue = {
            isAnd: !inverted,
            keys: [],
            children: [],
          };
          tree[key].forEach(v => {
            merge(newValue, simplify(v, names, newValue.isAnd, inverted));
          });
          merge(entry, newValue);
        }
        break;
      case '$or':
        // A OR B. Should be converted to AND if inverted.
        if (isAnd === inverted) {
          // Merge keys and children
          tree[key].forEach(v => {
            merge(entry,
              simplify(v, names, inverted, inverted));
          });
        } else {
          let newValue = {
            isAnd: inverted,
            keys: [],
            children: [],
          };
          tree[key].forEach(v => {
            merge(newValue, simplify(v, names, newValue.isAnd, inverted));
          });
          merge(entry, newValue);
        }
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
      default: {
        // If current state is OR, or AND in inverted, we need to create new
        // child.
        if (isAnd !== inverted) {
          merge(entry, simplify(tree[key], names.concat([key]),
            isAnd, inverted));
        } else {
          merge(entry, simplify(tree[key], names.concat([key]),
            !isAnd, inverted));
        }
        break;
      }
    }
  }
  return entry;
}
