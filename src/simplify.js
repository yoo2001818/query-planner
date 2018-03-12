import * as ranges from './range';

// Returns simplified AST of where clause.
export default function simplify(input) {
  // The simplify method is required to traverse the AST, using recursion.
  // Remove NOT
  // Remove IN
  if (input.type === 'in') {
    return {
      type: 'logical',
      op: '||',
      // TODO Handle subquery
      values: input.values.values.map(v => ({
        type: 'compare',
        op: '=',
        left: input.target,
        right: v,
      })),
    };
  } else if (input.type === 'between') {
    return {
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
    };
  } 
  // Remove CASE
  // Combine nested operators
  // Remove implied / unnecesary operators. Simplify again if necessary.
  return input;
}