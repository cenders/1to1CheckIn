var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mongoose = require('mongoose');

var path = require('path')
app.use(express.static(path.join(__dirname, 'assets')));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/static/index.html');
});
app.get('/viewer', function(req, res){
  res.sendFile(__dirname + '/static/viewer.html');
});

var db = mongoose.connection;
db.on('error', console.error);
db.once('open', function(){
  console.log('MongoDB connection open');
});

mongoose.connect('mongodb://localhost:27017/test');

var schema = new mongoose.Schema({
  id: Number,
  name: String,
  grade: Number,
  asset: Number,
  openCampus: Boolean,
  completed: {type: Boolean, default: false}
});

var Student = mongoose.model('Student', schema);

/* Create new user
var collin = new Student({
  id: 127458,
  name: 'Collin Enders',
  grade: '15',
  asset: 107000,
  openCampus: true
});
collin.save(function(err, collin){});
*/

io.on('connection', function(socket){
  // Student submits initial student ID form
  socket.on('studentID', function(studentID){
    Student.findOne({id:studentID}, function(err, obj){
      if(err) return console.error(err);
      var student = {
        id: obj.id,
        name: obj.name,
        grade: obj.grade,
        asset: obj.asset
      };
      io.emit('student', student);
      console.log('Received request for SID# '+ studentID);
    });
  });

  // Student submits second form with Open Campus option
  socket.on('studentInfo', function(studentObj){
    Student.findOneAndUpdate({id: studentObj.id}, {openCampus: studentObj.openCampus}, function(err, obj){
      if(err) return console.error(err);

      // Display all user data
      console.log(studentObj.id);
      console.log(studentObj.name);
      console.log(studentObj.grade);
      console.log(studentObj.asset);
      console.log(studentObj.openCampus);
      console.log(studentObj.completed);
    });

    var info = {
      id: studentObj.id,
      name: studentObj.name,
      grade: studentObj.grade,
      asset: studentObj.asset,
      openCampus: studentObj.openCampus,
      completed: studentObj.completed
    };
    io.emit('info' , info);
  });
});

// Start server on
http.listen(1337, function(){
  console.log('listening on *:1337');
});
