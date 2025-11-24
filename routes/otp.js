const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const router = express.Router();

// Generate a random 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Create transporter for nodemailer (configured via environment variables)
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
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
      const tempUser = new User({
        email,
        username: `temp_${Date.now()}`, // Temporary username
        password: crypto.randomBytes(20).toString('hex') // Random password
      });
      
      // Set OTP using the method
      tempUser.setOTP(otp);
      await tempUser.save();
    }
    
    // Send OTP via email using SMTP
    try {
      const transporter = createTransporter();
      
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Your Login OTP Code',
        text: `Your OTP code is: ${otp}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.`
      };
      
      await transporter.sendMail(mailOptions);
      
      res.json({
        message: 'OTP sent to your email',
        isNewUser: !user
      });
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