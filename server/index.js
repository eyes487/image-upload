"use strict";
exports.__esModule = true;
var express = require("express");
var multer = require("multer");
var fs = require('fs');
const path = require('path');
const favicon = require('serve-favicon')
var image = require("imageinfo");
var bodyParser = require('body-parser');

var storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './public/uploads');
    },
    filename: function(req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`)
    }
})
var upload = multer({ storage: storage });

var myImgOperate = require('./image')

var app = express();

app.use('/',express.static('public'));
app.use(favicon(path.join(__dirname,'../public','favicon.ico')))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(function(req,res,next){    
    //允许哪个源访问我
    res.setHeader('Access-Control-Allow-Origin','*')
    next();
})

//上传
app.post('/uploadimg', upload.array('imgfile', 40), myImgOperate.upload)
//获取列表
app.get('/getImageList', myImgOperate.getImageList)

app.get('/deleteImages', myImgOperate.deleteImages)

var server = app.listen(9999, function() {
    console.log('server is running at port 9999...');
});