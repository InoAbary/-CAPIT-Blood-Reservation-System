
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./dbconnection.cjs');

const inventoryRoutes = require('./routes/inventoryRoutes.cjs');
const bloodFormRoutes = require('./routes/bloodFormRoutes.cjs');
//const authRoutes = require('./routes/auth.cjs');

const app = express();

app.use(cors({
    origin: 'http://localhost:5173'
}));

app.use(express.json());

connectDB();

// API Routes
app.use('/api/inventories', inventoryRoutes);
app.use('/api/bloodForm', bloodFormRoutes);

// Enable when authRoutes exports a valid router
// app.use('/api/auth', authRoutes);

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
