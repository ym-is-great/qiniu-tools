# qiniu-tools

## 安装

安装七牛云 Node.js SDK ：

``` sh
npm intall qiniu --save
```

安装 `qiniu-tools` ：

``` sh
npm install qiniu-tools --save
```

## 使用

``` js
// 引入
const qiniuTools = require('qiniu-tools')

// 配置
qiniuTools.config({
  accessKey: 'Your AccessKey',  // 七牛云 AccessKey
  secretKey: 'Your SecretKey',  // 七牛云 SecretKey
  bucket: 'Your Bucket Name',   // 七牛云存储空间名称
  zone: 'Your Bucket Zone'      // 七牛云存储区域代码 Zone_z0=华东 Zone_z1=华北 Zone_z2=华南 Zone_na0=北美
})

// 上传
qiniuTools.push({
  path: 'dist/static',  // 文件或目录路径
  prefix: 'assets',     // 指定在七牛云存储空间中的路径前缀
  success: function () {
    console.log('Do something if success ...')
  },
  failed: function () {
    console.log('Do something if failed ...')
  }
})
```
