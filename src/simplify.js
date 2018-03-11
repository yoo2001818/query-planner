import * as ranges from './range';

// Returns simplified AST of where clause.
export default function simplify(input) {
  // The simplify method is required to traverse the AST, using recursion.
  // Remove NOT
  // Remove IN
  // Remove BETWEEN
  // Remove CASE
  // Combine nested operators
  // Remove implied / unnecesary operators. Simplify again if necessary.
  return input;
}