// Products Module
let allProducts = [];
let cart = JSON.parse(localStorage.getItem('tajer_cart') || '[]');

// Fetch all products from Supabase
async function fetchProducts(filters = {}) {
  let query = sb.from('products').select('*').eq('in_stock', true);

  if (filters.category && filters.category !== 'all') {
    query = query.eq('category', filters.category);
  }
  if (filters.game && filters.game !== 'all') {
    query = query.eq('game', filters.game);
  }
  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,game.ilike.%${filters.search}%`);
  }

  const { data, error } = await query.order('id', { ascending: false });
  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }
  return data || [];
}

// Render product card
function renderProductCard(product) {
  const discount = product.old_price
    ? Math.round(((product.old_price - product.price) / product.old_price) * 100)
    : 0;

  return `
    <div class="product-card" data-id="${product.id}">
      ${product.badge ? `<span class="badge badge-${product.badge.toLowerCase()}">${product.badge}</span>` : ''}
      ${discount > 0 ? `<span class="discount-tag">-${discount}%</span>` : ''}
      <div class="product-icon ${product.img_class || ''}">
        ${product.icon ? `<img src="${product.icon}" alt="${product.title}" onerror="this.style.display='none'">` : `<span class="icon-placeholder">🎮</span>`}
      </div>
      <div class="product-info">
        <span class="product-game">${product.game || ''}</span>
        <h3 class="product-title">${product.title}</h3>
        <div class="product-meta">
          ${product.region ? `<span class="region-tag">${product.region}</span>` : ''}
          ${product.category ? `<span class="category-tag">${product.category}</span>` : ''}
        </div>
        <div class="product-pricing">
          ${product.old_price ? `<span class="old-price">${product.old_price} د.ع</span>` : ''}
          <span class="price">${product.price} د.ع</span>
        </div>
        <button class="btn-add-cart" onclick="addToCart(${product.id}, '${product.title.replace(/'/g, "\\'")}', ${product.price})">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          أضف للسلة
        </button>
      </div>
    </div>
  `;
}

// Cart functions
function addToCart(id, title, price) {
  const existing = cart.find(i => i.id === id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id, title, price, qty: 1 });
  }
  saveCart();
  updateCartUI();
  showCartNotification(title);
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart();
  updateCartUI();
  renderCartItems();
}

function updateQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (item) {
    item.qty += delta;
    if (item.qty <= 0) removeFromCart(id);
    else { saveCart(); updateCartUI(); renderCartItems(); }
  }
}

function saveCart() {
  localStorage.setItem('tajer_cart', JSON.stringify(cart));
}

function cartTotal() {
  return cart.reduce((s, i) => s + i.price * i.qty, 0);
}

function cartCount() {
  return cart.reduce((s, i) => s + i.qty, 0);
}

function updateCartUI() {
  const badge = document.getElementById('cart-count');
  if (badge) {
    const count = cartCount();
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
}

function renderCartItems() {
  const container = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `<div class="cart-empty"><span>🛒</span><p>السلة فارغة</p></div>`;
  } else {
    container.innerHTML = cart.map(item => `
      <div class="cart-item">
        <div class="cart-item-info">
          <span class="cart-item-title">${item.title}</span>
          <span class="cart-item-price">${item.price} د.ع</span>
        </div>
        <div class="cart-item-controls">
          <button onclick="updateQty(${item.id}, -1)">−</button>
          <span>${item.qty}</span>
          <button onclick="updateQty(${item.id}, 1)">+</button>
          <button class="remove-btn" onclick="removeFromCart(${item.id})">✕</button>
        </div>
      </div>
    `).join('');
  }
  if (totalEl) totalEl.textContent = `${cartTotal().toLocaleString()} د.ع`;
}

function showCartNotification(title) {
  const notif = document.createElement('div');
  notif.className = 'cart-notif';
  notif.innerHTML = `<span>✓</span> تمت الإضافة: ${title}`;
  document.body.appendChild(notif);
  setTimeout(() => notif.classList.add('show'), 10);
  setTimeout(() => { notif.classList.remove('show'); setTimeout(() => notif.remove(), 400); }, 2500);
}

function toggleCart() {
  const panel = document.getElementById('cart-panel');
  const overlay = document.getElementById('cart-overlay');
  if (panel) panel.classList.toggle('open');
  if (overlay) overlay.classList.toggle('show');
  renderCartItems();
}

async function placeOrder() {
  if (cart.length === 0) return;
  const user = await getCurrentUser();

  for (const item of cart) {
    await sb.from('orders').insert({
      user_id: user ? user.id : null,
      product_id: item.id,
      product_title: item.title,
      amount: item.price * item.qty,
      status: 'pending'
    });
  }

  cart = [];
  saveCart();
  updateCartUI();
  renderCartItems();
  toggleCart();

  const msg = document.createElement('div');
  msg.className = 'cart-notif success';
  msg.innerHTML = `<span>🎉</span> تم إرسال طلبك بنجاح!`;
  document.body.appendChild(msg);
  setTimeout(() => msg.classList.add('show'), 10);
  setTimeout(() => { msg.classList.remove('show'); setTimeout(() => msg.remove(), 400); }, 3000);
}