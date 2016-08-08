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

mongoose.connect('mongodb://localhost:27017/distribution/dist');

var schema = new mongoose.Schema({
  id: Number,
  name: String,
  grade: Number,
  asset: Number,
  openCampus: Boolean,
  completed: {type: Boolean, default: false},
  time: String
},
{collection: 'dist'});

var Student = mongoose.model('Student', schema);

io.on('connection', function(socket){
  // Student submits initial student ID form
  socket.on('studentID', function(studentID){
    Student.findOne({id:studentID}, function(err, obj){
      if(err) return console.error(err);
      if(!obj) return console.log('Error: student id not found');
        var student = {
          id: obj.id,
          name: obj.name,
          grade: obj.grade,
          asset: obj.asset,
          openCampus: obj.openCampus
        };
      io.emit('student', student);
      console.log('Received request for SID# '+ studentID);
    });
  });

  //Requesting student list
  socket.on('studentList', function(listObj) {
    var q = {completed: {$ne: listObj.showIncomplete}};

    Student.find(q).count().exec(function(err, count) {
      if(err) return console.error(err);

      Student.find(q).limit(listObj.limit).skip(listObj.skip).exec(function(err, objs) {
        if(err) return console.error(err);

        var students = [];

        for(var i in objs) {
          students[i] = {
            id: objs[i].id,
            name: objs[i].name,
            grade: objs[i].grade,
            asset: objs[i].asset,
            openCampus: objs[i].openCampus,
            completed: objs[i].completed
          }
        }

        io.emit('list', {count: count, students: students});
      });
    });
  });

  // Student submits second form with Open Campus option
  socket.on('studentInfo', function(studentObj){
    Student.findOneAndUpdate({id: studentObj.id}, {openCampus: studentObj.openCampus}, function(err, obj){
      if(err) return console.error(err);

      // Display all user data
      console.log(obj);

      var info = {
        id: obj.id,
        name: obj.name,
        grade: obj.grade,
        asset: obj.asset,
        openCampus: obj.openCampus,
        completed: obj.completed
      };
      io.emit('info' , info);
    });
  });

  socket.on('studentComplete', function(completeObj) {
    Student.findOneAndUpdate({id: completeObj.id}, {completed: true, time: completeObj.time}).exec(function(err, student) {
      if(err) return console.error(err);
      if(!student) return console.error('Student "' + completeObj.id + '" not found, not updated');

      console.log('Student "' + completeObj.id + '" completed');

      io.emit('studentCompleted' , info);
    });
  });
});

// Start server on
http.listen(1337, function(){
  console.log('listening on *:1337');
});
