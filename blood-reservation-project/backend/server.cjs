
const express = require('express');
const connectDB = require('./dbconnection.cjs');
const cors = require('cors');

const inventoryRoutes = require('./routes/inventoryRoutes.cjs');
const facilityRoutes = require('./routes/FacilityRoutes.cjs');


const app = express();

require('dotenv').config();

connectDB();

app.use(express.json());
app.use(cors());

app.use('/api/inventories', inventoryRoutes);
app.use('/api/facilities', facilityRoutes);

app.listen(3000, () => console.log('Server running on port 3000'));
