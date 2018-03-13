import * as ranges from './range';

// Returns simplified AST of where clause.
export default function simplify(input) {
  // The simplify method is required to traverse the AST, using recursion.
  // Remove NOT
  // Remove IN
  if (input.type === 'in') {
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
    });
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
    });
  } else if (input.type === 'case') {
    console.log(input);
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
    });
  }
  // Remove CASE
  // Combine nested operators
  // Remove implied / unnecesary operators. Simplify again if necessary.
  return input;
}