const express = require('express');
const fs = require('fs');
const image = require("imageinfo");
const db = require('./db');

//上传
const upload = function(req, resp, next) {
    var files = req.files
    if (!files[0]) {
        resp.send({
            status: 200,
            message: '未上传文件'
        });
    } else {
        for(let i = 0;i < files.length; i++){
            var sql = "insert into img_list (imgSrc)values (?)";
            db.dbConn.sqlConnect(sql,[files[i].filename],function(err,data){
                if(err){
                    resp.status(500).send({
                        status: 500,
                        message: err
                    })
                }else{
                    resp.send({
                        status: 200,
                        message: '上传成功'
                    });
                }
            })
        }
    };
}

//查询列表
const getImageList = function(req,resp){
    const pageNum = req.query.pageNum || 1;
    const pageSize = req.query.pageSize || 10;
    const sql = "select * from img_list order by id desc limit ?, ?";
    db.dbConn.sqlConnect(sql,[(pageNum-1)*pageSize,pageSize*1],function(err,data){
        if(err){
            resp.status(400).send({
                status: 400,
                message: err
            })
        }else{
            let newData = getImageFiles('public/uploads/',data)
            resp.send({
                status: 200,
                data: newData,
                message: '查询成功'
            });
        }
    })
}

const deleteImages = function(req, resp, next) {
    try {
        var ids = req.query.ids;
        let list = req.query.list;
        let pwd = req.query.pwd;
        list = list.split(',');
        const sql = 'delete from img_list where id in ('+ids+')'
    
        if(pwd != "20180119"){
            resp.status(401).send({
                code: 401,
                message: '密码错误'
            });
        }else{
            for(let i=0;i<list.length;i++){
                fs.unlinkSync('./public/uploads/'+list[i]);
            }
            db.dbConn.sqlConnect(sql,[],function(err,data){
                if(err){
                    resp.status(400).send({
                        status: 400,
                        message: err
                    })
                }else{
                    resp.send({
                        code: 200,
                        message: '删除成功'
                    });
                }
            })
        }
    } catch (error) {
        resp.status(500).send({
            code: 500,
            message: '服务器错误'
        });
    }
}


//获取指定图片的尺寸
function getImageFiles(path,data) {
    if(!data.length){
        return []
    }
    var imageList = [];
    data.forEach((item) => {
        var ms = image(fs.readFileSync(path + item.imgSrc));
        ms.mimeType && (imageList.push({...item,width: ms.width, height: ms.height}))
    });
    return imageList;
}


module.exports = {
    upload,
    getImageList,
    deleteImages
};