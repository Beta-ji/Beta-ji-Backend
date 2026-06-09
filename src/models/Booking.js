const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  // Booking ID
  bookingId: {
    type: String,
    unique: true,
    index: true
  },
  
  // User Reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Journey Type
  journeyType: {
    type: String,
    enum: ['domestic', 'international'],
    required: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'picked-up', 'in-transit', 'delivered', 'cancelled'],
    default: 'pending'
  },
  
  // ============================================
  // PICKUP DETAILS
  // ============================================
  
  pickupAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: String,
    zipcode: { type: String, required: true },
    country: { type: String, required: true }
  },
  pickupDate: {
    type: Date,
    required: true
  },
  pickupTimeSlot: {
    type: String,
    enum: ['morning', 'afternoon', 'evening'],
    required: true
  },
  pickupCompletedAt: Date,
  
  // ============================================
  // DELIVERY DETAILS
  // ============================================
  
  deliveryAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: String,
    zipcode: { type: String, required: true },
    country: { type: String, required: true }
  },
  deliveryDate: {
    type: Date,
    required: true
  },
  estimatedDeliveryDate: Date,
  deliveredAt: Date,
  
  // ============================================
  // BAGGAGE DETAILS
  // ============================================
  
  numberOfBags: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  totalWeight: {
    type: Number,
    required: true,
    min: 1
  },
  bagTypes: [{
    type: String,
    enum: ['suitcase', 'duffel', 'backpack', 'box', 'other']
  }],
  bagDescriptions: String,
  
  // ============================================
  // SPECIAL INSTRUCTIONS
  // ============================================
  
  specialInstructions: String,
  fragileItems: {
    type: Boolean,
    default: false
  },
  dangerousGoods: {
    type: Boolean,
    default: false
  },
  
  // ============================================
  // PRICING
  // ============================================
  
  basePrice: {
    type: Number,
    required: true
  },
  insurancePrice: {
    type: Number,
    default: 0
  },
  taxes: {
    type: Number,
    default: 0
  },
  totalPrice: {
    type: Number,
    required: true
  },
  pricePerKg: Number,
  
  // ============================================
  // TRACKING
  // ============================================
  
  trackingNumber: String,
  gpsLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: [Number] // [longitude, latitude]
  },
  currentLocation: String,
  
  // ============================================
  // TIMESTAMPS
  // ============================================
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  cancelledAt: Date,
  cancelReason: String
}, { timestamps: true });

// Create index for geospatial queries
BookingSchema.index({ gpsLocation: '2dsphere' });

// ============================================
// MIDDLEWARE: Generate Booking ID
// ============================================

BookingSchema.pre('save', async function(next) {
  if (!this.bookingId) {
    const count = await mongoose.model('Booking').countDocuments();
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    this.bookingId = `BJ-${date}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// ============================================
// METHODS: Calculate price
// ============================================

BookingSchema.methods.calculatePrice = function() {
  const basePricePerKg = this.journeyType === 'domestic' ? 10 : 120;
  this.basePrice = this.totalWeight * basePricePerKg;
  this.insurancePrice = Math.round(this.totalPrice * 0.05); // 5% insurance
  this.taxes = Math.round((this.basePrice + this.insurancePrice) * 0.18); // 18% GST
  this.totalPrice = this.basePrice + this.insurancePrice + this.taxes;
  return this.totalPrice;
};

module.exports = mongoose.model('Booking', BookingSchema);
