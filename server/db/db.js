// CREATE DATABASE LinkedList;
module.exports = db = {};
var pg = require('pg');

db.initDB = function() {
  var connectionString = process.env || 'postgres://localhost:5432/';

  var client = new pg.Client(connectionString);
  client.connect();

  var createDatabase = client.query(
    'CREATE DATABASE linkedlist'
    );
  createDatabase.on('end', function() { 
    client.end(); 
    initUserTable()
    console.log('Creating Database')
  });
}

//Queries server and calls callback once done
var queryDB = function(queryStr, callback) {
  callback = callback || function(){}
  var connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/linkedlist';
  var client = new pg.Client(connectionString);
  client.connect();
  
  var sendQuery = client.query(queryStr, function(err, results){
    if (err) {console.log(err)}
  })

  sendQuery.on('end', function() { 
    client.end();
    callback()
  });
}

//Queries server and calls callback on each returned row.
var requestDB = function(queryStr, callback) {
  var connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/linkedlist';
  var client = new pg.Client(connectionString);
  client.connect();
    
  var sendQuery = client.query(queryStr, function(err, results){})

  sendQuery.on('end', function(results) { 
    client.end();
    callback(results.rows)
  });
}
  
var initUserTable = function() {
  queryDB(
    'CREATE TABLE users(\
      id SERIAL PRIMARY KEY, \
      username VARCHAR(20) NOT NULL UNIQUE, \
      password VARCHAR(20) NOT NULL, \
      skills VARCHAR(100) NOT NULL,  \
      gitHub_ID INTEGER UNIQUE, \
      description VARCHAR(255))',
    function(){
      console.log('Creating User Table')
      db.initJobsTable()
    }
  )
} 

db.initJobsTable = function() {
  queryDB(
    'CREATE TABLE jobs(\
      id SERIAL PRIMARY KEY, \
      title VARCHAR(20) NOT NULL UNIQUE, \
      ownerID INTEGER references users(id), \
      description VARCHAR(255), \
      skills VARCHAR(100))',
    function(){
      console.log('Creating Jobs Table')
      db.initUserJobsTable()  
    }
  )
}
  
db.initUserJobsTable = function() {
  queryDB(
    'CREATE TABLE userjobs(\
      id SERIAL PRIMARY KEY, \
      userID INTEGER references users(id), \
      jobID INTEGER references jobs(id), \
      status varchar(10))',
    function(){console.log('Creating UserJobs Table')}
  )
} 

db.resetDB = function() {
  queryDB(
    'DROP DATABASE linkedlist',
    function(){console.log('Dropping Database')}
  )
}

db.addUser = function(user, callback) {
  queryDB(
    "INSERT INTO users (username, password, skills, GitHub_ID, description) \
    VALUES ('"+user.username+"','"+user.password+"','"+user.skills+"',"+user.gitHub_ID+",'"+user.description+"')",
    function(){
      console.log('Adding User')
      callback()
    }
  )
}

db.addJob = function(job, callback) {
  queryDB(
    "INSERT INTO jobs (title, ownerID, description, skills) VALUES \
    ('"+job.title+"',"+"(SELECT id FROM users WHERE username='"+job.owner+"')"+",'"+job.description+"',\
    '"+job.skills+"')",
    function(){
      console.log('Adding Job')
      callback()
    }
  )
}

db.addUserJob = function(username, jobTitle, status) {
  queryDB(
    "INSERT INTO userjobs (userID, jobID, status) VALUES \
    ((SELECT id FROM users WHERE username='"+username+"'), \
     (SELECT id FROM jobs WHERE title='"+jobTitle+"'), '"+status+"')"
  )
}

db.updateJob = function(job) {
  queryDB(
    "UPDATE jobs SET title='"+job.title+"'\
    , description='"+job.description+"', skills='"+job.skills+"' WHERE jobs.id="+job.id, 
    function(){console.log('Update Complete')})
}
db.updateUser = function(user) {
  queryDB(
    "UPDATE users SET skills='"+user.skills+"', gitHub_ID="+user.gitHub_ID+", \
     description='"+user.description+"' WHERE users.id="+user.id, 
    function(){console.log("Update Complete")})
}
db.updateUserJob = function(userjob) {
  queryDB(
    "UPDATE userjobs SET userID=(SELECT id FROM users WHERE username='"+userjob.username+"'),\
     jobID=(SELECT id FROM jobs WHERE title='"+userjob.jobTitle+"'), status='"+userjob.status+"' \
      WHERE userjobs.id='"+userjob.id+"'", 
    function(){console.log("Update Complete")})
}

db.getJobs = function(callback, filter, value){
  if (filter === undefined) {
    requestDB(
      "SELECT * FROM jobs",
      function(results){ 
        return callback(results)
      }
    )
  } else {
    requestDB(
      "SELECT * FROM jobs WHERE "+filter+" = '"+value+"'",
      function(results){ 
        return callback(results)
      }
    )
  }
}

db.getUsers = function(callback, filter, value){
  if (filter === undefined) {
    requestDB(
      "SELECT * FROM users",
      function(results){ 
        return callback(results)
      }
    )
  } else {
    requestDB(
      "SELECT * FROM users WHERE "+filter+" = '"+value+"'",
      function(results){ 
        return callback(results)
      }
    )
  }
}

db.getUserJobs = function(callback, username) {
  requestDB(
    "SELECT userjobs.userID, jobs.title, jobs.description, jobs.ownerID, jobs.skills, userjobs.status \
    FROM jobs INNER JOIN userjobs ON jobs.id=userjobs.jobID \
    WHERE userjobs.userID = (SELECT id FROM users WHERE username='"+username+"')" 
    ,
    function(results){
      return callback(results)
    }
  )
}

db.getCoworkers = function(callback, jobTitle) {
  requestDB(
    "SELECT userjobs.jobID, userjobs.userID, userjobs.status, users.username, jobs.title \
    FROM jobs INNER JOIN userjobs ON jobs.id=userjobs.jobID \
    INNER JOIN users ON users.id=userjobs.userID \
    WHERE jobs.title='"+jobTitle+"'" 
    ,
    function(results){
      return callback(results)
    }
  )
}

