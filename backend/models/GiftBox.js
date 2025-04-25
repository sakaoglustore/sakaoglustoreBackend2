const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  id: String,
  name: String
});

const GiftBoxSchema = new mongoose.Schema({
  category: String,
  name: String,
  price: Number,
  image: String,
  description: String,
  kdvOrani: Number,
  kutuUcreti: Number,
  items: {
    low: [ItemSchema],
    medium: [ItemSchema],
    high: [ItemSchema]
  }
});

module.exports = mongoose.model('GiftBox', GiftBoxSchema);
