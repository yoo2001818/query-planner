import * as ranges from './range';
import deepEqual from 'deep-equal';

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
      return ranges.eq([input.right.value]);
    case '!=':
      return ranges.neq([input.right.value]);
    case '<':
      return ranges.lt(input.right.value);
    case '>':
      return ranges.gt(input.right.value);
    case '<=':
      return ranges.lt(input.right.value, true);
    case '>=':
      return ranges.gt(input.right.value, true);
  }
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
  } else if (input.type === 'case') {
    let notTable = [];
    let result = [];
    for (let match of input.matches) {
      let query = input.value == null ? match.query : {
        type: 'compare',
        op: '=',
        left: input.value,
        right: match.query,
      };
      result.push({
        type: 'logical',
        op: '&&',
        values: notTable.concat(query, match.value),
      });
      notTable.push({
        type: 'unary',
        op: '!',
        value: query,
      });
    }
    if (input.else != null) {
      result.push({
        type: 'logical',
        op: '&&',
        values: notTable.concat(input.else),
      });
    }
    return simplify({
      type: 'logical',
      op: '||',
      values: result,
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
    // Remove unnecessary statements from logical operator; Store all the
    // predicates onto the range object, then rebuild the tree to contain
    // only allowed types.
    // Basically, we flush every compare operators - then rebuild it later.
    let columns = {};
    values = values.filter(value => {
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
        if (op === '<' && v.equal) op = '<=';
        if (op === '>' && v.equal) op = '>=';
        values.push({
          type: 'compare',
          op,
          left: entry.key,
          right: { type: 'number', value: v.value },
        });
      });
    }
    console.log(columns);
    return Object.assign({}, input, { op, values });
  } else if (inverted && input.type === 'compare') {
    return Object.assign({}, input, {
      op: compareInvertOp[input.op],
    });
  }
  // Remove implied / unnecesary operators. Simplify again if necessary.
  return input;
}
