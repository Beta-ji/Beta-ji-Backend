const Booking = require('./Booking');
const User = require('./User');

// ============================================
// CREATE BOOKING
// ============================================

exports.createBooking = async (req, res) => {
  try {
    const {
      journeyType,
      pickupAddress,
      pickupDate,
      pickupTimeSlot,
      deliveryAddress,
      deliveryDate,
      numberOfBags,
      totalWeight,
      bagTypes,
      bagDescriptions,
      specialInstructions,
      fragileItems,
      dangerousGoods
    } = req.body;

    // Validation
    if (!journeyType || !pickupAddress || !deliveryAddress || !numberOfBags || !totalWeight) {
      return res.status(400).json({ 
        error: 'Please provide all required fields' 
      });
    }

    if (journeyType !== 'domestic' && journeyType !== 'international') {
      return res.status(400).json({ 
        error: 'Invalid journey type' 
      });
    }

    // Create booking
    const booking = new Booking({
      userId: req.userId,
      journeyType,
      pickupAddress,
      pickupDate,
      pickupTimeSlot,
      deliveryAddress,
      deliveryDate,
      numberOfBags,
      totalWeight,
      bagTypes,
      bagDescriptions,
      specialInstructions,
      fragileItems: fragileItems || false,
      dangerousGoods: dangerousGoods || false
    });

    // Calculate price
    booking.calculatePrice();

    // Save booking
    await booking.save();

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking,
      estimatedPrice: booking.totalPrice,
      bookingId: booking.bookingId,
      trackingNumber: booking.bookingId
    });

  } catch (error) {
    console.error('Create Booking Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// GET BOOKING BY ID
// ============================================

exports.getBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findOne({ bookingId })
      .populate('userId', 'name email phone');

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check if user owns this booking
    if (booking.userId._id.toString() !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.status(200).json({
      success: true,
      booking
    });

  } catch (error) {
    console.error('Get Booking Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// GET USER'S BOOKINGS
// ============================================

exports.getUserBookings = async (req, res) => {
  try {
    const { status, limit = 10, page = 1 } = req.query;

    let query = { userId: req.userId };

    if (status) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Booking.countDocuments(query);

    res.status(200).json({
      success: true,
      bookings,
      total,
      page,
      pages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('Get User Bookings Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// UPDATE BOOKING
// ============================================

exports.updateBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status, specialInstructions, deliveryDate } = req.body;

    const booking = await Booking.findOne({ bookingId });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check authorization
    if (booking.userId.toString() !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Only allow status change by admin
    if (status && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Only admin can change status' });
    }

    // Update fields
    if (specialInstructions) booking.specialInstructions = specialInstructions;
    if (deliveryDate) booking.deliveryDate = deliveryDate;
    if (status) {
      booking.status = status;
      if (status === 'delivered') booking.deliveredAt = new Date();
      if (status === 'picked-up') booking.pickupCompletedAt = new Date();
    }

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Booking updated successfully',
      booking
    });

  } catch (error) {
    console.error('Update Booking Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// CANCEL BOOKING
// ============================================

exports.cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { cancelReason } = req.body;

    const booking = await Booking.findOne({ bookingId });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check authorization
    if (booking.userId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Only allow cancellation if not already in transit
    if (['in-transit', 'delivered'].includes(booking.status)) {
      return res.status(400).json({ 
        error: 'Cannot cancel booking in transit or already delivered' 
      });
    }

    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    booking.cancelReason = cancelReason || 'User cancelled';

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      booking
    });

  } catch (error) {
    console.error('Cancel Booking Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// GET PRICE QUOTE
// ============================================

exports.getQuote = async (req, res) => {
  try {
    const { journeyType, totalWeight } = req.body;

    if (!journeyType || !totalWeight) {
      return res.status(400).json({ 
        error: 'Please provide journeyType and totalWeight' 
      });
    }

    // Calculate quote
    const basePricePerKg = journeyType === 'domestic' ? 10 : 120;
    const basePrice = totalWeight * basePricePerKg;
    const insurancePrice = Math.round(basePrice * 0.05);
    const taxes = Math.round((basePrice + insurancePrice) * 0.18);
    const totalPrice = basePrice + insurancePrice + taxes;

    res.status(200).json({
      success: true,
      quote: {
        journeyType,
        weight: totalWeight,
        basePrice,
        insurancePrice,
        taxes,
        totalPrice,
        pricePerKg: basePricePerKg
      }
    });

  } catch (error) {
    console.error('Get Quote Error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = exports;
