import { inspect } from 'util';
import simplify from './simplify';

describe('simplify', () => {
  it('should parse simple query', () => {
    console.log(inspect(simplify({
      a: 5,
      b: [1, 3],
    }), false, null));
  });
  it('should parse range query', () => {
    console.log(inspect(simplify({
      a: { $gt: 9, $lte: 30 },
      b: { $in: [10, 15] },
    }), false, null));
  });
  it('should parse or query', () => {
    console.log(inspect(simplify({
      a: { $or: [5, 3] },
      b: { $not: { $or: [5, 3] } },
    }), false, null));
  });
  it('should remove redundant block', () => {
    console.log(inspect(simplify({
      $or: [{ b: 19 }, { b: 13 }],
    }), false, null));
  });
  it('should parse or query with multiple keys', () => {
    console.log(inspect(simplify({
      $or: [{ a: 99 }, { b: 13 }],
    }), false, null));
  });
  it('should parse not', () => {
    console.log(inspect(simplify({
      $not: {
        a: { $gt: 9, $lte: 30 },
        b: { $in: [10, 15] },
      },
    }), false, null));
  });
});
