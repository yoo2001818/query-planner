# Designing a Query planner
Query planner accepts a query and plans how should the database perform the
query. This is really important for implementing RDBMSes.
While the query planner doesn't support SQL yet, and only accepts MongoDB-like
queries, RDBMS join support should be considered.

Sure, query planners are cool, but how are we going to implement them?

This article has heavily referenced
[https://sqlite.org/optoverview.html](SQLite Query Optimizer Overview).

## Input data
Query planner should accept the query (obviously), and table information,
index information, and metrics information, which is optional.

The query planner should only consider columns having indexes first, then it
can use additional filters to filter them.

### MongoDB Query Language
Query planner should support MongoDB query language as first-class.

### SQL
SQL should be supported, but it should be converted to some kind of
intermediate language - any kind of SQL AST would suffice.

## Output data
The query planner should output a list of 'pipes'. Each pipe accepts input, or
reads the database, and outputs data. Each pipes are connected to other pipe.

Pipe network makes a directed acyclic graph, which can be run on distributed
systems, too.

### Pipe types
Pipes have three kinds of types: input, process, output.

#### Input
Input pipe reads and process jobs from input, or provided constant value,
simultaneously if possible.

Each job can be a range, or a list of IDs, and can have a 'reverse' flag to
reverse the results. A pipe runs inserted jobs simultaneously, which means that
it returns jobs at random order, but each job will be correctly ordered.

Each job can have additional props too - it can be used while doing table join,
etc.

`full` returns full document values, and `index` only returns partital documents
reconstructed from tuples.
So, in order to load the full document from the index, two inputs must be used.

- full - Accepts a list of operators.
- index - Accepts a list of operators.

#### Process
- filter
- sort
- union
- map

#### Output
- out

## Parallel processing
If the database uses distributed parallel computing (That is, queries are
processed using many computers, not to just improve redundancy), it might be
good idea to randomly partition the data and store them on separate buckets.

That way, the computers only have to process the rows they know -
A 'hypervisor' can merge them right away.

## Case 1. Single table, only ANDs
This query is really simple: `{ id: 1, title: 'aa', body: 'bb' }`

It just have to pick most better index, then run filters on them.

### Index selection
In order to utilize the index, certain criterias have to be met.

Suppose that there's an index storing `[a, b, c]`:

- Last variable in the query, which is c if c is specified, b if b is
  specified, ...  can utilize all query type, It can use eq, lt, gt,
  neq, ... everything!
  - If eq is used, it'll just fetch required values.
  - If lt, gt is used, range query will be used.
  - If everything else, including neq is used, full scan will occur. i.e.
    `[a, b, -Infinity]` - `[a, b, Infinity]` will be scanned.
- Other than that, only eq can be used. If eq has multiple values, it'll fetch
  multiple values at once.
- In order to utilize the index, variable 1 to N-1 must be occupied with eq.
  - if only a is specified, the index can be used.
  - if a and b is specified, the index can be used.
  - if only b is specified, the index can't be used.
  - if only c is specified, the index can't be used.
  - if a and c is specified, the index can't be used.

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
  type: 'index',
  table: 'a',
  name: 'a',
  jobs: [{
    range: true,
    lower: true,
    lowerValue: 1,
    lowerEqual: true,
    upperBound: true,
    upperValue: 10,
    upperEqual: true,
  }],
  output: [1],
}, {
  id: 1,
  type: 'full',
  table: 'a',
}, {
  id: 2,
  type: 'filter',
  criteria: [
    ['c', '=', 'test'],
  ],
  output: [3],
}, {
  id: 3,
  type: 'sort',
  criteria: [
    ['b', 'desc'],
  ],
  output: [4],
}, {
  id: 4,
  type: 'out',
}]
```

### Output in index
The query planner doesn't really consider using only indexes to create output,
but, if the indexes covers all the output the query needs, the query doesn't
even have to access the main table.

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

What if non-indexable values are provided?

`{ where: { $or: [{ a: { $gt: 1, $lt: 5 }, c: 9 }, { a: { $gt: 10 }, c: 8 }] }}`

- If `a` is indexed, 1 < a < 5, and a > 10 can be fetched and checked against
  c.
- If `c` is indexed, c = [8, 9] can be fetched and checked against a.
- If `a.c` is indexed, ... it'd be same as a.
- If `c.a` is indexed, [[9, 1 < a < 5], [8, 10 < a]] can be fetched.
- If nothing is indexed, do full scan as it'd cost O(n).

When processing the query, Only values with indexes should be taken into
account - other values should be ignored while selecting the input.

Implementing NOT is trivial - we can convert NOT (A OR B) into NOT A AND NOT
B quite easily.

### Sorting
Obviously indexes can be used to sort the array, however, there is multiple way
of sorting the array.

- Merge sort. O(n), just sort the array coming from the multiple inputs.
- Quick sort (filesort). O(n^2), though n log n in most cases. Sort everything.

Merge sort can be performed if one row of each input has been provided, and
quick sort can be performed if every input has been processed.

Obviously, quick sort can suffer from memory issues, so it should be avoided,
especially in frontend web environment as it can't use HDDs to sort.

```js
{
  where: { $or: [{ a: { $gt: 1, $lt: 5 }, c: 9 }, { a: { $gt: 10 }, c: 8 }] },
  order: [['a', 'asc']],
}
```

- If `a` is indexed, 1 < a < 5, and a > 10 can be fetched and checked against
  c, then directly outputted without sorting. We just have to process them
  sequentially.
- If `c` is indexed, c = [8, 9] can be fetched and checked against a.
- If `a.c` is indexed, ... it'd be same as a.
- If `c.a` is indexed, [[9, 1 < a < 5], [8, 10 < a]] can be fetched.

## Case 3. Single table, subquery in where clause
If the query includes a subquery that doesn't reference upper variables, the
query planner can simply get the results of subquery and pass it to the upper
query.

However, this is not expressable using JSON based query - SQL would be much
better.

```sql
SELECT * FROM a WHERE id IN (
  SELECT id FROM a WHERE a > 5
);
```
