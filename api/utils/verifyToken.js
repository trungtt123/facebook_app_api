const jwt = require('jsonwebtoken');
const User = require('../models/User');
var {responseError, setAndSendResponse, callRes} = require('../response/error');

module.exports = function (req, res, next) {
    const token = req.query.token || req.body.token;
    if(token !== 0 && !token) {
        console.log("PARAMETER_IS_NOT_ENOUGH");
        return setAndSendResponse(res, responseError.PARAMETER_IS_NOT_ENOUGH);
    }
    if(token && typeof token !== "string") {
        console.log("PARAMETER_TYPE_IS_INVALID");
        return setAndSendResponse(res, responseError.PARAMETER_TYPE_IS_INVALID);
    }

    try {
        const verified = jwt.verify(token, process.env.jwtSecret);
        User.findById(verified.id, (err, user) => {
            if (err) return callRes(res, responseError.NO_DATA_OR_END_OF_LIST_DATA, 'no-user');
            if(!user) return callRes(res, responseError.USER_IS_NOT_VALIDATED, 'user da bi xoa khoi csdl');
            // console.log(user);
            if (user.isBlocked == true)
              return callRes(res, responseError.NOT_ACCESS);
            if (user.dateLogin) {
                var date = new Date(verified.dateLogin);
                if (user.dateLogin.getTime() == date.getTime()) {
                    req.user = verified;
                    next();
                } else {
                    return callRes(res, responseError.TOKEN_IS_INVALID,'user has log out');
                }
            } else {
              return callRes(res, responseError.TOKEN_IS_INVALID,'user has log out');
            }

        })

    } catch (err) {
      return callRes(res, responseError.TOKEN_IS_INVALID);
    }
}