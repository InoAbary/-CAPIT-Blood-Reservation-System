
const express = require('express');
const connectDB = require('./dbconnection.cjs');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const inventoryRoutes = require('./routes/inventoryRoutes.cjs');
const facilityRoutes = require('./routes/FacilityRoutes.cjs');
const bloodUnitRoutes = require('./routes/bloodUnitRoutes.cjs');
const authRoutes = require('./routes/auth.cjs');

const requireAuth = require('./middleware/requireAuth.cjs');

const app = express();

require('dotenv').config();

connectDB();

app.use(express.json());
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));
app.use(cookieParser());

app.use('/api/auth', authRoutes);

app.use('/api/inventories', requireAuth, inventoryRoutes);
app.use('/api/facilities', requireAuth, facilityRoutes);
app.use('/api/facilities', requireAuth, bloodUnitRoutes);

app.listen(3000, () => console.log('Server running on port 3000'));
