const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGODB_LINK || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/blood-reservation'

async function connectDB() {
    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 2500 });
        console.log('MongoDB connected');
    } catch (err) {
        console.warn(`MongoDB unavailable (${err.message}); admin demo mode remains available.`);
    }
}

module.exports = connectDB;

