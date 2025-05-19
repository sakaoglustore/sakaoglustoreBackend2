// filepath: c:\Users\eyile\Documents\GitHub\sakaoglustoreBackend\backend\cron\cancelUnpaidOrders.js
const cron = require('node-cron');
const Order = require('../models/Order');
const User = require('../models/User');

// Her gün saat 13:00'de çalışacak cron job (Türkiye saati ile)
const cancelUnpaidOrders = cron.schedule('0 13 * * *', async () => {
  console.log('🔄 Ödeme yapılmayan siparişleri iptal etme işlemi başlıyor...');
  
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1); // 24 saat öncesi
    
    // Status: pending olan ve 24 saatten eski siparişleri bul
    const unpaidOrders = await Order.find({
      status: 'pending',
      createdAt: { $lt: yesterday },
      ibanPaymentVerified: false,
      trackingNumber: { $ne: 'İptal Edildi' } // Zaten iptal edilmemiş olanlar
    }).populate('userId');
    
    console.log(`🔍 İptal edilecek ${unpaidOrders.length} adet ödenmemiş sipariş bulundu.`);
    
    let cancelCount = 0;
    
    for (const order of unpaidOrders) {
      try {
        if (!order.userId) {
          console.error(`❌ Kullanıcı bulunamadı, sipariş ID: ${order._id}`);
          continue;
        }
        
        const user = order.userId;
        
        // Siparişten ödülleri geri alma - yeni model yapısına göre
        if (order.orderItems && order.orderItems.length > 0) {
          // OrderItems dizisindeki her bir öğe için
          for (const item of order.orderItems) {
            if (item.itemType === 'low') {
              // Küçük boy hediye için
              user.collectedLowItems = user.collectedLowItems.filter(id => id !== item.itemId);
            }
          }
        } else {
          // Eski model yapısıyla uyumluluk için
          const itemKey = order.whatOrdered; // örn: low-2, medium-5, high
          if (itemKey) {
            const [category] = itemKey.split('-'); // low, medium, high
            // Kullanıcı itemlarını düzenle
            if (category === 'low') {
              user.collectedLowItems = user.collectedLowItems.filter(item => item !== itemKey);
            } else if (category === 'medium') {
              user.wonMediumItems = user.wonMediumItems.filter(item => item !== itemKey);
            } else if (category === 'high') {
              if (user.wonHighItem === itemKey) {
                user.wonHighItem = null;
              }
            }
          }
        }
        
        // Siparişi iptal et
        order.isCanceled = true;
        order.trackingNumber = 'İptal Edildi';
        order.status = 'rejected';
        
        await order.save();
        await user.save();
        
        cancelCount++;
        console.log(`✅ Sipariş iptal edildi: ${order._id}`);
        
      } catch (err) {
        console.error(`❌ Sipariş iptalinde hata: ${order._id}`, err);
      }
    }
    
    console.log(`✅ Toplam ${cancelCount} adet sipariş otomatik olarak iptal edildi.`);
  } catch (err) {
    console.error('❌ Otomatik sipariş iptal işleminde hata:', err);
  }
});

module.exports = cancelUnpaidOrders;
