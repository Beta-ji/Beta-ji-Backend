const express = require('express');
const router = express.Router();
const bookingController = require('./bookingController');
const auth = require('./authMiddleware');

// ============================================
// PUBLIC ROUTES
// ============================================

// Get price quote
router.post('/quote', bookingController.getQuote);

// ============================================
// PROTECTED ROUTES (Require Authentication)
// ============================================

// Create booking
router.post('/', auth, bookingController.createBooking);

// Get all user's bookings
router.get('/', auth, bookingController.getUserBookings);

// Get specific booking
router.get('/:bookingId', auth, bookingController.getBooking);

// Update booking
router.put('/:bookingId', auth, bookingController.updateBooking);

// Cancel booking
router.post('/:bookingId/cancel', auth, bookingController.cancelBooking);

module.exports = router;
