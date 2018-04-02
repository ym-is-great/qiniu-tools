/**
 * 简单目录上传脚本
 * bug: 目录路径以斜杠结尾时上传后的路径异常
 * bug: 目录层级较多时上传后的路径可能异常
 * bug: 无法控制成功和结束回调
 */

const fs = require('fs')
const qiniu = require('qiniu')

// 授权秘钥
const accessKey = 'Your AccessKey'
const secretKey = 'Your SecretKey'

// 存储空间名称（bucket）
const bucket = 'Your Bucket Name'

// 要上传的资源目录
const staticPath = 'dist/static'

// 上传后的文件前缀
const prefix = 'static'

// 创建鉴权对象
const mac = new qiniu.auth.digest.Mac(accessKey, secretKey)

// 配置机房（Zone_z0=华东 Zone_z1=华北 Zone_z2=华南 Zone_na0=北美）
const config = new qiniu.conf.Config()
config.zone = qiniu.zone.Zone_z2

// 创建表单上传对象
const formUploader = new qiniu.form_up.FormUploader(config)
putExtra = new qiniu.form_up.PutExtra()

// 定义文件上传方法
function uploadFile (localFile) {
  const key = localFile.replace(staticPath, prefix)
  // 生成凭证（覆盖上传）
  const options = {
    scope: bucket + ":" + key,
    prefix: prefix
  }
  const putPolicy = new qiniu.rs.PutPolicy(options)
  const uploadToken = putPolicy.uploadToken(mac)
  // 上传文件
  formUploader.putFile(uploadToken, key, localFile, putExtra, function(respErr,
    respBody, respInfo) {
    if (respErr) throw respErr
    console.log('已上传: ', localFile)
  })
}

// 定义目录上传方法
function uploadDirectory (dirPath) {
  fs.readdir(dirPath, function (err, files) {
    if (err) throw err
    files.forEach(item => {
      let path = `${dirPath}/${item}`
      fs.stat(path, function (err, stats) {
        if (err) throw err
        // 判断是否目录，是目录就继续遍历，否则上传。
        if (stats.isDirectory()) uploadDirectory(path)
        else uploadFile(path, item) 
      })
    })
  })
}

fs.exists(staticPath, function (exists) {
  if (!exists) {
    console.log('目录不存在！')
  }
  else {
    console.log('开始上传...')
    uploadDirectory(staticPath)
  }
})
