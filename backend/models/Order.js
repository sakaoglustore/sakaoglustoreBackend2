const mongoose = require('mongoose'); // <-- Bunu en üste eklemen gerekiyordu!

const addressSchema = new mongoose.Schema({
  title: String,
  fullAddress: String,
  city: String,
  district: String,
  phone: String
});

const OrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  address: addressSchema, // Adres artık burada saklanıyor ✅
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'GiftBox' },
      quantity: Number
    }
  ],
  whatOrdered: { type: String },
  sendOrderId: { type: String },
  totalPrice: Number,
  confirmationCode: String,
  trackingNumber: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);
