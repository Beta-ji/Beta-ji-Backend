const express = require('express');
const router = express.Router();
const authController = require('./authController');
const auth = require('./authMiddleware');

// ============================================
// PUBLIC ROUTES
// ============================================

// Register
router.post('/register', authController.register);

// Login
router.post('/login', authController.login);

// Verify Token
router.post('/verify-token', authController.verifyToken);

// ============================================
// PROTECTED ROUTES (Require Authentication)
// ============================================

// Get Profile
router.get('/profile', auth, authController.getProfile);

// Update Profile
router.put('/profile', auth, authController.updateProfile);

module.exports = router;
