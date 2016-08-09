# 1to1CheckIn
A check-in web application for 1:1 laptop distribution made with NodeJS.

## Installation

#### Dependencies

* [NodeJS](nodejs.org)  v4.4.7
* [Socket.io](socket.io) v1.4.8
* [Mongoose](mongoosejs.com)  v4.5.8
* [Express](expressjs.com)  v4.14.0

#### Database Setup
1to1CheckIn uses MongoDB v3.2 for all backend data storage.
More info on installing MongoDB [here](https://docs.mongodb.com/manual/installation/).
To import data, run the following command:
```sh 
mongoimport --db distribution --collection dist --type csv --headerline --file /path/to/file.csv
```

#### Installing Packages
To install packages, run this command from the root of the project directory:
```sh 
npm install
```

#### Starting The Application
The application runs on port 1337 by default, and can be changed in the app.js file.
To start, run the command:
```sh 
node app.js
```