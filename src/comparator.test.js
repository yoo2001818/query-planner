import { compare, boundary } from './comparator';

function assertGreater(a, b) {
  expect(compare(a, b)).toBe(-1);
  expect(compare(b, a)).toBe(1);
}

describe('compare', () => {
  it('should compare numbers', () => {
    assertGreater(1, 2);
    assertGreater(-1001, 1000);
  });
  it('should compare Infinity with numbers', () => {
    assertGreater(-Infinity, 100);
    assertGreater(100, Infinity);
  });
  it('should compare strings lexicographically', () => {
    assertGreater('abc', 'ade');
    assertGreater('universal', 'university');
  });
  it('should treat strings greater than numbers', () => {
    assertGreater(5353, '1212');
    assertGreater(1212, '1212');
    assertGreater(Infinity, 'gorani');
  });
  it('should treat null 2nd smallest', () => {
    assertGreater(null, -Infinity);
    assertGreater(null, NaN);
    assertGreater(NaN, -Infinity);
  });
  it('should treat undefined smallest', () => {
    assertGreater(undefined, -Infinity);
    assertGreater(undefined, NaN);
    assertGreater(undefined, null);
  });
  it('should compare boundaries', () => {
    assertGreater(56, boundary('number', true));
    assertGreater(boundary('number', false), -Infinity);
    assertGreater(99, boundary('number', true));
    assertGreater(boundary('string', false), 'aa');
    assertGreater(boundary('number', true), 'bb');
  });
});
