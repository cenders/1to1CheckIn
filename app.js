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
app.get('/active', function(req, res){
  res.sendFile(__dirname + '/static/active.html');
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
  active: {type: Boolean, default: false},
  claimed: {type: Boolean, default: false},
  completed: {type: Boolean, default: false},
  time: String
},
{collection: 'dist'});

var Student = mongoose.model('Student', schema);

io.on('connection', function(socket){
  // Student submits initial student ID form
  socket.on('studentID', function(data) {
    Student.findOne({id:data.studentID}, function(err, obj){
      if(err) return console.error(err);
      if(!obj) return console.log('Error: student id not found');
        var student = {
          id: obj.id,
          name: obj.name,
          grade: obj.grade,
          asset: obj.asset,
          openCampus: obj.openCampus
        };
      io.to('/#' + data.id).emit('student', student);
      console.log('Received request for SID# '+ data.studentID);
    });
  });

  //Requesting student list
  socket.on('studentList', function(listObj) {
    var q = {completed: {$ne: listObj.showIncomplete}};

    Student.find(q).count().exec(function(err, count) {
      if(err) return console.error(err);

      Student.find(q).sort(listObj.order + listObj.sort).limit(listObj.limit).skip(listObj.skip).exec(function(err, objs) {
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
        io.to('/#' + listObj.id).emit('list', {count: count, students: students});
      });
    });
  });

  socket.on('activeList', function(listObj) {
    //var q = {'active': 'true'};

    Student.find({'active': true, 'completed': {$ne: true }}).exec(function(err, objs) {
      if(err) return console.error(err);

      var students = [];

      for(var i in objs) {
        students[i] = {
          id: objs[i].id,
          name: objs[i].name,
          grade: objs[i].grade,
          asset: objs[i].asset,
          active: objs[i].active,
          claimed: objs[i].claimed,
          completed: objs[i].completed
        }
      }

      io.to('/#' + listObj.id).emit('active', students);
    });
  });

  // Student submits second form with Open Campus option
  socket.on('studentInfo', function(studentObj){
    Student.findOneAndUpdate({id: studentObj.id}, {openCampus: studentObj.openCampus, time: new Date(), active: true}, function(err, obj){
      if(err) return console.error(err);

      // Display all user data
      console.log(obj);

      var info = {
        id: obj.id,
        name: obj.name,
        grade: obj.grade,
        asset: obj.asset,
        openCampus: obj.openCampus,
        claimed: obj.claimed,
        completed: obj.completed
      };
      io.emit('info', info);
    });
  });

  socket.on('studentClaimed', function(claimedObj) {
    Student.findOneAndUpdate({id: claimedObj.id}, {claimed: claimedObj.claimed}).exec(function(err, student) {
      if(err) return console.error(err);
      if(!student) return console.error('Student "' + claimedObj.id + '" not found, not updated');

      console.log('Student "' + claimedObj.id + '" claimed by helper');

      var info = {
        id: claimedObj.id,
        name: claimedObj.name,
        grade: claimedObj.grade,
        asset: claimedObj.asset,
        openCampus: claimedObj.openCampus,
        claimed: claimedObj.claimed,
        completed: claimedObj.completed
      };
      io.emit('claimed', info);
    });
  });

  socket.on('studentComplete', function(completeObj) {
    console.log('student Completed', completeObj);
    Student.findOneAndUpdate({id: completeObj.id}, {completed: true}).exec(function(err, student) {
      if(err) return console.error(err);
      if(!student) return console.error('Student "' + completeObj.id + '" not found, not updated');

      console.log('Student "' + completeObj.id + '" completed');

      var info = {
        id: completeObj.id,
        name: completeObj.name,
        grade: completeObj.grade,
        asset: completeObj.asset,
        openCampus: completeObj.openCampus,
        claimed: completeObj.claimed,
        completed: completeObj.completed
      };
      io.emit('studentCompleted' , info);
    });
  });
});

// Start server on
http.listen(1337, function(){
  console.log('listening on port 1337');
});
