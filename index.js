const qiniu = require('qiniu')
const path = require('path')
const fs = require('fs')

let mac = null
let config = null
let formUploader = null
let putExtra = null

module.exports =  {
  accessKey: null,
  secretKey: null,
  bucket: null,
  zone: null,
  queue: [],
  /**
   * 配置
   * @param {String} payload.accessKey 七牛云 AccessKey
   * @param {String} payload.secretKey 七牛云 SecretKey
   * @param {String} payload.bucket    七牛云存储空间名称
   * @param {String} payload.zone      七牛云存储区域代码 Zone_z0=华东 Zone_z1=华北 Zone_z2=华南 Zone_na0=北美
   */
  config: function (payload) {
    this.accessKey = payload.accessKey
    this.secretKey = payload.secretKey
    this.bucket = payload.bucket
    this.zone = payload.zone
    mac = new qiniu.auth.digest.Mac(this.accessKey, this.secretKey)
    config = new qiniu.conf.Config()
    config.zone = qiniu.zone[this.zone]
    formUploader = new qiniu.form_up.FormUploader(config)
    putExtra = new qiniu.form_up.PutExtra()
  },
  /**
   * 检查配置完整性
   * @return Boolean
   */
  checkConf: function () {
    let errors = []
    !this.accessKey && errors.push('missing parameter accessKey !')
    !this.secretKey && errors.push('missing parameter secretKey !')
    !this.bucket && errors.push('missing parameter bucket !')
    !this.zone && errors.push('missing parameter zone !')
    if (errors.length) throw new Error(`Configuration error, ${errors[0]}`)
  },
  /**
   * 格式化路径 若路径的最后一个字符为斜杠则移除
   * @param  {String} path 路径字符串
   * @return {String} path 经过处理的路径
   */
  formatDirPath: function (path) {
    if (path.lastIndexOf('/') == path.length - 1) return path.substr(0, path.length - 1)
    else return path
  },
  /**
   * 上传一个文件
   * @param {String}   payload.path   文件路径
   * @param {String}   payload.prefix 存储空间内路径前缀（可选）
   * @param {Function} success        成功回调（可选）
   * @param {Function} failed         失败回调（可选）
   */
  uploadFile: function (payload) {
    // 校验配置及参数
    this.checkConf()
    if (!payload.path) throw new Error(`Parameter 'payload.path' is required !`)
    if (!fs.existsSync(payload.path)) throw new Error(`File not found: ${payload.path}`)
    if (!fs.statSync(payload.path).isFile()) throw new Error(`'${payload.path}' is not a file !`)
    // 生成参数及凭证
    const filePath = payload.path
    const prefix = payload.prefix ? payload.prefix : ''
    const key = prefix ? prefix + path.basename(filePath) : path.basename(filePath)
    const options = {
      scope: this.bucket + ':' + key
    }
    const putPolicy = new qiniu.rs.PutPolicy(options)
    const uploadToken = putPolicy.uploadToken(mac)
    const localFile = filePath
    // 上传文件到七牛
    formUploader.putFile(uploadToken, key, localFile, putExtra, function(respErr, respBody, respInfo) {
      if (respErr) {
        throw respErr
        typeof payload.failed == 'function' && payload.failed()
      }
      if (respInfo.statusCode == 200) {
        console.log(`done: ${respBody.key || localFile}`)
        typeof payload.success == 'function' && payload.success()
      } else {
        console.log('failed: ', respBody)
        typeof payload.failed == 'function' && payload.failed()
      }
    })
  },
  /**
   * 上传一个目录
   * @param {String}   payload.path    目录路径
   * @param {String}   payload.prefix  存储空间内路径前缀（可选）
   * @param {Function} payload.success 成功回调（可选）
   * @param {Function} payload.failed  失败回调（可选）
   */
  uploadDirectory (payload) {
    // 校验配置及参数
    this.checkConf()
    if (!payload.path) throw new Error(`Parameter 'payload.path' is required !`)
    if (!fs.existsSync(payload.path)) throw new Error(`Directory not found: ${payload.path}`)
    if (!fs.statSync(payload.path).isDirectory()) throw new Error(`'${payload.path}' is not a directory !`)
    console.log('start ...')
    this.queue = []
    const origin = this.formatDirPath(payload.path)
    // 遍历目录生成队列
    const map = (dirPath) => {
      const items = fs.readdirSync(dirPath)
      items.forEach(item => {
        const itemPath = `${dirPath}/${item}`
        if (fs.statSync(itemPath).isDirectory()) {
          map(itemPath)
        } else {
          // 用指定前缀替换文件路径中的第一层目录
          const itemDir = path.dirname(itemPath)
          const prefix = payload.prefix ? itemDir.replace(origin, this.formatDirPath(payload.prefix)) + '/' : null
          this.queue.push({ path: itemPath, prefix: prefix })
        }
      })
    }
    map(origin)
    // 逐个上传
    const next = () => {
      if (this.queue.length) {
        this.uploadFile({
          path: this.queue[0].path,
          prefix: this.queue[0].prefix,
          // 若成功移除队列元素并继续
          success: () => {
            this.queue.splice(0, 1)
            next()
          },
          // 若失败中止上传并回调
          failed: () => {
            console.log('Failed !')
            payload.failed()
          }
        })
      } else {
        // 上传成功回调
        console.log('All done !')
        typeof payload.success == 'function' && payload.success()
      }
    }
    next()
  },
  /**
   * 上传文件或目录
   * @param {String}   payload.path    路径
   * @param {String}   payload.prefix  存储空间内路径前缀（可选）
   * @param {Function} payload.success 成功回调（可选）
   * @param {Function} payload.failed  失败回调（可选）
   */
  push: function (payload) {
    this.checkConf()
    if (!payload.path) throw new Error(`Parameter 'payload.path' is required !`)
    if (!fs.existsSync(payload.path)) throw new Error(`File or directory not found: ${payload.path}`)
    fs.statSync(payload.path).isFile() ? this.uploadFile(payload) : this.uploadDirectory(payload)
  }
}
