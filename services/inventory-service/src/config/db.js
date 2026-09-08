import mongoose from "mongoose";

const connectDB = async () => {
  const connection = await mongoose.connect(
    process.env.MONGO_URI
  );

  console.log(
    `Inventory MongoDB connected: ${connection.connection.host}/${connection.connection.name}`
  );

  return connection;
};

export default connectDB;