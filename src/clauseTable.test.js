import parse from 'yasqlp';
import makeClauseTable from './clauseTable';

function clauseFromSQL(query) {
  return makeClauseTable(parse(query)[0].where);
}

function getArrayResult(query) {
  let result = clauseFromSQL(query);
  return { clauses: result.clauses, bitmap: Array.from(result.iterator || []) };
}

describe('makeClauseTable', () => {
  it('should handle a single expression', () => {
    expect(getArrayResult('SELECT * WHERE a = \'1\';')).toEqual({
      clauses: [{
        type: 'compare',
        op: '=',
        left: { type: 'column', table: null, name: 'a' },
        right: { type: 'string', value: '1' },
      }],
      bitmap: [1],
    });
  });
  it('should handle a AND expression', () => {
    expect(getArrayResult('SELECT * WHERE a = \'1\' AND b = 3;')).toEqual({
      clauses: [{
        type: 'compare',
        op: '=',
        left: { type: 'column', table: null, name: 'a' },
        right: { type: 'string', value: '1' },
      }, {
        type: 'compare',
        op: '=',
        left: { type: 'column', table: null, name: 'b' },
        right: { type: 'number', value: 3 },
      }],
      bitmap: [3],
    });
  });
  it('should handle a OR expression', () => {
    expect(getArrayResult('SELECT * WHERE a = \'1\' OR b = 3;')).toEqual({
      clauses: [{
        type: 'compare',
        op: '=',
        left: { type: 'column', table: null, name: 'a' },
        right: { type: 'string', value: '1' },
      }, {
        type: 'compare',
        op: '=',
        left: { type: 'column', table: null, name: 'b' },
        right: { type: 'number', value: 3 },
      }],
      bitmap: [1, 2],
    });
  });
  it('should handle compound expression', () => {
    expect(getArrayResult('SELECT * WHERE (a = \'1\' OR b = 3) AND ' +
      '(a = \'2\' OR b = 4);')
    ).toEqual({
      clauses: [{
        type: 'compare',
        op: '=',
        left: { type: 'column', table: null, name: 'a' },
        right: { type: 'string', value: '1' },
      }, {
        type: 'compare',
        op: '=',
        left: { type: 'column', table: null, name: 'b' },
        right: { type: 'number', value: 3 },
      }, {
        type: 'compare',
        op: '=',
        left: { type: 'column', table: null, name: 'a' },
        right: { type: 'string', value: '2' },
      }, {
        type: 'compare',
        op: '=',
        left: { type: 'column', table: null, name: 'b' },
        right: { type: 'number', value: 4 },
      }],
      bitmap: [1 | 4, 1 | 8, 2 | 4, 2 | 8],
    });
  });
});
