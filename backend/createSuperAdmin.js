const mongoose = require('mongoose');
const Admin = require('./models/Admin');

mongoose.connect('mongodb+srv://eyilerege:WvKsrbqwp1sLR226@cluster.y9qo0.mongodb.net/sakaogluDB?retryWrites=true&w=majority&appName=Cluster', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('✅ MongoDB Bağlantısı Başarılı');

  const existingAdmin = await Admin.findOne({ email: 'superadmin@example.com' });
  if (existingAdmin) {
    console.log('❗ Bu email ile zaten bir admin var.');
    process.exit();
  }

  const superAdmin = new Admin({
    name: 'Süper Admin',
    email: 'superadmin@example.com',
    password: '123456', // Şifreyi güvenli hale getirmek için hash önerilir
    isSuperAdmin: true
  });

  await superAdmin.save();
  console.log('✅ Süper admin başarıyla oluşturuldu!');
  process.exit();
})
.catch(err => {
  console.error('❌ MongoDB bağlantı hatası:', err);
  process.exit();
});
