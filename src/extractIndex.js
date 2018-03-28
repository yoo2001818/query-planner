// Extracts index, additional and leftover predicates from the given WHERE AST
// and the index information.
// Thus, it can't compare through many indices - pre-filtering should be done
// before running this function.

export default function extractIndex(index, input) {
  return {
    index: null,
    additional: null,
    leftover: null,
  };
}
