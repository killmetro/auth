const express = require('express');
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

// POST /api/servers - create server (admin only)
router.post('/servers', requireAdmin, async (req, res) => {
  try {
    const { id, name, region, ip, port, multiplayerip, multiplayerport, status, capacity, currentPlayers, backendUrl } = req.body;
    const server = await GameServer.create({ id, name, region, ip, port, multiplayerip, multiplayerport, status, capacity, currentPlayers, backendUrl });
    res.status(201).json({ message: 'Server created', server });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Server id must be unique' });
    }
    console.error('Create server error:', error);
    res.status(500).json({ error: 'Failed to create server' });
  }
});

// GET /api/servers - full servers list
router.get('/servers', async (req, res) => {
  try {
    const query = {};
    if (req.query.region) {
      query.region = req.query.region.toLowerCase();
    }
    const servers = await GameServer.find(query).sort({ name: 1 });
    res.json({ servers });
  } catch (error) {
    console.error('Servers list error:', error);
    res.status(500).json({ error: 'Failed to load servers' });
  }
});

// GET /api/getservers - condensed servers list
router.get('/getservers', async (req, res) => {
  try {
    const query = {};
    if (req.query.region) {
      query.region = req.query.region.toLowerCase();
    }
    const servers = await GameServer.find(query)
      .select('id name status currentPlayers')
      .sort({ name: 1 });
    const slim = servers.map(s => ({ id: s.id, name: s.name, players: s.currentPlayers, status: s.status }));
    res.json({ servers: slim });
  } catch (error) {
    console.error('Condensed servers list error:', error);
    res.status(500).json({ error: 'Failed to load servers' });
  }
});

module.exports = router;