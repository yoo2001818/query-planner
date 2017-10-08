import * as ranges from './range';

// Let's don't test lt/gt, as they're too obvious

describe('range', () => {
  it('should return appropriate results', () => {
    expect(ranges.range(0, 100)).toEqual([
      { type: '>', value: 0, equal: false },
      { type: '<', value: 100, equal: false },
    ]);
    expect(ranges.range(1, 90, true, false)).toEqual([
      { type: '>', value: 1, equal: true },
      { type: '<', value: 90, equal: false },
    ]);
    expect(ranges.range(10, 90, true, true)).toEqual([
      { type: '>', value: 10, equal: true },
      { type: '<', value: 90, equal: true },
    ]);
  });
  it('should invert range if gt and lt are inverted', () => {
    expect(ranges.range(100, 0)).toEqual([
      { type: '<', value: 0, equal: true },
      { type: '>', value: 100, equal: true },
    ]);
    expect(ranges.range('aa', 1, true, false)).toEqual([
      { type: '<', value: 1, equal: true },
      { type: '>', value: 'aa', equal: false },
    ]);
  });
  it('should return equal or empty if both are equal', () => {
    expect(ranges.range(0, 0, false, false)).toEqual([]);
    expect(ranges.range(0, 0, true, false)).toEqual([]);
    expect(ranges.range(0, 0, true, true)).toEqual([
      { type: '=', value: 0 },
    ]);
  });
});

describe('eq', () => {
  it('should return right value', () => {
    expect(ranges.eq([1, 2, 3])).toEqual([
      { type: '=', value: 1 },
      { type: '=', value: 2 },
      { type: '=', value: 3 },
    ]);
  });
  it('should sort values', () => {
    expect(ranges.eq([1, 3, 2])).toEqual([
      { type: '=', value: 1 },
      { type: '=', value: 2 },
      { type: '=', value: 3 },
    ]);
  });
  it('should filter same values', () => {
    expect(ranges.eq([1, 3, 3, 2])).toEqual([
      { type: '=', value: 1 },
      { type: '=', value: 2 },
      { type: '=', value: 3 },
    ]);
  });
});

describe('neq', () => {
  it('should return right value', () => {
    expect(ranges.neq([1, 2, 3])).toEqual([
      { type: '*' },
      { type: '!=', value: 1 },
      { type: '!=', value: 2 },
      { type: '!=', value: 3 },
    ]);
  });
  it('should sort values', () => {
    expect(ranges.neq([1, 3, 2])).toEqual([
      { type: '*' },
      { type: '!=', value: 1 },
      { type: '!=', value: 2 },
      { type: '!=', value: 3 },
    ]);
  });
  it('should filter same values', () => {
    expect(ranges.neq([1, 3, 3, 2])).toEqual([
      { type: '*' },
      { type: '!=', value: 1 },
      { type: '!=', value: 2 },
      { type: '!=', value: 3 },
    ]);
  });
});

