import parse from 'yasqlp';

import extractIndex from './extractIndex';

function getAST(query) {
  return parse(query)[0].where;
}

describe('extractIndex', () => {
  it('should handle a simple expression', () => {
    expect(extractIndex(['a'], getAST('SELECT * WHERE a = \'1\';')))
      .toEqual({
        index: getAST('SELECT * WHERE a = \'1\';'),
        additional: { type: 'boolean', value: true },
        leftover: { type: 'boolean', value: false },
      });
    expect(extractIndex(['a', 'b'],
      getAST('SELECT * WHERE a = \'1\' AND c = 1;')))
      .toEqual({
        index: getAST('SELECT * WHERE a = \'1\';'),
        additional: getAST('SELECT * WHERE c = 1;'),
        leftover: { type: 'boolean', value: false },
      });
    expect(extractIndex(['a', 'b'],
      getAST('SELECT * WHERE a = \'1\' OR b = 1;')))
      .toEqual({
        index: getAST('SELECT * WHERE a = \'1\';'),
        additional: { type: 'boolean', value: true },
        leftover: getAST('SELECT * WHERE c = 1;'),
      });
  });
  it('should keep index order range', () => {
    expect(extractIndex(['a', 'b'],
      getAST('SELECT * WHERE a = 1 AND b = 1;')))
      .toEqual({
        index: getAST('SELECT * WHERE a = 1 AND b = 1;'),
        additional: { type: 'boolean', value: true },
        leftover: { type: 'boolean', value: false },
      });
    expect(extractIndex(['a', 'b'],
      getAST('SELECT * WHERE a > 1 AND b = 1;')))
      .toEqual({
        index: getAST('SELECT * WHERE a > 1;'),
        additional: getAST('SELECT * WHERE b = 1;'),
        leftover: { type: 'boolean', value: false },
      });
    expect(extractIndex(['a', 'b'],
      getAST('SELECT * WHERE a = 1 AND b > 1;')))
      .toEqual({
        index: getAST('SELECT * WHERE a = 1 AND b > 1;'),
        additional: { type: 'boolean', value: true },
        leftover: { type: 'boolean', value: false },
      });
  });
});
