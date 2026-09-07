import { createProxyMiddleware } from "http-proxy-middleware";

const authServiceUrl = process.env.AUTH_SERVICE_URL;

if (!authServiceUrl) {
  console.error("AUTH_SERVICE_URL is not defined");
  process.exit(1);
}

const authProxy = createProxyMiddleware({
  target: authServiceUrl,
  changeOrigin: true,

  pathRewrite: {
    "^/": "/auth/",
  },

  proxyTimeout: 10000,
  timeout: 10000,

  on: {
    proxyReq: (proxyReq, req) => {
      console.log(
        `[Gateway] ${req.method} ${req.originalUrl} → ${authServiceUrl}${proxyReq.path}`
      );
    },

    error: (error, req, res) => {
      console.error(
        `[Gateway] Auth Service unavailable: ${error.message}`
      );

      if (!res.headersSent) {
        res.status(503).json({
          success: false,
          message: "Auth Service is currently unavailable",
        });
      }
    },
  },
});

export default authProxy;