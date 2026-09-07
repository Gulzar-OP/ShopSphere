import "dotenv/config";
import app from "./app.js";

const PORT = process.env.PORT || 5050;

const server = app.listen(PORT, () => {
  console.log(
    `API Gateway running on http://localhost:${PORT} in ${process.env.NODE_ENV} mode`
  );
});

const gracefulShutdown = (signal) => {
  console.log(`${signal} received. Shutting down API Gateway...`);

  server.close(() => {
    console.log("API Gateway stopped");
    process.exit(0);
  });
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));