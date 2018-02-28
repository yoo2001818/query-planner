// Accepts a SQL expression and builds a 2D clause table for it.

export default function makeClauseTable(where) {
  const result = generateBitsets(where, []);
  return { iterator: result.bitmap, clauses: result.clauses };
}

function generateBitsets(where, clauses) {
  if (where.type === 'logical') {
    if (where.op === '||') {
      return where.values.reduce(
        ({ bitmap, clauses }, v) => {
          const result = generateBitsets(v, clauses);
          return {
            bitmap: bitmap.concat(result.bitmap),
            clauses: result.clauses,
          };
        }, { bitmap: [], clauses });
    } else if (where.op === '&&') {
      // Perform a cartesian product between values
      return where.values.reduce(({ bitmap, clauses }, v) => {
        const result = generateBitsets(v, clauses);
        if (bitmap.length === 0) return result;
        let outputBitmap = [];
        for (let i = 0; i < bitmap.length; ++i) {
          for (let j = 0; j < result.bitmap.length; ++j) {
            outputBitmap.push(bitmap[i] | result.bitmap[j]);
          }
        }
        return { bitmap: outputBitmap, clauses: result.clauses };
      }, { bitmap: [], clauses });
    }
  }
  return {
    bitmap: [1 << clauses.length],
    clauses: clauses.concat(where),
  };
}
