const mongoose = require('mongoose');

const gameServerSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  region: { type: String, required: true, lowercase: true, trim: true },
  ip: { type: String, required: true, trim: true },
  port: { type: Number, required: true, min: 1, max: 65535 },
  multiplayerip: { type: String, required: true, trim: true },
  multiplayerport: { type: Number, required: true, min: 1, max: 65535 },
  status: { type: String, enum: ['online', 'offline', 'maintenance'], default: 'offline' },
  capacity: { type: Number, default: 0, min: 0 },
  currentPlayers: { type: Number, default: 0, min: 0 },
  // ✅ NEW: Backend URL for API connections (optional, fallback to ip:port)
  backendUrl: { type: String, required: false, trim: true }
}, { timestamps: true });

gameServerSchema.index({ id: 1 }, { unique: true });
gameServerSchema.index({ region: 1 });

module.exports = mongoose.model('GameServer', gameServerSchema);