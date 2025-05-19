const mongoose = require('mongoose');

const CounterSchema = new mongoose.Schema({
  name: { type: String },
  date: { type: Date, default: Date.now },
  orderCount: { type: Number, default: 0 },
  totalCount: { type: Number, default: 0 } // Toplam sipariş sayısı
});

// Tarih ve isime göre indeks
CounterSchema.index({ date: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Counter', CounterSchema);
