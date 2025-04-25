const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  title: String,
  fullAddress: String        
});

const UserSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName:  { type: String, required: true },
  email:     { type: String, required: true, unique: true },
  phone:     { type: String, required: true, unique: true },
  password:  { type: String, required: true },
  addresses: [addressSchema],
  cart: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'GiftBox' },
      quantity: Number
    }
  ],
  collectedLowItems: [String],
  wonMediumItems: [String],
  wonHighItem: { type: String, default: null },  
  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
  openedBoxesToday: { type: Number, default: 0 },
  lastBoxOpenedDate: Date
});

module.exports = mongoose.model('User', UserSchema);
