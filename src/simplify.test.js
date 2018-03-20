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
    expect(simplify(getAST('SELECT * WHERE !(a = 1 AND !(c = 1 OR d = 1));')))
      .toEqual(getAST('SELECT * WHERE a != 1 OR c = 1 OR d = 1;'));
    expect(simplify(getAST('SELECT * WHERE !(a = 1 AND !(c = 1 AND d = 1));')))
      .toEqual(getAST('SELECT * WHERE (c = 1 AND d = 1) OR a != 1;'));
  });
  it('should simplify between expression', () => {
    expect(simplify(getAST('SELECT * WHERE a BETWEEN 1 AND 2;')))
      .toEqual(getAST('SELECT * WHERE a >= 1 AND a <= 2;'));
  });
  it('should simplify not between expression', () => {
    expect(simplify(getAST('SELECT * WHERE a NOT BETWEEN 1 AND 2;')))
      .toEqual(getAST('SELECT * WHERE a < 1 OR a > 2;'));
  });
  it('should simplify in expression', () => {
    expect(simplify(getAST('SELECT * WHERE a IN (1, 2, 3);')))
      .toEqual(getAST('SELECT * WHERE a = 1 OR a = 2 OR a = 3;'));
  });
  it('should simplify not in expression', () => {
    expect(simplify(getAST('SELECT * WHERE a NOT IN (1, 2, 3);')))
      .toEqual(getAST('SELECT * WHERE a != 1 AND a != 2 AND a != 3;'));
  });
  it('should simplify nested operators', () => {
    expect(simplify(getAST('SELECT * WHERE a AND (b AND c);')))
      .toEqual(getAST('SELECT * WHERE a AND b AND c;'));
    expect(simplify(getAST('SELECT * WHERE a OR (b OR (c AND d));')))
      .toEqual(getAST('SELECT * WHERE a OR b OR (c AND d);'));
  });
  it('should simplify unnecessary operators', () => {
    expect(simplify(getAST('SELECT * WHERE ' +
      '(a > 5 AND b = 1) OR (a > 3 AND b = 1);')))
      .toEqual(getAST('SELECT * WHERE b = 1 AND a > 3;'));
    expect(simplify(getAST('SELECT * WHERE ' +
      '(a > 5 OR b = 1) AND (a > 3 OR b = 1) AND c = 1;')))
      .toEqual(getAST('SELECT * WHERE b = 1 AND a > 3 AND c = 1;'));
    expect(simplify(getAST('SELECT * WHERE ' +
      '(a = 1 OR b = 1) AND (a = 1 OR b = 1);')))
      .toEqual(getAST('SELECT * WHERE a = 1 OR b = 1;'));
  });
});
