// filepath: c:\Users\eyile\Documents\GitHub\sakaoglustoreBackend\backend\routes\boxOpen.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const crypto = require('crypto');

const User = require('../models/User');
const Order = require('../models/Order');
const GiftBox = require('../models/GiftBox');
const Counter = require('../models/Counter'); // Sipariş sayacı için

// Yardımcı Fonksiyonlar
function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Günlük sipariş sayacını getiren fonksiyon
async function getTodayOrderCount() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Bugüne ait counter'ı bul veya oluştur
  let counter = await Counter.findOne({ date: today });
  
  if (!counter) {
    counter = new Counter({
      date: today,
      orderCount: 0,
      totalCount: await Counter.countDocuments() > 0 ? 
        await Counter.findOne().sort({ totalCount: -1 }).then(c => c.totalCount) : 0
    });
    await counter.save();
  }
  
  return counter;
}

router.post('/open-box/:userId/:addressId', async (req, res) => {
  const { userId, addressId } = req.params;
  console.log('userId:', userId, 'addressId:', addressId);

  try {
    const { quantity } = req.body;

    if (!quantity || quantity <= 0 || quantity > 3) {
      return res.status(400).json({ message: 'Geçersiz kutu adedi. En az 1, en fazla 3 kutu alabilirsiniz.' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Daily limit kontrolü - Kullanıcı başına günde 1 sipariş, en fazla 3 kutu
    const todayUserOrders = await Order.countDocuments({
      userId: userId,
      createdAt: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (todayUserOrders >= 1) {
      return res.status(403).json({ message: 'Günlük sipariş hakkınızı kullandınız. Her gün saat 01:00 itibariyle yeni sipariş hakkı tanımlanır.' });
    }    
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });

    const selectedAddress = user.addresses.id(addressId);
    if (!selectedAddress) return res.status(404).json({ message: 'Adres bulunamadı.' });

    // Kutu düzenlemesi için gerekli bilgileri topla
    const giftBox = await GiftBox.findOne({ name: 'Süpriz Kutu' });
    if (!giftBox) return res.status(404).json({ message: 'Gift Box bulunamadı.' });

    const { low, medium, high } = giftBox.items;
    
    // Kullanıcının bu ay high item kazanıp kazanmadığını kontrol et
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const hasWonHighThisMonth = await Order.findOne({
      userId,
      createdAt: { $gte: firstDayOfMonth },
      $or: [
        { highItemCount: { $gt: 0 } },
        { maxItemCount: { $gt: 0 } }
      ]
    });
    
    // Günlük ve toplam sipariş sayacını al ve güncelle
    let counter = await getTodayOrderCount();
    counter.orderCount++; // Günlük sayacı arttır
    counter.totalCount++; // Toplam sayacı arttır
    await counter.save();
    
    // Güncel sipariş numarası
    const currentOrderNumber = counter.totalCount;
    
    // Yeni bir sipariş oluştur
    const newOrder = new Order({
      userId,
      address: {
        title: selectedAddress.title,
        fullAddress: selectedAddress.fullAddress,
        city: selectedAddress.city,
        district: selectedAddress.district,
        phone: selectedAddress.phone
      },
      items: [{ productId: giftBox._id, quantity }],
      totalPrice: (giftBox.fullPrice || giftBox.price) * quantity,
      status: 'pending',
      ibanPaymentVerified: false,
      orderNumber: currentOrderNumber,
      orderItems: [],
      lowItemCount: 0,
      mediumItemCount: 0,
      highItemCount: 0,
      maxItemCount: 0
    });
    
    // Ödül dağılımını hesapla
    let specialItemGiven = false;
    
    // Özel sıra kontrolleri (10, 400, 2000 ve katları)
    if (currentOrderNumber % 2000 === 0) {
      // Maximum boy (en büyük) ödül
      if (!hasWonHighThisMonth) {
        const maxItem = high[0]; // Maksimum boy ödül olarak high kullanılır
        newOrder.orderItems.push({
          itemId: maxItem.id,
          itemName: maxItem.name,
          itemType: 'maximum'
        });
        newOrder.maxItemCount = 1;
        specialItemGiven = true;
        
        // Sonraki high sırasını güncelle
        newOrder.nextHighItemOrder = currentOrderNumber + 2000;
      } else {
        // Bu ay zaten max/high kazanmışsa, medium ver
        const mediumItem = randomElement(medium);
        newOrder.orderItems.push({
          itemId: mediumItem.id,
          itemName: mediumItem.name,
          itemType: 'medium'
        });
        newOrder.mediumItemCount = 1;
        specialItemGiven = true;
        
        // Ertelenen high item için sırayı güncelle
        newOrder.nextHighItemOrder = currentOrderNumber + 10;
      }
    } else if (currentOrderNumber % 400 === 0) {
      // Büyük boy ödül
      if (!hasWonHighThisMonth) {
        const highItem = high[0];
        newOrder.orderItems.push({
          itemId: highItem.id,
          itemName: highItem.name,
          itemType: 'high'
        });
        newOrder.highItemCount = 1;
        specialItemGiven = true;
      } else {
        // Bu ay zaten high kazanmışsa, medium ver
        const mediumItem = randomElement(medium);
        newOrder.orderItems.push({
          itemId: mediumItem.id,
          itemName: mediumItem.name,
          itemType: 'medium'
        });
        newOrder.mediumItemCount = 1;
        specialItemGiven = true;
      }
    } else if (currentOrderNumber % 10 === 0) {
      // Orta boy ödül
      const mediumItem = randomElement(medium);
      newOrder.orderItems.push({
        itemId: mediumItem.id,
        itemName: mediumItem.name,
        itemType: 'medium'
      });
      newOrder.mediumItemCount = 1;
      specialItemGiven = true;
    }
    
    // Eğer özel ödül verilmişse, kalan kutuları küçük boy ile doldur
    // Özel ödül verilmemişse, tüm kutuları küçük boy ile doldur
    const remainingBoxes = specialItemGiven ? quantity - 1 : quantity;
    
    for (let i = 0; i < remainingBoxes; i++) {
      // Kullanıcının mevcut düşük seviye itemlarını kontrol et
      const availableLowItems = low.filter(l => !user.collectedLowItems.includes(l.id));
      
      // Eğer kullanıcı 10 unique item topladıysa veya hiç available item kalmadıysa reset at
      if (user.collectedLowItems.length >= 8 || availableLowItems.length === 0) {
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
      
      const lowItem = randomElement(refreshedLowItems);
      user.collectedLowItems.push(lowItem.id);
      
      newOrder.orderItems.push({
        itemId: lowItem.id,
        itemName: lowItem.name,
        itemType: 'low'
      });
      newOrder.lowItemCount++;
      
      // Log collection progress
      console.log(`User ${userId} collected ${user.collectedLowItems.length}/10 unique low items`);
    }
      // Siparişi kaydet
    await newOrder.save();
    user.orders.push(newOrder._id);
    await user.save();
    
    // Kullanıcıya ödül listesini döndür - orders array formatında frontend beklentisine uygun şekilde
    res.status(200).json({
      orders: [{
        orderId: newOrder._id,
        orderNumber: currentOrderNumber,
        quantity: quantity,
        rewards: newOrder.orderItems.map(item => ({
          itemName: item.itemName,
          itemType: item.itemType
        })),
        status: 'pending'
      }]
    });
  } catch (err) {
    console.error('❌ Kutu açılırken hata:', err);
    res.status(500).json({ message: 'Sunucu hatası', error: err.message });
  }
});

module.exports = router;
