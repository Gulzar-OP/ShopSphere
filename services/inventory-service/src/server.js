import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";
import connectDB from "./config/db.js";
import {
  connectRabbitMQ,
  closeRabbitMQ,
} from "./config/rabbitmq.js";

const PORT = process.env.PORT || 5003;

let server;
let shuttingDown = false;

const startServer = async () => {
  await connectDB();
  await connectRabbitMQ();

  server = app.listen(PORT, () => {
    console.log(
      `Inventory Service running on http://localhost:${PORT} in ${process.env.NODE_ENV} mode`
    );
  });
};

const gracefulShutdown = async (signal) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.log(
    `${signal} received. Shutting down Inventory Service...`
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
    "Inventory Service dependencies closed"
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
    `Failed to start Inventory Service: ${error.message}`
  );

  await Promise.allSettled([
    mongoose.connection.close(),
    closeRabbitMQ(),
  ]);

  process.exit(1);
});