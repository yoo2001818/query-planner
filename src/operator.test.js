import * as operators from './operator';

// Let's don't test lt/gt, as they're too obvious

describe('range', () => {
  it('should return appropriate results', () => {
    expect(operators.range(0, 100)).toEqual([
      { type: '>', value: 0, equal: false },
      { type: '<', value: 100, equal: false },
    ]);
    expect(operators.range(1, 90, true, false)).toEqual([
      { type: '>', value: 1, equal: true },
      { type: '<', value: 90, equal: false },
    ]);
    expect(operators.range(10, 90, true, true)).toEqual([
      { type: '>', value: 10, equal: true },
      { type: '<', value: 90, equal: true },
    ]);
  });
  it('should invert range if gt and lt are inverted', () => {
    expect(operators.range(100, 0)).toEqual([
      { type: '<', value: 0, equal: true },
      { type: '>', value: 100, equal: true },
    ]);
    expect(operators.range('aa', 1, true, false)).toEqual([
      { type: '<', value: 1, equal: true },
      { type: '>', value: 'aa', equal: false },
    ]);
  });
  it('should return equal or empty if both are equal', () => {
    expect(operators.range(0, 0, false, false)).toEqual([]);
    expect(operators.range(0, 0, true, false)).toEqual([]);
    expect(operators.range(0, 0, true, true)).toEqual([
      { type: '=', value: 0 },
    ]);
  });
});

describe('eq', () => {
  it('should return right value', () => {
    expect(operators.eq([1, 2, 3])).toEqual([
      { type: '=', value: 1 },
      { type: '=', value: 2 },
      { type: '=', value: 3 },
    ]);
  });
  it('should sort values', () => {
    expect(operators.eq([1, 3, 2])).toEqual([
      { type: '=', value: 1 },
      { type: '=', value: 2 },
      { type: '=', value: 3 },
    ]);
  });
  it('should filter same values', () => {
    expect(operators.eq([1, 3, 3, 2])).toEqual([
      { type: '=', value: 1 },
      { type: '=', value: 2 },
      { type: '=', value: 3 },
    ]);
  });
});

describe('neq', () => {
  it('should return right value', () => {
    expect(operators.neq([1, 2, 3])).toEqual([
      { type: '*' },
      { type: '!=', value: 1 },
      { type: '!=', value: 2 },
      { type: '!=', value: 3 },
    ]);
  });
  it('should sort values', () => {
    expect(operators.neq([1, 3, 2])).toEqual([
      { type: '*' },
      { type: '!=', value: 1 },
      { type: '!=', value: 2 },
      { type: '!=', value: 3 },
    ]);
  });
  it('should filter same values', () => {
    expect(operators.neq([1, 3, 3, 2])).toEqual([
      { type: '*' },
      { type: '!=', value: 1 },
      { type: '!=', value: 2 },
      { type: '!=', value: 3 },
    ]);
  });
});

describe('not', () => {
  it('should invert eq/neq', () => {
    expect(operators.not(operators.eq([1, 5, 9])))
      .toEqual(operators.neq([1, 5, 9]));
    expect(operators.not(operators.neq([1, 5, 9])))
      .toEqual(operators.eq([1, 5, 9]));
  });
  it('should invert range', () => {
    expect(operators.not(operators.range(3, 8)))
      .toEqual(operators.range(8, 3));
    expect(operators.not(operators.range(3, 8, true)))
      .toEqual(operators.range(8, 3, false, true));
    expect(operators.not(operators.range(3, 8, false, true)))
      .toEqual(operators.range(8, 3, true, false));
  });
  it('should invert complex querys', () => {
    expect(operators.not([
      { type: '!=', value: 1 },
      { type: '!=', value: 2 },
      { type: '<', value: 3, equal: false },
      { type: '=', value: 4 },
      { type: '>', value: 5, equal: false },
      { type: '!=', value: 6 },
    ])).toEqual([
      { type: '=', value: 1 },
      { type: '=', value: 2 },
      { type: '>', value: 3, equal: true },
      { type: '!=', value: 4 },
      { type: '<', value: 5, equal: true },
      { type: '=', value: 6 },
    ]);
  });
});

