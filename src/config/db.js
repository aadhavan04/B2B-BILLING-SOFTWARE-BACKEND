import mongoose from "mongoose";

const LOCAL_DB_URI = "mongodb://127.0.0.1:27017/b2b_billing";

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || LOCAL_DB_URI;

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000,
    });
    console.log(`MongoDB connected: ${mongoose.connection.name}`);
    return true;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);

    if (uri !== LOCAL_DB_URI) {
      try {
        await mongoose.connect(LOCAL_DB_URI, {
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 5000,
        });
        console.log(`MongoDB connected: ${mongoose.connection.name}`);
        return true;
      } catch (fallbackError) {
        console.error("Local MongoDB connection failed:", fallbackError.message);
      }
    }

    if (process.env.SKIP_DB_START === "true") {
      console.warn("Starting server without a reachable MongoDB database.");
    } else {
      console.warn("Starting server without a reachable MongoDB database.");
    }

    return false;
  }
};
