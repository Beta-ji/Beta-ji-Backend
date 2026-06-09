const express = require('express');
const router = express.Router();
const paymentController = require('./paymentController');
const auth = require('./authMiddleware');

// ============================================
// ALL ROUTES REQUIRE AUTHENTICATION
// ============================================

// Create Razorpay order
router.post('/create-order', auth, paymentController.createOrder);

// Verify payment
router.post('/verify', auth, paymentController.verifyPayment);

// Get payment details
router.get('/:bookingId', auth, paymentController.getPaymentDetails);

// Request refund
router.post('/:bookingId/refund', auth, paymentController.requestRefund);

module.exports = router;
