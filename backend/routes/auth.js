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

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z]).{6,16}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      message: 'Şifre 1 büyük, 1 küçük harf ve 6-16 karakter olmalı.'
    });
  }
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Bu email adresi zaten kayıtlı.' });
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

    const verificationUrl = `http://localhost:3000/verify?token=${verificationToken}&email=${email}`;    try {
      await transporter.sendMail({
        from: 'Sakaoglu Store <info@sakaoglustore.com>',
        to: email,
        subject: 'Hesabınızı Doğrulayın',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <h2 style="color: #333;">Hesap Doğrulaması</h2>
            <p>Merhaba ${firstName},</p>
            <p>Sakaoglu Store'a hoş geldiniz! Hesabınızı doğrulamak için aşağıdaki bağlantıya tıklayın:</p>
            <p style="text-align: center; margin: 20px 0;">
              <a href="${verificationUrl}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Hesabımı Doğrula</a>
            </p>
            <p style="color: #666; font-size: 13px;">Bu bağlantı 24 saat süreyle geçerlidir. Bu süre sonunda bağlantı geçerliliğini yitirecektir.</p>
            <p>İyi günler,<br>Sakaoglu Store Ekibi</p>
          </div>
        `
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
    const user = await User.findOne({ email: identifier });
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
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email gerekli.' });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 saat (1 gün) geçerli

    user.resetToken = resetToken;
    user.resetExpires = resetExpires;
    await user.save();

    const resetUrl = `http://localhost:3000/reset-password?token=${resetToken}`;
    
    await transporter.sendMail({
      from: 'Sakaoglu Store <info@sakaoglustore.com>',
      to: email,
      subject: 'Şifre Sıfırlama',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333;">Şifre Sıfırlama</h2>
          <p>Merhaba,</p>
          <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:</p>
          <p style="text-align: center; margin: 20px 0;">
            <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Şifremi Sıfırla</a>
          </p>
          <p style="color: #666; font-size: 13px;">Bu bağlantı 24 saat süreyle geçerlidir. Bu süre sonunda bağlantı geçerliliğini yitirecektir.</p>
          <p>İyi günler,<br>Sakaoglu Store Ekibi</p>
        </div>
      `
    });
    
    res.status(200).json({ message: 'Şifre sıfırlama e-postası gönderildi.' });
  } catch (err) {
    console.error('Şifre sıfırlama email hatası:', err);
    res.status(500).json({ message: 'Mail gönderilemedi.', error: err.message });
  }
});

// Token doğrulama endpoint'i
router.get('/validate-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ message: 'Token gereklidir.' });
    }
    
    const user = await User.findOne({ 
      resetToken: token,
      resetExpires: { $gt: Date.now() } 
    });
    
    if (!user) {
      return res.status(400).json({ message: 'Geçersiz veya süresi dolmuş token.' });
    }
    
    res.status(200).json({ message: 'Token geçerli.' });
  } catch (err) {
    console.error('Token doğrulama hatası:', err);
    res.status(500).json({ message: 'Token doğrulaması sırasında bir hata oluştu.', error: err.message });
  }
});

// Şifre sıfırlama endpoint'i
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ message: 'Token ve yeni şifre gereklidir.' });
    }
      // Şifre güç kontrolü
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z]).{6,16}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: 'Şifre 1 büyük, 1 küçük harf ve 6-16 karakter olmalı.'
      });
    }
    
    const user = await User.findOne({ 
      resetToken: token,
      resetExpires: { $gt: Date.now() } 
    });
    
    if (!user) {
      return res.status(400).json({ message: 'Geçersiz veya süresi dolmuş token.' });
    }
    
    // Yeni şifreyi hashle ve kaydet
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetExpires = undefined;
    
    await user.save();
    
    res.status(200).json({ message: 'Şifreniz başarıyla sıfırlandı.' });
  } catch (err) {
    console.error('Şifre sıfırlama hatası:', err);
    res.status(500).json({ message: 'Şifre sıfırlama sırasında bir hata oluştu.', error: err.message });
  }
});

// Yeni Şifre Belirle
router.post('/change-password', async (req, res) => {
  const { userId, current, newPass } = req.body;
  if (!userId || !current || !newPass)
    return res.status(400).json({ message: 'Eksik bilgi.' });
  // Şifre güç kontrolü
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z]).{6,16}$/;
  if (!passwordRegex.test(newPass)) {
    return res.status(400).json({
      message: 'Şifre 1 büyük, 1 küçük harf ve 6-16 karakter olmalı.'
    });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });

    // Mevcut şifreyi kontrol et
    const isMatch = await bcrypt.compare(current, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Mevcut şifre yanlış.' });

    // Yeni şifreyi güncelle
    user.password = await bcrypt.hash(newPass, 10);
    await user.save();

    res.json({ message: 'Şifre başarıyla güncellendi.' });
  } catch (err) {
    res.status(500).json({ message: 'Şifre güncellenemedi.', error: err.message });
  }
});
module.exports = router;
