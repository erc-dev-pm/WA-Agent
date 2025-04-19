import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

class Database {
  private static instance: Database;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('Using existing database connection');
      return;
    }

    try {
      const options = {
        autoIndex: true,
        minPoolSize: 10,
        maxPoolSize: 50,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      };

      await mongoose.connect(process.env.MONGODB_URI!, options);

      mongoose.connection.on('connected', () => {
        console.log('Connected to MongoDB');
        this.isConnected = true;
      });

      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
        this.isConnected = false;
      });

    } catch (error) {
      console.error('Error connecting to MongoDB:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('Disconnected from MongoDB');
    } catch (error) {
      console.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  public getConnection(): mongoose.Connection {
    return mongoose.connection;
  }

  public isConnectedToDatabase(): boolean {
    return this.isConnected;
  }
}

export default Database; 