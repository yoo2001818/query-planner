// Simplifies, or rather, serializes the Mongo-DB style query to a node
// composed of operator type, queries, and children nodes.
//
// Since the database is not supposed to handle nested objects, i.e. pos.x,
// it should change these formats into a single key separated by .: 'pos.x'.
//
const obj = {
  type: 'and',
  keys: {
    a: [1, 2, 3],
    b: [4, 5, 6],
  },
  children: [

  ],
};
