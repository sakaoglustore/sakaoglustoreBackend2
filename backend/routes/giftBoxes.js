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
    res.status(500).json({ message: 'Ürün eklenemedi', error: err.message });
  }
});

router.get('/all', async (req, res) => {
  try {
    const boxes = await GiftBox.find();
    res.json(boxes);
  } catch (err) {
    res.status(500).json({ message: 'Ürünler getirilemedi', error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await GiftBox.findByIdAndDelete(req.params.id);
    res.json({ message: 'Ürün silindi' });
  } catch (err) {
    res.status(500).json({ message: 'Silme hatası', error: err.message });
  }
});

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
  try {
    const giftBox = await GiftBox.findOne({
      $or: [
        { 'items.low.id': req.params.id },
        { 'items.medium.id': req.params.id },
        { 'items.high.id': req.params.id },
        { 'items.maximum.id': req.params.id }
      ]
    });
    if (!giftBox) return res.status(404).json({ message: 'GiftBox bulunamadı.' });
    res.json(giftBox);
  } catch (err) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

router.put('/:id', adminAuth, async (req, res) => {
  try {
    console.log('Updating gift box with ID:', req.params.id);
    console.log('Update payload received:', req.body);
    console.log('Items in payload:', req.body.items);

    const updated = await GiftBox.findByIdAndUpdate(req.params.id, {
      $set: req.body
    }, { new: true });
    
    console.log('Updated document:', updated);
    res.json(updated);
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ message: 'Güncelleme hatası', error: err.message });
  }
});

module.exports = router;
