const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGODB_URI

async function connectDB() {
    try {
        await mongoose.connect(uri);
        console.log('MongoDB connected');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
}

module.exports = connectDB;

