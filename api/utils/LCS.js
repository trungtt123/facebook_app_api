module.exports = function LCS(a, b) {
  var m = a.length,
      n = b.length,
      C = [],
      i,
      j;

  for (i = 0; i <= m; i++) C.push([0]);
  for (j = 0; j < n; j++) C[0].push(0);
  for (i = 0; i < m; i++) {
      for (j = 0; j < n; j++) {
          C[i+1][j+1] = a[i] === b[j]
          ? C[i][j]+1
          : Math.max(C[i+1][j], C[i][j+1]);
      }
  }

  let bt = (i, j) =>{ 
      if (i * j === 0) {
          return '';
      }
      if (a[i-1] === b[j-1]) {
          return bt(i-1, j-1) + a[i-1];
      }
      return (C[i][j-1] > C[i-1][j])
              ? bt(i, j-1)
              : bt(i-1, j);
  }
  return bt(m,n);
}
