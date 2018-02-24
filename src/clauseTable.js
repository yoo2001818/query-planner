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
  let result = [];
  result.push(generateBitsets(where, 0, result));
  console.log(result);
  return { clauses };
}

function generateBitsets(where, current = 0, output = []) {
  if (where.type === 'logical') {
    if (where.op === '||') {
      return where.values.forEach((v) => {
        output.push(generateBitsets(v, current, output));
      });
    } else if (where.op === '&&') {
      return where.values.reduce((p, v) => {
        return generateBitsets(v, p, output);
      }, current);
    }
  }
  return current | where.index;
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
