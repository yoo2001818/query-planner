import parse from 'yasqlp';

import simplify from './simplify';

function getAST(query) {
  return parse(query)[0].where;
}

describe('simplify', () => {
  it('should handle a single expression', () => {
    expect(simplify(getAST('SELECT * WHERE a = \'1\';')))
      .toEqual(getAST('SELECT * WHERE a = \'1\';'));
  });
  it('should simplify NOT expression', () => {
    expect(simplify(getAST('SELECT * WHERE NOT(a = \'1\');')))
      .toEqual(getAST('SELECT * WHERE a != \'1\';'));
  });
  it('should simplify OR expression', () => {
    expect(simplify(getAST('SELECT * WHERE a = \'1\' OR a > \'1\';')))
      .toEqual(getAST('SELECT * WHERE a >= \'1\';'));
    expect(simplify(getAST('SELECT * WHERE a < \'1\' OR a > \'1\';')))
      .toEqual(getAST('SELECT * WHERE a != \'1\';'));
    expect(simplify(getAST('SELECT * WHERE a < \'1\' OR a >= \'1\';')))
      .toEqual(getAST('SELECT * WHERE TRUE;'));
  });
  it('should simplify AND expression', () => {
    expect(simplify(getAST('SELECT * WHERE a > 10 AND a > 20;')))
      .toEqual(getAST('SELECT * WHERE a > 20;'));
    expect(simplify(getAST('SELECT * WHERE a >= 10 AND a <= 10;')))
      .toEqual(getAST('SELECT * WHERE a = 10;'));
    expect(simplify(getAST('SELECT * WHERE a > 10 AND a < 10;')))
      .toEqual(getAST('SELECT * WHERE FALSE;'));
  });
  it('should simplify compound NOT expression', () => {
    expect(simplify(getAST('SELECT * WHERE !(a = 1 AND b = 2);')))
      .toEqual(getAST('SELECT * WHERE a != 1 OR b != 2;'));
    expect(simplify(getAST('SELECT * WHERE !(a = 1 OR b = 2);')))
      .toEqual(getAST('SELECT * WHERE a != 1 AND b != 2;'));
  });
  it('should simplify between expression', () => {
    expect(simplify(getAST('SELECT * WHERE a BETWEEN 1 AND 2;')))
      .toEqual(getAST('SELECT * WHERE a <= 1 AND a <= 2;'));
  });
  it('should simplify in expression', () => {
    expect(simplify(getAST('SELECT * WHERE a IN (1, 2, 3);')))
      .toEqual(getAST('SELECT * WHERE a = 1 OR a = 2 OR a = 3;'));
  });
});
