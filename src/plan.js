import * as ranges from './range';

export default function plan(tree, sort, indexes, merges) {
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
  // Sometimes mutually exclusivity can be proved using the queries. In that
  // case, the queries can be merged without any cost. This can be done by
  // calculating max possible range of the keys and comparing each other - If
  // both keys exist and there is no intersection at all, it's mutually
  // exclusive. Except arrays.
  if (tree.isAnd) {
    // TODO Merge merges
    // 1. Find and calculate costs for the keys.
    // 2. If suitable index was found, attach filter to it and exit.
    // 3. Find and calculate costs for children.
    // 4. Use the children with lowest cost, attach filter to it and exit.
    let selected = pickIndex(tree.keys, sort, indexes);
    // Calculate costs for children too. AND's children can use parent's
    // conditions to optimize the query, so we should submit it too.
    console.log(selected);
    // Convert the tree to a job - extract lower / upper bound.
    return [
      {
        type: 'index',
        config: {
          index: selected.index,
          jobs: extractJobs(tree.keys, selected.index),
        },
      },
      {
        type: 'filter',
        config: {
          filter: createFilter(tree),
        },
        inputs: [0],
      },
      {
        type: 'out',
        inputs: [1],
      },
    ];
  } else {
    // 1. Find each key's index. If not found, use full scan.
    // 2. Traverse the children by recursively calling query planner. If the
    //    children uses full scan, just use full scan.
    // 3. Merge all the indexes and queries, attach union and exit.
    let plans = [];
    let failed = false;
    for (let key in tree.keys) {
      let filter = mergeFilter({ [key]: tree.keys[key] }, merges);
      // TODO Construct plan
      let { index } = pickIndex(filter, sort, indexes);
      if (index == null) {
        failed = true;
        break;
      }
      plans.push(index);
    }
    for (let i = 0; i < tree.children.length; ++i) {
      
    }
  }
  // Bailout: if no index can be found, run a full scan.
  return [
    {
      type: 'full',
      config: {
        jobs: [{
          range: true,
        }],
      },
    },
    {
      type: 'filter',
      config: {
        filter: createFilter(tree),
      },
      inputs: [0],
    },
    {
      type: 'out',
      inputs: [1],
    },
  ];
}

function mergeFilter(a, b) {
  if (b == null) return a;
  let output = Object.assign({}, a);
  for (let key in b) {
    if (output[key] != null) output[key] = ranges.and(a[key], b[key]);
    else output[key] = b[key];
  }
  return output;
}

function pickIndex(keys, sort, indexes) {
  let bestId = -1;
  let bestScore = 0;
  for (let i = 0; i < indexes.length; ++i) {
    let index = indexes[i];
    let score = scoreIndex(keys, sort, index);
    if (bestScore < score) {
      bestScore = score;
      bestId = i;
    }
  }
  return { index: indexes[bestId], score: bestScore };
}

// Scores the index - returns a number that displays how much the index is
// useful.
function scoreIndex(keys, sort, index) {
  // We have 'directly indexable' columns, 'inferred' columns, and 'sort'
  // columns.
  // Directly indexable columns are determined by the keys. First N keys can
  // only have '=' range operators (or '!='), and a single key after the
  // N keys can have any range operators (N >= 0). These keys can be used to
  // directly load the required rows, hence 'directly indexable' columns.
  // The columns right after that can be 'sort' columns. These columns are used
  // to aid the sorting work.
  // All other miscellaneous columns can be used to filter the rows before
  // loading them from the 'master' table, which can improve the performance
  // slightly.
  // The priority will be judged by count of directly indexable columns,
  // sort columns, and inferred columns.
  //
  // Phase represents the index usablity level.
  // 0: Directly indexable
  // 1: Sort
  // 2: Inferred
  let sortId = 0;
  let score = 0;
  let phase = 0;
  for (let i = 0; i < index.length; ++i) {
    let key = index[i];
    if (phase === 0) {
      if (keys[key] == null) {
        phase = 1;
      } else {
        if (!ranges.isAllEqual(keys[key])) phase = 1;
        score += 10000;
      }
      if (sort != null && sort[sortId] != null && sort[sortId][0] === key) {
        sortId++;
        score += 1000;
      }
      continue;
    } else if (phase === 1) {
      if (sort != null && sort[sortId] != null && sort[sortId][0] === key) {
        sortId++;
        score += 100;
      } else {
        phase = 2;
      }
    }
    if (keys[key] != null) score += 1;
  }
  return score;
}

function createFilter(criteria, wrapOr = true) {
  // Convert provided clause to filter's clause, which is a list of expressions
  // that can easily be compiled to JS function.
  // Or, it can be converted to an interval tree.
  // It must return an array, which is the filter's clause.
  // [ { name: 'a', value: 3 }, [ { name: 'b', value: 1 }, ... ] ].
  // First depth is AND, and second depth is OR, third depth is AND, and so on.
  // Thus, upper example should be a == 3 AND (b == 1 OR ...).
  // value should be a range object, which is already used to construct the
  // query.
  // Filters can construct an interval tree a range's elements count is too
  // high. Otherwise, it'd be better to stick to sequental comparing.
  // Although, the code generation should be done by the user.
  let output = [];
  for (let key in criteria.keys) {
    output.push({ name: key, value: criteria.keys[key] });
  }
  criteria.children.forEach(v => {
    output.push(createFilter(v, false));
  });
  if (!criteria.isAnd && wrapOr) return [output];
  return output;
}

// Traverse and extracts the index boundary.
function extractJobs(keys, index) {
  // This uses the same logic used to score the indices - instead, we create
  // bunch of jobs to scan the whole index.
  // This should use Cartesian product - below query should generate 27 jobs.
  // A IN (1, 2, 3) AND B IN (1, 2, 3) AND C IN (1, 2, 3)
  // a.b.c can be [1,1,1], [1,1,2], [1,1,3], ... [3,3,3].
  // TODO: This shouldn't use cartesian product - it should be able to
  // represent the query using nested loop!!!
}
