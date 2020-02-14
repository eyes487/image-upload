var aUpload = document.querySelector('.selectImg')
var button = document.querySelector('#upload')
var fileinput = document.getElementById('file')
var imageList = document.querySelector('.image-list')
var mask = document.querySelector('.mask')
var close = document.querySelector('.close')
var cover_img = document.querySelector('#cover_img')
var previewDOM = document.querySelector('.preview')

var deleteLists = [],checkIds = [],pageNum = 1,pageSize = 15,canLoad = true;
var windowCW,  //窗口视口的宽度
    n,         //一行能容纳多少个div，并向下取整
    center,    //居中
    arrH = []; //定义一个数组存放每个item的高度
const BASE_URL = 'http://localhost:9999';

/**
 * 选择文件
 */
fileinput.onchange = () => {
    var files = fileinput.files;
    let imgDOMArray = new Array(files.length)
    let reader = []
    let thumbPic = []
    progressDOM = document.getElementById('progress-img')
    for (let i = 0; i < files.length; i++) {
        if(files[i].type.indexOf('image')>-1){
            reader[i] = new FileReader()
            thumbPic[i] = document.createElement('div')
            imgDOMArray[i] = document.createElement('img')
            imgDOMArray[i].file = files[i]
            thumbPic[i].className = 'thumbPic'
            thumbPic[i].appendChild(imgDOMArray[i])
            previewDOM.appendChild(thumbPic[i])
            reader[i].readAsDataURL(files[i])
            reader[i].onload = (img => {
                return e => {
                    img.src = e.target.result
                }
            })(imgDOMArray[i])
        }else{
            thumbPic[i] = document.createElement('div')
            imgDOMArray[i] = document.createElement('p')
            thumbPic[i].className = 'thumbPic'
            thumbPic[i].appendChild(imgDOMArray[i])
            previewDOM.appendChild(thumbPic[i])
            imgDOMArray[i].innerHTML = files[i].name;
        }
        
    }
}
button.onclick = uploadFile;
/**
 * 上传文件
 */
function uploadFile() {
    var xhr = new XMLHttpRequest();
    var formdata = new FormData()
    var files = fileinput.files
    if (!files[0]) {
        alert('请先选择图片，再上传！')
        return
    }
    var progress = document.querySelector('progress')
    for (let i = 0; i < files.length; i++) {
        formdata.append('imgfile', files[i], files[i].name)
    }
    xhr.open('POST', BASE_URL+'/uploadimg')
    xhr.upload.onprogress = e => {
        if (e.lengthComputable) {
            var progressWrap = document.querySelector('.progress')
            progressWrap.style.display = "flex"
            var percentComplete = e.loaded / e.total * 100
            progress.value = percentComplete
            if (percentComplete >= 100) {
                progress.value = 0
                progressWrap.style.display = "none"
            }
        }
    }
    xhr.send(formdata)
    xhr.onload = () => {
        if (xhr.readyState == 4 && xhr.status === 200) {
            previewDOM.innerHTML = ''
            xhr = null;
            //上传之后，显示在最上面，所以把所有数据重置，从第一页查询
            document.querySelector('.image-list').innerHTML = null;
            arrH = [];
            pageNum = 1;
            getImageList();
        }
    }
}
/**
 * 查询图片列表
 */
function getImageList() {
    canLoad = false; //请求数据时，改为不可加载
    var xhr = new XMLHttpRequest();
    xhr.open('GET', BASE_URL+`/getImageList?pageNum=${pageNum}&pageSize=${pageSize}`);
    xhr.send();
    xhr.onload = () => {
        if (xhr.readyState == 4 && xhr.status === 200) {
            let res = JSON.parse(xhr.responseText);
            let data = res.data;
            renderImage(data);
        }
    }
}

/**
 * 渲染图片
 * @param {*} list 图片数据
 */
function renderImage(list) {
    let Node = [];
    let Fragment = document.createDocumentFragment();
    for (let i = 0, len = list.length; i < len; i++) {
        let Div = document.createElement('div');
        Div.setAttribute('class','image-item');
        Div.innerHTML = `
            <input type="checkbox" class="delete-checkbox" onClick="selectDeleteImg(this,'${list[i].id}','${list[i].imgSrc}')">
            <img class="img" src="./uploads/${list[i].imgSrc}"/>
            <p class="desc">${list[i].imgSrc}</p>
        `;
        Node.push(Div)
        Fragment.appendChild(Div);
    }    
    //设置新增加点的位置
    change(Node,list);
    imageList.appendChild(Fragment)
    //渲染完之后
    if(!(list.length < pageSize)){
        pageNum++;
        canLoad = true;
    }
}

