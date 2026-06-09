const Razorpay = require('razorpay');
const crypto = require('crypto');
const Booking = require('./Booking');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET
});

// ============================================
// CREATE RAZORPAY ORDER
// ============================================

exports.createOrder = async (req, res) => {
  try {
    const { bookingId, amount } = req.body;

    if (!bookingId || !amount) {
      return res.status(400).json({ 
        error: 'Please provide bookingId and amount' 
      });
    }

    // Verify booking exists and belongs to user
    const booking = await Booking.findOne({ bookingId });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.userId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Create Razorpay order
    const options = {
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: bookingId,
      notes: {
        bookingId: bookingId,
        service: 'baggage_shipping'
      }
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt
      },
      razorpayKey: process.env.RAZORPAY_KEY_ID
    });

  } catch (error) {
    console.error('Create Order Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// VERIFY RAZORPAY PAYMENT
// ============================================

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, bookingId } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ 
        error: 'Please provide payment details' 
      });
    }

    // Verify signature
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ 
        error: 'Payment verification failed' 
      });
    }

    // Update booking status
    const booking = await Booking.findOne({ bookingId });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    booking.status = 'confirmed';
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      booking
    });

  } catch (error) {
    console.error('Verify Payment Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// GET PAYMENT DETAILS
// ============================================

exports.getPaymentDetails = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findOne({ bookingId });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.userId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.status(200).json({
      success: true,
      payment: {
        bookingId: booking.bookingId,
        amount: booking.totalPrice,
        basePrice: booking.basePrice,
        insurance: booking.insurancePrice,
        taxes: booking.taxes,
        status: booking.status
      }
    });

  } catch (error) {
    console.error('Get Payment Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// REQUEST REFUND
// ============================================

exports.requestRefund = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findOne({ bookingId });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.userId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (booking.status === 'delivered') {
      return res.status(400).json({ 
        error: 'Cannot refund delivered bookings' 
      });
    }

    // Process refund (simplified - would need payment ID in real scenario)
    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    booking.cancelReason = reason || 'Refund requested';

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      refundAmount: booking.totalPrice
    });

  } catch (error) {
    console.error('Refund Error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = exports;
