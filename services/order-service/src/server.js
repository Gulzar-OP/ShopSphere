import "dotenv/config";
import mongoose from "mongoose";

import app from "./app.js";
import connectDB from "./config/db.js";

import {
  connectRabbitMQ,
  closeRabbitMQ,
} from "./config/rabbitmq.js";

const PORT = process.env.PORT || 5004;

let server;
let shuttingDown = false;

const startServer = async () => {
  await connectDB();
  await connectRabbitMQ();

  server = app.listen(PORT, () => {
    console.log(
      `Order Service running on http://localhost:${PORT} in ${process.env.NODE_ENV} mode`
    );
  });
};

const gracefulShutdown = async (signal) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.log(
    `${signal} received. Shutting down Order Service...`
  );

  if (server) {
    await new Promise((resolve) => {
      server.close(resolve);
    });
  }

  await Promise.allSettled([
    mongoose.connection.close(),
    closeRabbitMQ(),
  ]);

  console.log(
    "Order Service dependencies closed"
  );

  process.exit(0);
};

process.on("SIGINT", () =>
  gracefulShutdown("SIGINT")
);

process.on("SIGTERM", () =>
  gracefulShutdown("SIGTERM")
);

startServer().catch(async (error) => {
  console.error(
    `Failed to start Order Service: ${error.message}`
  );

  await Promise.allSettled([
    mongoose.connection.close(),
    closeRabbitMQ(),
  ]);

  process.exit(1);
});