import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const connection = await mongoose.connect(process.env.MONGO_URI);

    console.log(
      `Product MongoDB connected: ${connection.connection.host}/${connection.connection.name}`
    );
  } catch (error) {
    console.error(
      `Product MongoDB connection failed: ${error.message}`
    );

    process.exit(1);
  }
};

export default connectDB;