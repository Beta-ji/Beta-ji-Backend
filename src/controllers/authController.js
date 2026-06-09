const jwt = require('jsonwebtoken');
const User = require('./User');

// ============================================
// GENERATE JWT TOKEN
// ============================================

const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'your_jwt_secret_key',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// ============================================
// REGISTER USER
// ============================================

exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, confirmPassword, userType } = req.body;

    // Validation
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ 
        error: 'Please provide all required fields' 
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ 
        error: 'Passwords do not match' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { phone }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: 'Email or phone number already registered' 
      });
    }

    // Create user
    const user = new User({
      name,
      email,
      phone,
      password,
      userType: userType || 'general'
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Return response
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: user.getPublicProfile()
    });

  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// LOGIN USER
// ============================================

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Please provide email and password' 
      });
    }

    // Find user and include password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    // Compare passwords
    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({ 
        error: 'Your account has been deactivated' 
      });
    }

    // Generate token
    const token = generateToken(user._id);

    // Return response
    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: user.getPublicProfile()
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// VERIFY TOKEN
// ============================================

exports.verifyToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your_jwt_secret_key'
    );

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.status(200).json({
      success: true,
      user: user.getPublicProfile()
    });

  } catch (error) {
    console.error('Token Verification Error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ============================================
// GET PROFILE
// ============================================

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      success: true,
      user: user.getPublicProfile()
    });

  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// UPDATE PROFILE
// ============================================

exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, address, preferredContact, whatsappNumber } = req.body;

    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        name,
        phone,
        address,
        preferredContact,
        whatsappNumber,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: user.getPublicProfile()
    });

  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = exports;
