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

function mergeKey(dest, name, value) {
  let rangeVal = dest.inverted ? ranges.not(value) : value;
  if (dest.keys[name] == null) {
    dest.keys[name] = rangeVal;
    return;
  }
  if (dest.isAnd) {
    dest.keys[name] = ranges.and(dest.keys[name], rangeVal);
  } else {
    dest.keys[name] = ranges.or(dest.keys[name], rangeVal);
  }
}

function merge(dest, value) {
  if (value.isAnd === dest.isAnd) {
    for (let key in value.keys) {
      mergeKey(dest, key, value.keys[key]);
    }
    dest.children.push.apply(dest.children, value.children);
  } else {
    // If the children has only single key, merge it into current destination.
    // Since AND query requires that all keys and children pass, and OR query
    // requires one of the keys or children pass, there is no problem about it.
    //
    // We can further optimize the query by merging (A AND B) OR (A AND C) form
    // to (B OR C) AND A. This can be expensive to implement.
    if (value.children.length === 0) {
      let keyNames = Object.keys(value.keys);
      let len = keyNames.length;
      if (len === 0) return;
      if (len === 1) {
        let keyName = keyNames[0];
        mergeKey(dest, keyName, value.keys[keyName]);
        return;
      }
    }
    dest.children.push(value);
  }
}

export default function simplify(
  tree, names = [], isAnd = true, inverted = false,
) {
  let keys = {};
  let children = [];
  let entry = { isAnd, keys, children, inverted };
  function addConstraint(names, range) {
    let nameStr = joinName(names);
    mergeKey(entry, nameStr, range);
  }
  if (Array.isArray(tree)) {
    addConstraint(names, ranges.eq(tree));
    return entry;
  }
  if (typeof tree !== 'object') {
    addConstraint(names, ranges.eq([tree]));
    return entry;
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
            inverted: inverted,
            isAnd: !inverted,
            keys: [],
            children: [],
          };
          tree[key].forEach(v => {
            merge(newValue, simplify(v, names, !inverted, inverted));
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
              simplify(v, names, !inverted, inverted));
          });
        } else {
          let newValue = {
            inverted: inverted,
            isAnd: inverted,
            keys: [],
            children: [],
          };
          tree[key].forEach(v => {
            merge(newValue, simplify(v, names, !inverted, inverted));
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
  if (Object.keys(entry.keys).length === 0 && entry.children.length === 1) {
    return entry.children[0];
  }
  return entry;
}
