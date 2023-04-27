const str = "你好：《我们试试》这个前端的分词效果，你说怎么样？Let's try Intl.Segmenter, should we ?"
let segmenterZH = new Intl.Segmenter('zh', { granularity: 'grapheme' })
let segments = segmenterZH.segment(str)
for (let segment of segments) {
    // console.log(`${segment.index}:${segment.segment}`)
    // if (/\p{P}(?<=[\u3000-\u303F\uFF00-\uFFEF])/u.test(segment.segment)) {
    if (/\p{P}(?<=[\u3000-\u303F])/u.test(segment.segment)) {
        console.log(`${segment.index}:${segment.segment}`)
    }
}
// console.log("----------------")
// for (let segment of segments) {
//     if (/\p{sc=Han}/u.test(segment.segment)) {
//         console.log(`${segment.index}:${segment.segment}`)
//     }
// }