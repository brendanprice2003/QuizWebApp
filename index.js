const express = require('express'),
    res = require('express/lib/response'),
    { createServer } = require('http'),
    { Server } = require('socket.io'),
    path = require('path'),
    fs = require('fs'),
    { SocketAddress } = require('net');
const log = console.log.bind(console);

const app = express(),
httpServer = createServer(app),
port = 3221,
io = new Server(httpServer, {});
log(`- http://86.2.10.33:${port}/`);

// Objects to store users & rooms
var __userStruct__ = {},
    __roomStruct__ = {};


io.on('connection', (socket) => {

    var stats = JSON.parse(fs.readFileSync(path.join(__dirname, 'fstat.json')));
    stats.loggedUsers = stats.loggedUsers + 1;
    fs.writeFileSync(path.join(__dirname, 'fstat.json'), JSON.stringify(stats, null, 2));

    socket.on('roomListener', (args) => {

        // Check for userType & config rooms
        if (args.user.userType == 'student' && __roomStruct__[args.room.roomCode]) {
            __userStruct__[socket.id] = 
            {
                user: { userType: args.user.userType, isTeacher: false },
                room: { roomCode: args.room.roomCode }
            };

            socket.join(args.room.roomCode);
            socket.emit('roomConnect');
            log('Student Joined Room!');
        }
        else if (args.user.userType == 'student' && !__roomStruct__[args.room.roomCode]) {
            // Room does not exist
            socket.emit('roomError');
        }
        else if (args.user.userType == 'teacher' && !__roomStruct__[args.room.id]) {
            __roomStruct__[args.room.id] =
            {
                inception: { time: new Date() },
                room:      { roomCode: args.room.id, roomName: args.room.roomName },
                instance:  { qNum: 0, users: 0 }
            };
            __userStruct__[socket.id] = 
            {
                user: { userType: args.user.userType, isTeacher: true },
                room: { roomCode: args.room.id },
                data: { pts: 0 }
            };

            socket.join(args.room.id);
            log('Teacher Created Room!');

            var stats = JSON.parse(fs.readFileSync(path.join(__dirname, 'fstat.json')));
            stats.loggedRooms = stats.loggedRooms + 1;
            fs.writeFileSync(path.join(__dirname, 'fstat.json'), JSON.stringify(stats, null, 2));
        };
    });

    socket.on('nickListener', (args) => {
        __userStruct__[socket.id].user['userNickname'] = args.nickname;
    });

    socket.on('roomEvent', (args) => {
        var questions = JSON.parse(fs.readFileSync(path.join(__dirname, 'json/questions.json'))),
            answers   = JSON.parse(fs.readFileSync(path.join(__dirname, 'json/answers.json')));

        io.to(args.room.id).emit('roomEvent', {questions, answers});
    });

    socket.on('dev', (bruh) => {
        log(__userStruct__);
        log(__roomStruct__);
        
        // format of structures
        // __userStruct__ @global variable
        // {
        //     <socket.id>: {
        //         user: { userType: 'student/teacher', isTeacher: true/false, userNickname: '<userNickname>' },
        //         room: { roomCode: '<roomCode>'}
        //     }
        // }

        // __roomStruct__ @global variable
        // {
        //     <roomCode>: {
        //         inception: { time: '<time>' },
        //         room: { roomCode: '<roomCode>', roomName: '<roomName' }
        //     }
        // }
    });

    socket.on('disconnect', () => {

        // This works somehow lmfao, If client disconnects remove all references (RAM efficient)
        if (__userStruct__[socket.id] && __userStruct__[socket.id].user.userType == 'teacher') {
            let roomCode = __userStruct__[socket.id].room.roomCode;
            delete __roomStruct__[roomCode];
            delete __userStruct__[socket.id];
        }
        else if (__userStruct__[socket.id] && __userStruct__[socket.id].user.userType == 'student') {
            delete __userStruct__[socket.id];
        };
    });
});



app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, '/home.html'));
});
app.get('', (req, res) => {
    res.sendFile(path.join(__dirname, '/home.html'));
});

app.get('/teacher', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/teacher/teacher.html'));
});

app.get('/student', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/student/student.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/admin/admin.html'));
});

app.get('*', (req, res) => {
    res.send('Error 404: How did we get here?');
});

httpServer.listen(port);