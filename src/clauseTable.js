// Accepts a SQL expression and builds a 2D clause table for it.

export default function makeClauseTable(where) {
  const result = generateBitsets(where);
  return { iterator: result, clauses: result.clauses };
}

function * generateBitsets(where) {
  if (where.type === 'logical') {
    if (where.op === '||') {
      for (let entry of where.values) {
        yield * generateBitsets(entry);
      }
    } else if (where.op === '&&') {
      // Perform a cartesian product between values
      yield * where.values.reduce(function * (p, v) {
        const result = Array.from(generateBitsets(v));
        if (p == null) return yield * result;
        for (let entry of p) {
          for (let j = 0; j < result.bitmap.length; ++j) {
            yield entry | result.bitmap[j];
          }
        }
      }, null);
    }
  } else {
    yield 1 << where.index;
  }
}
