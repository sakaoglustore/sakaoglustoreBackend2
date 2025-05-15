const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  title: String,
  city: String,
  district: String,
  fullAddress: String,
  phone: String 
});

const UserSchema = new mongoose.Schema({
  firstName:  { type: String, required: true },
  lastName:   { type: String, required: true },
  email:      { type: String, required: true, unique: true },
  phone:      { type: String, required: true, unique: true },
  password:   { type: String, required: true },
  addresses:  [addressSchema],
  cart:       [{ productId: { type: mongoose.Schema.Types.ObjectId, ref: 'GiftBox' }, quantity: Number }],
  collectedLowItems: [String],
  wonMediumItems:    [String],
  wonHighItem:       { type: String, default: null },
  orders:            [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
  openedBoxesToday:  { type: Number, default: 0 },
  lastBoxOpenedDate: Date,

  isVerified:         { type: Boolean, default: false },
  verificationToken:  { type: String },
  verificationExpires:{ type: Date },
  temporaryCreatedAt: { type: Date, default: null }
});

// Sadece onaysız kullanıcıları 24 saat sonra sil
UserSchema.index({ temporaryCreatedAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('User', UserSchema);
