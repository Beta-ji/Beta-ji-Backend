const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// ============================================
// MIDDLEWARE
// ============================================

app.use(helmet()); // Security headers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// ============================================
// DATABASE CONNECTION
// ============================================

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/betaji', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.log('❌ MongoDB Error (don\'t worry for local testing):', err.message));

// ============================================
// BASIC ROUTES (For testing)
// ============================================

app.get('/api/health', (req, res) => {
  res.json({ 
    status: '✅ Beta Ji Backend is Running!',
    timestamp: new Date(),
    environment: process.env.NODE_ENV
  });
});

// ============================================
// AUTH ROUTES
// ============================================

const authRoutes = require('./routes/auth.routes');
app.use('/api/auth', authRoutes);

// ============================================
// BOOKING ROUTES
// ============================================

const bookingRoutes = require('./routes/booking.routes');
app.use('/api/bookings', bookingRoutes);

// ============================================
// PAYMENT ROUTES
// ============================================

const paymentRoutes = require('./routes/payment.routes');
app.use('/api/payments', paymentRoutes);

// ============================================
// ERROR HANDLING
// ============================================

app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      error: 'Validation Error',
      details: Object.values(err.errors).map(e => e.message)
    });
  }
  
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid Token' });
  }
  
  res.status(err.status || 500).json({ 
    error: err.message || 'Server Error'
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Beta Ji Backend running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Health: http://localhost:${PORT}/api/health`);
});

module.exports = app;
