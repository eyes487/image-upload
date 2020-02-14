# image-upload
A Picture Bed.一个简单的图床，用于博客存放图片。
[线上地址](http://fs.eyes487.top:9999/)

技术: `html`+`css`+`js`+`node`+`mysql`

功能:
* 上传图片
* 删除图片
* 瀑布流显示图片
* 懒加载图片

# 运行方法

1.克隆代码
```js
git clone https://github.com/eyes487/image-upload.git
```

2. 进入项目根目录并安装依赖：
```
cd image-upload
npm install
```

```bash
创建数据库 image_store  创建一张表 img_list
```
数据库 账号：root，密码：123456，如果不一致，请自行更改 `server/db.js`

3. 运行项目
```js
npm start
```
浏览器输入http://localhost:9999