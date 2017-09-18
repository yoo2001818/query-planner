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
