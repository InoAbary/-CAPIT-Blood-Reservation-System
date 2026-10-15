
const express = require('express');
const connectDB = require('./dbconnection.cjs');

const inventoryRoutes = require('./routes/inventoryRoutes.cjs');
const bloodFormRoutes = require('./routes/bloodFormRoutes.cjs');
const authRoutes = require('./routes/auth.cjs');

const app = express();

require('dotenv').config();

connectDB();



app.use(express.json());

app.use('/api/inventories', inventoryRoutes);
app.use('/api/bloodForm', bloodFormRoutes)
app.use('/api/auth', authRoutes)

app.listen(3000, () => console.log('Server running on port 3000'));
