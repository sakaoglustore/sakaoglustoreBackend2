const mongoose = require('mongoose');
const Admin = require('./models/Admin');

mongoose.connect('mongodb+srv://muratsakaoglustore:Ci1xpiU9J6nkVgv0@sakaoglustoredb.6jb9eqh.mongodb.net/?retryWrites=true&w=majority&appName=sakaoglustoreDB', {
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
    email: 'murat.sakaoglu.store@gmail.com',
    password: '3253251aA?', // Şifreyi güvenli hale getirmek için hash önerilir
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
