# Designing a Query planner
Query planner accepts a query and plans how should the database perform the
query. This is really important for implementing RDBMSes.
While the query planner doesn't support SQL yet, and only accepts MongoDB-like
queries, RDBMS join support should be considered.

Sure, query planners are cool, but how are we going to implement them?

## Input data
Query planner should accept the query (obviously), and table information,
index information, and metrics information, which is optional.

The query planner should only consider columns having indexes first, then it
can use additional filters to filter them.

## Output data
The query planner should output a list of 'pipes'. Each pipe accepts input, or
reads the database, and outputs data. Each pipes are connected to other pipe.

Pipe network makes a directed acyclic graph, which can be run on distributed
systems, too.

## Case 1. Single table, only ANDs
This query is really simple: `{ id: 1, title: 'aa', body: 'bb' }`

It just have to pick most better index, then run filters on them.

### Sorting
However, if the result should be sorted, it should check if sorting can be
performed using indexes.

`{ where: { a: 'b' }, order: ['b', 'DESC'] }`

In this query, if there are `[a, b]` index, the whole query can be performed
using the index, scanning from top of `b` from bottom of `b`.

If that's not possible, sorting can be done using sorting algorithm, which
should be avoided, especially if the memory space is not large enough.

### Result
Result like this should be displayed for single table and only ANDs query.
If the whole database is partitioned, it might be possible to parallelize it
between multiple computers, too.

```js
[{
  id: 0,
  type: 'indexScan',
  table: 'a',
  name: 'a',
  lower: true,
  lowerValue: 1,
  lowerEqual: true,
  upperBound: true,
  upperValue: 10,
  upperEqual: true,
  output: [1],
}, {
  id: 1,
  type: 'filter',
  criteria: [
    ['c', '=', 'test'],
  ],
  output: [2],
}, {
  id: 2,
  type: 'sort',
  criteria: [
    ['b', 'desc'],
  ],
  output: [3],
}, {
  id: 3,
  type: 'out',
}]
```

## Case 2. Single table, AND / OR / NOT
Although this query still performs on the single table with single read, since
OR and NOT exists, it becomes significiantly difficult compared to case 1.

`{ where: { $or: [{ a: 1, b: 2 }, { a: 2, b: 1 }] }, order: ['b', 'DESC'] }`

If values in the OR is directly indexable, those values should be merged
together.

i.e. above statement should look up `[[1, 2], [2, 1]]` in `a.b`.

Of course, if the user is using OR, that means the query can be separately
read:

`{ where: { $or: [{ a: { $gt: 1 } }, { b: { $lt: 1 } }] }}`

In the above query, the whole query can be separated to a > 1, and b < 1. The
data can be duplicated in this case, however, merging them is not that
difficult problem.

But, if a range completely contains the other range, that range should be
ignored. (Same for AND, too)

`{ where: { $or: [{ a: { $gt: 1 } }, { a: { $gt: 3 } }] }}`

The above query can be converted to a > 1.
