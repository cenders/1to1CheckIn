var express = require('express');
var request = require('request');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var favicon = require('serve-favicon');
var _ = require('lodash');
var config = require('./config.json');

var path = require('path');

var queue = [];
var studentsInQueue = [];
app.use(express.static(path.join(__dirname, 'assets')));

app.use(favicon(__dirname + '/static/favicon.ico'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/static/index.html');
});
app.get('/viewer', function(req, res){
  res.sendFile(__dirname + '/static/viewer.html');
});
app.get('/active', function(req, res){
  res.sendFile(__dirname + '/static/active.html');
});


io.on('connection', function(socket) {
  // Student submits initial student ID form

  function logError(message, id, type) {
    console.log(message);
    var log = {
      message: message || 'An Error occured.',
      type: type || 'danger'
    }

    io.to('/#' + id).emit('server-log', log);
  }

  function requestGetJSON(url, cb) {
    request.get(url, function(err, res, body) {
      if(err) return console.error(err);
      if(!body) return cb('Error: No body');
      if(!(parsedData = JSON.parse(body))) return cb('Could not pase JSON');
      return cb(null, parsedData, res);
    });
  }

  socket.on('client-student', function(data) {
    requestGetJSON('http://localhost:3000/students/' + data.studentID, function(err, student) {
      if(err) return console.log(err);
      io.to('/#' + data.id).emit('server-student', student);
      console.log('Student "'+ student.id + '" in grade "' + student.grade + '" information requested');
    });
  });

  //Requesting student list
  socket.on('client-student-list', function(listObj) {

    var paginationURL = '?_limit=' + listObj.limit + "&_start=" +
      listObj.skip + '&_sort=' + listObj.sort + '&_order=' + listObj.order;

    requestGetJSON('http://localhost:3000/students/' + paginationURL, function(err, students, res) {
      if(err) return console.log(err);
      var count = 0;
      if(res.headers && res.headers['x-total-count'])
        count = res.headers['x-total-count'];

      io.to('/#' + listObj.id).emit('server-student-list', {count: count, students: students});
    });
  });

  socket.on('client-active-list', function(listObj) {
    io.to('/#' + listObj.id).emit('server-active-list', queue);
  });

  // Student submits second form with Open Campus option
  socket.on('client-student-active', function(studentObj){

    if(studentsInQueue.indexOf(studentObj.id) == -1) {
      requestGetJSON('http://localhost:3000/students/' + studentObj.id, function(err, student) {
        if(err) return console.log(err);

        student.claimed = false;
        student.completed = false;

        queue.push(student);
        studentsInQueue.push(studentObj.id);

        io.emit('server-list-info', student);
        console.log('Student "' + studentObj.id + '" in grade "' + student.grade + '" pushed to active queue');
      });
    }
  });

  socket.on('client-student-claimed', function(claimedObj) {
    var student = _.find(queue, _.matchesProperty('id', claimedObj.id));

    if(student) {
      student.claimed = claimedObj.claimed;

      io.emit('server-student-claimed', student);
      if(student.claimed) {
        console.log('Student "' + student.id + '" in grade "' + student.grade + '" claimed by helper');
      }

      if(!student.claimed) {
        console.log('Student "' + student.id + '" in grade "' + student.grade + '" unclaimed');
      }
    }
  });

  socket.on('client-student-complete', function(completeObj) {

    var student = _.find(queue, _.matchesProperty('id', completeObj.id));

    if(student) {
      _.remove(queue, function(i) {
        return i.id == completeObj.id
      });

      io.emit('server-student-completed' , student);
      console.log('Student "' + completeObj.id + '" in grade "' + student.grade + '" completed');
    }
  });
});

// Start server on
http.listen(config.webport, function(){
  console.log('listening on port: ' + config.webport);
});
