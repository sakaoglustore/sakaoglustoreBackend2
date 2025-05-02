const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// Örnek sabitler (bunlar sana VakıfBank tarafından verilecek)
const POS_URL = 'https://sanalpos.vakifbank.com.tr/fim/est3Dgate';
const CLIENT_ID = '123456789';
const STORE_KEY = 'GIZLIANAHTAR';
const SUCCESS_URL = 'http://localhost:5000/api/payment/callback-success';
const FAIL_URL = 'http://localhost:5000/api/payment/callback-fail';

// Siparişi başlat: Kullanıcıyı VakıfBank ödeme sayfasına yönlendir
router.post('/checkout', async (req, res) => {
  const { userId, totalAmount, orderId } = req.body;

  // İmzalama için gerekli alanları sırayla birleştiriyoruz
  const hashString = `${CLIENT_ID}${orderId}${totalAmount}TRL${SUCCESS_URL}${FAIL_URL}Auth${STORE_KEY}`;
  const hash = crypto.createHash('sha1').update(hashString).digest('base64');

  const htmlForm = `
    <html>
    <body onload="document.forms['vbform'].submit()">
      <form name="vbform" method="post" action="${POS_URL}">
        <input type="hidden" name="clientid" value="${CLIENT_ID}">
        <input type="hidden" name="amount" value="${totalAmount}">
        <input type="hidden" name="oid" value="${orderId}">
        <input type="hidden" name="okUrl" value="${SUCCESS_URL}">
        <input type="hidden" name="failUrl" value="${FAIL_URL}">
        <input type="hidden" name="rnd" value="random123">
        <input type="hidden" name="currency" value="949">
        <input type="hidden" name="storetype" value="3d_pay">
        <input type="hidden" name="lang" value="tr">
        <input type="hidden" name="hash" value="${hash}">
      </form>
    </body>
    </html>
  `;

  res.send(htmlForm); // Kullanıcıyı form ile VakıfBank'a yönlendiriyoruz
});
// Başarılı ödeme sonrası dönüş
router.post('/callback-success', async (req, res) => {
    const {
      Response,
      ProcReturnCode,
      mdStatus,
      OrderId,
      AuthCode
    } = req.body;
  
    if (Response === 'Approved' && ProcReturnCode === '00') {
      // Ödeme başarılı, burada siparişi onaylayabilirsin:
      console.log('✔️ Başarılı ödeme:', { OrderId, AuthCode });
  
      // Siparişi veritabanında "paid" yap
      // örnek: await Order.findByIdAndUpdate(OrderId, { isPaid: true, approvalCode: AuthCode });
  
      res.redirect(`/success?code=${AuthCode}`);
    } else {
      console.log('❌ Başarısız dönüş:', req.body);
      res.redirect('/fail');
    }
  });
  
  // Başarısız ödeme sonrası dönüş
  router.post('/callback-fail', (req, res) => {
    console.log('❌ Ödeme reddedildi:', req.body);
    res.redirect('/fail');
  });
  module.exports = router;
