const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const Order = require('../models/Order');
const adminAuth = require('../middlewares/adminAuth');

// Dosya yükleme ayarları
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// Dosya yükleme ayarlarını oluştur
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5 // 5MB dosya limiti
  },
  fileFilter: function (req, file, cb) {
    if (
      file.mimetype === 'application/vnd.ms-excel' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Sadece Excel dosyaları (.xls, .xlsx) yüklenebilir'), false);
    }
  }
});

// Excel dosyasından kargo kodlarını çıkarmak için endpoint
router.post('/match-tracking-codes', adminAuth, upload.single('excelFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Lütfen bir Excel dosyası yükleyin' });
    }

    // Yüklenen Excel dosyasını oku
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Sonuçları saklamak için dizi
    const results = [];
    let matchedCount = 0;
    let notFoundCount = 0;

    // Excel'deki her satır için
    for (const row of data) {
      // Bu örnekte, "Referans" sütunu, sipariş ID'sini içeriyor olsun
      // "Gönderi Kodu" sütunu, kargo takip numarasını içersin
      const referenceNumber = row['Referans'] || row['Referans No'] || row['Referans Numarası'] || row['ReferansNo'] || '';
      const trackingCode = row['Gönderi Kodu'] || row['Takip No'] || row['Kargo No'] || row['Kargo Takip'] || '';

      if (!referenceNumber || !trackingCode) {
        continue; // Gerekli sütunlar yoksa geç
      }

      // Sipariş ID'sine göre siparişi bul
      const order = await Order.findById(referenceNumber).populate('userId', 'firstName lastName');
      
      if (order) {
        // Siparişi güncelle - kargo takip linki formatına çevir
        const trackingUrl = `https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=${trackingCode}`;
        order.trackingNumber = trackingUrl;
        await order.save();

        // Sonuçlara ekle
        results.push({
          referenceNumber,
          trackingCode,
          status: 'Başarılı',
          orderInfo: {
            customerName: order.userId ? `${order.userId.firstName} ${order.userId.lastName}` : 'Bilinmiyor',
            itemCount: order.items ? order.items.length : 0,
            status: order.status
          }
        });
        matchedCount++;
      } else {
        // Sipariş bulunamadıysa hata kaydı ekle
        results.push({
          referenceNumber,
          trackingCode,
          status: 'Bulunamadı',
          error: 'Sipariş ID bulunamadı'
        });
        notFoundCount++;
      }
    }

    // Özel kontroller ve segment filtreleme - sadece orta ve küçük segment ürünler
    const segmentFiltered = results.filter(item => {
      if (item.status === 'Başarılı' && item.orderInfo) {
        // Eğer orderItems varsa ve içinde medium veya low varsa
        const order = data.find(row => row.referenceNumber === item.referenceNumber);
        const isLowOrMedium = order && 
          (order.lowItemCount > 0 || order.mediumItemCount > 0 || 
          (order.orderItems && order.orderItems.some(oi => 
            oi.itemType === 'low' || oi.itemType === 'medium')));
        
        return isLowOrMedium;
      }
      return false;
    });

    res.status(200).json({
      message: 'Excel işleme tamamlandı',
      stats: {
        total: data.length,
        processed: results.length,
        matched: matchedCount,
        notFound: notFoundCount,
        segmentFiltered: segmentFiltered.length
      },
      results,
      segmentFiltered
    });
  } catch (error) {
    console.error('❌ Excel işleme hatası:', error);
    res.status(500).json({ message: 'Excel dosyası işlenirken bir hata oluştu', error: error.message });
  }
});

// Referans numarası (sipariş ID) ile kargo kodu eşleştirme endpoint'i
router.get('/find-tracking/:orderId', adminAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findById(orderId).populate('userId', 'firstName lastName');
    
    if (!order) {
      return res.status(404).json({ message: 'Sipariş bulunamadı' });
    }
    
    // Eğer sipariş orta veya küçük segment değilse
    const isLowOrMedium = 
      order.lowItemCount > 0 || 
      order.mediumItemCount > 0 || 
      (order.orderItems && order.orderItems.some(item => 
        item.itemType === 'low' || item.itemType === 'medium'));
    
    if (!isLowOrMedium) {
      return res.status(400).json({ 
        message: 'Bu sipariş orta veya küçük segment ürün içermiyor',
        order: {
          id: order._id,
          customerName: order.userId ? `${order.userId.firstName} ${order.userId.lastName}` : 'Bilinmiyor',
          status: order.status,
          items: order.items
        }
      });
    }
    
    // Kargo takip numarası var mı?
    if (order.trackingNumber) {
      return res.status(200).json({
        message: 'Kargo takip numarası bulundu',
        orderId: order._id,
        trackingNumber: order.trackingNumber,
        customerName: order.userId ? `${order.userId.firstName} ${order.userId.lastName}` : 'Bilinmiyor'
      });
    } else {
      return res.status(404).json({
        message: 'Bu siparişe ait kargo takip numarası bulunamadı',
        orderId: order._id,
        customerName: order.userId ? `${order.userId.firstName} ${order.userId.lastName}` : 'Bilinmiyor'
      });
    }
  } catch (error) {
    console.error('❌ Kargo takip numarası bulma hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

module.exports = router;
