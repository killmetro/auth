const mongoose = require('mongoose');

const regionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, uppercase: true, trim: true }
}, { timestamps: true });

regionSchema.index({ id: 1 }, { unique: true });

module.exports = mongoose.model('Region', regionSchema);
