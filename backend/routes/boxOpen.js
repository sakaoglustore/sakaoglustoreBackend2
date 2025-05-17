const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const crypto = require('crypto');

const User = require('../models/User');
const Order = require('../models/Order');
const GiftBox = require('../models/GiftBox');

// Yardımcı Fonksiyonlar
function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function getNextHighItemOrder() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastOrder = await Order.findOne({
    nextHighItemOrder: { $exists: true }
  }).sort({ nextHighItemOrder: -1 });
  
  return lastOrder ? lastOrder.nextHighItemOrder : 2000;
}

router.post('/open-box/:userId/:addressId', async (req, res) => {
  const { userId, addressId } = req.params;
  console.log('userId:', userId, 'addressId:', addressId);

  try {
    const { userId, addressId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: 'Geçersiz kutu adedi.' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);    // Daily limit kontrolü - Kullanıcı başına toplam 1 kutu
    const todayUserOrders = await Order.countDocuments({
      userId: userId,
      createdAt: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (todayUserOrders + quantity > 2) {
      return res.status(403).json({ message: 'Günlük kutu limiti 1 adettir.' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });

    const selectedAddress = user.addresses.id(addressId);
    if (!selectedAddress) return res.status(404).json({ message: 'Adres bulunamadı.' });

    // Günlük kutu açma limiti kontrolü
    const isNewDay = !user.lastBoxOpenedDate || user.lastBoxOpenedDate.toDateString() !== today.toDateString();
    if (isNewDay) {
      user.openedBoxesToday = 0;
      user.lastBoxOpenedDate = today;
    }    if (user.openedBoxesToday + quantity > 2) {
      return res.status(403).json({ message: 'Günlük 1 kutu açma hakkınızı aşıyorsunuz.' });
    }

    const giftBox = await GiftBox.findOne({ name: 'Süpriz Kutu' });
    if (!giftBox) return res.status(404).json({ message: 'Gift Box bulunamadı.' });

    const { low, medium, high } = giftBox.items;
    const orders = [];

    // Kullanıcının bu ay high item kazanıp kazanmadığını kontrol et
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const hasWonHighThisMonth = await Order.findOne({
      userId,
      createdAt: { $gte: firstDayOfMonth },
      whatOrdered: high[0].name
    });

    // Sonraki high item sırasını al
    let nextHighItemOrder = await getNextHighItemOrder();

    for (let i = 0; i < quantity; i++) {
      let selectedItem;
      const currentOrderNumber = todayUserOrders + i + 1;
      // High item kontrolü
      if (currentOrderNumber === nextHighItemOrder) {
        if (!hasWonHighThisMonth) {
          selectedItem = high[0];
          nextHighItemOrder += 2000; // Sonraki high item için sırayı güncelle
        } else {
          // Bu ay zaten high item kazanmışsa, medium ver ve high'ı ertele
          const currentSet = Math.floor(user.wonMediumItems.length / 5);
          const currentSetItems = user.wonMediumItems.slice(currentSet * 5);
          const availableMediumItems = medium.filter(m => 
            !currentSetItems.includes(m.id)
          );

          if (availableMediumItems.length > 0) {
            selectedItem = randomElement(availableMediumItems);
            user.wonMediumItems.push(selectedItem.id);
          }
          
          // High item hakkını 10 sipariş sonrasına ertele
          nextHighItemOrder += 10;
        }
      } 
      // Medium item kontrolü (10'da bir ve high ile çakışmıyorsa)
      else if (currentOrderNumber % 10 === 0 && currentOrderNumber !== nextHighItemOrder) {
        const currentSet = Math.floor(user.wonMediumItems.length / 5);
        const currentSetItems = user.wonMediumItems.slice(currentSet * 5);
        const availableMediumItems = medium.filter(m => 
          !currentSetItems.includes(m.id)
        );

        if (availableMediumItems.length > 0) {
          selectedItem = randomElement(availableMediumItems);
          user.wonMediumItems.push(selectedItem.id);
        }
      }

      // Low item seçimi
      if (!selectedItem) {
        // Kullanıcının mevcut düşük seviye itemlarını kontrol et
        const availableLowItems = low.filter(l => !user.collectedLowItems.includes(l.id));
        
        // Eğer kullanıcı 10 unique item topladıysa veya hiç available item kalmadıysa reset at
        if (user.collectedLowItems.length >= 10 || availableLowItems.length === 0) {
          user.collectedLowItems = []; // Reset collection
          console.log('Low items collection reset for user:', userId);
        }
        
        // Reset sonrası mevcut itemları tekrar filtrele
        const refreshedLowItems = low.filter(l => !user.collectedLowItems.includes(l.id));
        
        if (refreshedLowItems.length === 0) {
          // Bu duruma düşmemeli ama güvenlik için kontrol
          console.error('No available low items after reset!');
          return res.status(500).json({ message: 'Item selection error' });
        }
        
        selectedItem = randomElement(refreshedLowItems);
        user.collectedLowItems.push(selectedItem.id);
        
        // Log collection progress
        console.log(`User ${userId} collected ${user.collectedLowItems.length}/10 unique low items`);
      }

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
        status: 'pending', // Set initial status as pending
        ibanPaymentVerified: false,
        whatOrdered: selectedItem.name,
        sendOrderId: selectedItem.id,
        nextHighItemOrder: selectedItem === high[0] ? nextHighItemOrder : undefined
      });

      await newOrder.save();
      user.orders.push(newOrder._id);

      orders.push({
        orderId: newOrder._id,
        item: selectedItem.name,
        orderNumber: currentOrderNumber,
        status: 'pending'
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
