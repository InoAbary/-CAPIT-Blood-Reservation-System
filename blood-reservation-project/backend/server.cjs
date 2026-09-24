
const express = require('express');
const connectDB = require('./dbconnection.cjs');

const inventoryRoutes = require('./routes/inventoryRoutes.cjs');

const app = express();
connectDB();

app.use(express.json());

app.use('/api/inventories', inventoryRoutes);

app.listen(5000, () => console.log('Server running on port 5000'));
