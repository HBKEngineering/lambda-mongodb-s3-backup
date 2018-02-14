'use strict';
// Dependencies
const AWS         = require('aws-sdk');
const fs          = require('fs');
const url         = require('url');
const zipFolder   = require('zip-folder');
const exec        = require('child_process').exec;
const config      = require('./config');
const parse       = require('parse-mongo-url');
const _foreach    = require('lodash.foreach');

// config variables
const mongoURI = config.MONGODB_URL;

const s3Path = config.S3_PATH;
// Parsing MongoDB URI
const mongoURIparsed = parse(mongoURI);

console.log(mongoURIparsed)

var hosts = "";
let sslFlag = "";
let authDbFlag = "";

const username = mongoURIparsed.auth.user;
const pass = mongoURIparsed.auth.password;
const dbName = mongoURIparsed.dbName;

_foreach(mongoURIparsed.servers, function(item){
  hosts += item.host + ":" + item.port + ","
});

// setting some flags 
if(mongoURIparsed.rs_options.ssl){
  sslFlag = "--ssl"
}

if(mongoURIparsed.db_options.authSource){
  authDbFlag = "--authenticationDatabase " + mongoURIparsed.db_options.authSource
}

// Fetching S3 bucket
const s3bucket = new AWS.S3({
  params: {
    Bucket: s3Path
  }
});

module.exports.handler = (event, context, cb)=> {
  // Handle (and print) the PATH
  process.env['PATH'] = `${process.env['PATH']}:${process.env['LAMBDA_TASK_ROOT']}`;
  console.log(`[PATH] ${process.env['PATH']}`);

  // Get the folder name and file path to store the dump data
  let fileName = (new Date()).toDateString().replace(/ /g, '') + '_' + (new Date()).getTime();
  let folderName = `/tmp/${fileName}/`;
  let filePath = `/tmp/${fileName}.zip`;
  
  // Use the mongodump binary to get the data from MongoDB
  exec(`mongodump -h ${hosts} -d ${dbName} -u ${username} -p ${pass} ${sslFlag} ${authDbFlag} -o ${folderName}`, (error, stdout, stderr)=> {
    if (error) {
        console.error(`exec error: ${error}`);
        return;
    }
    // Zip the folder
    zipFolder(folderName, filePath, (err)=> {
      if (err) {
        console.error('[ZIP ERROR]', err);
        return;
      }
      console.log('[ZIP FOLDER SUCCESS]');
      // Read the ZIP that was just created
      fs.readFile(filePath, (err, data)=> {
        if (err) {
          console.error('[ERROR READING ZIP]', err);
          return;
        }
        // Create the S3 data to upload the file
        s3bucket.createBucket(()=> {
          let params = {
              Key: fileName,
              Body: data
          };
          s3bucket.upload(params, (err, data)=> {
              // Whether there is an error or not, delete the temp file
              fs.unlink(filePath, (err)=> {
                  if (err) console.error('[TEMP FILE DELETE ERROR]', err);
                  else console.log('[TEMP FILE DELETED]');
              });
              // Check everything went OK
              if (err) console.error('[UPLOAD ERROR]', err);
              else console.log('Successfully uploaded data');
          });
        });
      });
    })
  });
};
