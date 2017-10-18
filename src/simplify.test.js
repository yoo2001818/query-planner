import * as ranges from './range';
import simplify from './simplify';

describe('simplify', () => {
  it('should parse simple query', () => {
    expect(simplify({
      a: 5,
      b: [1, 3],
    })).toEqual({
      isAnd: true,
      keys: {
        a: ranges.eq([5]),
        b: ranges.eq([1, 3]),
      },
      children: [],
    });
  });
  it('should parse range query', () => {
    expect(simplify({
      a: { $gt: 9, $lte: 30 },
      b: { $in: [10, 15] },
    })).toEqual({
      isAnd: true,
      keys: {
        a: ranges.range(9, 30, false, true),
        b: ranges.eq([10, 15]),
      },
      children: [],
    });
  });
  it('should parse or query', () => {
    expect(simplify({
      a: { $or: [5, 3] },
      b: { $not: { $or: [5, 3] } },
    })).toEqual({
      isAnd: true,
      keys: {
        a: ranges.eq([5, 3]),
        b: ranges.not(ranges.eq([5, 3])),
      },
      children: [],
    });
  });
  it('should remove redundant block', () => {
    expect(simplify({
      $or: [{ b: 19 }, { b: 13 }],
    })).toEqual({
      isAnd: true,
      keys: {
        b: ranges.eq([19, 13]),
      },
      children: [],
    });
  });
  it('should parse or query with multiple keys', () => {
    expect(simplify({
      $or: [{ a: 99 }, { b: 13 }],
    })).toEqual({
      isAnd: false,
      keys: {
        a: ranges.eq([99]),
        b: ranges.eq([13]),
      },
      children: [],
    });
  });
  it('should parse not', () => {
    expect(simplify({
      $not: {
        a: { $gt: 9, $lte: 30 },
        b: { $in: [10, 15] },
      },
    })).toEqual({
      isAnd: false,
      keys: {
        a: ranges.range(30, 9, true, false),
        b: ranges.neq([10, 15]),
      },
      children: [],
    });
  });
  it('should merge redundant same keys', () => {
    expect(simplify({
      $or: [{ a: 1, b: 5 }, { b: 6 }, { b: 7 }, { c: 8 }],
    })).toEqual({
      isAnd: false,
      keys: {
        b: ranges.eq([6, 7]),
        c: ranges.eq([8]),
      },
      children: [{
        isAnd: true,
        keys: {
          a: ranges.eq([1]),
          b: ranges.eq([5]),
        },
        children: [],
      }],
    });
  });
  /*
  it('should merge keys using distributive property', () => {
    console.log(inspect(simplify({
      $or: [{ a: 1, b: 5 }, { a: 1, b: 6 }],
    }), false, null));
  });
  */
});
