const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const adminAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: 'Token gerekli' });

  try {
    const decoded = jwt.verify(token, 'SECRET_KEY'); // .env'ye alınabilir
    const admin = await Admin.findById(decoded.id);

    if (!admin) return res.status(401).json({ message: 'Admin bulunamadı' });

    req.admin = admin;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Geçersiz token' });
  }
};

module.exports = adminAuth;
