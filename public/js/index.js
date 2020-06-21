
var aUpload = document.querySelector('.selectImg')
var button = document.querySelector('#upload')
var fileinput = document.getElementById('file')
var imageList = document.querySelector('.image-list')
var mask = document.querySelector('.mask')
var close = document.querySelector('.close')
var cover_img = document.querySelector('#cover_img')
var previewDOM = document.querySelector('.preview')
var progressWrap = document.querySelector('.progress')

var deleteLists = [],checkIds = [],pageNum = 1,pageSize = 15,canLoad = true;
var windowCW,  //窗口视口的宽度
    n,         //一行能容纳多少个div，并向下取整
    center,    //居中
    arrH = []; //定义一个数组存放每个item的高度
// const BASE_URL = 'http://47.106.187.172:9999';
const BASE_URL = 'http://localhost:9999';
const chunkSize = 0.5*1024*1024;

/**
 * 选择文件
 */
fileinput.onchange =async () => {
    var files = fileinput.files;

    let imgDOMArray = new Array(files.length)
    let reader = []
    let thumbPic = []
    
    progressDOM = document.getElementById('progress-img')
    for (let i = 0; i < files.length; i++) {
        let ret = await isImage(files[i])
        if(!ret) return alert('只能上传图片，格式不正确！！！')

        reader[i] = new FileReader()
        thumbPic[i] = document.createElement('div')
        imgDOMArray[i] = document.createElement('img')
        imgDOMArray[i].file = files[i]
        thumbPic[i].className = 'thumbPic'
        thumbPic[i].appendChild(imgDOMArray[i])
        previewDOM.innerHTML = '';//暂时清空
        previewDOM.appendChild(thumbPic[i])
        reader[i].readAsDataURL(files[i])
        reader[i].onload = (img => {
            return e => {
                img.src = e.target.result
            }
        })(imgDOMArray[i])
    }
}
button.onclick = uploadFile;
/**
 * 上传文件
 */
async function uploadFile() {
    const files = fileinput.files
    if (!files[0]) {
        alert('请先选择图片，再上传！')
        return
    }
    const chunks = createFileChunk(files[0],chunkSize)
    //方法一：webwoker方式计算hash值
    const hash = await calculateHashWorker(chunks)
    //方式er： requestIdleCallback方式
    // const hash1 = await calculateHashIdle(chunks);
    
    //判断文件是否上传成功，如果没有，是否有存在的切片
    const {uploaded, uploadedList} = await checkFile(hash)
    if(uploaded){
        //秒传
        fileinput.value = null
        previewDOM.innerHTML = ''
        return alert('秒传成功')
    }
    const chunksData = chunks.map((chunk,index)=>{
        const name = hash + '_' + index
        return {
            hash,
            name,
            index,
            chunk: chunk.file,
            progress: uploadedList.indexOf(name)>-1? 100 : 0
        }
    })
    const progressChunkMap = setProgress(chunksData)
    await uploadChunks(chunksData, progressChunkMap,hash,uploadedList)
}
/**
 * 
 * 为区块设置进度条
 */
function setProgress(chunks){
    progressWrap.innerHTML = ''
    progressWrap.style.display = "flex"
    let progressChunkMap = {}
    chunks.map((chunk,index)=>{
        const node = document.createElement('div')
        node.className = 'progressChunk success'
        progressWrap.appendChild(node)
        chunk.progress==100
            ?node.style.height = 100*0.3 +'px'
            :progressChunkMap[chunk.name] = node   
    })
    return progressChunkMap
}
/**
 * 判断文件是否上传成功，如果没有，是否有存在的切片
 */
function checkFile(hash){
    const file = fileinput.files[0]
    return new Promise(resolve=>{
        var xhr = new XMLHttpRequest();
        xhr.open('POST', BASE_URL+'/checkFile')
        xhr.setRequestHeader("Content-type","application/x-www-form-urlencoded");
        xhr.send(`ext=${file.name.split('.').pop()}&hash=${hash}`)
        xhr.onload = () => {
            if (xhr.readyState == 4 && xhr.status === 200) {
                let res = JSON.parse(xhr.responseText);
                let data = res.data;
                xhr = null
                resolve(data)
            }
        }
    })
}
/**
 * 上传切片
 */
async function uploadChunks(chunks, progressChunkMap,hash,uploadedList){
    const requests = chunks
    .filter(chunk=>uploadedList.indexOf(chunk.name)==-1)
    .map((chunk,index)=>{
        //转成promise
        const form = new FormData()
        form.append('chunk', chunk.chunk)
        form.append('hash', chunk.hash)
        form.append('name', chunk.name)

        return {form,name:chunk.name}
    }).map(({form,name},index)=>{
        return new Promise(resolve=>{
            var xhr = new XMLHttpRequest();
            xhr.open('POST', BASE_URL+'/uploadimg')
            xhr.upload.onprogress = e => {
                if (e.lengthComputable) {
                    var percentComplete = e.loaded / e.total * 100
                    progressChunkMap[name].style.height = percentComplete*0.3 +'px'
                    if (percentComplete >= 100) {
                        progressChunkMap[name].style.height = 100*0.3 +'px'
                    }
                }
            }
            xhr.send(form)
            xhr.onload = () => {
                if (xhr.readyState == 4 && xhr.status === 200) {
                    xhr = null;
                    resolve(1)
                }
            }
        })
    })
    await Promise.all(requests)
    mergeRequest(hash)
}
/**
 * 合并切片请求
 */
function mergeRequest(hash){
    const file = fileinput.files[0]
    var xhr = new XMLHttpRequest();
    xhr.open('POST', BASE_URL+'/mergeFile')
    xhr.setRequestHeader("Content-type","application/x-www-form-urlencoded");
    xhr.send(`ext=${file.name.split('.').pop()}&size=${chunkSize}&hash=${hash}`)
    xhr.onload = () => {
        if (xhr.readyState == 4 && xhr.status === 200) {
            fileinput.value = null
            previewDOM.innerHTML = ''
            xhr = null;
            // 上传之后，显示在最上面，所以把所有数据重置，从第一页查询
            progressWrap.style.display = "none"
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

const observer = new IntersectionObserver(function(changes) {
    changes.forEach(function(element, index) {
     // 当这个值大于0，说明满足我们的加载条件了，这个值可通过rootMargin手动设置
      if (element.intersectionRatio > 0) {
        // 放弃监听，防止性能浪费，并加载图片。
        observer.unobserve(element.target);
        element.target.src = element.target.dataset.src;
      }
    });
});

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
            <img class="img" data-src="./uploads/${list[i].imgSrc}"/>
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
        lazyLoad()
    }
    initObserver();
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


function initObserver() {
  const listItems = document.querySelectorAll('.img');
  listItems.forEach(function(item) {
   // 对每个list元素进行监听
    observer.observe(item);
  });
}


//初始化
resetSize();
getImageList();