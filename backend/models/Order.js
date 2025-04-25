const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  addressId: { type: mongoose.Schema.Types.ObjectId, required: true },
  items: [
    {
      productId: { type: String, ref: 'GiftBox' },
      quantity: Number
    }
  ],
  whatOrdered: { type: String }, // ✅ Buraya taşıdık
  sendOrderId: { type: String },
  totalPrice: Number,
  confirmationCode: String,
  trackingNumber: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);
