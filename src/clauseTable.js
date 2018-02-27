// Accepts a SQL expression and builds a 2D clause table for it.

export default function makeClauseTable(where) {
  // Traverse and generate bitset positions - this is used to generate actual
  // bitmap.
  let clauses = [];
  let indexedWhere = traverseClauses(where, where => {
    let self = Object.assign({}, where, { index: clauses.length });
    clauses.push(self);
    return self;
  });
  // Create a generator for where clause - it should generate all possible
  // sets for the clause.
  // It should start by marking all ORs, and running them.
  let bitmap = generateBitsets(indexedWhere);
  console.log(bitmap);
  return { clauses, iterator: bitmap };
}

function generateBitsets(where) {
  if (where.type === 'logical') {
    if (where.op === '||') {
      return where.values.reduce((p, v) => p.concat(generateBitsets(v)), []);
    } else if (where.op === '&&') {
      // Perform a cartesian product between values
      return where.values.reduce((p, v) => {
        const currentResult = generateBitsets(v);
        if (p.length === 0) return currentResult;
        let output = [];
        for (let i = 0; i < p.length; ++i) {
          for (let j = 0; j < currentResult.length; ++j) {
            output.push(p[i] | currentResult[j]);
          }
        }
        return output;
      }, []);
    }
  }
  return [1 << where.index];
}

function traverseClauses(where, callback) {
  console.log(where);
  if (where.type === 'logical') {
    if (where.op === '||' || where.op === '&&') {
      return Object.assign({}, where, {
        values: where.values.map(v => traverseClauses(v, callback)),
      });
    }
  }
  if (where.type === 'unary' && where.op === '!') {
    return Object.assign({}, where, {
      value: traverseClauses(where.value, callback),
    });
  }
  return callback(where);
}