// Aka union
describe('or', () => {
  it('should merge eqs', () => {
    expect(operators.or(operators.eq([1, 5]), operators.eq([2, 6])))
      .toEqual(operators.eq([1, 2, 5, 6]));
  });
  it('should merge neqs', () => {
    expect(operators.or(
      operators.neq([1, 5, 6, 9]),
      operators.neq([5, 9, 10])
    )).toEqual(operators.neq([5, 9]));
  });
  it('should merge neqs and eq', () => {
    expect(operators.or(
      operators.neq([1, 2, 3, 5, 10, 20]),
      operators.eq([1, 2, 10, 500])
    )).toEqual(operators.neq([3, 5, 20]));
  });
  it('should merge ranges', () => {
    expect(operators.or(operators.range(0, 9), operators.range(9, 12)))
      .toEqual([
        { type: '>', value: 0, equal: false },
        { type: '!=', value: 9 },
        { type: '<', value: 12, equal: false },
      ]);
    expect(operators.or(operators.range(0, 9), operators.range(9, 12, true)))
      .toEqual(operators.range(0, 12));
    expect(operators.or(operators.range(0, 6), operators.range(3, 12)))
      .toEqual(operators.range(0, 12));
    expect(operators.or(operators.range(0, 3), operators.range(4, 8)))
      .toEqual([
        { type: '>', value: 0, equal: false },
        { type: '<', value: 3, equal: false },
        { type: '>', value: 4, equal: false },
        { type: '<', value: 8, equal: false },
      ]);
    expect(operators.or(operators.range(4, 0), operators.range(8, 4)))
      .toEqual([{ type: '*' }]);
    expect(operators.or(
      operators.range(4, 0, true, true),
      operators.range(8, 4, true, true),
    )).toEqual([{ type: '*' }, { type: '!=', value: 4 }]);
    expect(operators.or(
      operators.range(3, 0, true, true),
      operators.range(1, 2),
    )).toEqual([
      { type: '<', value: 0, equal: false },
      { type: '>', value: 1, equal: false },
      { type: '<', value: 2, equal: false },
      { type: '>', value: 3, equal: false },
    ]);
  });
  it('should merge range and eq', () => {
    expect(operators.or(
      operators.range(3, 9),
      operators.eq([1, 2, 3, 5, 8, 10])
    )).toEqual([
      { type: '=', value: 1 },
      { type: '=', value: 2 },
      { type: '>', value: 3, equal: true },
      { type: '<', value: 9, equal: false },
      { type: '=', value: 10 },
    ]);
    expect(operators.or(
      operators.range(9, 3, true, true),
      operators.eq([1, 2, 3, 5, 8, 10])
    )).toEqual([
      { type: '<', value: 3, equal: true },
      { type: '=', value: 5 },
      { type: '=', value: 8 },
      { type: '>', value: 9, equal: false },
    ]);
  });
  it('should merge range and neq', () => {
    expect(operators.or(
      operators.range(3, 9),
      operators.neq([1, 2, 3, 5, 8, 10])
    )).toEqual([
      { type: '*' },
      { type: '!=', value: 1 },
      { type: '!=', value: 2 },
      { type: '!=', value: 3 },
      { type: '!=', value: 10 },
    ]);
    expect(operators.or(
      operators.range(9, 3, true, true),
      operators.neq([1, 2, 3, 5, 8, 10])
    )).toEqual([
      { type: '*' },
      { type: '!=', value: 3 },
      { type: '!=', value: 5 },
      { type: '!=', value: 8 },
    ]);
  });
});

// Aka intersect
describe('and', () => {
  it('should merge eqs', () => {
    expect(operators.and(operators.eq([1, 2, 5]), operators.eq([2, 5, 6])))
      .toEqual(operators.eq([2, 5]));
  });
  it('should merge neqs', () => {
    expect(operators.and(
      operators.neq([1, 5, 6, 9]),
      operators.neq([5, 9, 10])
    )).toEqual(operators.neq([1, 5, 6, 9, 10]));
  });
  it('should merge neqs and eq', () => {
    expect(operators.and(
      operators.neq([1, 2, 3, 5, 10, 20]),
      operators.eq([1, 2, 10, 500])
    )).toEqual(operators.eq([500]));
  });
  it('should merge ranges', () => {
    expect(operators.and(operators.range(0, 9), operators.range(9, 12)))
      .toEqual([]);
    expect(operators.and(
      operators.range(0, 9, false, true), operators.range(9, 12, true)
    ))
      .toEqual(operators.eq([9]));
    expect(operators.and(operators.range(0, 6), operators.range(3, 12, true)))
      .toEqual(operators.range(3, 6, true));
    expect(operators.and(operators.range(0, 3), operators.range(4, 8)))
      .toEqual([]);
    expect(operators.and(
      operators.range(4, 0),
      operators.range(8, 4),
    )).toEqual([
      { type: '<', value: 0, equal: true },
      { type: '=', value: 4 },
      { type: '>', value: 8, equal: true },
    ]);
    expect(operators.and(
      operators.range(4, 0, true, true),
      operators.range(8, 4, true, true),
    )).toEqual([
      { type: '<', value: 0, equal: false },
      { type: '>', value: 8, equal: false },
    ]);
    expect(operators.and(
      operators.range(3, 0, true, true),
      operators.range(1, 2),
    )).toEqual([]);
  });
  it('should merge range and eq', () => {
    expect(operators.and(
      operators.range(3, 9),
      operators.eq([1, 2, 3, 5, 8, 10]),
    )).toEqual(operators.eq([5, 8]));
    expect(operators.and(
      operators.range(9, 3),
      operators.eq([1, 2, 3, 5, 8, 10])
    )).toEqual(operators.eq([1, 2, 3, 10]));
  });
  it('should merge range and neq', () => {
    expect(operators.and(
      operators.range(3, 9, true),
      operators.neq([1, 2, 3, 5, 8, 10])
    )).toEqual([
      { type: '>', value: 3, equal: false },
      { type: '!=', value: 5 },
      { type: '!=', value: 8 },
      { type: '<', value: 9, equal: false },
    ]);
    expect(operators.and(
      operators.range(9, 3, true, true),
      operators.neq([1, 2, 3, 5, 8, 10])
    )).toEqual([
      { type: '!=', value: 1 },
      { type: '!=', value: 2 },
      { type: '<', value: 3, equal: false },
      { type: '>', value: 9, equal: false },
      { type: '!=', value: 10 },
    ]);
  });
});

// Why do we need this?
// or(except(a, b), except(b, a)) == xor(a, b)
describe('except', () => {

});
