import {
  createProxyMiddleware,
} from "http-proxy-middleware";

const orderProxy = createProxyMiddleware({
  target: process.env.ORDER_SERVICE_URL,
  changeOrigin: true,

  pathRewrite: (path) => {
    return `/orders${path}`;
  },

  on: {
    proxyReq: (proxyReq, req) => {
      console.log(
        `[Gateway] ${req.method} ${req.originalUrl} → ${process.env.ORDER_SERVICE_URL}/orders${req.url}`
      );
    },

    error: (error, req, res) => {
      console.error(
        "Order proxy error:",
        error.message
      );

      if (!res.headersSent) {
        res.status(503).json({
          success: false,
          message:
            "Order Service is unavailable",
        });
      }
    },
  },
});

export default orderProxy;