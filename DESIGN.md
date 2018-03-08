# Designing a Query planner
Query planner accepts a query and plans how should the database perform the
query. This is really important for implementing RDBMSes.

Sure, query planners are cool, but how are we going to implement them?

This article has heavily referenced
[https://sqlite.org/optoverview.html](SQLite Query Optimizer Overview).

## Input data
Query planner should accept the query (obviously), and table information,
index information, and metrics information, which is optional.

The query planner should only consider columns having indexes first, then it
can use additional filters to filter them.

### SQL
SQL is parsed by `yasqlp`, then its AST is processed directly.

### MongoDB Query Language
MongoDB Query Language should be converted to `yasqlp` compatiable AST, then
it should be processed like SQL.

## Output data
The query planner should output a list of tasks. Each task accepts input, or
reads the database, and output data. Each tasks are connected to other task.

Task network makes a directed acyclic graph, which can be run on distributed
systems, too, if order doesn't matter.

### Task types
Task can be one of these types:

- Scan
  - Full scan
  - Index scan
  - Bitmap scan
  - Constant value
- Filter
- Sort
- Limit
- Join
  - Merge join
  - Hash join
  - Nested loop join
- Union

#### Scan
Scan task reads and process jobs from input, or provides constant value.

It can contain clause information related to the index, which is used to scan
the table. However, anything unrelated is strictly not allowed.

The query planner should be responsible for clause information generation -
it should generate appropriate 2D bitset for the index.

Index scan should be provided a single index, and a direction for scanning.

Bitmap scan should be provided a main index, list of indexes, and direction
for main index.

Full scan can be specified with a direction, but this is pretty meaningless.

#### Filter
Filter task filters the rows, and outputs them right away.

#### Sort
Sort task sorts the rows. If limit is not specified, it'll perform a quicksort.
But if limit is specified, it'll perform quickselect for better performance.

#### Limit
Limit task limits / offsets the rows.

#### Join
Join task accepts two inputs - the first one is main, and second one is
'smaller' one - and joins them. Clause information must be
provided.

Query planner should select which index to use, and those indexes will be
used for joining.

Hash join may take a while to initialize while generating hashmap - but it
can be cacheable - the execution engine should utilize this.

#### Union
There is two types of union - union all and union. Both outputs rows in
desired order, but union checkes for conflicts using a hashmap.

## Parallel processing
If the database uses distributed parallel computing (That is, queries are
processed using many computers, not to just improve redundancy), it might be
good idea to randomly partition the data and store them on separate buckets.

That way, the computers only have to process the rows they know -
A 'hypervisor' can merge them right away.

## Single table querying

### Simplification
We need to use extensive boolean algebra in order to generate simplified query.
#### Removing NOT
NOT can be elliminated by switching OR/AND with each other and inverting the
predicates.

`NOT(A OR B) = !A AND !B`
#### Removing IN
Since IN can be generalized from `x IN (1, 2, 3, 4)` to list of ORs,
thus it should be generalized.

#### Removing BETWEEN
BETWEEN can be generalized too, from `x BETWEEN 5 AND 10` to
`x >= 5 AND x <= 10`.

#### Removing CASE
CASE can be generalized too, albeit being slightly weird.

`CASE WHEN x = 1 THEN y WHEN x = 2 THEN z ELSE 3 END` can be converted to
`(x = 1 AND y) OR (NOT(x = 1) AND x = 2 AND z) OR (NOT(...) AND NOT(...) AND 3)`
Yes, it's weird but it works!

#### Combining nested operators
If same operators are nested, they should be unwinded to simplify the query.

`a AND (b AND c)` should be converted to `a AND b AND c`.

#### Removing implied / unnecessary operators
By embracing boolean algebras, and rules of replacement,
these can be simplfied as well:

- `a > 3 AND a > 5` can be converted to `a > 5`.
- `a > 3 OR a > 5` can be converted to `a > 3`.
- `(a > 5 AND b = 1) OR (a > 3 AND b = 1)` can be converted to
  `b = 1 AND (a > 3 OR a > 5)`... which can be converted to
  `b = 1 AND a > 3`.
- `(a > 5 OR b = 1) AND (a > 3 OR b = 1) AND c = 1` should be converted to...
  `(b = 1 AND a > 3) AND c = 1` 
- `(a = 1 OR b = 1) AND (a = 1 OR b = 1)` should be merged to one.

##### Algorithm
Surely this is the most important logic of query simplification; yet this is
quite complicated.

1. Elimination by distributive property - `(a AND b) OR (a AND c)` should be
   `a AND (b OR c)`.
   This should be implemented using hash code - a should be converted to
   a string, and it should be compared with other nodes.
   Finding the same node should be one level deep - it won't matter if
   other nodes exist in other level.
2. Removing implied / same operators - `a > 3 AND a > 5` should be `a > 5`.
   This requires a simple comparison code - we simply remove one that isn't
   necessary.
3. Expanding nested operators - 
   `(a AND (b OR c)) OR (b AND c)` can be expanded to
   `(b AND a) OR (c AND a) OR (b AND C)`.
   It should be carefully tested since it might not have an actual benefit yet
   it performs a Cartesian product which is prohibitively expensive.

### Index selection
After simplifying the predicates, the indexes should be selected using
their histograms / expected number of rows, etc.

Basically, we separate what can be selected from the clauses first - then
estimate the result size of each index, if that index can be used against
the query.

However, only one index can be not enough, if OR is used so other criterias have
to be scanned too. We can use UNION, or bitmap scan in that case.

- `a = 1 OR a = 2` is enough to be scanned by one index.
- `a = 1 AND b = 1` too.
- `a = 1 OR b = 1` can't be scanned by one index - we use bitmap scan.

Since bitmap scan can use multiple indexes at the same time, it should be
preferred if both indexes are expected to return many rows.

Bitmap index can be used for AND, and ORs. Since all NOTs are removed in
previous stage, it can be used for both queries.

However, it should be noted that bitmap scan AND is quite useless -
an index with smaller expected rows should be used, then other criterias
should be compared with it.

Bitmap scan OR, on the other hand, is quite useful - it can efficiently merge
two criterias without too much overhead - O(n+m).

#### Extracting columns to load by index
In order to get estimated output for index, we have to actually create
clauses to load indices.

Suppose there is an index with column order `a b c d` - `a`, `b`, `c` can be
used only for EQUAL - `d` can be used for range queries. Note that lower
columns, i.e. `d` can be used only if all `a`, `b`, `c` column is present
in the clause.

Keeping this in mind, we extract a list of predicates from the where clause.
While selected clauses are used to load indices, however, there might be
'leftover' clauses that needs additional filtering, or 'unresolvable' clauses
that is not possible to load with the index.

If all indices have 'unresolvable' clauses, the query planner should use
bitmap OR - or it should use full scan.

- `a = 1 AND d > 3 AND d < 5` can be converted to `a: 1, d: >3 <5`.
- `d > 3 OR d < 5`.... should be eliminated by simplication, so it's not valid.
- `b > 5 OR (c = 1 AND d = 2)` can be converted to `b: >5` OR `c: 1, d: 2` -
  It cannot be satisfied by one index. Thus it should use bitmap OR.

#### Sorting
Since all indexes are evaluated, we can automatically? detect the index
that doesn't require sorting - if bottom index isn't sorted, we perform a
filesort.

## Joining
When joining, cost for fetching each edge, and each table should be calculated
and the cost data should be used to calculate final path.

But how do we calculate the cost of the join, and perform them?

We select common columns specified in the clauses, and compare them.

Each join's cost is calculated by the size of index, whether if an index is
available, etc. It can also use histograms to approximate cost.

Judging by the index, sort-merge, hash, nested join will be used.

Sort-merge can be used if it doesn't require sorting in other types, and
filtering isn't really necessary.

Hash join should be used if a whole table can stored in RAM.

Nested join is slowest - thus it should be avoided.

### Sort-Merge Join
Usually sort-merge join has terrible performance, since the indexes has to be
sorted. But if two indexes are sorted, it's the quickest way to join the table.

### Hash Join
Hash join can be used for general purpose (at least in ORM relations),
and it's relatively fast if one side of table can be stored in the RAM.

### Nested Join
Nested join is slow, but it can handle all cases.

## Subqueries
Subqueries can be considered as a special type of join.

If subquery is inside SELECT clause, it can be considered as a regular join.
Otherwise, it can be joined, then removed right away - a 'temporary' column
can be made.

## Aggregation
Aggregation should be done in last level - since everything has to be read,
sorting / limiting is not applicable, but it can be sorted to group by columns,
which is really helpful - it should try to sort the columns without explicit
sorting first. Then, it should use hash join for aggregation.

Aggregation can be various, however, nothing changes the fact that every
row has to be scanned.

## Sorting
Sorting should be avoided for many cases since it makes a query really slow.

It should use quicksort for primary sorting method.

## Limiting
If sorting is required and limit is specified, we can use quick select
algorithm to limit the searching. However, this is not possible if bitmap scan
is required.
