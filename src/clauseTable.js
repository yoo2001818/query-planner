// Accepts a SQL expression and builds a 2D clause table for it.

export default function makeClauseTable(where) {
  let clauses = [];
  let indexedWhere = traverseClauses(where, where => {
    let self = Object.assign({}, where, { index: clauses.length });
    clauses.push(self);
    return self;
  });

  const result = generateBitsets(indexedWhere);
  return { iterator: result, clauses: clauses };
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
          for (let j = 0; j < result.length; ++j) {
            yield entry | result[j];
          }
        }
      }, null);
    }
  } else {
    yield 1 << where.index;
  }
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
