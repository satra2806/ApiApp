const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const cors = require('cors');
var bodyParser = require('body-parser')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./src/users');

const router = require('./src/router');

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
    cors: {
      origin: '*',
    }
  });;

app.use(cors());
app.use(router);
app.use(express.static(__dirname))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

var mongoose = require('mongoose')

app.use(express.static(__dirname))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

var dbUrl = 'mongodb+srv://sathish:Meena546@cluster0.gxlws.mongodb.net/myFirstDatabase?retryWrites=true&w=majority'

var Message = mongoose.model('Message', {
    name: String,
    message: String
})


app.get('/messages', (req, res) => {
    Message.find({}, (err, messages) =>{
        res.send(messages)
    })
})

app.post('/messages', (req, res) => {
    var message = new Message(req.body)

    message.save((err) => {
        if (err)
            sendStatus(500)

            const response = new Date();
          // io.emit('messages ',response)
        io.emit('messages', "req.body")
        res.sendStatus(200)
    })

})

io.on('connect', (socket) => {
  socket.on('join', ({ name, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, name, room });

    if(error) return callback(error);

    socket.join(user.room);

    socket.emit('message', { user: 'admin', text: `${user.name}, welcome to room ${user.room}.`});
    socket.broadcast.to(user.room).emit('message', { user: 'admin', text: `${user.name} has joined!` });

    io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });

    callback();
  });

  socket.on('sendMessage', (message, callback) => {
    const user = getUser(socket.id);

    io.to(user.room).emit('message', { user: user.name, text: message });

    callback();
  });

  socket.on('disconnect', () => {
    const user = removeUser(socket.id);

    if(user) {
      io.to(user.room).emit('message', { user: 'Admin', text: `${user.name} has left.` });
      io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room)});
    }
  })
});

mongoose.connect(dbUrl, (err) => {
    console.log('mongo db connection', err)
})
server.listen(process.env.PORT || 5000, () => console.log(`Server has started.`));