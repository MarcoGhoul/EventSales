// En Compose, API_TARGET usa el nombre del servicio. En macOS, usa el puerto local.
module.exports = {
  '/api/**': {
    target: process.env.API_TARGET || 'http://127.0.0.1:8080',
    changeOrigin: true,
  },
};
