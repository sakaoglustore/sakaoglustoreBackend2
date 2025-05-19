const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  title: String,
  fullAddress: String,
  city: String,
  district: String,
  phone: String
});

const orderItemSchema = new mongoose.Schema({
  itemId: String,
  itemName: String,
  itemType: {
    type: String,
    enum: ['low', 'medium', 'high', 'maximum']
  }
});

const OrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  address: addressSchema,
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'GiftBox' },
      quantity: Number
    }
  ],
  orderNumber: { type: Number }, // Sistemde kaçıncı sipariş olduğunu belirtir
  orderItems: [orderItemSchema], // Siparişte yer alan hediyeler
  whatOrdered: { type: String }, // Eski sistem uyumluluğu için
  sendOrderId: { type: String }, // Eski sistem uyumluluğu için
  totalPrice: Number,
  lowItemCount: { type: Number, default: 0 }, // Küçük boy hediye sayısı
  mediumItemCount: { type: Number, default: 0 }, // Orta boy hediye sayısı 
  highItemCount: { type: Number, default: 0 }, // Büyük boy hediye sayısı
  maxItemCount: { type: Number, default: 0 }, // Maksimum boy hediye sayısı
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
