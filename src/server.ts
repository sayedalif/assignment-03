import { Server } from 'http';
import app from './app';
import mongoose from 'mongoose';

let server: Server;
async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB');
    server = app.listen(process.env.PORT as string, () => {
      console.log(`Server is running on port ${process.env.PORT as string}`);
    });
  } catch (error) {
    console.log(error);
  }
}
main();
