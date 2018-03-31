// Extracts index, additional and leftover predicates from the given WHERE AST
// and the index information.
// Thus, it can't compare through many indices - pre-filtering should be done
// before running this function.

export default function extractIndex(index, input) {
  // We need to consider each AST as a diverging branch -
  // We check if there is any indexable entry in the branch.
  // OR should diverge the branch, so other neighbors shouldn't affect other
  // objects, or master. To achieve this, the parent AST must manage index /
  // additional / leftover branch separately.
  // However, if all neighbors can be addressed using indexes, the whole branch
  // should be considered as indexable.
  // AND should merge the branch, so neighbors' 'associated with index' state
  // should be ORed, so their predicates should be stored inside 'additional'.
  // If [a, b, c] is specified, only one last column can act as an index,
  // and all other column in the left should be compared only using equal.
  // e.g. if a, b has 'equal' query, c can perform range scan, however,
  // if b is missing, only a can work.
  // To put this in index extraction, actual index predicate extraction should
  // be performed in post-order, so it can know children's data.
  // The index's columns state should be saved as a list of flags with
  // three values - 'unavailable', 'equal', 'range'.
  // One range predicate should change the whole parent tree's flag to equal
  // since the equal predicate can be also considered as range, but not vice
  // versa.
  // After generating all the information, mainly 'considered' predicates and
  // index flags, we actually separate real index predicates and
  // additional predicates.
  // index predicates shouldn't be too complicated - it should be able to
  // contain all the range required for the index.
  
  // Build the index flags table and the list of indexes.
  let state = {
    tree: null,
    leftover: null,
    flags: index.map(() => 0),
  };

  function traverse(input) {
    if (input.type === 'compare') {
      // Compare against index list
    } else if (input.type === 'logical') {
      let isAnd = input.op === '&&';
      // Traverse to bottom.
      input.values.forEach(v => traverse(v));
    }
  }

  traverse(input);

  return {
    index: null,
    additional: null,
    leftover: null,
  };
}
