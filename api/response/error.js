const convertString = require('../utils/convertString');
var responseError = {
    OK: {
        statusCode: 200,
        body: {
            code: "1000",
            message: "OK",
            data: null
        }
    },
    POST_IS_NOT_EXISTED: {
        statusCode: 400,
        body: {
            code: "9992",
            message: "Post is not existed"
        }
    },
    CODE_VERIFY_IS_INCORRECT: {
        statusCode: 400,
        body: {
            code: "9993",
            message: "Code verify is incorrect"
        }
    },
    NO_DATA_OR_END_OF_LIST_DATA: {
        statusCode: 400,
        body: {
            code: "9994",
            message: "No data or end of list data"
        }
    },
    USER_IS_NOT_VALIDATED: {
        statusCode: 400,
        body: {
            code: "9995",
            message: "User is not validated"
        }
    },
    USER_EXISTED: {
        statusCode: 400,
        body: {
            code: "9996",
            message: "User existed"
        }
    },
    METHOD_IS_INVALID: {
        statusCode: 400,
        body: {
            code: "9997",
            message: "Method is invalid"
        }
    },
    TOKEN_IS_INVALID: {
        statusCode: 401,
        body: {
            code: "9998",
            message: "Token is invalid"
        }
    },
    EXCEPTION_ERROR: {
        statusCode: 400,
        body: {
            code: "9999",
            message: "Exception error"
        }
    },
    CAN_NOT_CONNECT_TO_DB: {
        statusCode: 500,
        body: {
            code: "1001",
            message: "Can not connect to DB"
        }
    },
    PARAMETER_IS_NOT_ENOUGH: {
        statusCode: 400,
        body: {
            code: "1002",
            message: "Parameter is not enough"
        }
    },
    PARAMETER_TYPE_IS_INVALID: {
        statusCode: 400,
        body: {
            code: "1003",
            message: "Parameter type is invalid"
        }
    },
    PARAMETER_VALUE_IS_INVALID: {
        statusCode: 400,
        body: {
            code: "1004",
            message: "Parameter value is invalid"
        }
    },
    UNKNOWN_ERROR: {
        statusCode: 400,
        body: {
            code: "1005",
            message: "Unknown error"
        }
    },
    FILE_SIZE_IS_TOO_BIG: {
        statusCode: 400,
        body: {
            code: "1006",
            message: "File size is too big"
        }
    },
    UPLOAD_FILE_FAILED: {
        statusCode: 500,
        body: {
            code: "1007",
            message: "Upload file failed"
        }
    },
    MAXIMUM_NUMBER_OF_IMAGES: {
        statusCode: 400,
        body: {
            code: "1008",
            message: "Maximum number of images"
        }
    },
    NOT_ACCESS: {
        statusCode: 403,
        body: {
            code: "1009",
            message: "Not access"
        }
    },
    ACTION_HAS_BEEN_DONE_PREVIOUSLY_BY_THIS_USER: {
        statusCode: 400,
        body: {
            code: "1010",
            message: "Action has been done previously by this user"
        }
    }
}

function setAndSendResponse(res, responseError) {
    return res.status(responseError.statusCode).send(responseError.body);
}

function callRes(res, responseErrorName, data = null) {
  if (responseErrorName != responseError.OK){
    let x = {
      code: responseErrorName.body.code,
      message: responseErrorName.body.message,
      details: null
    }
    if (data) x.details = data.toString();
    return res.status(responseErrorName.statusCode).send(convertString(x));
  }
  else {
    let x = {
      code: responseErrorName.body.code,
      message: responseErrorName.body.message,
      data: data 
    }
    return res.status(responseErrorName.statusCode).send(convertString(x));
  }
}

module.exports = {responseError, setAndSendResponse, callRes};
