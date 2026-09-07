import { createProxyMiddleware } from "http-proxy-middleware";

const productServiceUrl = process.env.PRODUCT_SERVICE_URL;

if (!productServiceUrl) {
  throw new Error("PRODUCT_SERVICE_URL is not configured");
}

const productProxy = createProxyMiddleware({
  target: productServiceUrl,
  changeOrigin: true,

  pathRewrite: {
    "^/api/products": "/products",
  },

  proxyTimeout: 10000,
  timeout: 10000,

  on: {
    proxyReq: (proxyReq, req) => {
      // Client-provided identity remove
      proxyReq.removeHeader("x-user-id");
      proxyReq.removeHeader("x-user-role");

      // Auth Service se verified identity add
      if (req.authenticatedUser) {
        proxyReq.setHeader("x-user-id", req.authenticatedUser.id);

        proxyReq.setHeader("x-user-role", req.authenticatedUser.role);
      }

      console.log(
        `[Gateway] ${req.method} ${req.originalUrl} → ${productServiceUrl}${proxyReq.path}`,
      );
    },

    error: (error, req, res) => {
      console.error(`[Gateway] Product Service unavailable: ${error.message}`);

      if (!res.headersSent) {
        res.status(503).json({
          success: false,
          message: "Product Service is currently unavailable",
        });
      }
    },
  },
});

export default productProxy;
