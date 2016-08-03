var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var path = require('path')
app.use(express.static(path.join(__dirname, 'assets')));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/static/index.html');
});
app.get('/viewer', function(req, res){
  res.sendFile(__dirname + '/static/viewer.html');
});

io.on('connection', function(socket){
  socket.on('studentID', function(obj){
    var student = {
      id: obj,
      name: 'Jim Bob',
      grade: 12
    };
    io.emit('student', student);
    console.log('Received request for SID# '+ obj);
  });

  socket.on('studentInfo', function(obj){
    var info = {
      id: obj.id,
      name: obj.name,
      grade: obj.grade,
      openCampus: obj.openCampus,
      twilight: obj.twilight
    };
    io.emit('info' , info);
  });
});

http.listen(1337, function(){
  console.log('listening on *:1337');
});