describe('not', () => {
  it('should invert eq/neq', () => {
    expect(ranges.not(ranges.eq([1, 5, 9])))
      .toEqual(ranges.neq([1, 5, 9]));
    expect(ranges.not(ranges.neq([1, 5, 9])))
      .toEqual(ranges.eq([1, 5, 9]));
  });
  it('should invert range', () => {
    expect(ranges.not(ranges.range(3, 8)))
      .toEqual(ranges.range(8, 3));
    expect(ranges.not(ranges.range(3, 8, true)))
      .toEqual(ranges.range(8, 3, false, true));
    expect(ranges.not(ranges.range(3, 8, false, true)))
      .toEqual(ranges.range(8, 3, true, false));
  });
  it('should invert complex querys', () => {
    expect(ranges.not([
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
    expect(ranges.or(ranges.eq([1, 5]), ranges.eq([2, 6])))
      .toEqual(ranges.eq([1, 2, 5, 6]));
  });
  it('should merge neqs', () => {
    expect(ranges.or(
      ranges.neq([1, 5, 6, 9]),
      ranges.neq([5, 9, 10])
    )).toEqual(ranges.neq([5, 9]));
  });
  it('should merge neqs and eq', () => {
    expect(ranges.or(
      ranges.neq([1, 2, 3, 5, 10, 20]),
      ranges.eq([1, 2, 10, 500])
    )).toEqual(ranges.neq([3, 5, 20]));
  });
  it('should merge ranges', () => {
    expect(ranges.or(ranges.range(0, 9), ranges.range(9, 12)))
      .toEqual([
        { type: '>', value: 0, equal: false },
        { type: '!=', value: 9 },
        { type: '<', value: 12, equal: false },
      ]);
    expect(ranges.or(ranges.range(0, 9), ranges.range(9, 12, true)))
      .toEqual(ranges.range(0, 12));
    expect(ranges.or(ranges.range(0, 6), ranges.range(3, 12)))
      .toEqual(ranges.range(0, 12));
    expect(ranges.or(ranges.range(0, 3), ranges.range(4, 8)))
      .toEqual([
        { type: '>', value: 0, equal: false },
        { type: '<', value: 3, equal: false },
        { type: '>', value: 4, equal: false },
        { type: '<', value: 8, equal: false },
      ]);
    expect(ranges.or(ranges.range(4, 0), ranges.range(8, 4)))
      .toEqual([{ type: '*' }]);
    expect(ranges.or(
      ranges.range(4, 0, true, true),
      ranges.range(8, 4, true, true),
    )).toEqual([{ type: '*' }, { type: '!=', value: 4 }]);
    expect(ranges.or(
      ranges.range(3, 0, true, true),
      ranges.range(1, 2),
    )).toEqual([
      { type: '<', value: 0, equal: false },
      { type: '>', value: 1, equal: false },
      { type: '<', value: 2, equal: false },
      { type: '>', value: 3, equal: false },
    ]);
  });
  it('should merge range and eq', () => {
    expect(ranges.or(
      ranges.range(3, 9),
      ranges.eq([1, 2, 3, 5, 8, 10])
    )).toEqual([
      { type: '=', value: 1 },
      { type: '=', value: 2 },
      { type: '>', value: 3, equal: true },
      { type: '<', value: 9, equal: false },
      { type: '=', value: 10 },
    ]);
    expect(ranges.or(
      ranges.range(9, 3, true, true),
      ranges.eq([1, 2, 3, 5, 8, 10])
    )).toEqual([
      { type: '<', value: 3, equal: true },
      { type: '=', value: 5 },
      { type: '=', value: 8 },
      { type: '>', value: 9, equal: false },
    ]);
  });
  it('should merge range and neq', () => {
    expect(ranges.or(
      ranges.range(3, 9),
      ranges.neq([1, 2, 3, 5, 8, 10])
    )).toEqual([
      { type: '*' },
      { type: '!=', value: 1 },
      { type: '!=', value: 2 },
      { type: '!=', value: 3 },
      { type: '!=', value: 10 },
    ]);
    expect(ranges.or(
      ranges.range(9, 3, true, true),
      ranges.neq([1, 2, 3, 5, 8, 10])
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
    expect(ranges.and(ranges.eq([1, 2, 5]), ranges.eq([2, 5, 6])))
      .toEqual(ranges.eq([2, 5]));
  });
  it('should merge neqs', () => {
    expect(ranges.and(
      ranges.neq([1, 5, 6, 9]),
      ranges.neq([5, 9, 10])
    )).toEqual(ranges.neq([1, 5, 6, 9, 10]));
  });
  it('should merge neqs and eq', () => {
    expect(ranges.and(
      ranges.neq([1, 2, 3, 5, 10, 20]),
      ranges.eq([1, 2, 10, 500])
    )).toEqual(ranges.eq([500]));
  });
  it('should merge ranges', () => {
    expect(ranges.and(ranges.range(0, 9), ranges.range(9, 12)))
      .toEqual([]);
    expect(ranges.and(
      ranges.range(0, 9, false, true), ranges.range(9, 12, true)
    ))
      .toEqual(ranges.eq([9]));
    expect(ranges.and(ranges.range(0, 6), ranges.range(3, 12, true)))
      .toEqual(ranges.range(3, 6, true));
    expect(ranges.and(ranges.range(0, 3), ranges.range(4, 8)))
      .toEqual([]);
    expect(ranges.and(
      ranges.range(4, 0),
      ranges.range(8, 4),
    )).toEqual([
      { type: '<', value: 0, equal: true },
      { type: '=', value: 4 },
      { type: '>', value: 8, equal: true },
    ]);
    expect(ranges.and(
      ranges.range(4, 0, true, true),
      ranges.range(8, 4, true, true),
    )).toEqual([
      { type: '<', value: 0, equal: false },
      { type: '>', value: 8, equal: false },
    ]);
    expect(ranges.and(
      ranges.range(3, 0, true, true),
      ranges.range(1, 2),
    )).toEqual([]);
  });
  it('should merge range and eq', () => {
    expect(ranges.and(
      ranges.range(3, 9),
      ranges.eq([1, 2, 3, 5, 8, 10]),
    )).toEqual(ranges.eq([5, 8]));
    expect(ranges.and(
      ranges.range(9, 3),
      ranges.eq([1, 2, 3, 5, 8, 10])
    )).toEqual(ranges.eq([1, 2, 3, 10]));
  });
  it('should merge range and neq', () => {
    expect(ranges.and(
      ranges.range(3, 9, true),
      ranges.neq([1, 2, 3, 5, 8, 10])
    )).toEqual([
      { type: '>', value: 3, equal: false },
      { type: '!=', value: 5 },
      { type: '!=', value: 8 },
      { type: '<', value: 9, equal: false },
    ]);
    expect(ranges.and(
      ranges.range(9, 3, true, true),
      ranges.neq([1, 2, 3, 5, 8, 10])
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
