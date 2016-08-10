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

  function logError(message, type) {
    console.log(message);
    var log = {
      message: message || 'An Error occured.',
      type: type || 'danger'
    }

    io.emit('server-log', log);
  }

  socket.on('client-student', function(data) {
    Student.findOne({id:data.studentID}, function(err, obj){
      if(err) return console.error(err);
      if(!obj) return logError('Error: student id not found.');
        var student = {
          id: obj.id,
          name: obj.name,
          grade: obj.grade,
          asset: obj.asset,
          openCampus: obj.openCampus
        };
      io.to('/#' + data.id).emit('server-student', student);
      console.log('Received request for Student "'+ data.studentID + '"');
    });
  });

  //Requesting student list
  socket.on('client-student-list', function(listObj) {
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
        io.to('/#' + listObj.id).emit('server-student-list', {count: count, students: students});
      });
    });
  });

  socket.on('client-active-list', function(listObj) {
    Student.find({'active': true, 'completed': {$ne: true }}).sort({time: 'asc'}).exec(function(err, objs) {
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

      io.to('/#' + listObj.id).emit('server-active-list', students);
    });
  });

  // Student submits second form with Open Campus option
  socket.on('client-student-active', function(studentObj){
    var q = {id: studentObj.id};
    var update = {openCampus: studentObj.openCampus, time: new Date(), active: true};

    Student.findOneAndUpdate(q, update, function(err, student){
      if(err) return console.error(err);

      var info = {
        id: student.id,
        name: student.name,
        grade: student.grade,
        asset: student.asset,
        openCampus: student.openCampus,
        claimed: student.claimed,
        completed: student.completed
      };

      io.emit('server-list-info', info);
    });
  });

  socket.on('client-student-claimed', function(claimedObj) {
    Student.findOneAndUpdate({id: claimedObj.id}, {claimed: claimedObj.claimed}).exec(function(err, student) {
      if(err) return console.error(err);
      if(!student) return logError('Student "' + claimedObj.id + '" not found, not updated');

      var info = {
        id: claimedObj.id,
        name: claimedObj.name,
        grade: claimedObj.grade,
        asset: claimedObj.asset,
        openCampus: claimedObj.openCampus,
        claimed: claimedObj.claimed,
        completed: claimedObj.completed
      };
      io.emit('server-student-claimed', info);

      if(info.claimed == true){
        console.log('Student "' + claimedObj.id + '" claimed by helper')
      };
      if(info.claimed == false){
        console.log('Student "' + claimedObj.id + '" unclaimed')
      };
    });
  });

  socket.on('client-student-complete', function(completeObj) {
    Student.findOneAndUpdate({id: completeObj.id}, {completed: true}).exec(function(err, student) {
      if(err) return console.error(err);
      if(!student) logError('Student "' + completeObj.id + '" not found, not updated');

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
      io.emit('server-student-completed' , info);
    });
  });
});

// Start server on
http.listen(8080, function(){
  console.log('listening on port 8080');
});
