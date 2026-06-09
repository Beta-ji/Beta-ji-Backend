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

app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// ============================================
// DATABASE CONNECTION (OPTIONAL)
// ============================================

if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.log('⚠️ MongoDB Connection Warning:', err.message));
} else {
  console.log('⚠️ MongoDB URI not set - running without database');
}

// ============================================
// ROOT ROUTE
// ============================================

app.get('/', (req, res) => {
  res.json({ 
    message: '✅ Beta Ji Backend is Running!',
    docs: 'Visit /api/health for detailed status',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/register',
      bookings: '/api/bookings',
      payments: '/api/payments'
    }
  });
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', (req, res) => {
  res.json({ 
    status: '✅ Beta Ji Backend is Running!',
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development',
    message: 'Backend API is working correctly'
  });
});

// ============================================
// AUTH ROUTES
// ============================================

try {
  const authRoutes = require('./routes/auth.routes');
  app.use('/api/auth', authRoutes);
  console.log('✅ Auth routes loaded');
} catch (err) {
  console.log('⚠️ Auth routes error:', err.message);
}

// ============================================
// BOOKING ROUTES
// ============================================

try {
  const bookingRoutes = require('./routes/booking.routes');
  app.use('/api/bookings', bookingRoutes);
  console.log('✅ Booking routes loaded');
} catch (err) {
  console.log('⚠️ Booking routes error:', err.message);
}

// ============================================
// PAYMENT ROUTES
// ============================================

try {
  const paymentRoutes = require('./routes/payment.routes');
  app.use('/api/payments', paymentRoutes);
  console.log('✅ Payment routes loaded');
} catch (err) {
  console.log('⚠️ Payment routes error:', err.message);
}

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
  console.log(`🔗 API Root: http://localhost:${PORT}`);
  console.log(`🔗 API Health: http://localhost:${PORT}/api/health`);
});

module.exports = app;
