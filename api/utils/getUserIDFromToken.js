const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports.getUserIDFromToken = async function(token) {
    try {
        const verified = jwt.verify(token, process.env.jwtSecret);
        let user;
        try {
            user = await User.findById(verified.id);
        } catch (err) {
            if(err.kind == "ObjectId") {
                console.log("Sai id");
                return 'TOKEN_IS_INVALID';
            }
            return 'CAN_NOT_CONNECT_TO_DB';
        }
        if(!user) {
            console.log("User da bi xoa khoi csdl");
            return 'USER_IS_NOT_VALIDATED';
        }
        if (user.isBlocked == true)  
          return 'NOT_ACCESS';
        if (user && user.dateLogin) {
            var date = new Date(verified.dateLogin);
            if (user.dateLogin.getTime() == date.getTime())
            {
                return user;
            } else {
                return 'TOKEN_IS_INVALID';
            }
        } else {
            return 'TOKEN_IS_INVALID';
        }
    } catch (err) {
        return 'TOKEN_IS_INVALID';
    }
}