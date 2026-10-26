require('dotenv').config();

const express = require('express');
const connectDB = require('./dbconnection.cjs');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const inventoryRoutes = require('./routes/inventoryRoutes.cjs');
const bloodFormRoutes = require('./routes/bloodFormRoutes.cjs');
const facilityRoutes = require('./routes/FacilityRoutes.cjs');
const bloodUnitRoutes = require('./routes/bloodUnitRoutes.cjs');
const authRoutes = require('./routes/auth.cjs');
const utilizationRoutes = require('./routes/utilizationRoutes.cjs');
const bloodRequestAdminRoutes = require('./routes/bloodRequestAdminRoutes.cjs');
const inventoryFulfillmentRoutes = require('./routes/inventoryFulfillmentRoutes.cjs');

const requireDonor = require('./middleware/requireDonor.cjs');
const requireStaff = require('./middleware/requireStaff.cjs');

const app = express();


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
app.use('/api/facilities', facilityRoutes);
app.use('/api/bloodUnit', requireStaff, bloodUnitRoutes);
app.use('/api/bloodUnits', requireStaff, bloodUnitRoutes);
app.use('/api/utilization', requireStaff, utilizationRoutes);
app.use('/api/inventory-fulfillment', inventoryFulfillmentRoutes);
// Both paths use the same facility-scoped router; keep the legacy alias safe.
app.use('/api/blood-requests', bloodRequestAdminRoutes);
app.use('/api/bloodRequest', bloodRequestAdminRoutes);

app.listen(3000, () => console.log('Server running on port 3000'));
