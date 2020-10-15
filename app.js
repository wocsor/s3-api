#! /usr/bin/node
const http = require('http');
const request = require('request-promise');
const url = require('url');

http.createServer((req, res) => {
    let data = '';
    let urlstring = '';
    console.log(request.method)
});
