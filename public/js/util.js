async function blobToString(blob){
    return new Promise(resolve=>{
        const reader = new FileReader()
        reader.onload = function(){
            const ret = reader.result.split('')
                        .map(v=>v.charCodeAt())
                        .map(v=>v.toString(16).toUpperCase())
                        .map(v=>v.padStart(2,'0'))
                        .join(' ')
            resolve(ret)
        }
        reader.readAsBinaryString(blob)
    })
}
async function isGif(file){
    const ret = await blobToString(file.slice(0,6))
    return (ret == '47 49 46 38 39 61') || (ret == '47 49 46 38 37 61')
}

async function isPNG(file){
    const ret = await blobToString(file.slice(0,8))
    return ret == '89 50 4E 47 0D 0A 1A 0A'
}

async function isJPG(file){
    const len = file.size
    const start = await blobToString(file.slice(0,2))
    const tail = await blobToString(file.slice(-2,len))

    return (start == 'FF D8' && (tail == "FF D9"))
}
// 根据头部信息，判断是否是图片
async function isImage(file){
    return (await isJPG(file) || await isPNG(file) || await isGif(file))
}

//对文件切片
function createFileChunk(file,size){
    let chunks = []
    let cur = 0
    while(cur<file.size){
        chunks.push({index: cur, file: file.slice(cur, cur+size)})
        cur += size
    }
    return chunks
}

//webwoker   计算hash
async function calculateHashWorker(chunks){
    return new Promise(resolve=>{
        let worker = new Worker('/js/hash.js')
        worker.postMessage({chunks: chunks})
        worker.onmessage =e=>{
            const {progress, hash} = e.data
            console.log('progress-------',progress);
            // let hashProgress = Number(progress.toFixed(2))
            if(hash){
                resolve(hash)
            }
        }
    })
}

//时间切片   计算hash
async function calculateHashIdle(chunks){
    return new Promise(resolve=>{
        const spark = new SparkMD5.ArrayBuffer()
        let count = 0

        const appendToSpark = async file=>{
            return new Promise(resolve=>{
                const reader = new FileReader()
                reader.readAsArrayBuffer(file)
                reader.onload =e=>{
                    spark.append(e.target.result)
                    resolve()
                }
            })
        }
        const wookloop = async deadLine=>{
            while(count<chunks.length && deadLine.timeRemaining()>1){
                await appendToSpark(chunks[count].file)
                count++
                if(count<chunks.length){
                    let hashProgress = Number(
                        ((100*count)/chunks.length).toFixed(2)
                    )
                    console.log(hashProgress)
                }else{
                    resolve(spark.end())
                }
            }
            window.requestIdleCallback(wookloop)
        }
        window.requestIdleCallback(wookloop)
    })
}