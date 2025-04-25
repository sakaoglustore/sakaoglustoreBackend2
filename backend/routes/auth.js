const express = require('express');
const bcrypt = require('bcryptjs');
const CryptoJS = require('crypto-js');
const User = require('../models/User');

const router = express.Router();
const SECRET_KEY = 'sakaoglu_secret_key';

// Kayıt (Signup)
router.post('/signup', async (req, res) => {
  const { firstName, lastName, email, phone, address, password } = req.body;

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\W).{6,16}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      message: 'Şifre en az bir büyük harf, küçük harf, sembol içermeli ve 6-16 karakter uzunluğunda olmalı.'
    });
  }

  try {
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Bu email veya telefon numarası zaten kayıtlı.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    let encryptedAddress = '';
    if (address) {
      encryptedAddress = CryptoJS.AES.encrypt(address, SECRET_KEY).toString();
    }

    const newUser = new User({
      firstName,
      lastName,
      email,
      phone,
      address: encryptedAddress,
      password: hashedPassword,
      cart: []
    });

    await newUser.save();
    res.status(201).json({ message: 'Kayıt başarılı' });
  } catch (err) {
    res.status(500).json({ message: 'Kayıt başarısız', error: err.message });
  }
});

// Giriş (Login)
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body;

  try {
    const user = await User.findOne({ $or: [{ email: identifier }, { phone: identifier }] });
    if (!user) return res.status(400).json({ message: 'Kullanıcı bulunamadı' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Şifre hatalı' });

    let decryptedAddress = '';
    if (user.address) {
      const bytes = CryptoJS.AES.decrypt(user.address, SECRET_KEY);
      decryptedAddress = bytes.toString(CryptoJS.enc.Utf8);
    }

    res.status(200).json({
      message: 'Giriş başarılı',
      user: {
        id: user._id,
        name: user.firstName,
        email: user.email,
        phone: user.phone,
        address: decryptedAddress,
        cart: user.cart
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Giriş başarısız', error: err.message });
  }
});

module.exports = router;

router.put('/update/:id', async (req, res) => {
    const { name, address } = req.body;
    const { id } = req.params;
  
    try {
      const encryptedAddress = CryptoJS.AES.encrypt(address, SECRET_KEY).toString();
  
      const updatedUser = await User.findByIdAndUpdate(
        id,
        { firstName: name, address: encryptedAddress },
        { new: true }
      );
  
      const bytes = CryptoJS.AES.decrypt(updatedUser.address, SECRET_KEY);
      const decryptedAddress = bytes.toString(CryptoJS.enc.Utf8);
  
      res.status(200).json({
        message: 'Bilgiler güncellendi',
        updatedUser: {
          id: updatedUser._id,
          name: updatedUser.firstName,
          email: updatedUser.email,
          phone: updatedUser.phone,
          address: decryptedAddress
        }
      });
    } catch (err) {
      res.status(500).json({ message: 'Güncelleme başarısız', error: err.message });
    }
  });
  
  
module.exports = router;
