const timeToSecond = x => Math.floor(x.getTime() / 1000);
// var date = new Date()
// console.log (timeToSecond(date))
const currentMillisecond = () => Date.now();
const currentSecond = () => Math.floor(Date.now() / 1000);
module.exports = { timeToSecond, currentSecond, currentMillisecond }