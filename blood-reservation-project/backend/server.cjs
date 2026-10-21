
const express = require('express');
const connectDB = require('./dbconnection.cjs');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const inventoryRoutes = require('./routes/inventoryRoutes.cjs');
const bloodFormRoutes = require('./routes/bloodFormRoutes.cjs');
const facilityRoutes = require('./routes/FacilityRoutes.cjs');
const bloodUnitRoutes = require('./routes/bloodUnitRoutes.cjs');
const authRoutes = require('./routes/auth.cjs');

const requireDonor = require('./middleware/requireDonor.cjs');
const requireStaff = require('./middleware/requireStaff.cjs');

const app = express();

require('dotenv').config();

connectDB();



app.use(express.json());
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));
app.use(cookieParser());



app.use('/api/auth', authRoutes)
app.use('/api/bloodForm', requireDonor, bloodFormRoutes)
app.use('/api/inventories', requireStaff, inventoryRoutes);
app.use('/api/facilities', requireStaff, facilityRoutes);
app.use('/api/bloodUnit', requireStaff, bloodUnitRoutes);

app.listen(3000, () => console.log('Server running on port 3000'));
