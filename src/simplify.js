import * as ranges from './range';

const compareInvertOp = {
  '>=': '<',
  '<=': '>',
  '>': '<=',
  '<': '>=',
  '=': '!=',
  '!=': '=',
};

function createRange(input) {
  if (input.type !== 'compare') return;
  switch (input.op) {
    case '=':
      return ranges.eq([input.right.value], true, { right: input.right });
    case '!=':
      return ranges.neq([input.right.value], true, { right: input.right });
    case '<':
      return ranges.lt(input.right.value, false, { right: input.right });
    case '>':
      return ranges.gt(input.right.value, false, { right: input.right });
    case '<=':
      return ranges.lt(input.right.value, true, { right: input.right });
    case '>=':
      return ranges.gt(input.right.value, true, { right: input.right });
  }
}

// Simplify is implemented using various levels.
// 1. Inverting
// 2. Expanding in / between
// 3. Check short-curcuiting
// 4. Remove unnecessary predicates 
// 5. Eliminate by distributive property

function simplifyInvert(input, inverted = false) {
  if (input.type === 'unary' && input.op === '!') {
    return simplifyInvert(input.value, !inverted);
  } else if (input.type === 'logical') {
    // TODO
  } else if (inverted && input.type === 'compare') {
    return Object.assign({}, input, {
      op: compareInvertOp[input.op],
    });
  } else {
    return input;
  }
}

function simplifyExpand(input, inverted) {
  if (input.type === 'in') {
    return simplifyInvert({
      type: 'logical',
      op: '||',
      // TODO Handle subquery
      values: input.values.values.map(v => ({
        type: 'compare',
        op: '=',
        left: input.target,
        right: v,
      })),
    }, inverted);
  } else if (input.type === 'between') {
    return simplifyInvert({
      type: 'logical',
      op: '&&',
      values: [{
        type: 'compare',
        op: '>=',
        left: input.target,
        right: input.min,
      }, {
        type: 'compare',
        op: '<=',
        left: input.target,
        right: input.max,
      }],
    }, inverted);
  } else {
    return simplifyInvert(input, inverted);
  }
}

function simplifyLogical(input) {
  return input;
}

function simplifyDistributive(input) {
  return input;
}

function newSimplify(input) {
  return simplifyExpand(simplifyInvert(input, false));
}

// Returns simplified AST of where clause.
export default function simplify(input, inverted = false) {
  // The simplify method is required to traverse the AST, using recursion.
  // Remove NOT
  if (input.type === 'unary' && input.op === '!') {
    return simplify(input.value, !inverted);
  } else if (input.type === 'in') {
    return simplify({
      type: 'logical',
      op: '||',
      // TODO Handle subquery
      values: input.values.values.map(v => ({
        type: 'compare',
        op: '=',
        left: input.target,
        right: v,
      })),
    }, inverted);
  } else if (input.type === 'between') {
    return simplify({
      type: 'logical',
      op: '&&',
      values: [{
        type: 'compare',
        op: '>=',
        left: input.target,
        right: input.min,
      }, {
        type: 'compare',
        op: '<=',
        left: input.target,
        right: input.max,
      }],
    }, inverted);
  } else if (input.type === 'logical') {
    let op = (input.op === '||') === inverted ? '&&' : '||';
    let values = [];
    for (let i = 0; i < input.values.length; ++i) {
      let value = simplify(input.values[i], inverted);
      if (value.type === 'logical' && value.op === op) {
        values = values.concat(value.values);
      } else {
        values.push(value);
      }
    }
    // Check short-circuit
    if (values.some(v => v.type === 'boolean' && v.value === (op === '||'))) {
      return { type: 'boolean', value: op === '||' };
    }
    if (values.every(v => v.type === 'boolean' && v.value === (op !== '||'))) {
      return { type: 'boolean', value: op !== '||' };
    }
    // Remove unnecessary statements from logical operator; Store all the
    // predicates onto the range object, then rebuild the tree to contain
    // only allowed types.
    // Basically, we flush every compare operators - then rebuild it later.
    let columns = {};
    values = values.filter(value => {
      if (value.type === 'boolean' && value.value === (op !== '||')) {
        return false;
      }
      if (value.type !== 'compare' || value.left.type !== 'column') {
        return true;
      }
      let name = value.left.table + '.' + value.left.name;
      let range = createRange(value);
      // Check if the range contains the operator.
      if (columns[name] != null) {
        if (op === '||') {
          columns[name].value = ranges.or(columns[name].value, range);
        } else {
          columns[name].value = ranges.and(columns[name].value, range);
        }
      } else {
        columns[name] = { key: value.left, value: range };
      }
      return false;
    });
    for (let key in columns) {
      let entry = columns[key];
      entry.value.forEach(v => {
        let op = v.type;
        if (op === '*') return;
        if (op === '<' && v.equal) op = '<=';
        if (op === '>' && v.equal) op = '>=';
        values.push({
          type: 'compare',
          op,
          left: entry.key,
          right: v.right,
        });
      });
    }
    if (values.length === 1) return values[0];
    if (values.length === 0) {
      return { type: 'boolean', value: input.op === '||' };
    }
    // Eliminate properties by distributive property -
    // (a AND b) OR (c AND b) should be converted to (a OR c) AND b.
    // (a AND b) OR (c AND b) OR d -> ((a OR c) AND b) OR d
    // To do that, we find mutual predicate for each value, and combine
    // everything.
    let counts = {};
    values.forEach(value => {
      if (value.type === 'compare') {
        let name = JSON.stringify(value);
        if (counts[name] == null) counts[name] = { count: 0, value };
        counts[name].count = counts[name].count + 1;
      } else if (value.type === 'logical') {
        value.values.forEach(predicate => {
          let name = JSON.stringify(predicate);
          if (counts[name] == null) {
            counts[name] = { count: 0, value: predicate };
          }
          counts[name].count = counts[name].count + 1;
        });
      }
    });
    // Check most mutual predicate, and use it.
    // TODO It could use multiple mutual predicates.
    let maxCount = Object.keys(counts)
      .reduce((p, v) => Math.max(p, counts[v].count), 0);
    if (maxCount >= 2) {
      let fulfilled = Object.keys(counts)
        .map(v => counts[v]).filter(v => v.count === maxCount);
      let leftovers = [];
      let result = values.map(value => {
        if (value.type === 'compare') {
          let name = JSON.stringify(value);
          if (counts[name].count !== maxCount) leftovers.push(value);
          return null;
        } else if (value.type === 'logical') {
          let caught = false;
          let result = {
            type: 'logical',
            op: value.op,
            values: value.values.filter(predicate => {
              let name = JSON.stringify(predicate);
              if (counts[name].count === maxCount) {
                caught = true;
                return false;
              }
              return true;
            }),
          };
          if (caught) return result;
          leftovers.push(value);
          return null;
        }
      }).filter(v => v != null);
      let wrapped = {
        type: 'logical',
        op: op === '||' ? '&&' : '||',
        values: [{
          type: 'logical',
          op,
          values: result,
        }].concat(fulfilled.map(v => v.value)),
      };
      // If fulfilled is not empty, we can perform elimination.
      if (fulfilled.length > 0) {
        if (leftovers.length === 0) return simplify(wrapped);
        return simplify({
          type: 'logical',
          op,
          values: [wrapped].concat(leftovers),
        });
      }
    }
    // Does any operator has sufficient count? 
    return Object.assign({}, input, { op, values });
  } else if (inverted && input.type === 'compare') {
    return Object.assign({}, input, {
      op: compareInvertOp[input.op],
    });
  }
  return input;
}
