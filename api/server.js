require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors');
const multer = require('multer');
const {responseError, callRes} = require('./response/error');

const app = express()
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server, { cors: { origin: '*' } });
global._io = io;
// use express.json as middleware
app.use('/public', express.static(__dirname + '/webview'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }));
app.use(cors());

// connect to MongoDB
const url = process.env.mongoURI;
mongoose.connect(url,
    { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true })
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.log(`errors: ${err}`)
    );

app.get('/it4788/finishedsignup', (req, res) => {
    res.sendFile(__dirname + '/webview/finishSignup.html');
});
// use Routes
app.use('/it4788/auth', require('./routes/auth'));
app.use('/it4788/friend', require('./routes/friend'));
app.use('/it4788/post', require('./routes/posts'));
app.use('/it4788/search', require('./routes/search'));
app.use('/it4788/comment', require('./routes/comments'));
app.use('/it4788/like', require('./routes/likes'));
app.use('/it4788/friend', require('./routes/friend'));
app.use('/it4788/setting', require('./routes/settings'));
app.use('/it4788/user', require('./routes/user'));
app.use('/it4788/chat', require('./routes/chat'));
_io.on('connection', async (socket) => {
	console.log('Connected: ' + socket.id);
    socket.on("disconnect", () => {
        socket.disconnect();
        console.log("🔥: A user disconnected");
    });
});
app.use(function (err, req, res, next) {
    if(err instanceof multer.MulterError) {
        if(err.code === 'LIMIT_UNEXPECTED_FILE') {
            return callRes(res, responseError.EXCEPTION_ERROR, "'" + err.field + "'" + " không đúng với mong đợi. Xem lại trường ảnh hoặc video gửi lên trong yêu cầu cho đúng");
        }
    }
    console.log(err);
    return callRes(res, responseError.UNKNOWN_ERROR, "Lỗi chưa xác định");
})

const port = process.env.PORT || 8080;
server.listen(port, () => console.log(`Server is running on port ${port}`))