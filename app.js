#! /usr/bin/node
"use strict";
const http = require("http"),
    port = 3000, // For production environments, set port to 80 unless port forwarding
    aws = require('aws-sdk'),
    bucket_name = 'wocsor-nolanville-tx-upload';

const s3 = new aws.S3({region: 'us-east-2', 
                    signatureVersion: 'v4'
                    });

var allowed_uuids = [];

// janky auth - get whitelisted UUIDs from text file and create an array to compare against.
// TODO: check if UUID is registered on network using a DB instead of a file
s3.getObject({ 
    Bucket: bucket_name,
    Key: 'UUID.txt'
}, (err, data) => {
    if (err) console.log(err);
    allowed_uuids = data.Body.toString().replace('\n', '').split(',');
});

const server = http.createServer((req, res) => {
    try {
        let body = [];
        let command = req.url.split('?');

        switch (command[0]){

            case ('/upload'):
                // client wants to upload files
                let uploadparams = {
                    Bucket: bucket_name,
                    Key: '',
                    Body: ''
                };

                let head = req.headers;

                // looks bad, but we want to be sure we are getting:
                // 1 - valid header with relevant info
                // 2 - a valid UUID that is in the whitelist

                if (head['uuid'] !== undefined && head['timestamp'] !== undefined && head['filename'] !== undefined && allowed_uuids.includes(head['uuid'])) {
                    let uploadUrl = "";

                    uploadparams.Key = head['uuid'] + '/' + head['timestamp'] + '/' + head['filename'];

                    // Get signed URL for uploading to S3 bucket
                    s3.getSignedUrl('putObject', uploadparams, function (err, url) {
                        uploadUrl = url;
                    });
    
                    req.on("data", (chunk) => {
                        // Content body can be large and may come in chunks
                        body += chunk;
                    });
    
                    req.on("end", async () => {
                        // Return the S3 upload URL
                        res.writeHead(200); // Configure head/metadata of response
                        res.write(uploadUrl); // Configure response body
                        res.end(); // Sends the response back to client   
                    });

                } else {
                    res.writeHead(403);
                    res.write('invalid auth');
                    res.end()
                }

                break;

            default:

                break;

        }
    } catch {
        res.writeHead(500);
        res.end();
    }
});

server.listen(port);
console.log(`Server on Port ${port}`);
