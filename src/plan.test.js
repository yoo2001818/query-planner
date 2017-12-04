import plan from './plan';
import simplify from './simplify';
import util from 'util';

describe('plan', () => {
  it('should use index for simple queries', () => {
    console.log(util.inspect(plan(simplify({ a: 5, b: 3 }), null, [
      ['a', 'b'],
      ['a'],
    ]), false, null));
  });
  it('should use index for simple queries along with sort', () => {
    console.log(util.inspect(plan(simplify({ a: 5, b: 3 }), [['c', 1]], [
      ['a', 'b', 'c'],
      ['a', 'b'],
      ['a'],
    ]), false, null));
  });
  it('should use index for or queries', () => {
    console.log(util.inspect(plan(
      simplify({ $or: [{ a: 5, b: 3 }, { a: 1, b: 7 }] }), null, [
        ['a', 'b'],
        ['a'],
      ]), false, null,
    ));
  });
  it('should use index for sorting', () => {
    console.log(util.inspect(plan(
      simplify({ $or: [{ a: 5, b: 3 }, { a: 1, b: 7 }] }), [
        ['c', 1],
      ], [
        ['a', 'b', 'c'],
        ['a', 'b'],
        ['a'],
      ]), false, null,
    ));
  });
});
