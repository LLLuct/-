// 系统标准库放在前面
const fs = require('fs')

// 接着放第三方库
const request = require('syncrequest')
const cheerio = require('cheerio')

// 需要使用 cookie 和 user-agent，这两个内容放在了 config.js 中
// 使用 require 的方式获取 cookie 和 userAgent
let cookie = 'waf_cookie=aca44333-53e7-493bd257f5b89e5ed0ffcb9d166145105397; _ydclearance=ff443edbc201f1d4a14dfad8-710e-4cf4-b871-a3083851273d-1585228953; _userCode_=20203261922362290; _userIdentity_=20203261922362045; _tt_=CC67FFBC4063C0CC195B7CDBDE99CC0C; DefaultCity-CookieKey=423; DefaultDistrict-CookieKey=0; __utma=196937584.571206183.1585221757.1585221757.1585221757.1; __utmc=196937584; __utmz=196937584.1585221757.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); Hm_lvt_6dd1e3b818c756974fb222f0eae5512e=1585221757; __utmt=1; __utmt_~1=1; __utmb=196937584.12.10.1585221757; Hm_lpvt_6dd1e3b818c756974fb222f0eae5512e=1585223017'
let userAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36
`

// 最后放自己写的模块
const log = console.log.bind(console)

// ES6 定义一个类
class Movie {
    constructor() {
        // 分别是电影名/评分/引言/排名/封面图片链接/评价人数
        this.name = ''
        this.score = 0
        this.quote = ''
        this.ranking = 0
        this.coverUrl = ''
    }
}

const movieFromDiv = (div) => {
    let e = cheerio.load(div)


    let movie = new Movie()
    movie.name = e('.c_fff').text()
    movie.quote = e('.mt3').text()

    //电影序号父元素
    let number = e('.number')
    // find 是用来查找子元素的
    movie.ranking = number.find('em').text()

    //电影海报的父元素
    let pic = e('.mov_pic')
    //attr()是获取元素属性的工具函数，比如id，class这些属性都能通过这个拿到
    movie.coverUrl = pic.find('img').attr('src')

    // let other = e('.other').text()
    // movie.otherNames = other.slice(3).split('/').join('|')
    movie.score = e('.point').text()
    return movie
}

const ensurePath = (dir) => {
    //如果不存在就创建一个
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir)
    }
}

const cachedUrl = (url) => {
    // 1. 确定缓存的文件名
    let dir = 'mtime_html'
    ensurePath(dir)
    let temp = url.split('top100')[1]
    let b = temp.indexOf('/')
    if (b !== -1) {
        temp = temp.split('/')[1]
    }
    let cacheFile = dir + '/' + temp

    // 2. 检查缓存文件是否存在
    // 如果存在就读取缓存文件
    // 如果不存在就下载并且写入缓存文件
    let exists = fs.existsSync(cacheFile)
    if (exists) {
        let data = fs.readFileSync(cacheFile, 'utf8')
        return data
    } else {
        // 要伪装登录，需要使用 user-agent 和 cookie
        let options = {
            'headers': {
                'user-agent': userAgent,
                'cookie': cookie,
            }
        }
        // 用 GET 方法获取 url 链接的内容
        // 相当于你在浏览器地址栏输入 url 按回车后得到的 HTML 内容
        let r = request.get.sync(url, options)
        // r.body 就是网页的源码
        let body = r.body
        // console.log('r', body)   //url没错
        fs.writeFileSync(cacheFile, body)
        return body
        // log('body: ', body)
    }
}

const moviesFromUrl = (url) => {
    let body = cachedUrl(url)
    // log('url', url)
    // log('body', body)
    // cheerio.load 用来把 HTML 格式的字符串解析为一个可以操作的 DOM
    // 注意, e 依然是一个函数
    let e = cheerio.load(body)
    log('body:', body)
    // 一共有 10 个 li       //li是每个电影的div的属性
    let asyn = e('#asyncRatingRegion')
    let movieDivs = asyn.find('li')
    // 循环处理 10 个 li
    let movies = []
    for (let i = 0; i < movieDivs.length; i++) {
        let div = movieDivs[i]
        // 扔给 movieFromDiv 函数来获取到一个 movie 对象
        let m = movieFromDiv(div)
        movies.push(m)
    }
    return movies
}

//把数据写到mtime.json文件里面
const saveMovie = (movies) => {
    let s = JSON.stringify(movies, null, 2)
    // 把 json 格式字符串写入到 文件 中
    let path = 'mtime.json'
    fs.writeFileSync(path, s)
}

// //保存图片到covers文件夹里面
// const downloadCovers = (movies) => {
//     let dir = 'covers'
//     ensurePath(dir)         //创建covers文件夹
//     for (let i = 0; i < movies.length; i++) {
//         let m = movies[i]
//         let url = m.coverUrl    //这是电影海报的src
//         let path = dir + '/' + m.ranking + '_' + m.name + '.jpg'  //这是保存图片文件名的要求
//         request.sync(url, {
//             // pipe 参数是套路, 指定存储的文件名称就可以
//             pipe: path
//         })
//     }
//     log('图片保存完毕')
// }

const __main = () => {
    // 主函数
    let movies = []

    for (let i = 1; i < 11; i++) {
        let start = ''
        if ( i === 1) {
            start = ''
        } else {
            start = `index-${i}.html`
        }
        let url = `http://www.mtime.com/top/movie/top100/${start}`
        let moviesInPage = moviesFromUrl(url)
        // log('moviesInPage: ', moviesInPage)
        // ES6 写法
        movies = [...movies, ...moviesInPage]
        // 常规语法
        // movies = movies.concat(moviesInPage)
    }

    saveMovie(movies)
    // downloadCovers(movies)
    log('抓取成功, 数据已经写入到 douban.json 中')
}

__main()