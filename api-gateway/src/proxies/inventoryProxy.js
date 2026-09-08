import { createProxyMiddleware } from "http-proxy-middleware";

const inventoryServiceUrl =
  process.env.INVENTORY_SERVICE_URL;

if (!inventoryServiceUrl) {
  throw new Error(
    "INVENTORY_SERVICE_URL is not configured"
  );
}

const inventoryProxy = createProxyMiddleware({
  target: inventoryServiceUrl,
  changeOrigin: true,

  pathRewrite: {
    "^/": "/inventory",
  },

  proxyTimeout: 10000,
  timeout: 10000,

  on: {
    proxyReq: (proxyReq, req) => {
      // Client ke fake headers remove
      proxyReq.removeHeader("x-user-id");
      proxyReq.removeHeader("x-user-role");

      // Gateway-verified identity set
      if (req.authenticatedUser) {
        proxyReq.setHeader(
          "x-user-id",
          req.authenticatedUser.id
        );

        proxyReq.setHeader(
          "x-user-role",
          req.authenticatedUser.role
        );
      }

      console.log(
        `[Gateway] ${req.method} ${req.originalUrl} → ${inventoryServiceUrl}${proxyReq.path}`
      );
    },

    error: (error, req, res) => {
      console.error(
        `[Gateway] Inventory Service unavailable: ${error.message}`
      );

      if (!res.headersSent) {
        res.status(503).json({
          success: false,
          message:
            "Inventory Service is currently unavailable",
        });
      }
    },
  },
});

export default inventoryProxy;