const express = require('express');
const connectDB = require('./dbconnection.cjs');
const inventoryRoutes = require('./routes/inventoryRoutes.cjs');
const facilityRoutes = require('./routes/facilityRoutes.cjs');
require('dotenv').config();

const app = express();

connectDB();

app.use(express.json());

app.use('/api/inventories', inventoryRoutes);
app.use('/api/facilities', facilityRoutes);

// Database offline error fallback middleware (Phase 2.2)
app.use((err, req, res, next) => {
  if (err.name === 'MongooseError' || err.name === 'MongoNetworkError' || (err.message && err.message.includes('buffering timed out'))) {
    console.warn('[AI Studio] Database offline — returning mock empty response');
    if (req.method === 'GET') {
      return res.json(req.path.endsWith('s') || req.path.endsWith('s/') ? [] : {});
    }
    return res.status(503).json({ error: 'Service temporarily unavailable (database offline)' });
  }
  next(err);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://0.0.0.0:${PORT}`));
