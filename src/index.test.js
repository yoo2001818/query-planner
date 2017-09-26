import queryPlanner from './index';

describe('queryPlanner', () => {
  const indices = [
    { name: 0, keys: ['a', 'b'] },
    { name: 1, keys: ['b', 'a'] },
  ];
  it('should work for simple queries', () => {
    expect(queryPlanner({ a: 5 }, indices)).toEqual([
      {
        id: 0,
        type: 'indexScan',
        name: 0,
        lowerBound: true,
        lowerValue: [5],
        lowerEqual: true,
        upperBound: true,
        upperValue: [5],
        upperEqual: true,
        outputs: [1],
      },
      {
        id: 1,
        type: 'out',
      },
    ]);
  });
});