/**
 * 改变指定图片尺寸
 * @param {*} Items dom元素
 * @param {*} source 图片数据，窗口改变大小不传
 */
function change(Items,source) {
    if (n <= 0) { return };
    
    for (var i = 0; i < Items.length; i++) {
        var j = i % n;
        let height = source ? Math.ceil(380/(source[i].width/source[i].height))+70 : Items[i].offsetHeight; //根据图片设置宽度380，同比缩放高度
        if (arrH.length == n) {                    //一行排满n个后到下一行                    
            var min = findMin(arrH);              //从最“矮”的排起，可以从下图的序号中看得出来，下一行中序号是从矮到高排列的
            Items[i].style.left = center + min * 410 + "px";
            Items[i].style.top = arrH[min] + 10 + "px";
            arrH[min] += height + 10;
        } else {
            arrH[j] = height;
            Items[i].style.left = center + 400 * j + 10 * j + "px";
            Items[i].style.top = 0;
        }
    };
}
/**
 * 懒加载
 */
function lazyLoad(){
    let height = arrH.length && arrH[findMin(arrH)];    
    if(canLoad && height){
        let scrollTop = document.documentElement.scrollTop;
        let clientHeight = document.documentElement.clientHeight;

        if(scrollTop + clientHeight > height){
            getImageList()
        }
    }
}
/**
 * 选中图片--->删除
 * @param {*} obj 
 * @param {*} id 
 * @param {*} img 
 */
function selectDeleteImg(obj, id, img) {
    if (obj.checked) {
        deleteLists.push(img);
        checkIds.push(id)
    } else {
        deleteLists = deleteLists.filter(src => src != img)
        checkIds = checkIds.filter(src => src != id)
    }
}

/**
 * 删除图片
 */
function deleteImages() {
    if (!deleteLists.length) {
        return alert('请选择图片')
    }
    var pwd = prompt('输入密码')
    if (!pwd) {
        return;
    }
    var xhr = new XMLHttpRequest();
    xhr.open('GET', BASE_URL+'/deleteImages?list=' + deleteLists.join(',')+'&ids='+checkIds.join(',')+'&pwd='+pwd, true);
    xhr.send();
    xhr.onload = () => {
        if (xhr.readyState == 4) {
            if(xhr.status === 200){
                //删除之后，所以把所有数据重置，从第一页查询
                document.querySelector('.image-list').innerHTML = null;
                arrH = [];
                pageNum = 1;
                getImageList();
                deleteLists = [];
                checkIds = [];
            }else if(xhr.status === 401){
                alert('密码错误')
            }
        }
    }
}

/**
 * 重新计算窗口宽度
 */
function resetSize(){
    windowCW = document.documentElement.clientWidth;  //窗口视口的宽度
    n = Math.floor(windowCW / 410);                     //一行能容纳多少个div，并向下取整
    center = (windowCW - n * 410) / 2;                   //居中
    arrH = [];                                       //定义一个数组存放每个item的高度
}
/**
 * 窗口改变
 */
function resizeLoad(){
    var Items = document.querySelectorAll('.image-item')
    resetSize();
    change(Items);
}
/**
 * 查询数组中最小的数据
 * @param {*} arr 
 */
function findMin(arr) {
    var m = 0;
    for (var i = 0; i < arr.length; i++) {
        m = Math.min(arr[m], arr[i]) == arr[m] ? m : i;
    }
    return m;
}
/**
 * 查看大图
 * @param {*} target 
 */
function lookPic(target) {
    cover_img.src = target.src;
    mask.setAttribute('class', 'mask show')
}
imageList.addEventListener('click', function (e) {
    // 兼容性处理
    var event = e || window.event;
    var target = event.target || event.srcElement;
    if (target.nodeName === 'IMG') {
        lookPic(target);
    }
})
close.addEventListener('click', function (e) {
    mask.setAttribute('class', 'mask hide')
})

window.onscroll = lazyLoad;
window.onresize = resizeLoad;

//初始化
resetSize();
getImageList();