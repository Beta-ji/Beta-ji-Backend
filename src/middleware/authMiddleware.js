const jwt = require('jsonwebtoken');

// ============================================
// VERIFY JWT TOKEN
// ============================================

const auth = (req, res, next) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        error: 'No token provided. Please login.' 
      });
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your_jwt_secret_key'
    );

    // Attach user ID to request
    req.userId = decoded.id;
    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token has expired. Please login again.' 
      });
    }

    return res.status(401).json({ 
      error: 'Invalid token. Please login again.' 
    });
  }
};

module.exports = auth;
