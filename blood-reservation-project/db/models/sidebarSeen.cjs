const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  _id: String,
  seenThrough: { type: Date, required: true },
}, { versionKey: false });

module.exports = mongoose.model('SidebarSeen', schema);
