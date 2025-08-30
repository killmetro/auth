const express = require('express');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { 
  profileUpdateValidation,
  handleValidationErrors 
} = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/user/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    res.json({
      user: req.user.getPublicProfile()
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Profile retrieval failed',
      message: 'Unable to get user profile'
    });
  }
});

// @route   PUT /api/user/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, profileUpdateValidation, handleValidationErrors, async (req, res) => {
  try {
    const { username, email } = req.body;
    const user = req.user;

    // Check if username or email is already taken by another user
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({
          error: 'Username already taken',
          message: 'This username is already in use'
        });
      }
      user.username = username;
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          error: 'Email already registered',
          message: 'An account with this email already exists'
        });
      }
      user.email = email;
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: user.getPublicProfile()
    });

  } catch (error) {
    console.error('Profile update error:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        error: 'Duplicate field',
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
      });
    }

    res.status(500).json({
      error: 'Profile update failed',
      message: 'Unable to update profile'
    });
  }
});

// @route   DELETE /api/user/profile
// @desc    Delete user account
// @access  Private
router.delete('/profile', auth, async (req, res) => {
  try {
    const user = req.user;
    
    // Soft delete - mark as inactive instead of removing
    user.isActive = false;
    await user.save();

    res.json({
      message: 'Account deactivated successfully',
      note: 'Your account has been deactivated. Contact support to reactivate if needed.'
    });

  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({
      error: 'Account deletion failed',
      message: 'Unable to deactivate account'
    });
  }
});

// @route   GET /api/user/stats
// @desc    Get user game statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const user = req.user;
    
    res.json({
      stats: user.gameStats,
      lastLogin: user.lastLogin,
      loginCount: user.loginCount,
      memberSince: user.createdAt
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      error: 'Stats retrieval failed',
      message: 'Unable to get user statistics'
    });
  }
});

// @route   PUT /api/user/stats
// @desc    Update user game statistics
// @access  Private
router.put('/stats', auth, async (req, res) => {
  try {
    const { totalPlayTime, gamesPlayed, highScore } = req.body;
    const user = req.user;

    // Update stats if provided
    if (totalPlayTime !== undefined) {
      user.gameStats.totalPlayTime = Math.max(0, totalPlayTime);
    }
    
    if (gamesPlayed !== undefined) {
      user.gameStats.gamesPlayed = Math.max(0, gamesPlayed);
    }
    
    if (highScore !== undefined) {
      user.gameStats.highScore = Math.max(user.gameStats.highScore, highScore);
    }

    await user.save();

    res.json({
      message: 'Statistics updated successfully',
      stats: user.gameStats
    });

  } catch (error) {
    console.error('Stats update error:', error);
    res.status(500).json({
      error: 'Stats update failed',
      message: 'Unable to update statistics'
    });
  }
});

// @route   GET /api/user/leaderboard
// @desc    Get leaderboard (top players by high score)
// @access  Public (optional auth for personalized results)
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const leaderboard = await User.find({ isActive: true })
      .select('username gameStats.highScore gameStats.gamesPlayed createdAt')
      .sort({ 'gameStats.highScore': -1 })
      .limit(limit)
      .skip(skip);

    const total = await User.countDocuments({ isActive: true });

    res.json({
      leaderboard,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        limit
      }
    });

  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({
      error: 'Leaderboard retrieval failed',
      message: 'Unable to get leaderboard'
    });
  }
});

// @route   POST /api/user/session-start
// @desc    Record game session start
// @access  Private
router.post('/session-start', auth, async (req, res) => {
  try {
    const user = req.user;
    
    // Update last login time
    user.lastLogin = new Date();
    user.loginCount += 1;
    
    await user.save();

    res.json({
      message: 'Game session started',
      sessionId: Date.now().toString(),
      user: user.getPublicProfile()
    });

  } catch (error) {
    console.error('Session start error:', error);
    res.status(500).json({
      error: 'Session start failed',
      message: 'Unable to start game session'
    });
  }
});

// @route   GET /api/user/characters
// @desc    Get character IDs per server for the account
// @access  Private
router.get('/characters', auth, async (req, res) => {
  try {
    const accountId = req.user._id.toString();
    const { region } = req.query; // optional filter

    const all = {
      'medley-eu': `char_${accountId.slice(-3)}_medley`,
      'colma-eu': `char_${accountId.slice(-3)}_colma`
    };

    let characters = all;
    if (region) {
      const regionPrefix = region.toLowerCase();
      characters = Object.fromEntries(Object.entries(all).filter(([serverId]) => serverId.includes(regionPrefix)));
    }

    res.json({ accountId, characters });
  } catch (error) {
    console.error('Get characters error:', error);
    res.status(500).json({
      error: 'Characters retrieval failed',
      message: 'Unable to get characters mapping'
    });
  }
});

module.exports = router;
