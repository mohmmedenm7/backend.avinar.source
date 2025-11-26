// models/visitorModel.js
const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema(
  {
    ip: { type: String, required: true },
    country: { type: String },
    city: { type: String },
    lat: { type: Number },
    lng: { type: Number },
  },
  { timestamps: true }
);

const Visitor = mongoose.model('Visitor', visitorSchema);
module.exports = Visitor;
