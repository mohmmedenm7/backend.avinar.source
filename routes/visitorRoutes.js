// routes/visitorRoutes.js
const express = require('express');
const router = express.Router();
const { addVisitor, getVisitorCount, getAllVisitors } = require('../services/visitorService');

// تسجيل كل زيارة
router.post('/add', async (req, res) => {
  // Ngrok يمرر IP الزائر في x-forwarded-for
const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;


  const visitor = await addVisitor(ip);
  res.status(201).json({
    status: 'success',
    data: visitor,
  });
});

// الحصول على عدد الزوار
router.get('/count', async (req, res) => {
  const count = await getVisitorCount();
  res.status(200).json({ count });
});

// جلب كل الزوار
router.get('/all', async (req, res) => {
  const visitors = await getAllVisitors();
  res.status(200).json({ visitors });
});

module.exports = router;
