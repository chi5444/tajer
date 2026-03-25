// ═══════════════════════════════
//  TAJER — Products & Cart Logic
// ═══════════════════════════════
let cart = JSON.parse(localStorage.getItem('tajer_cart') || '[]');

/* ── FETCH ─────────────────────────────────────── */
async function fetchProducts(filters = {}) {
  let q = sb.from('products').select('*').eq('in_stock', true);
  if (filters.category && filters.category !== 'all')
    q = q.eq('category', filters.category);
  if (filters.brand && filters.brand !== 'all')
    q = q.eq('brand', filters.brand);
  if (filters.search)
    q = q.or(`name.ilike.%${filters.search}%,brand.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  if (filters.featured)
    q = q.eq('featured', true);
  const { data, error } = await q.order('id', { ascending: false });
  if (error) { console.error(error); return []; }
  return data || [];
}

/* ── RENDER CARD ───────────────────────────────── */
function renderProductCard(p, large = false) {
  const disc = p.old_price ? Math.round(((p.old_price - p.price) / p.old_price) * 100) : 0;
  const img  = p.image_url || `https://placehold.co/480x560/1a1a1a/555?text=${encodeURIComponent(p.name)}`;
  return `
  <article class="product-card${large ? ' large' : ''}" data-id="${p.id}">
    <div class="card-img-wrap">
      <img src="${img}" alt="${p.name}" loading="lazy"
           onerror="this.src='https://placehold.co/480x560/1a1a1a/444?text=تاجر'">
      <div class="card-badges">
        ${p.badge  ? `<span class="pill pill-${p.badge.toLowerCase()}">${p.badge}</span>` : ''}
        ${disc > 0 ? `<span class="pill pill-sale">-${disc}%</span>` : ''}
        ${!p.in_stock ? `<span class="pill pill-out">نفذ</span>` : ''}
      </div>
      <button class="card-quick-add" onclick="event.stopPropagation();addToCart(${p.id},'${escQ(p.name)}',${p.price},'${img}')">
        + أضف للسلة
      </button>
    </div>
    <div class="card-body">
      ${p.brand ? `<span class="card-brand">${p.brand}</span>` : ''}
      <h3 class="card-name">${p.name}</h3>
      <div class="card-price-row">
        <span class="card-price">${fmtPrice(p.price)}</span>
        ${p.old_price ? `<span class="card-old">${fmtPrice(p.old_price)}</span>` : ''}
      </div>
    </div>
  </article>`;
}

function escQ(s) { return s.replace(/'/g, "\\'"); }
function fmtPrice(n) { return Number(n).toLocaleString('ar-IQ') + ' د.ع'; }

/* ── CART ──────────────────────────────────────── */
function addToCart(id, name, price, img = '') {
  const ex = cart.find(i => i.id === id);
  if (ex) ex.qty++;
  else cart.push({ id, name, price, img, qty: 1 });
  saveCart(); refreshCartBadge(); renderCartPanel();
  toast(`✓ أُضيف: ${name}`);
}
function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart(); refreshCartBadge(); renderCartPanel();
}
function changeQty(id, d) {
  const it = cart.find(i => i.id === id);
  if (!it) return;
  it.qty += d;
  if (it.qty < 1) removeFromCart(id);
  else { saveCart(); refreshCartBadge(); renderCartPanel(); }
}
function saveCart()  { localStorage.setItem('tajer_cart', JSON.stringify(cart)); }
function cartTotal() { return cart.reduce((s, i) => s + i.price * i.qty, 0); }
function cartCount() { return cart.reduce((s, i) => s + i.qty, 0); }

function refreshCartBadge() {
  const b = document.getElementById('cart-badge');
  if (!b) return;
  const c = cartCount();
  b.textContent = c;
  b.style.display = c ? 'flex' : 'none';
}

function renderCartPanel() {
  const el = document.getElementById('cart-list');
  const tot = document.getElementById('cart-total-val');
  if (!el) return;
  if (!cart.length) {
    el.innerHTML = `<div class="cart-empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg><p>السلة فارغة</p></div>`;
  } else {
    el.innerHTML = cart.map(i => `
      <div class="c-item">
        <img src="${i.img || ''}" alt="${i.name}"
             onerror="this.style.display='none'">
        <div class="c-info">
          <span class="c-name">${i.name}</span>
          <span class="c-price">${fmtPrice(i.price)}</span>
          <div class="c-qty">
            <button onclick="changeQty(${i.id},-1)">−</button>
            <span>${i.qty}</span>
            <button onclick="changeQty(${i.id},1)">+</button>
            <button class="c-rm" onclick="removeFromCart(${i.id})">✕</button>
          </div>
        </div>
      </div>`).join('');
  }
  if (tot) tot.textContent = fmtPrice(cartTotal());
}

function toggleCart() {
  document.getElementById('cart-drawer')?.classList.toggle('open');
  document.getElementById('cart-veil')?.classList.toggle('show');
  renderCartPanel();
}

async function checkout() {
  if (!cart.length) return;
  const user = await getCurrentUser();
  const rows = cart.map(i => ({
    user_id: user?.id || null,
    product_id: i.id,
    product_name: i.name,
    qty: i.qty,
    price: i.price,
    total: i.price * i.qty,
    status: 'pending'
  }));
  const { error } = await sb.from('orders').insert(rows);
  if (error) { toast('❌ خطأ أثناء الإرسال'); return; }
  cart = []; saveCart(); refreshCartBadge(); renderCartPanel(); toggleCart();
  toast('🎉 تم استلام طلبك! سنتواصل معك قريباً', 4000);
}

/* ── TOAST ─────────────────────────────────────── */
function toast(msg, dur = 2800) {
  let el = document.getElementById('global-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'global-toast';
    el.className = 'g-toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), dur);
}