// 📦 boxOpen.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const User = require('../models/User');
const GiftBox = require('../models/GiftBox');
const Order = require('../models/Order');
const crypto = require('crypto');

const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

// 📦 Kutu Açma ve Sipariş Oluşturma
router.post('/open-box/:userId/:addressId', async (req, res) => {
  try {
    const { userId, addressId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });

    const today = new Date();
    const isNewDay = !user.lastBoxOpenedDate || user.lastBoxOpenedDate.toDateString() !== today.toDateString();
    if (isNewDay) {
      user.openedBoxesToday = 0;
      user.lastBoxOpenedDate = today;
    }

    const boxCount = req.body.quantity || 1;
    if (user.openedBoxesToday + boxCount > 3) {
      return res.status(403).json({ message: 'Günlük 3 kutu açma hakkınızı aşıyorsunuz.' });
    }

    const giftBox = await GiftBox.findOne({ name: 'Gift Box' });
    if (!giftBox) return res.status(404).json({ message: 'Gift Box bulunamadı' });

    const { low, medium, high } = giftBox.items;
    const totalOrders = await Order.countDocuments();

    const orders = [];

    for (let i = 0; i < boxCount; i++) {
      let selectedItem;
      const isHigh = (totalOrders + i) % 2000 === 0 && totalOrders !== 0;
      const isMedium = (totalOrders + i) % 10 === 0 && totalOrders !== 0;

      if (isHigh && !user.wonHighItem) {
        selectedItem = high[0];
        user.wonHighItem = new mongoose.Types.ObjectId(); // dummy
      } else if (isMedium && user.wonMediumItems.length < 5) {
        const remainingMedium = medium.filter(m => !user.wonMediumItems.includes(m.id));
        if (remainingMedium.length > 0) {
          const mid = randomElement(remainingMedium);
          selectedItem = mid;
          user.wonMediumItems.push(mid.id);
        }
      }

      if (!selectedItem) {
        const remainingLow = low.filter(l => !user.collectedLowItems.includes(l.id));
        if (remainingLow.length === 0) {
          user.collectedLowItems = [];
        }
        const refreshLow = low.filter(l => !user.collectedLowItems.includes(l.id));
        selectedItem = randomElement(refreshLow);
        user.collectedLowItems.push(selectedItem.id);
      }

      const confirmationCode = crypto.randomBytes(4).toString('hex').toUpperCase();
      const orderNumber = totalOrders + i + 1;

      const newOrder = new Order({
        userId,
        addressId,
        items: [{ productId: giftBox._id, quantity: 1 }],
        totalPrice: giftBox.price,
        confirmationCode,
        whatOrdered: selectedItem.id,
        sendOrderId: selectedItem.id
      });
      

      await newOrder.save();
      user.orders.push(newOrder._id);
      orders.push({ item: selectedItem, confirmationCode, orderNumber });
    }

    user.openedBoxesToday += boxCount;
    await user.save();

    res.status(200).json({ orders });
  } catch (err) {
    console.error('❌ Kutu açılırken hata:', err);
    res.status(500).json({ message: 'Sunucu hatası', error: err.message });
  }
});

module.exports = router;
