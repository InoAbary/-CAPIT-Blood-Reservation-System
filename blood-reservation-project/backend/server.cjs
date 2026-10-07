
const express = require('express');
const connectDB = require('./dbconnection.cjs');

const inventoryRoutes = require('./routes/inventoryRoutes.cjs');
const utilizationRoutes = require('./routes/utilizationRoutes.cjs');

const app = express();

require('dotenv').config();

connectDB();



app.use(express.json());

app.use('/api/inventories', inventoryRoutes);
app.use('/api/utilization', utilizationRoutes);

app.listen(3000, () => console.log('Server running on port 3000'));
