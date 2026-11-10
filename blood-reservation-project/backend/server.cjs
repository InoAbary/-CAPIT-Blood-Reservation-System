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
const bloodRequestRoutes = require('./routes/bloodRequestRoutes.cjs');
const adminRoutes = require('./routes/adminRoutes.cjs');
const bloodRequestAdminRoutes = require('./routes/bloodRequestAdminRoutes.cjs');
const inventoryFulfillmentRoutes = require('./routes/inventoryFulfillmentRoutes.cjs');
const forgotPasswordEmailRoutes = require('./routes/forgotPasswordEmailRoutes.cjs');
const staffPasswordRecoveryRoutes = require('./routes/staffPasswordRecoveryRoutes.cjs');
const branchAdminRoutes = require('./routes/branchAdminRoutes.cjs');
const staffRoutes = require('./routes/staffRoutes.cjs');
const appointmentRoutes = require('./routes/appointmentRoutes.cjs')
const donationRoutes = require('./routes/donationRoutes.cjs')

const requireDonor = require('./middleware/requireDonor.cjs');
const requireStaff = require('./middleware/requireStaff.cjs');
const requireRole = require('./middleware/requireRole.cjs');

const app = express();


connectDB().then(async () => {
    try {
        const { startDonationReminders } = require('./services/donationReminders.cjs');
        await startDonationReminders();
    } catch (error) {
        console.error('Donation reminders could not start:', error.message);
    }
});



app.use(express.json());
app.use(cors({
    origin: new URL(process.env.FRONTEND_URL || "http://localhost:5173").origin,
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
app.use('/api/branch-admin', requireStaff, branchAdminRoutes);
app.use('/api/staff', requireStaff, staffRoutes)
app.use('/api/inventory-fulfillment', inventoryFulfillmentRoutes);
// Both paths use the same facility-scoped router; keep the legacy alias safe.
app.use('/api/blood-requests', bloodRequestAdminRoutes);
app.use('/api/bloodRequest', bloodRequestAdminRoutes);
app.use('/api/admin/donors', requireStaff, requireRole('admin'), require('./routes/adminDonorRoutes.cjs'));
app.use('/api/admin', requireStaff, requireRole('admin'), adminRoutes);
// Public recovery endpoints: users cannot sign in until their password is reset.
app.use('/api/donor', forgotPasswordEmailRoutes);
app.use('/api/donor', require('./routes/mobileNumberChangeRoutes.cjs'));
app.use('/api/donor', require('./routes/donorNotificationRoutes.cjs'));
app.use('/api/donor', require('./routes/donorProfileRoutes.cjs'));
app.use('/api/staff-recovery', staffPasswordRecoveryRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/donations', requireStaff, donationRoutes);

app.listen(3000, () => console.log('Server running on port 3000'));
