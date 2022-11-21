
/* Data test
let data = {
  1: true,
  2: {
    1: 'gg',
    2: Date.now()
  },
  x: null,
  y: undefined
}
*/
function toString(o) {
  Object.keys(o).forEach(k => {

      if (o[k] && typeof o[k] === 'object') {
        return toString(o[k]);
      }
      if (o[k] != undefined && o[k] != null)
        o[k] = '' + o[k];
  });
  
  return o;
}

var convertString = (data) => {
  return toString(data)
}
// console.log(convertString(data))
module.exports = convertString;