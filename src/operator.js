import { compare } from './comparator';

// Operators are used to plan the query; User written JSONs are converted to
// JSON with these operators.
// The operator is a plot on a single axis - it performs a boolean operation on
// the single axis.
//
// Thus, it's stored in a sorted array, and the database system reads it from
// the first, quickly 'winds' the entire database while looking at the pattern.
// it can read the operators from the reverse, too.
//
// Each operator has many instructions, telling that what range/value should be
// accepted or not.
//
// There are these types of instructions: <, >, <=, >=, ==, !=.
// It's pretty self explainary. < and > continues until they meet corresponding
// > or <. != ignores the specific value in the range. You can see it as a very
// specific < and >.
//
// [ > 1, < 3 ] means 1 < n < 3.
// [ < 3 ] means -Infinity < n < 3.
//
// However, != requires that the range is already 'triggered'. For this
// purpose, special instruction '*' is used to mark that all range is
// qualified.

export function gt(value, equal = false) {
  return [
    { type: '>', value, equal },
  ];
}

export function lt(value, equal = false) {
  return [
    { type: '<', value, equal },
  ];
}

export function range(gt, lt, gte = false, lte = false) {
  const compared = compare(gt, lt);
  if (compared === -1) {
    // Normal output
    return [
      { type: '>', value: gt, equal: gte },
      { type: '<', value: lt, equal: lte },
    ];
  } else if (compared === 1) {
    // Inverted output
    return [
      { type: '<', value: lt, equal: !lte },
      { type: '>', value: gt, equal: !gte },
    ];
  } else {
    // Return empty array unless both are true.
    if (!gte || !lte) return [];
    return [ { type: '=', value: gt } ];
  }
}

export function eq(values, noSort) {
  if (values.length === 0) return [];
  if (noSort) {
    return values.map(v => ({ type: '=', value: v }));
  }
  let arr = values.slice();
  arr.sort(compare);
  let result = [{ type: '=', value: arr[0] }];
  for (let i = 1; i < arr.length; ++i) {
    if (arr[i] !== arr[i - 1]) {
      result.push({ type: '=', value: arr[i] });
    }
  }
  return result;
}

export function neq(values, noSort) {
  if (values.length === 0) return [];
  if (noSort) {
    return [{ type: '*' }].concat(
      values.map(v => ({ type: '!=', value: v })));
  }
  let arr = values.slice();
  arr.sort(compare);
  let result = [
    { type: '*' },
    { type: '!=', value: arr[0] },
  ];
  for (let i = 1; i < arr.length; ++i) {
    if (arr[i] !== arr[i - 1]) {
      result.push({ type: '!=', value: arr[i] });
    }
  }
  return result;
}

export function not(query) {
  // [ > 1, < 3 ] should be converted to 1 <= n or n >= 3.
  // Simply put, this should be run like this:
  // - > and < should be inverted, along with 'equal'.
  // - If = is met outside, set '*' flag. If > and < is not met until the end,
  //   insert '*' operator at the first. Then, convert it to !=.
  // - If * is met, remove it.
  // - If != is met inside, change it to =. 

  // Special case: empty array
  if (query.length === 0) return [{ type: '*' }];
  let hasSign = false;
  let hasEqual = false;
  let output = query.map(op => {
    switch (op.type) {
      case '*':
        return null;
      case '>':
        hasSign = true;
        return { type: '<', equal: !op.equal, value: op.value };
      case '<':
        return { type: '>', equal: !op.equal, value: op.value };
      case '=':
        hasEqual = true;
        return { type: '!=', value: op.value };
      case '!=':
        return { type: '=', value: op.value };
    }
  }).filter(v => v != null);
  if (!hasSign && hasEqual) return [{ type: '*' }].concat(output);
  return output;
}

// The table tells how the 'inside' state should be while entering/exiting.
const OPERATOR_TABLE = {
  '<': { enter: true, exit: false, flag: 2 },
  '>': { enter: false, exit: true, flag: 1 },
  '*': { enter: false, exit: true, flag: 1 },
  '=': { enter: false, exit: false, flag: 0 },
  '!=': { enter: true, exit: true, flag: 3 },
};

