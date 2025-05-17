const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const adminAuth = require('../middlewares/adminAuth');
const User = require('../models/User'); 

router.get('/', adminAuth, async (req, res) => {
  try {
    const { query = '', page = 1, limit = 50 } = req.query;
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    // Tüm siparişleri çek
    const orders = await Order.find()
      .populate({
        path: 'userId',
        select: 'firstName lastName email phone addresses',
      })
      .populate('items.productId', 'name')
      .sort({ createdAt: -1 }) // Yeni siparişler önce
      .exec();

    // Arama filtrelemesi
    const filtered = query
      ? orders.filter(order => {
          const fullName = `${order.userId?.firstName || ''} ${order.userId?.lastName || ''}`.toLowerCase();
          const email = order.userId?.email?.toLowerCase() || '';
          const orderId = order._id.toString().toLowerCase();
          const search = query.toLowerCase();

          return (
            fullName.includes(search) ||
            email.includes(search) ||
            orderId.includes(search)
          );
        })
      : orders;

    // Sayfalama (örneğin 50 şer 50 şer göster)
    const startIndex = (pageNumber - 1) * limitNumber;
    const paginated = filtered.slice(startIndex, startIndex + limitNumber);

    res.json({
      orders: paginated,
      totalOrders: filtered.length,
      currentPage: pageNumber,
      totalPages: Math.ceil(filtered.length / limitNumber),
    });
  } catch (err) {
    console.error('❌ Sipariş çekme hatası:', err);
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
  });  router.put('/verify-order/:orderId', adminAuth, async (req, res) => {
    try {
      const { orderId } = req.params;
      const { status } = req.body; // 'confirmed' or 'rejected'
  
      if (!['confirmed', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Geçersiz sipariş durumu' });
      }
  
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Sipariş bulunamadı' });
      }
  
      order.status = status;
      order.ibanPaymentVerified = status === 'confirmed';
      await order.save();
  
      // Send notification to user about order status
      // TODO: Implement notification system
  
      res.status(200).json({ message: 'Sipariş durumu güncellendi', order });
    } catch (error) {
      console.error('Sipariş onaylama hatası:', error);
      res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
  });



module.exports = router;
