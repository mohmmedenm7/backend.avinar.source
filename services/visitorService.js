const Visitor = require('../models/visitorModel');
const axios = require('axios');

async function addVisitor(ip) {
  try {
    const response = await axios.get(`https://ipapi.co/${ip}/json/`);
    const { country_name, city, latitude, longitude } = response.data;

    const visitor = await Visitor.create({
      ip,
      country: country_name,
      city,
      lat: latitude,
      lng: longitude,
    });

    return visitor;
  } catch (err) {
    console.error('Error adding visitor:', err.message);
    return null;
  }
}

async function getVisitorCount() {
  return await Visitor.countDocuments();
}

async function getAllVisitors() {
  return await Visitor.find().sort({ createdAt: -1 });
}

module.exports = { addVisitor, getVisitorCount, getAllVisitors };