function compareOp(a, b) {
  // 1. Compare type. * is always smallest.
  if (a.type === '*' && b.type === '*') return 0;
  if (a.type === '*') return -1;
  if (b.type === '*') return 1;
  // 2. Compare value.
  let result = compare(a.value, b.value);
  return result;
}

const OR_EQUAL_ACTIONS = [
  // Select anything; prefer the one with equal flag.
  (a, b) => a.equal ? a : b,
  // Apply equal flag.
  (a, b) => Object.assign({}, b, { equal: true }),
  // Do nothing.
  () => null,
  // If both don't have equal sign, create !=. Otherwise, do nothing.
  (a, b) => (a.equal || b.equal) ? null : { type: '!=', value: a.value },
];

// Please refer to OPERATOR_TABLE's flag and OR_EQUAL_ACTIONS to see how it
// works.
const OR_EQUAL_LUT = [
  0, 1, 1, 2, -1, 0, 3, 3, -1, -1, 0, 3, -1, -1, -1, 0,
].map(v => OR_EQUAL_ACTIONS[v]);

export function or(a, b) {
  // Check each query's 'inside' state. Make 'inside' state large as possible.
  // This can be achieved by doing:
  // Check initial state of the queries.
  //   <, *, != means inside, and >, = means outside.
  // Compare each values of the queries, progress smaller one.
  // If both are outside and the operator enters 'inside' state,
  //   insert that to the output and set 'inside' state.
  // if only the query is inside and the operator leaves 'inside' state,
  //   insert that to the output and clear 'inside' state.
  if (a.length === 0) return b;
  if (b.length === 0) return a;
  let aInside = OPERATOR_TABLE[a[0].type].enter;
  let bInside = OPERATOR_TABLE[b[0].type].enter;
  // We have to prepend * operator if the completed statement doesn't exit
  // true state at all, and either A and B didn't provide * operator.
  let doPrepend = (aInside || bInside) &&
    !(aInside.type === '*' || bInside.type === '*');
  let aCount = 0;
  let bCount = 0;
  let output = [];
  while (aCount < a.length && bCount < b.length) {
    // Compare both values and advance smaller one.
    let compared = compareOp(a[aCount], b[bCount]);
    if (compared < 0) {
      let op = a[aCount];
      let { exit } = OPERATOR_TABLE[op.type];
      aInside = exit;
      if (!bInside) output.push(op);
      aCount += 1;
    } else if (compared > 0) {
      let op = b[bCount];
      let { exit } = OPERATOR_TABLE[op.type];
      bInside = exit;
      if (!aInside) output.push(op);
      bCount += 1;
    } else {
      // Both have same value - this is a special case.
      // (1) < and >, both doesn't have equal - add !=
      // (2) < and >, one of them are equal - NOP
      // (3) (< or >) and =, add equal flag
      // (4) (< or >) and !=, use < or >
      // (5) = and !=, ignore both
      // (6) If both are same, use one of them.
      // According to this, a look up table has been created.
      let aOp = a[aCount];
      let bOp = b[bCount];
      let { flag: aOpFlag, exit: aOpExit } = OPERATOR_TABLE[aOp.type];
      let { flag: bOpFlag, exit: bOpExit } = OPERATOR_TABLE[bOp.type];
      let outputOp;
      if (aOpFlag < bOpFlag) {
        let flag = (aOpFlag << 2) | bOpFlag;
        outputOp = OR_EQUAL_LUT[flag](aOp, bOp);
      } else {
        let flag = (bOpFlag << 2) | aOpFlag;
        outputOp = OR_EQUAL_LUT[flag](bOp, aOp);
      }
      if (outputOp != null) output.push(outputOp);
      aInside = aOpExit;
      bInside = bOpExit;
      aCount += 1;
      bCount += 1;
    }
    if (!bInside && !aInside) doPrepend = false;
  }
  // Digest remaining data.
  while (aCount < a.length) {
    let op = a[aCount];
    let { exit } = OPERATOR_TABLE[op.type];
    aInside = exit;
    if (!bInside) {
      output.push(op);
      if (!aInside) doPrepend = false;
    }
    aCount += 1;
  }
  while (bCount < b.length) {
    let op = b[bCount];
    let { exit } = OPERATOR_TABLE[op.type];
    bInside = exit;
    if (!aInside) {
      output.push(op);
      if (!bInside) doPrepend = false;
    }
    bCount += 1;
  }
  if (doPrepend) {
    output.unshift({ type: '*' });
  }
  return output;
}

