const express = require('express');
const router = express.Router();
const GiftBox = require('../models/GiftBox');
const adminAuth = require('../middlewares/adminAuth');

router.post('/', adminAuth, async (req, res) => {
  try {
    const newBox = new GiftBox(req.body);
    await newBox.save();
    res.status(201).json({ message: 'Ürün eklendi', box: newBox });
  } catch (err) {
    console.error('Ekleme hatası:', err);
    res.status(500).json({ message: 'Ürün eklenemedi', error: err.message });
  }
});
// Tüm ürünleri getir
router.get('/all', async (req, res) => {
  try {
    const boxes = await GiftBox.find();
    res.json(boxes);
  } catch (err) {
    res.status(500).json({ message: 'Ürünler getirilemedi', error: err.message });
  }
});

// Ürün sil
router.delete('/:id', async (req, res) => {
  try {
    await GiftBox.findByIdAndDelete(req.params.id);
    res.json({ message: 'Ürün silindi' });
  } catch (err) {
    res.status(500).json({ message: 'Silme hatası', error: err.message });
  }
});

// routes/giftbox.js
router.get('/:id', async (req, res) => {
  try {
    const product = await GiftBox.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Ürün bulunamadı' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

router.get('/item/:id', async (req, res) => {
  const productId = req.params.id;

  try {
    const giftBox = await GiftBox.findOne({
      $or: [
        { 'items.low.id': productId },
        { 'items.medium.id': productId },
        { 'items.high.id': productId }
      ]
    });

    if (!giftBox) return res.status(404).json({ message: 'GiftBox bulunamadı.' });

    res.json(giftBox);
  } catch (err) {
    console.error('GiftBox arama hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

module.exports = router;
