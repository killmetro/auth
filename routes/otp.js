const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const crypto = require('crypto');
const { SMTPClient } = require('smtp-client');

const router = express.Router();

// In-memory storage for pending OTPs (in production, use Redis or database)
const pendingOTPs = new Map();

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
    secure: process.env.SMTP_SECURE === 'true',
    ignoreTLS: false
  });

  try {
    await client.connect();

    // Always greet first
    await client.greet({ hostname: 'localhost' });

    // Authenticate
    await client.authPlain({
      username: process.env.SMTP_USER,
      password: process.env.SMTP_PASS
    });

    // Send email
    await client.mail({ from: process.env.SMTP_FROM || process.env.SMTP_USER });
    await client.rcpt({ to: to });

    // Format the email content properly
    const emailContent = `From: ${process.env.SMTP_FROM || process.env.SMTP_USER}\r
To: ${to}\r
Subject: ${subject}\r
\r
${text}`;
    await client.data(emailContent);
    await client.quit();

    return { success: true };
  } catch (error) {
    console.error('SMTP Error Details:', error);
    await client.quit().catch(() => { }); // Ignore quit errors
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
      // For new users, store OTP in memory with expiration
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      pendingOTPs.set(email, { otp, expiry: otpExpiry });
      console.log(`New user OTP for ${email}: ${otp}`);
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
        // Check if OTP is valid
        const pendingOTP = pendingOTPs.get(email);
        if (!pendingOTP) {
          return res.status(400).json({
            error: 'Invalid OTP',
            message: 'No OTP found for this email. Please request a new OTP.'
          });
        }

        // Check if OTP is expired
        if (pendingOTP.expiry < new Date()) {
          pendingOTPs.delete(email);
          return res.status(400).json({
            error: 'OTP expired',
            message: 'The OTP has expired. Please request a new OTP.'
          });
        }

        // Check if OTP matches
        if (pendingOTP.otp !== otp) {
          return res.status(400).json({
            error: 'Invalid OTP',
            message: 'The OTP you entered is invalid'
          });
        }

        // OTP is valid, indicate that username is needed
        return res.json({
          message: 'OTP verified',
          email: email,
          needsUsername: true
        });
      } else {
        // Creating new user with username
        // First verify OTP
        const pendingOTP = pendingOTPs.get(email);
        if (!pendingOTP) {
          return res.status(400).json({
            error: 'Invalid OTP',
            message: 'No OTP found for this email. Please request a new OTP.'
          });
        }

        // Check if OTP is expired
        if (pendingOTP.expiry < new Date()) {
          pendingOTPs.delete(email);
          return res.status(400).json({
            error: 'OTP expired',
            message: 'The OTP has expired. Please request a new OTP.'
          });
        }

        // Check if OTP matches
        if (pendingOTP.otp !== otp) {
          return res.status(400).json({
            error: 'Invalid OTP',
            message: 'The OTP you entered is invalid'
          });
        }

        // Remove used OTP
        pendingOTPs.delete(email);

        // Check if username is already taken
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
          return res.status(400).json({
            error: 'Username taken',
            message: 'This username is already in use'
          });
        }

        // Create new user
        const newUser = new User({
          email,
          username
        });

        await newUser.save();

        // Generate token
        const token = jwt.sign(
          { userId: newUser._id },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        // Update user stats
        newUser.lastLogin = new Date();
        newUser.loginCount = 1;
        await newUser.save();

        res.status(201).json({
          message: 'User registered successfully',
          user: newUser.getPublicProfile(),
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