const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const adminAuth = require('../middlewares/adminAuth');
const User = require('../models/User'); 

// Siparişleri listele (adres ve kullanıcı bilgisi dahil)
router.get('/', adminAuth, async (req, res) => {
  try {
    const { query } = req.query;

    const orders = await Order.find()
      .populate({
        path: 'userId',
        select: 'firstName lastName email addresses',
      })
      .populate('items.productId', 'name')
      .exec();

    // Filtreleme
    const filtered = query
      ? orders.filter(order => {
          const fullName = `${order.userId.firstName} ${order.userId.lastName}`.toLowerCase();
          const email = order.userId.email.toLowerCase();
          const orderId = order._id.toString().toLowerCase();
          const q = query.toLowerCase();

          return (
            fullName.includes(q) ||
            email.includes(q) ||
            orderId.includes(q)
          );
        })
      : orders;

    res.json(filtered);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Siparişler alınamadı' });
  }
});

router.put('/:orderId/tracking', adminAuth, async (req, res) => {
    const { trackingNumber } = req.body;
  
    // Kargo takip linki formatına çevir
    const fullUrl = `https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=${trackingNumber}`;
  
    try {
      const order = await Order.findByIdAndUpdate(
        req.params.orderId,
        { trackingNumber: fullUrl },
        { new: true }
      );
      res.json({ message: 'Kargo takip numarası güncellendi', order });
    } catch (err) {
      res.status(500).json({ message: 'Güncelleme hatası' });
    }
  });
  router.put('/:orderId/cancel', async (req, res) => {
    try {
      const order = await Order.findById(req.params.orderId);
      if (!order) return res.status(404).json({ message: 'Sipariş bulunamadı' });
  
      if (order.trackingNumber && order.trackingNumber !== 'İptal Edildi') {
        return res.status(400).json({ message: 'Kargoya verilen sipariş iptal edilemez' });
      }
  
      const user = await User.findById(order.userId);
      if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
  
      const itemKey = order.whatOrdered; // örn: low-2, medium-5, high
      const [category] = itemKey.split('-'); // low, medium, high
  
      if (category === 'low') {
        user.collectedLowItems = user.collectedLowItems.filter(item => item !== itemKey);
      } else if (category === 'medium') {
        user.wonMediumItems = user.wonMediumItems.filter(item => item !== itemKey);
      } else if (category === 'high') {
        if (user.wonHighItem === itemKey) {
          user.wonHighItem = null;
        }
      }
      if (typeof user.openedBoxesToday === 'number' && user.openedBoxesToday > 0) {
        user.openedBoxesToday -= 1;
      }
      order.isCanceled = true;
      order.trackingNumber = 'İptal Edildi';
  
      await order.save();
      await user.save();
  
      res.json({ message: 'Sipariş iptal edildi ve kullanıcıdan kaldırıldı', order });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Sipariş iptali başarısız' });
    }
  });



module.exports = router;