const AND_EQUAL_ACTIONS = [
  // If both lack equal sign, ignore. or =
  (a, b) => a.equal && b.equal ? { type: '=', value: a.value } : null,
  // Variant of the top - equal vs < or >.
  (a, b) => b.equal ? { type: '=', value: a.value } : null,
  // Select anything; prefer the one without equal flag.
  (a, b) => a.equal ? b : a,
  // Do nothing.
  () => null,
  // Strip equal flag.
  (a, b) => Object.assign({}, a, { equal: false }),
];

// Please refer to OPERATOR_TABLE's flag and OR_EQUAL_ACTIONS to see how it
// works.
const AND_EQUAL_LUT = [
  2, 1, 1, 3, -1, 2, 0, 4, -1, -1, 4, 2, -1, -1, -1, 2,
].map(v => AND_EQUAL_ACTIONS[v]);

export function and(a, b) {
  // The operation is quite same with OR, but append state if both are in
  // 'inside' state.
  if (a.length === 0) return [];
  if (b.length === 0) return [];
  let aInside = OPERATOR_TABLE[a[0].type].enter;
  let bInside = OPERATOR_TABLE[b[0].type].enter;
  let aCount = 0;
  let bCount = 0;
  let output = [];
  while (aCount < a.length && bCount < b.length) {
    // Compare both values and advance smaller one.
    let compared = compareOp(a[aCount], b[bCount]);
    if (compared < 0) {
      let op = a[aCount];
      let { exit } = OPERATOR_TABLE[op.type];
      aInside = exit;
      if (bInside && op.type !== '*') output.push(op);
      aCount += 1;
    } else if (compared > 0) {
      let op = b[bCount];
      let { exit } = OPERATOR_TABLE[op.type];
      bInside = exit;
      if (aInside && op.type !== '*') output.push(op);
      bCount += 1;
    } else {
      // Both have same value - this is a special case.
      // (1) < and >, both doesn't have equal - ignore
      // (2) < and >, both of them are equal - change to =
      // (3) (< or >) and =, if < or > has equal flag, = or ignore
      // (4) (< or >) and !=, use < or >, strip equal flag
      // (5) = and !=, ignore both
      // (6) If both are same, use one of them, while stripping equal flag.
      // According to this, a look up table has been created.
      let aOp = a[aCount];
      let bOp = b[bCount];
      let { flag: aOpFlag, exit: aOpExit } = OPERATOR_TABLE[aOp.type];
      let { flag: bOpFlag, exit: bOpExit } = OPERATOR_TABLE[bOp.type];
      let outputOp;
      if (aOpFlag < bOpFlag) {
        let flag = (aOpFlag << 2) | bOpFlag;
        outputOp = AND_EQUAL_LUT[flag](aOp, bOp);
      } else {
        let flag = (bOpFlag << 2) | aOpFlag;
        outputOp = AND_EQUAL_LUT[flag](bOp, aOp);
      }
      if (outputOp != null) output.push(outputOp);
      aInside = aOpExit;
      bInside = bOpExit;
      aCount += 1;
      bCount += 1;
    }
  }
  // Digest remaining data.
  while (aCount < a.length) {
    let op = a[aCount];
    let { exit } = OPERATOR_TABLE[op.type];
    aInside = exit;
    if (bInside) {
      output.push(op);
    }
    aCount += 1;
  }
  while (bCount < b.length) {
    let op = b[bCount];
    let { exit } = OPERATOR_TABLE[op.type];
    bInside = exit;
    if (aInside) {
      output.push(op);
    }
    bCount += 1;
  }
  return output;
}
