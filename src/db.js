import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data', 'db.json');

function read() {
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

function write(db) {
  const temp = `${dbPath}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(temp, dbPath);
}

export const db = {
  read,
  write,
  getProducts() { return read().products; },
  getProduct(id) { return read().products.find(p => p.id === id); },
  createOrder(order) {
    const data = read();
    data.orders.unshift(order);
    write(data);
    return order;
  },
  updateOrder(id, patch) {
    const data = read();
    const i = data.orders.findIndex(o => o.id === id);
    if (i === -1) return null;
    data.orders[i] = { ...data.orders[i], ...patch, updatedAt: new Date().toISOString() };
    write(data);
    return data.orders[i];
  },
  findOrder(id) { return read().orders.find(o => o.id === id); },
  findOrderByExternalReference(ref) { return read().orders.find(o => o.externalReference === ref); },
  findCoupon(code) { return read().coupons.find(c => c.active && c.code.toLowerCase() === String(code || '').toLowerCase()); }
};
