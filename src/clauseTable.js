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
  return { clauses };
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
