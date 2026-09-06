import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";
import connectDB from "./config/db.js";

const PORT = process.env.PORT || 5001;

let server;

const startServer = async () => {
  await connectDB();

  server = app.listen(PORT, () => {
    console.log(
      `Auth Service running on http://localhost:${PORT} in ${process.env.NODE_ENV} mode`
    );
  });
};

const gracefulShutdown = async (signal) => {
  console.log(`${signal} received. Shutting down Auth Service...`);

  if (server) {
    server.close(async () => {
      await mongoose.connection.close();
      console.log("MongoDB connection closed");
      process.exit(0);
    });
  } else {
    await mongoose.connection.close();
    process.exit(0);
  }
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

startServer().catch((error) => {
  console.error(`Failed to start Auth Service: ${error.message}`);
  process.exit(1);
});