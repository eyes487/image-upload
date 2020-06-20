"use strict";
exports.__esModule = true;
var express = require("express");
var multer = require("multer");
const path = require('path');
const favicon = require('serve-favicon')
var bodyParser = require('body-parser');

var storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './public/uploads/');
    },
})
var uploadFile = multer({ storage: storage });

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
app.post('/uploadimg', uploadFile.single('chunk'), myImgOperate.upload)
//合并切片
app.post('/mergeFile', myImgOperate.mergeFile)
//获取列表
app.get('/getImageList', myImgOperate.getImageList)

app.get('/deleteImages', myImgOperate.deleteImages)

var server = app.listen(9999, function() {
    console.log('server is running at port 9999...');
});