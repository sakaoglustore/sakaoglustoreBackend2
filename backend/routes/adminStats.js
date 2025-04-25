const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const adminAuth = require('../middlewares/adminAuth');

// Günlük sipariş istatistiği (son 7 gün)
router.get('/daily-orders', adminAuth, async (req, res) => {
  try {
    const today = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 6); // son 7 gün

    const result = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: lastWeek }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          totalOrders: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'İstatistik alınamadı' });
  }
});

router.get('/top-items', adminAuth, async (req, res) => {
    try {
      const result = await Order.aggregate([
        { $match: { sendOrderId: { $ne: null } } },
        { $group: {
            _id: "$sendOrderId",
            count: { $sum: 1 }
        }},
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);
  
      res.status(200).json(result); // [{ _id: "item1", count: 34 }, ...]
    } catch (err) {
      res.status(500).json({ message: 'İstatistik alınamadı', error: err.message });
    }
  });
  router.get('/order-stats', adminAuth, async (req, res) => {
    try {
      const orders = await Order.find();
  
      const totalRevenue = orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
      const totalOrders = orders.length;
      const averageOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0;
  
      res.status(200).json({
        totalRevenue,
        totalOrders,
        averageOrderValue
      });
    } catch (err) {
      console.error('AOV Hatası:', err);
      res.status(500).json({ message: 'İstatistik alınamadı', error: err.message });
    }
  });
module.exports = router;
