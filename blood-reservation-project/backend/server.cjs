const express = require('express');
const connectDB = require('./dbconnection.cjs');

const inventoryRoutes = require('./routes/inventoryRoutes.cjs');


const app = express();

require('dotenv').config();

connectDB();



app.use(express.json());

app.use('/api/inventories', inventoryRoutes);

app.listen(3000, () => console.log('Server running on port 3000'));

