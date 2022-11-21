const removeAccents = require('./removeAccents');
// @desc check user password
// @desc password valid: 6-10 chars
var checkUserPassword = (password) => {
    var regex = /^[A-Za-z\d]{6,10}$/;
    return regex.test(password);
}

// @desc check phone number
// @desc password valid: 10 digits, begin with '0'
var checkPhoneNumber = (phoneNumber) => {
    var regex = /^0[0-9]{9}$/;
    return regex.test(phoneNumber);
}

const checkNotNegativeInteger = x => {
  let parsed = parseInt(x, 10);
  if (!isNaN(parsed)) {
    if (Number.isInteger(parsed) && parsed >= 0) return true;
    return false;
  }
  return false;
}

const checkIsInteger = x => {
  let parsed = parseInt(x, 10);
  if (isNaN(parsed)) return false;
  if (Number.isInteger(parsed)) return true;
  else return false;
}

// @desc check phone number
// @desc password valid: 10 digits, begin with '0'
var checkVerifyCode = (verifyCode) => {
  var regex = /^[1-9][0-9]{3}$/;
  return regex.test(verifyCode);
}

// check user_name
var checkUserName = (userName) => {
  return new Promise((resolve, reject) => {
    if (userName.length == 0) reject('lỗi xâu rỗng');
    let str = removeAccents(userName);
    var regex = /^[a-zA-Z][a-zA-Z_ ]*$/;
    if (regex.test(str)) resolve(userName);
    else reject('phải bắt đầu là chữ, tiếp theo là chữ hoặc gạch dưới hoặc khoảng trắng')
  })
}

// check link
var checkLink = link => {
  let banLink = ['bilutv.com', 'hayhaytv.com', 'hdviet.com', 'phimmoi.net', 'hdonline.vn', 'phimbathu.com', 'vnhackers.com'];
  let result = banLink.filter(e => link.includes(e));
  if (result.length > 0) return false;
  else return true;
}

// @desc check index, count
// @desc index va count la so va khong chua ki tu dac biet
var checkNumber = (number) => {
  var regex = /^[0-9]*$/;
  return regex.test(number);
}

// checkUserName('thanh _sh9 ')
//   .then(res => console.log(res))
//   .catch(err => console.error(err));
// console.log(checkLink('http://vnhackers.com.com/gg'))
module.exports = { checkUserPassword, checkPhoneNumber, checkNotNegativeInteger, checkIsInteger, checkVerifyCode, checkUserName, checkLink, checkNumber};