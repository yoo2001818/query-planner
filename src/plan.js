export default function plan(tree, sort, indexes) {
  // Traverse the tree in in-order.
  //
  // In case of AND, the keys act as constraint - that is, all the children can
  // be evaluated then keys can be checked. Or it can be done other way.
  // Since AND doesn't require anything else outside the requested query,
  // we just have to pick the best index that minimizes the cost of fetching
  // the rows.
  // Since AND's children can't be AND, all the children would be OR.
  // We can pick the best index that minimizes the cost of query. If all values
  // are not plausible, we can fall back to OR union.
  // i.e. (A = 1 OR B = 2) AND C = 3. If C index doesn't exist, the planner can
  // choose to fetch A = 1 OR B = 2 from A, B index and run union on them.
  // If all query subsets don't have an index, full scan will be issued.
  //
  // In case of OR, we have run union on all the queries. We can employ some
  // kind of dynamic programming - If two queries have same signature, we can
  // use same input and add a filter.
  if (tree.isAnd) {
    // 1. Find and calculate costs for the keys.
    // 2. If suitable index was found, attach filter to it and exit.
    // 3. Find and calculate costs for children.
    // 4. Use the children with lowest cost, attach filter to it and exit.
  } else {
    // 1. Find each key's index. If not found, use full scan.
    // 2. Traverse the children by recursively calling query planner. If the
    //    children uses full scan, just use full scan.
    // 3. Merge all the indexes and queries, attach union and exit.
  }
}
