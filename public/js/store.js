const CART_KEY = 'noroeste_cart_v1';
const getCart = () => JSON.parse(localStorage.getItem(CART_KEY) || '[]');
const setCart = cart => { localStorage.setItem(CART_KEY, JSON.stringify(cart)); renderCart(); };
function renderCart(){
  const cart=getCart();
  document.querySelectorAll('[data-cart-count]').forEach(el=>el.textContent=cart.length);
  const wrap=document.querySelector('[data-cart-items]');
  if(wrap){wrap.innerHTML=cart.length?cart.map(i=>`<div class="cart-line"><img src="${i.image}"><div><b>${i.name}</b><span>R$ ${Number(i.price).toFixed(2).replace('.',',')}</span></div><button data-remove="${i.id}">×</button></div>`).join(''):'<p class="empty">Seu carrinho está vazio.</p>';}
  const checkout=document.querySelector('[data-cart-checkout]');
  if(checkout){checkout.href=cart.length?`/checkout?items=${cart.map(i=>encodeURIComponent(i.id)).join(',')}`:'#';checkout.classList.toggle('disabled',!cart.length);}
}
function applyFilter(category){
  document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active', category==='all' ? b.dataset.filter==='all' : b.dataset.filter===category));
  const term=(document.querySelector('[data-product-search]')?.value||'').trim().toLowerCase();
  let visible=0;
  document.querySelectorAll('.modern-product-card[data-category]').forEach(card=>{
    const catOk=category==='all'||card.dataset.category===category;
    const text=(card.dataset.productName||'').toLowerCase();
    const searchOk=!term||text.includes(term);
    card.hidden=!(catOk&&searchOk); if(!card.hidden) visible++;
  });
  const empty=document.querySelector('[data-search-empty]'); if(empty) empty.hidden=visible!==0;
}
function showToast(){const t=document.querySelector('[data-store-toast]');if(!t)return;t.classList.add('show');clearTimeout(window.__storeToast);window.__storeToast=setTimeout(()=>t.classList.remove('show'),1800)}
document.addEventListener('click',e=>{
  const add=e.target.closest('[data-add-cart]');
  if(add){const cart=getCart();if(!cart.some(i=>i.id===add.dataset.id))cart.push({id:add.dataset.id,name:add.dataset.name,price:add.dataset.price,image:add.dataset.image});setCart(cart);showToast();document.body.classList.add('cart-open');}
  const rm=e.target.closest('[data-remove]');if(rm)setCart(getCart().filter(i=>i.id!==rm.dataset.remove));
  if(e.target.closest('[data-cart-open]'))document.body.classList.add('cart-open');
  if(e.target.closest('[data-cart-close]'))document.body.classList.remove('cart-open');
  const filter=e.target.closest('[data-filter]');if(filter)applyFilter(filter.dataset.filter);
  const jump=e.target.closest('[data-jump-filter]');if(jump){sessionStorage.setItem('noroeste_filter',jump.dataset.jumpFilter);setTimeout(()=>applyFilter(jump.dataset.jumpFilter),60);}
});
document.addEventListener('input',e=>{if(e.target.matches('[data-product-search]')){const active=document.querySelector('[data-filter].active')?.dataset.filter||'all';applyFilter(active);if(location.pathname==='/'&&!location.hash)location.hash='catalogo';}});
window.addEventListener('DOMContentLoaded',()=>{const saved=sessionStorage.getItem('noroeste_filter');if(saved&&location.pathname==='/'){applyFilter(saved);sessionStorage.removeItem('noroeste_filter');}});
renderCart();
