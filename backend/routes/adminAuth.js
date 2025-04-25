const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');

// Admin login
router.post('/', async (req, res) => {
  const { identifier, password } = req.body;

  try {
    const admin = await Admin.findOne({ email: identifier });
    if (!admin) return res.status(400).json({ message: 'Admin bulunamadı' });

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Şifre hatalı' });

    const token = jwt.sign({ id: admin._id }, 'SECRET_KEY', { expiresIn: '1d' });

    res.json({
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        isSuperAdmin: admin.isSuperAdmin,
        permissions: admin.permissions // 👈 eksik olan buydu
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

module.exports = router;
