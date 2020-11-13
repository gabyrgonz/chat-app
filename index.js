// References
// Used this tutorial: https://youtu.be/jD7FnbI76Hg
// Used this article: https://medium.com/daily-programmer/build-a-chat-application-with-express-and-socket-io-e8c335d27386 

var express = require('express');
var app = require('express')();
var path = require('path');
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var msgHistory = [];
var onlineUserList = {};
var userData = {};
var totalUserCount = 0;
var colorData = {};
let defaultName = "yeet"


// Handle route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Set the absolute path of the directory you want
app.use(express.static(path.join(__dirname, "static")));

// If the connection exists
io.on('connection', (socket) => {

  // Connected
  console.log('A user connected!');

  // Get user information
  let userCookie = socket.handshake.headers['cookie'];
  let userId = "user123";

  // Parse cookie to get userId
  if (typeof userCookie != "undefined") {
    if (userCookie.includes("userId=")) {
      userId = userCookie.split('; ');
      userId = userId.find(
        (row) => row.startsWith('userId')
      ).split('=')[1];
    }
  }

  // Object to be updated and emitted
  let object = {};
  let isUserExisting = userId !== "user123" && userId in userData;

  // See if user already exists
  if(isUserExisting) {
      object = {
        username: userData[userId],
        usercolor: colorData[userId],
        id: userId,
      };
      console.log("User with the id " + userId + " already exists");
  }
  // Create a new user
  else {
    let newId = socket.id;
    let newName = defaultName + totalUserCount;
    console.log("New: " + newName);

    // Determine the users color
    var hexDigit = '0123456789ABCDEF';
    var randomColor = '#';
    for (var i = 0; i < 6; i++) {
      randomColor += hexDigit[Math.floor(Math.random() * 16)];
    }

    // Update the object with the new info
    userData[newId] = newName;
    colorData[newId] = randomColor;
    object = {
      username: userData[newId],
      usercolor: colorData[newId],
      id: newId,
    };
    
    totalUserCount++;
    console.log("New user with the id " + socket.id + " was created");
  }

  // Update the list of online users
  onlineUserList[object.id] = socket.id;
 
  // Send updated information
  socket.emit("history", msgHistory);     
  socket.emit("username", object);           
  io.emit("currentUsers", onlineUserList);
  io.emit("allUsers", userData);
  io.emit("allUserColors", colorData);

  // Change color
  socket.on('change color', (data) => {
    // set the new color
    colorData[data.userId] = data.color;

    // Update the data to be sent out
    let object = {
      username: userData[data.userId],
      usercolor: colorData[data.userId],
      id: data.userId,
    };

    socket.emit("username", object);
    io.emit("allUserColors", colorData);
  });

  // Change username
  socket.on('change name', (data) => {
    if (Object.values(userData).indexOf(data.name) < 0) {

      // Set the new name
      userData[data.userId] = data.name;

      // Update the data to be sent out
      let object = {
        username: userData[data.userId],
        usercolor: colorData[data.userId],
        id: data.userId,
      };

      socket.emit("username", object);
      io.emit("allUsers", userData);
    }
  });

  // Print the chat message for everyone
  socket.on('chat message', (data) => {     
    // Add a time stamp for the message
    let timestamp = new Date();

    let payload = {
      user: data.userId,
      msg: data.message,
      time: timestamp.toTimeString().substring(0, 8),
    }
    io.emit('chat message', payload);
    msgHistory.push(payload);
  });


  // Disconnected
  socket.on('disconnect', () => {
    let disconnectedId = Object.values(onlineUserList).indexOf(socket.id);
    if (disconnectedId != -1) {
      delete onlineUserList[Object.keys(onlineUserList)[disconnectedId]];
      io.emit("currentUsers", onlineUserList);
    }
    console.log('A user disconnected!');
  });
});

http.listen(3000, () => {
  console.log('listening on *:3000');
});
