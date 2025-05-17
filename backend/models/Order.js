const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  title: String,
  fullAddress: String,
  city: String,
  district: String,
  phone: String
});

const OrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  address: addressSchema,
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'GiftBox' },
      quantity: Number
    }
  ],  whatOrdered: { type: String },
  sendOrderId: { type: String },
  totalPrice: Number,
  confirmationCode: { type: String, unique: true, sparse: true },
  trackingNumber: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  nextHighItemOrder: { type: Number },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'rejected'],
    default: 'pending'
  },
  ibanPaymentVerified: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('Order', OrderSchema);
