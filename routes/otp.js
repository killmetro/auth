const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const crypto = require('crypto');
const { SMTPClient } = require('smtp-client');

const router = express.Router();

// Generate a random 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send email using SMTP client
const sendEmailViaSMTP = async (to, subject, text) => {
  // Check if SMTP configuration exists
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('SMTP configuration missing');
  }

  const client = new SMTPClient({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true'
  });

  try {
    await client.connect();
    
    if (process.env.SMTP_SECURE !== 'true') {
      await client.greet({hostname: 'localhost'}); // SMTP greeting
      await client.authPlain({
        username: process.env.SMTP_USER,
        password: process.env.SMTP_PASS
      });
    } else {
      await client.authLogin({
        username: process.env.SMTP_USER,
        password: process.env.SMTP_PASS
      });
    }

    await client.mail({from: process.env.SMTP_FROM || process.env.SMTP_USER});
    await client.rcpt({to: to});
    
    await client.data(text);
    await client.quit();
    
    return { success: true };
  } catch (error) {
    await client.quit().catch(() => {}); // Ignore quit errors
    throw error;
  }
};

// @route   POST /api/otp/send
// @desc    Send OTP to user's email
// @access  Public
router.post('/send', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email required',
        message: 'Email is required to send OTP'
      });
    }

    // Validate email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Please enter a valid email address'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    
    // Generate OTP
    const otp = generateOTP();
    
    if (user) {
      // Existing user - update OTP using the method
      user.setOTP(otp);
      await user.save();
    } else {
      // New user - create temporary user record with OTP
      // No password needed for OTP users
      const tempUser = new User({
        email,
        username: `temp_${Date.now()}` // Temporary username
        // No password field for OTP users
      });
      
      // Set OTP using the method
      tempUser.setOTP(otp);
      await tempUser.save();
    }
    
    // Send OTP via email using SMTP
    try {
      const emailResult = await sendEmailViaSMTP(
        email,
        'Your Login OTP Code',
        `Your OTP code is: ${otp}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.`
      );
      
      if (emailResult.success) {
        res.json({
          message: 'OTP sent to your email',
          isNewUser: !user
        });
      } else {
        res.status(500).json({
          error: 'Failed to send OTP',
          message: 'Unable to send OTP to your email. Please try again.'
        });
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      res.status(500).json({
        error: 'Failed to send OTP',
        message: 'Unable to send OTP to your email. Please try again.'
      });
    }
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      error: 'Failed to send OTP',
      message: 'Unable to send OTP to your email'
    });
  }
});

// @route   POST /api/otp/verify
// @desc    Verify OTP and login/create user
// @access  Public
router.post('/verify', async (req, res) => {
  try {
    const { email, otp, username } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        error: 'Missing fields',
        message: 'Email and OTP are required'
      });
    }

    // Find user by email
    let user = await User.findOne({ email });
    
    if (user) {
      // Existing user - verify OTP
      if (!user.verifyOTP(otp)) {
        return res.status(400).json({
          error: 'Invalid OTP',
          message: 'The OTP you entered is invalid or has expired'
        });
      }
      
      // Clear OTP after successful verification
      user.clearOTP();
      
      // Generate token
      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );
      
      // Update user stats
      user.lastLogin = new Date();
      user.loginCount += 1;
      await user.save();
      
      res.json({
        message: 'Login successful',
        user: user.getPublicProfile(),
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        needsUsername: false
      });
    } else {
      // New user - check if username is provided
      if (!username) {
        // Just verifying OTP for new user, not creating account yet
        // Find the temporary user with this email and OTP
        const tempUser = await User.findOne({ email });
        if (!tempUser || !tempUser.verifyOTP(otp)) {
          return res.status(400).json({
            error: 'Invalid OTP',
            message: 'The OTP you entered is invalid or has expired'
          });
        }
        
        return res.json({
          message: 'OTP verified',
          email: email,
          needsUsername: true
        });
      } else {
        // Creating new user with username
        // First verify OTP by finding the temporary user
        const tempUser = await User.findOne({ email });
        if (!tempUser || !tempUser.verifyOTP(otp)) {
          return res.status(400).json({
            error: 'Invalid OTP',
            message: 'The OTP you entered is invalid or has expired'
          });
        }
        
        // Check if username is already taken
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
          return res.status(400).json({
            error: 'Username taken',
            message: 'This username is already in use'
          });
        }
        
        // Update the temporary user to be a real user
        tempUser.username = username;
        tempUser.clearOTP();
        
        await tempUser.save();
        
        // Generate token
        const token = jwt.sign(
          { userId: tempUser._id },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );
      
        // Update user stats
        tempUser.lastLogin = new Date();
        tempUser.loginCount = 1;
        await tempUser.save();
        
        res.status(201).json({
          message: 'User registered successfully',
          user: tempUser.getPublicProfile(),
          token,
          expiresIn: process.env.JWT_EXPIRES_IN || '7d',
          needsUsername: false
        });
      }
    }
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      error: 'Failed to verify OTP',
      message: 'Unable to verify OTP'
    });
  }
});

module.exports = router;