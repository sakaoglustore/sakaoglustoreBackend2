const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const adminAuth = require('../middlewares/adminAuth');

// ✅ Admin Ekle
router.post('/add', adminAuth, async (req, res) => {
  if (!req.admin.isSuperAdmin) return res.status(403).json({ message: 'Yetkisiz' });

  const { name, email, password, isSuperAdmin = false, permissions = {} } = req.body;

  try {
    const existing = await Admin.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Admin zaten var' });

    const newAdmin = new Admin({
      name,
      email,
      password,
      isSuperAdmin,
      permissions,
      createdBy: req.admin._id
    });

    await newAdmin.save();
    res.status(201).json({ message: 'Admin başarıyla oluşturuldu', admin: newAdmin });
  } catch (err) {
    res.status(500).json({ message: 'Sunucu hatası', error: err.message });
  }
});

// ✅ Admin Listele
router.get('/list', adminAuth, async (req, res) => {
  if (!req.admin.isSuperAdmin) return res.status(403).json({ message: 'Yetkisiz' });

  try {
    const admins = await Admin.find({}, 'name email isSuperAdmin permissions createdBy')
      .populate('createdBy', 'name');
    res.status(200).json(admins);
  } catch (err) {
    res.status(500).json({ message: 'Adminler alınamadı', error: err.message });
  }
});

// ✅ Admin Güncelle
router.put('/update/:id', adminAuth, async (req, res) => {
  if (!req.admin.isSuperAdmin) return res.status(403).json({ message: 'Yetkisiz' });

  try {
    const updated = await Admin.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Güncelleme hatası', error: err.message });
  }
});

// ✅ Admin Sil
router.delete('/delete/:id', adminAuth, async (req, res) => {
  if (!req.admin.isSuperAdmin) return res.status(403).json({ message: 'Yetkisiz' });

  try {
    const adminToDelete = await Admin.findById(req.params.id);

    if (!adminToDelete) {
      return res.status(404).json({ message: 'Admin bulunamadı' });
    }

    // ❌ Kendi hesabını silemez
    if (adminToDelete._id.toString() === req.admin._id.toString()) {
      return res.status(403).json({ message: 'Kendi hesabınızı silemezsiniz' });
    }

    // ❌ Başkasının oluşturduğu admini silemez (süper admin olsa bile)
    if (!adminToDelete.createdBy || adminToDelete.createdBy.toString() !== req.admin._id.toString()) {
      return res.status(403).json({ message: 'Bu admini silme yetkiniz yok' });
    }

    await Admin.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Admin silindi' });
  } catch (err) {
    res.status(500).json({ message: 'Silme hatası', error: err.message });
  }
});

module.exports = router;
