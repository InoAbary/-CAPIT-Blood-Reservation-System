const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGODB_LINK || process.env.MONGODB_URI || '';

async function connectDB() {
    mongoose.set('bufferCommands', false); // CRITICAL: fail fast, don't hang
    if (!uri) {
        console.warn('[AI Studio] No MONGODB_LINK configured — running with in-memory mock data');
        return;
    }
    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
        console.log('MongoDB connected');
    } catch (err) {
        console.warn('MongoDB not connected — using mock fallback:', err.message);
    }
}

module.exports = connectDB;
