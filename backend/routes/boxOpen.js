const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const crypto = require('crypto');

const User = require('../models/User');
const Order = require('../models/Order');
const GiftBox = require('../models/GiftBox');

// Yardımcı Fonksiyon
function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 📦 Kutu açma ve sipariş oluşturma
router.post('/open-box/:userId/:addressId', async (req, res) => {
  try {
    const { userId, addressId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: 'Geçersiz kutu adedi.' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });

    const selectedAddress = user.addresses.id(addressId);
    if (!selectedAddress) return res.status(404).json({ message: 'Adres bulunamadı.' });

    const today = new Date();
    const isNewDay = !user.lastBoxOpenedDate || user.lastBoxOpenedDate.toDateString() !== today.toDateString();
    if (isNewDay) {
      user.openedBoxesToday = 0;
      user.lastBoxOpenedDate = today;
    }

    if (user.openedBoxesToday + quantity > 3) {
      return res.status(403).json({ message: 'Günlük 3 kutu açma hakkınızı aşıyorsunuz.' });
    }

    const giftBox = await GiftBox.findOne({ name: 'Gift Box' });
    if (!giftBox) return res.status(404).json({ message: 'Gift Box bulunamadı.' });

    const { low, medium, high } = giftBox.items;
    const totalOrders = await Order.countDocuments();
    const orders = [];

    for (let i = 0; i < quantity; i++) {
      let selectedItem;
      const currentOrderNumber = totalOrders + i + 1;

      const isHigh = currentOrderNumber % 2000 === 0;
      const isMedium = currentOrderNumber % 10 === 0;

      if (isHigh && !user.wonHighItem) {
        selectedItem = high[0];
        user.wonHighItem = new mongoose.Types.ObjectId(); // dummy kayıt
      } else if (isMedium && user.wonMediumItems.length < 5) {
        const availableMediumItems = medium.filter(m => !user.wonMediumItems.includes(m.id));
        if (availableMediumItems.length > 0) {
          selectedItem = randomElement(availableMediumItems);
          user.wonMediumItems.push(selectedItem.id);
        }
      }

      if (!selectedItem) {
        const availableLowItems = low.filter(l => !user.collectedLowItems.includes(l.id));
        if (availableLowItems.length === 0) {
          user.collectedLowItems = []; // Reset
        }
        const refreshedLowItems = low.filter(l => !user.collectedLowItems.includes(l.id));
        selectedItem = randomElement(refreshedLowItems);
        user.collectedLowItems.push(selectedItem.id);
      }

      const confirmationCode = crypto.randomBytes(4).toString('hex').toUpperCase();

      const newOrder = new Order({
        userId,
        address: {
          title: selectedAddress.title,
          fullAddress: selectedAddress.fullAddress,
          city: selectedAddress.city,
          district: selectedAddress.district,
          phone: selectedAddress.phone
        },
        items: [{ productId: giftBox._id, quantity: 1 }],
        totalPrice: giftBox.fullPrice || giftBox.price,
        confirmationCode,
        whatOrdered: selectedItem.name,
        sendOrderId: selectedItem.id,
      });

      await newOrder.save();
      user.orders.push(newOrder._id);

      orders.push({
        confirmationCode,
        item: selectedItem.name,
        orderNumber: currentOrderNumber,
      });
    }

    user.openedBoxesToday += quantity;
    await user.save();

    res.status(200).json({ orders });
  } catch (err) {
    console.error('❌ Kutu açılırken hata:', err);
    res.status(500).json({ message: 'Sunucu hatası', error: err.message });
  }
});

module.exports = router;
