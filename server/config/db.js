const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
    if (isConnected && mongoose.connection.readyState === 1) {
        return;
    }

    if (!process.env.MONGODB_URI) {
        console.error('CRITICAL: MONGODB_URI is missing from environment variables!');
        throw new Error('MONGODB_URI_MISSING');
    }

    try {
        console.log('Connecting to MongoDB Atlas...');
        const db = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10
        });
        isConnected = !!db.connections[0].readyState;
        console.log('Successfully connected to MongoDB Atlas');
    } catch (error) {
        console.error('CRITICAL: MongoDB Connection Error!', error.message);
        throw error;
    }
};

module.exports = { connectDB };
