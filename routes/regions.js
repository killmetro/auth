const express = require('express');
const Region = require('../models/Region');
const GameServer = require('../models/GameServer');

const router = express.Router();

function requireAdmin(req, res, next) {
  const key = req.header('x-admin-api-key');
  if (!process.env.ADMIN_API_KEY) {
    return res.status(500).json({ error: 'ADMIN_API_KEY not configured' });
  }
  if (!key || key !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// POST /api/regions - create region (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { id, name, slug } = req.body;
    const region = await Region.create({ id, name, slug });
    res.status(201).json({ message: 'Region created', region });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Region id must be unique' });
    }
    console.error('Create region error:', error);
    res.status(500).json({ error: 'Failed to create region' });
  }
});

// GET /api/regions - list all regions
router.get('/', async (req, res) => {
  try {
    const regions = await Region.find({}).sort({ name: 1 });
    res.json({ regions });
  } catch (error) {
    console.error('Regions list error:', error);
    res.status(500).json({ error: 'Failed to load regions' });
  }
});

// GET /api/regions/:id/servers - list servers in a region
router.get('/:id/servers', async (req, res) => {
  try {
    const { id } = req.params;
    const servers = await GameServer.find({ region: id.toLowerCase() }).sort({ name: 1 });
    if (!servers.length) {
      return res.json({ servers: [] });
    }
    res.json({ servers });
  } catch (error) {
    console.error('Region servers error:', error);
    res.status(500).json({ error: 'Failed to load region servers' });
  }
});

module.exports = router;
