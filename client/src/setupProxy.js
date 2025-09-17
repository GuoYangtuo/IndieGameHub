const proxy = require('http-proxy-middleware')

module.exports = function (app)  {
  app.use(
    // 代理 1
    proxy.createProxyMiddleware('/api', {             // 匹配到 '/api' 前缀的请求，就会触发该代理配置
      target: 'http://127.0.0.1:5000/api',  // 请求转发地址
      changeOrigin: true,                             // 是否跨域
      /*
        changeOrigin 为 true 时，服务器收到的请求头中的host为：127.0.0.1:6000，也就是代理地址的 host
        changeOrigin 为 false 时，服务器收到的请求头中的host为：localhost:3000，也就是本地站点地址的 host
        changeOrigin 默认 false，但一般需要将 changeOrigin 值设为 true，根据自己需求调整
      */
      pathRewrite: {
        '^/api': ''                                   // 重写请求路径
      }
    })
  )
}
