import plan from './plan';
import simplify from './simplify';

describe('plan', () => {
  it('should use index for simple queries', () => {
    console.log(plan(simplify({ a: 5, b: 3 }), null, [
      ['a'],
      ['a', 'b'],
    ]));
  });
  it('should use index for or queries', () => {
    console.log(plan(simplify({ $or: [{ a: 5, b: 3 }, { a: 1, b: 7 }] }), null, [
      ['a'],
      ['a', 'b'],
    ]));
  });
  it('should use index for sorting', () => {
    console.log(plan(simplify({ $or: [{ a: 5, b: 3 }, { a: 1, b: 7 }] }), [
      ['c', 1],
    ], [
      ['a'],
      ['a', 'b'],
      ['a', 'b', 'c'],
    ]));
  });
});
