import mongoose from 'mongoose';


async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URL, {
   
    });
    console.log('MongoDB connected successfully!');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1); 
  }
}

export default connectToDatabase;
 