const express = require('express');
const fs = require('fs');
const path = require('path')
const image = require("imageinfo");
const db = require('./db');
const BASE_URL = 'public/uploads/'

//上传
const upload = function(req, resp, next) {
    try{
        const file = req.file
        const {hash, name} = req.body
        
        const chunkPath = path.resolve(BASE_URL,hash)
        // 判断目录是否存在
        if(!fs.existsSync(chunkPath)) fs.mkdirSync(chunkPath);
        // 移动切片文件
        fs.renameSync(file.path,chunkPath +'/'+ name);
        resp.send({
            status: 200,
            message: '切片上传成功'
        });
       
    }catch(e){
        resp.status(500).send({
            code: 500,
            message: '服务器错误'
        });
    }
}

const checkFile = async function(req, resp, next){
    try{
        const {ext, hash} = req.body
        const filePath = path.resolve(BASE_URL,`${hash}.${ext}`)
        const chunkDir = path.resolve(BASE_URL,hash)

        let uploaded = false
        let uploadedList = []
        if(fs.existsSync(filePath)){
            uploaded = true
        }else{
            uploadedList = fs.existsSync(chunkDir)
                           ? (fs.readdirSync(chunkDir).filter(name=>name[0]!=='.'))
                           : []
        }   
        resp.send({
            status: 200,
            message: '成功',
            data:{
                uploaded, uploadedList
            }
        });
    }catch(e){
        resp.status(500).send({ 
            code: 500,
            message: '服务器错误'
        });
    }
}

//合并切片
const mergeFile =async function(req, resp, next) {
    try{
        const {ext, size, hash} = req.body
        
        const filePath = path.resolve(BASE_URL,`${hash}.${ext}`)
        const chunkDir = path.resolve(BASE_URL,hash)

        let chunks =  fs.readdirSync(chunkDir)
        chunks.sort((a,b)=>a.split('-')[1] - b.split('-')[1])
        chunks = chunks.map(cp=>{
            return path.resolve(chunkDir,cp)
        })
        
        const pipeStream = (filePath,WritableStream)=>{
            new Promise((resolve)=>{
                const readStream = fs.createReadStream(filePath)
                readStream.on('end',()=>{
                    fs.unlinkSync(filePath) 
                    resolve(1)
                })
                readStream.pipe(WritableStream)
            })
        }
        await Promise.all(
            chunks.map((file,index)=>{
                pipeStream(file,fs.createWriteStream(filePath,{
                    start: index*size,
                    end: (index+1)*size
                }))
            })
        )
        var sql = "insert into img_list (imgSrc)values (?)";
        db.dbConn.sqlConnect(sql,[`${hash}.${ext}`],function(err,data){
            if(err){
                resp.status(500).send({
                    status: 500,
                    message: err
                })
            }else{
                setTimeout(()=>{
                    fs.rmdirSync(chunkDir)
                },1000)
                resp.send({
                    status: 200,
                    message: '上传成功',
                    url: "/public/uploads/"+`${hash}.${ext}`
                });
            }
        })
    }catch(e){
        resp.status(500).send({
            code: 500,
            message: '服务器错误'
        });
    }
}


//查询列表
const getImageList = function(req,resp){
    try{
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
                let newData = getImageFiles(BASE_URL,data)
                resp.send({
                    status: 200,
                    data: newData,
                    message: '查询成功'
                });
            }
        })
    }catch(e){
        resp.status(500).send({
            code: 500,
            message: '服务器错误'
        });
    }
}

const deleteImages = function(req, resp, next) {
    try {
        var ids = req.query.ids;
        let list = req.query.list;
        let pwd = req.query.pwd;
        list = list.split(',');
        const sql = 'delete from img_list where id in ('+ids+')'
    
        if(pwd != "123456"){
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
    mergeFile,
    checkFile,
    getImageList,
    deleteImages
};