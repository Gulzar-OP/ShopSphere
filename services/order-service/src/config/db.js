import mongoose from "mongoose";

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error(
      "MONGO_URI environment variable is not defined"
    );
  }

  const connection = await mongoose.connect(
    process.env.MONGO_URI
  );

  console.log(
    `Order MongoDB connected: ${connection.connection.host}/${connection.connection.name}`
  );

  return connection;
};

export default connectDB;