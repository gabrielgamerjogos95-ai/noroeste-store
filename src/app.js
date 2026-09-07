import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';
import { requireAdmin } from './auth.js';
import { createCheckoutPreference, getPayment, validateWebhook } from './payment.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-session-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: BASE_URL.startsWith('https://'), maxAge: 1000 * 60 * 60 * 12 }
}));

app.use((req, res, next) => {
  const data = db.read();
  res.locals.storeName = process.env.STORE_NAME || 'Noroeste Roleplay';
  res.locals.discordUrl = process.env.DISCORD_URL || '#';
  res.locals.settings = data.settings;
  res.locals.admin = Boolean(req.session?.admin);
  next();
});

app.get('/', (req, res) => {
  const products = db.getProducts().filter(p => p.active);
  res.render('index', { products });
});

app.get('/produto/:id', (req, res) => {
  const product = db.getProduct(req.params.id);
  if (!product || !product.active) return res.status(404).render('message', { title: 'Produto não encontrado', message: 'Esse produto não está disponível.' });
  res.render('product', { product });
});

app.get('/checkout', (req, res) => {
  const ids = String(req.query.items || '').split(',').filter(Boolean);
  const products = ids.map(id => db.getProduct(id)).filter(Boolean);
  if (!products.length) return res.redirect('/');
  res.render('checkout', { products, error: null });
});

app.post('/checkout/criar', async (req, res) => {
  try {
    const productIds = Array.isArray(req.body.productIds) ? req.body.productIds : [req.body.productIds].filter(Boolean);
    const selected = productIds.map(id => db.getProduct(id)).filter(p => p?.active);
    if (!selected.length) throw new Error('Nenhum produto válido foi selecionado.');

    const coupon = db.findCoupon(req.body.coupon);
    const discount = coupon ? coupon.percent / 100 : 0;
    const items = selected.map(p => ({
      productId: p.id,
      name: p.name,
      description: p.description,
      quantity: 1,
      originalUnitPrice: p.price,
      unitPrice: Number((p.price * (1 - discount)).toFixed(2))
    }));
    const total = Number(items.reduce((s, i) => s + i.unitPrice * i.quantity, 0).toFixed(2));
    const id = `NW-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const order = {
      id,
      externalReference: id,
      status: 'created',
      paymentStatus: 'not_paid',
      customer: {
        name: String(req.body.name || '').trim(),
        email: String(req.body.email || '').trim(),
        discord: String(req.body.discord || '').trim(),
        fivemId: String(req.body.fivemId || '').trim()
      },
      items,
      coupon: coupon?.code || null,
      discountPercent: coupon?.percent || 0,
      total,
      createdAt: new Date().toISOString()
    };
    if (!order.customer.name || !order.customer.email) throw new Error('Preencha nome e e-mail.');
    db.createOrder(order);

    const pref = await createCheckoutPreference({ order, baseUrl: BASE_URL });
    db.updateOrder(order.id, { preferenceId: pref.id, checkoutUrl: pref.init_point, status: 'awaiting_payment' });
    return res.redirect(pref.init_point);
  } catch (error) {
    const ids = Array.isArray(req.body.productIds) ? req.body.productIds : [req.body.productIds].filter(Boolean);
    const products = ids.map(id => db.getProduct(id)).filter(Boolean);
    res.status(400).render('checkout', { products, error: error.message });
  }
});

app.get('/checkout/retorno', (req, res) => {
  const order = db.findOrder(req.query.order);
  if (!order) return res.status(404).render('message', { title: 'Pedido não encontrado', message: 'Não localizamos esse pedido.' });
  res.render('return', { order, returnedStatus: req.query.status || 'pending' });
});

app.post('/api/mercadopago/webhook', async (req, res) => {
  const dataId = String(req.query['data.id'] || req.body?.data?.id || '');
  if (!dataId) return res.sendStatus(200);

  try {
    if (!validateWebhook(req, String(req.query['data.id'] || dataId))) return res.sendStatus(401);
    const payment = await getPayment(dataId);
    const externalReference = payment.external_reference;
    const order = db.findOrderByExternalReference(externalReference);
    if (order) {
      const statusMap = {
        approved: 'paid', pending: 'pending', in_process: 'pending',
        rejected: 'rejected', cancelled: 'cancelled', refunded: 'refunded', charged_back: 'charged_back'
      };
      db.updateOrder(order.id, {
        paymentId: String(payment.id),
        paymentStatus: payment.status,
        status: statusMap[payment.status] || payment.status,
        paymentMethod: payment.payment_method_id || null,
        approvedAt: payment.date_approved || null
      });
    }
    return res.sendStatus(200);
  } catch (error) {
    console.error('Webhook Mercado Pago:', error);
    return res.sendStatus(500);
  }
});

app.get('/admin/login' (req, res) => res.render('admin-login', { error: null }));
app.post('/admin/login', async (req, res) => {
  const emailOk = String(req.body.email || '') === String(process.env.ADMIN_EMAIL || 'admin@noroeste.local');
  const plain = String(process.env.ADMIN_PASSWORD || 'troque-esta-senha');
  const passwordOk = await bcrypt.compare(String(req.body.password || ''), await bcrypt.hash(plain, 10));
  if (!emailOk || !passwordOk) return res.status(401).render('admin-login', { error: 'Login inválido.' });
  req.session.admin = true;
  res.redirect('/admin');
});
app.get('/admin/login' (req, res) => req.session.destroy(() => res.redirect('/admin/login')));

app.get('/admin', requireAdmin, (req, res) => {
  const data = db.read();
  const paidRevenue = data.orders.filter(o => o.status === 'paid').reduce((s, o) => s + o.total, 0);
  res.render('admin', { data, paidRevenue });
});

app.post('/admin/products', requireAdmin, (req, res) => {
  const data = db.read();
  const id = (req.body.id || req.body.name || crypto.randomUUID()).toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const product = {
    id,
    name: String(req.body.name || '').trim(),
    category: String(req.body.category || 'Outros').trim(),
    price: Number(String(req.body.price || 0).replace(',', '.')),
    description: String(req.body.description || '').trim(),
    image: String(req.body.image || '').trim(),
    active: req.body.active === 'on',
    featured: req.body.featured === 'on',
    delivery: 'manual'
  };
  const i = data.products.findIndex(p => p.id === id);
  if (i >= 0) data.products[i] = product; else data.products.unshift(product);
  db.write(data);
  res.redirect('/admin#produtos');
});

app.post('/admin/products/:id/delete', requireAdmin, (req, res) => {
  const data = db.read();
  data.products = data.products.filter(p => p.id !== req.params.id);
  db.write(data);
  res.redirect('/admin#produtos');
});

app.post('/admin/orders/:id/status', requireAdmin, (req, res) => {
  db.updateOrder(req.params.id, { status: String(req.body.status || 'manual_review') });
  res.redirect('/admin#pedidos');
});

app.post('/admin/settings', requireAdmin, (req, res) => {
  const data = db.read();
  data.settings = {
    ...data.settings,
    heroTitle: String(req.body.heroTitle || ''),
    heroSubtitle: String(req.body.heroSubtitle || ''),
    deliveryText: String(req.body.deliveryText || ''),
    accent: String(req.body.accent || '#7c3aed')
  };
  db.write(data);
  res.redirect('/admin#configuracoes');
});

app.use((req, res) => res.status(404).render('message', { title: '404', message: 'Página não encontrada.' }));

app.listen(PORT, () => console.log(`Noroeste Store: ${BASE_URL}`));
