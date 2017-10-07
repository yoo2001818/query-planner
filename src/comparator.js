// Creates a generalized comparator using a key.
// But the index only gets an array for a key - that means we just have to
// compare the array, that's all.
export default function createComparator(index) {
  const { keys } = index;
  // Create an comparator.
  if (keys.length === 1) {
    // single key index doesn't use an array.
    return compare;
  } else {
    return (a, b) => {
      // Compare each keys, return if non-zero.
      for (let i = 0; i < keys.length; ++i) {
        let compared = compare(a[i], b[i]);
        if (compared !== 0) return compared;
      }
      return 0;
    };
  }
}

const BOUNDARY_MAP = {
  undefined: -2,
  null: -1,
  boolean: 0,
  number: 1,
  string: 2,
};

export function boundary(type, top = false) {
  return { __boundary__: true, type: BOUNDARY_MAP[type], pos: top ? 1 : -1 };
}

// Compares which index has higher order, which will be compared against the
// query first.
export function indexComparator(a, b) {
  let keyLen = compare(a.keys.length, b.keys.length);
  if (keyLen !== 0) return -keyLen;
  // TODO Data size
  return -compare(a.id, b.id);
}

function getPriority(value) {
  if (value === undefined) return -2;
  if (value === null) return -1;
  if (value.__boundary__) return value.type;
  switch (typeof value) {
    case 'boolean': return 0;
    case 'number': return 1;
    case 'string': return 2;
    default: return 3;
  }
}

export function compare(a, b) {
  // Only treat numbers and strings - convert boolean to number.
  // Also, don't treat object number/strings...
  let aId = getPriority(a);
  let bId = getPriority(b);
  if (aId < bId) return -1;
  if (aId > bId) return 1;
  if (a.__boundary__ || b.__boundary__) {
    if (!a.__boundary__) return -b.pos;
    if (!b.__boundary__) return a.pos;
    return a.pos - b.pos;
  }
  if (aId === 1) {
    let aNaN = isNaN(a);
    let bNaN = isNaN(b);
    if (aNaN && bNaN) return 0;
    if (aNaN) return -1;
    if (bNaN) return 1;
  }
  if (a > b) return 1;
  if (a < b) return -1;
  return 0;
}
