const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const CryptoJS = require('crypto-js');
const User = require('../models/User');

const router = express.Router();
const SECRET_KEY = 'sakaoglu_secret_key';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'murat.sakaoglu.store@gmail.com',
    pass: 'vnxnzuuqfozznggd'
  }
});

// Kayıt (Signup)
router.post('/signup', async (req, res) => {
  console.log('GELEN VERİ:', req.body); // HATA TESPİTİ İÇİN

  const { firstName, lastName, email, phone, password } = req.body;

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\W).{6,16}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      message: 'Şifre 1 büyük, 1 küçük harf, 1 sembol ve 6-16 karakter olmalı.'
    });
  }

  try {
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Bu email veya telefon zaten kayıtlı.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const newUser = new User({
      firstName,
      lastName,
      email,
      phone,
      password: hashedPassword,
      isVerified: false,
      verificationToken,
      verificationExpires,
      temporaryCreatedAt: new Date()
    });

    await newUser.save();

    const verificationUrl = `http://master.d2ts14tpekdi5s.amplifyapp.com/verify?token=${verificationToken}&email=${email}`;

    try {
      await transporter.sendMail({
        from: 'Sakaoglu Store <info@sakaoglustore.com>',
        to: email,
        subject: 'Hesabınızı Doğrulayın',
        html: `<p>Doğrulamak için <a href="${verificationUrl}">buraya tıkla</a></p>`
      });
      console.log('✅ Mail başarıyla gönderildi');
    } catch (err) {
      console.error('❌ Mail gönderilemedi:', err);
    }
    

    res.status(201).json({ message: 'Kayıt başarılı. Lütfen e-postanızı doğrulayın.' });
  } catch (err) {
    res.status(500).json({ message: 'Kayıt başarısız', error: err.message });
  }
});

// E-posta Doğrulama
router.get('/verify', async (req, res) => {
  const { token, email } = req.query;

  try {
    const user = await User.findOne({ email, verificationToken: token });

    if (!user || user.verificationExpires < new Date()) {
      return res.status(400).send('Doğrulama bağlantısı geçersiz veya süresi dolmuş.');
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    user.temporaryCreatedAt = undefined; // TTL silinmesini engelle
    await user.save();

    res.send('Hesabınız başarıyla doğrulandı. Artık giriş yapabilirsiniz.');
  } catch (err) {
    res.status(500).send('Bir hata oluştu.');
  }
});

// Giriş
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body;

  try {
    const user = await User.findOne({ $or: [{ email: identifier }, { phone: identifier }] });
    if (!user) return res.status(400).json({ message: 'Kullanıcı bulunamadı' });

    if (!user.isVerified) {
      return res.status(403).json({ message: 'E-posta adresinizi doğrulamadan giriş yapamazsınız.' });
    }

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
