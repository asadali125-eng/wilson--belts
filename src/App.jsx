import React, { useState, useEffect, useCallback } from "react";
import { ShoppingBag, Plus, Minus, X, Trash2, Check, Lock, Package, ChevronRight, ChevronLeft, Image as ImageIcon, Edit3, ArrowLeft } from "lucide-react";
import { getProducts, saveProduct, deleteProductById, getOrders, createOrder, updateOrder } from "./firebase.js";

// ---------- Storage Helpers ----------
const PRODUCTS_KEY = "wb-products";
const ORDERS_KEY = "wb-orders";
const ADMIN_PASS = "wilson2026";

const defaultProducts = [
  {
    id: "p1",
    name: "Big Gold Heavyweight",
    price: 249,
    description: "Full metal plate, hand-cut leather strap, championship-grade finish.",
    image: "",
    stock: 5,
  },
  {
    id: "p2",
    name: "Crimson Reign",
    price: 199,
    description: "Red leather strap with brushed gold center plate.",
    image: "",
    stock: 8,
  },
  {
    id: "p3",
    name: "Midnight Legacy",
    price: 219,
    description: "Black leather, matte black plate, gold engraved nameplate.",
    image: "",
    stock: 3,
  },
];

// Storage is handled via Firebase (see firebase.js)

// ---------- Main App ----------
export default function App() {
  const [view, setView] = useState("store"); // store, product, cart, checkout, confirm, admin, admin-login
  const [products, setProducts] = useState(defaultProducts);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastOrderId, setLastOrderId] = useState(null);
  const [adminAuthed, setAdminAuthed] = useState(false);

  // Load data on mount
  useEffect(() => {
    (async () => {
      try {
        const storedProducts = await getProducts();
        if (storedProducts && storedProducts.length > 0) {
          setProducts(storedProducts);
        } else {
          // Seed Firestore with default products on first run
          for (const p of defaultProducts) {
            await saveProduct(p);
          }
          const seeded = await getProducts();
          setProducts(seeded.length > 0 ? seeded : defaultProducts);
        }
        const storedOrders = await getOrders();
        setOrders(storedOrders || []);
      } catch (e) {
        console.error("Failed to load data from Firebase:", e);
        setProducts(defaultProducts);
      }
      setLoading(false);
    })();
  }, []);

  const saveProducts = useCallback(async (newProducts) => {
    setProducts(newProducts);
  }, []);

  const saveOrders = useCallback(async (newOrders) => {
    setOrders(newOrders);
  }, []);

  const addToCart = (product, qty = 1) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) => (i.id === product.id ? { ...i, qty: i.qty + qty } : i));
      }
      return [...prev, { ...product, qty }];
    });
  };

  const updateCartQty = (id, qty) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.id !== id));
    } else {
      setCart((prev) => prev.map((i) => (i.id === id ? { ...i, qty } : i)));
    }
  };

  const removeFromCart = (id) => setCart((prev) => prev.filter((i) => i.id !== id));

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);

  const placeOrder = async (customerInfo) => {
    const newOrder = {
      items: cart.map((i) => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
      total: cartTotal,
      customer: customerInfo,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    try {
      const firestoreId = await createOrder(newOrder);
      const orderWithId = { ...newOrder, id: firestoreId };
      setOrders((prev) => [orderWithId, ...prev]);
      setLastOrderId(firestoreId.slice(-8).toUpperCase());
      setCart([]);
      setView("confirm");
    } catch (e) {
      console.error("Failed to place order:", e);
      alert("Something went wrong placing your order. Please try again or contact us directly.");
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loadingPlate}>WB</div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <GlobalStyles />
      {view !== "admin" && view !== "admin-login" && (
        <Header cartCount={cartCount} onCartClick={() => setView("cart")} onLogoClick={() => setView("store")} onAdminClick={() => setView(adminAuthed ? "admin" : "admin-login")} />
      )}

      {view === "store" && (
        <Store
          products={products}
          onSelect={(p) => {
            setSelectedProduct(p);
            setView("product");
          }}
        />
      )}

      {view === "product" && selectedProduct && (
        <ProductDetail
          product={selectedProduct}
          onAdd={(qty) => {
            addToCart(selectedProduct, qty);
            setView("cart");
          }}
          onBack={() => setView("store")}
        />
      )}

      {view === "cart" && (
        <Cart
          cart={cart}
          total={cartTotal}
          onUpdateQty={updateCartQty}
          onRemove={removeFromCart}
          onCheckout={() => setView("checkout")}
          onContinue={() => setView("store")}
        />
      )}

      {view === "checkout" && (
        <Checkout
          cart={cart}
          total={cartTotal}
          onBack={() => setView("cart")}
          onPlaceOrder={placeOrder}
        />
      )}

      {view === "confirm" && (
        <Confirmation orderId={lastOrderId} onBackToStore={() => setView("store")} />
      )}

      {view === "admin-login" && (
        <AdminLogin
          onSuccess={() => {
            setAdminAuthed(true);
            setView("admin");
          }}
          onBack={() => setView("store")}
        />
      )}

      {view === "admin" && adminAuthed && (
        <AdminPanel
          products={products}
          orders={orders}
          onSaveProducts={saveProducts}
          onSaveOrders={saveOrders}
          onExit={() => setView("store")}
        />
      )}

      {view !== "admin" && view !== "admin-login" && <Footer />}
    </div>
  );
}

// ---------- Global Styles ----------
function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
      * { box-sizing: border-box; }
      body { margin: 0; }
      ::selection { background: #C9A227; color: #0B0B0C; }
      input:focus, textarea:focus, button:focus-visible { outline: 2px solid #C9A227; outline-offset: 2px; }
      @media (prefers-reduced-motion: reduce) {
        * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
      }
      @media (max-width: 720px) {
        .wb-detail-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
        .wb-checkout-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
        .wb-order-body { grid-template-columns: 1fr !important; gap: 14px !important; }
        .wb-hero { padding: 56px 20px 40px !important; }
      }
    `}</style>
  );
}

// ---------- Header ----------
function Header({ cartCount, onCartClick, onLogoClick, onAdminClick }) {
  return (
    <header style={styles.header}>
      <div style={styles.headerInner}>
        <div style={styles.logo} onClick={onLogoClick}>
          <span style={styles.logoMark}>W</span>
          <span style={styles.logoText}>WILSON BELTS</span>
        </div>
        <div style={styles.headerRight}>
          <button style={styles.adminLink} onClick={onAdminClick}>Admin</button>
          <button style={styles.cartButton} onClick={onCartClick}>
            <ShoppingBag size={20} />
            {cartCount > 0 && <span style={styles.cartBadge}>{cartCount}</span>}
          </button>
        </div>
      </div>
    </header>
  );
}

// ---------- Store / Product Grid ----------
function Store({ products, onSelect }) {
  return (
    <main>
      <section style={styles.hero} className="wb-hero">
        <div style={styles.heroPlate}>
          <div style={styles.heroEyebrow}>CUSTOM CHAMPIONSHIP BELTS</div>
          <h1 style={styles.heroTitle}>EARN YOUR<br/>GOLD.</h1>
          <p style={styles.heroSub}>Hand-finished plates. Real leather straps. Shipped worldwide.</p>
        </div>
      </section>

      <section style={styles.gridSection}>
        <div style={styles.sectionLabel}>THE COLLECTION</div>
        <div style={styles.grid}>
          {products.map((p) => (
            <div key={p.id} style={styles.card} onClick={() => onSelect(p)} className="wb-card">
              <div style={styles.cardImageWrap}>
                {p.image ? (
                  <img src={p.image} alt={p.name} style={styles.cardImage} />
                ) : (
                  <div style={styles.cardImagePlaceholder}>
                    <ImageIcon size={28} color="#5A4A2A" />
                  </div>
                )}
                <div style={styles.cardPlateBorder} />
              </div>
              <div style={styles.cardInfo}>
                <div style={styles.cardName}>{p.name}</div>
                <div style={styles.cardPrice}>${p.price} USD</div>
                {p.stock <= 3 && p.stock > 0 && (
                  <div style={styles.cardLowStock}>Only {p.stock} left</div>
                )}
                {p.stock === 0 && <div style={styles.cardSoldOut}>SOLD OUT</div>}
              </div>
            </div>
          ))}
        </div>
      </section>
      <style>{`
        .wb-card { transition: transform 0.2s ease, box-shadow 0.2s ease; cursor: pointer; }
        .wb-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.4); }
      `}</style>
    </main>
  );
}

// ---------- Product Detail ----------
function ProductDetail({ product, onAdd, onBack }) {
  const [qty, setQty] = useState(1);
  return (
    <main style={styles.detailWrap}>
      <button style={styles.backLink} onClick={onBack}><ArrowLeft size={16} /> Back to collection</button>
      <div style={styles.detailGrid} className="wb-detail-grid">
        <div style={styles.detailImageWrap}>
          {product.image ? (
            <img src={product.image} alt={product.name} style={styles.detailImage} />
          ) : (
            <div style={styles.detailImagePlaceholder}>
              <ImageIcon size={48} color="#5A4A2A" />
            </div>
          )}
        </div>
        <div style={styles.detailInfo}>
          <div style={styles.sectionLabel}>WILSON BELTS</div>
          <h1 style={styles.detailName}>{product.name}</h1>
          <div style={styles.detailPrice}>${product.price} USD</div>
          <p style={styles.detailDesc}>{product.description}</p>
          {product.stock > 0 ? (
            <>
              <div style={styles.qtyRow}>
                <span style={styles.qtyLabel}>Quantity</span>
                <div style={styles.qtyControl}>
                  <button style={styles.qtyBtn} onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus size={14} /></button>
                  <span style={styles.qtyValue}>{qty}</span>
                  <button style={styles.qtyBtn} onClick={() => setQty((q) => Math.min(product.stock, q + 1))}><Plus size={14} /></button>
                </div>
              </div>
              <button style={styles.primaryBtn} onClick={() => onAdd(qty)}>Add to Cart</button>
            </>
          ) : (
            <div style={styles.soldOutBanner}>This belt is currently sold out</div>
          )}
        </div>
      </div>
    </main>
  );
}

// ---------- Cart ----------
function Cart({ cart, total, onUpdateQty, onRemove, onCheckout, onContinue }) {
  if (cart.length === 0) {
    return (
      <main style={styles.emptyState}>
        <Package size={40} color="#5A4A2A" />
        <h2 style={styles.emptyTitle}>Your cart is empty</h2>
        <p style={styles.emptyText}>No belts in here yet. Time to claim one.</p>
        <button style={styles.primaryBtn} onClick={onContinue}>Browse Belts</button>
      </main>
    );
  }
  return (
    <main style={styles.cartWrap}>
      <h1 style={styles.pageTitle}>Your Cart</h1>
      <div style={styles.cartList}>
        {cart.map((item) => (
          <div key={item.id} style={styles.cartItem}>
            <div style={styles.cartItemImage}>
              {item.image ? <img src={item.image} alt={item.name} style={styles.cartItemImg} /> : <ImageIcon size={24} color="#5A4A2A" />}
            </div>
            <div style={styles.cartItemInfo}>
              <div style={styles.cartItemName}>{item.name}</div>
              <div style={styles.cartItemPrice}>${item.price} USD</div>
            </div>
            <div style={styles.qtyControl}>
              <button style={styles.qtyBtn} onClick={() => onUpdateQty(item.id, item.qty - 1)}><Minus size={14} /></button>
              <span style={styles.qtyValue}>{item.qty}</span>
              <button style={styles.qtyBtn} onClick={() => onUpdateQty(item.id, item.qty + 1)}><Plus size={14} /></button>
            </div>
            <button style={styles.removeBtn} onClick={() => onRemove(item.id)}><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
      <div style={styles.cartSummary}>
        <div style={styles.cartTotalRow}>
          <span>Total</span>
          <span style={styles.cartTotalValue}>${total} USD</span>
        </div>
        <button style={styles.primaryBtn} onClick={onCheckout}>Proceed to Checkout</button>
        <button style={styles.linkBtn} onClick={onContinue}>Continue shopping</button>
      </div>
    </main>
  );
}

// ---------- Checkout ----------
function Checkout({ cart, total, onBack, onPlaceOrder }) {
  const [form, setForm] = useState({ name: "", email: "", address: "", country: "", paypalTxnId: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const PAYPAL_LINK = "https://paypal.me/talhacheema";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.address || !form.paypalTxnId) {
      setError("Please fill in all fields, including your PayPal transaction ID.");
      return;
    }
    setError("");
    setSubmitting(true);
    await onPlaceOrder(form);
    setSubmitting(false);
  };

  return (
    <main style={styles.checkoutWrap}>
      <button style={styles.backLink} onClick={onBack}><ArrowLeft size={16} /> Back to cart</button>
      <h1 style={styles.pageTitle}>Checkout</h1>

      <div style={styles.checkoutGrid} className="wb-checkout-grid">
        <div style={styles.paymentBox}>
          <div style={styles.sectionLabel}>STEP 1 — PAY</div>
          <p style={styles.paymentText}>
            Send <strong>${total} USD</strong> via PayPal to complete your order:
          </p>
          <a href={PAYPAL_LINK} target="_blank" rel="noopener noreferrer" style={styles.paypalBtn}>
            Pay ${total} with PayPal
          </a>
          <p style={styles.paymentNote}>
            After paying, copy your PayPal transaction ID (found in your PayPal receipt/email) and paste it below.
          </p>
        </div>

        <form style={styles.form} onSubmit={handleSubmit}>
          <div style={styles.sectionLabel}>STEP 2 — YOUR DETAILS</div>
          <label style={styles.formLabel}>Full Name</label>
          <input style={styles.formInput} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Cena" />

          <label style={styles.formLabel}>Email</label>
          <input style={styles.formInput} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@email.com" />

          <label style={styles.formLabel}>Shipping Address</label>
          <textarea style={styles.formTextarea} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street, City, State, ZIP" />

          <label style={styles.formLabel}>Country</label>
          <input style={styles.formInput} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="United States" />

          <label style={styles.formLabel}>PayPal Transaction ID</label>
          <input style={styles.formInput} value={form.paypalTxnId} onChange={(e) => setForm({ ...form, paypalTxnId: e.target.value })} placeholder="e.g. 8XJ123456A789012B" />

          {error && <div style={styles.formError}>{error}</div>}

          <button style={styles.primaryBtn} type="submit" disabled={submitting}>
            {submitting ? "Placing Order..." : "Place Order"}
          </button>
        </form>
      </div>
    </main>
  );
}

// ---------- Confirmation ----------
function Confirmation({ orderId, onBackToStore }) {
  return (
    <main style={styles.confirmWrap}>
      <div style={styles.confirmIcon}><Check size={32} color="#0B0B0C" /></div>
      <h1 style={styles.pageTitle}>Order Received</h1>
      <p style={styles.confirmText}>
        Your order <strong>{orderId}</strong> has been recorded. We'll verify your payment and confirm shortly by email.
      </p>
      <button style={styles.primaryBtn} onClick={onBackToStore}>Back to Store</button>
    </main>
  );
}

// ---------- Admin Login ----------
function AdminLogin({ onSuccess, onBack }) {
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pass === ADMIN_PASS) {
      onSuccess();
    } else {
      setError("Incorrect password.");
    }
  };

  return (
    <main style={styles.loginWrap}>
      <div style={styles.loginBox}>
        <Lock size={28} color="#C9A227" />
        <h1 style={styles.loginTitle}>Admin Access</h1>
        <form onSubmit={handleSubmit} style={{ width: "100%" }}>
          <input
            style={styles.formInput}
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="Password"
            autoFocus
          />
          {error && <div style={styles.formError}>{error}</div>}
          <button style={styles.primaryBtn} type="submit">Enter</button>
        </form>
        <button style={styles.linkBtn} onClick={onBack}>Back to store</button>
      </div>
    </main>
  );
}

// ---------- Admin Panel ----------
function AdminPanel({ products, orders, onSaveProducts, onSaveOrders, onExit }) {
  const [tab, setTab] = useState("orders");
  const [editingProduct, setEditingProduct] = useState(null);

  const updateOrderStatus = async (orderId, status) => {
    const updated = orders.map((o) => (o.id === orderId ? { ...o, status } : o));
    onSaveOrders(updated);
    try {
      await updateOrder(orderId, { status });
    } catch (e) {
      console.error("Failed to update order status:", e);
    }
  };

  const deleteProduct = async (id) => {
    onSaveProducts(products.filter((p) => p.id !== id));
    try {
      await deleteProductById(id);
    } catch (e) {
      console.error("Failed to delete product:", e);
    }
  };

  const saveProductHandler = async (product) => {
    try {
      const id = await saveProduct(product);
      if (product.id) {
        onSaveProducts(products.map((p) => (p.id === product.id ? product : p)));
      } else {
        onSaveProducts([...products, { ...product, id }]);
      }
    } catch (e) {
      console.error("Failed to save product:", e);
      alert("Failed to save belt. Please try again.");
    }
    setEditingProduct(null);
  };

  return (
    <div style={styles.adminWrap}>
      <div style={styles.adminHeader}>
        <div style={styles.logo}>
          <span style={styles.logoMark}>W</span>
          <span style={styles.logoText}>WILSON BELTS — ADMIN</span>
        </div>
        <button style={styles.linkBtn} onClick={onExit}>Exit Admin</button>
      </div>

      <div style={styles.adminTabs}>
        <button style={tab === "orders" ? styles.adminTabActive : styles.adminTab} onClick={() => setTab("orders")}>
          Orders ({orders.length})
        </button>
        <button style={tab === "products" ? styles.adminTabActive : styles.adminTab} onClick={() => setTab("products")}>
          Products ({products.length})
        </button>
      </div>

      {tab === "orders" && (
        <div style={styles.ordersList}>
          {orders.length === 0 && <p style={styles.emptyText}>No orders yet.</p>}
          {orders.map((order) => (
            <div key={order.id} style={styles.orderCard}>
              <div style={styles.orderHeader}>
                <div>
                  <div style={styles.orderId}>{order.id}</div>
                  <div style={styles.orderDate}>{new Date(order.createdAt).toLocaleString()}</div>
                </div>
                <select
                  style={styles.statusSelect(order.status)}
                  value={order.status}
                  onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="shipped">Shipped</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div style={styles.orderBody} className="wb-order-body">
                <div style={styles.orderSection}>
                  <div style={styles.orderSectionLabel}>Customer</div>
                  <div>{order.customer.name}</div>
                  <div>{order.customer.email}</div>
                  <div>{order.customer.address}, {order.customer.country}</div>
                </div>
                <div style={styles.orderSection}>
                  <div style={styles.orderSectionLabel}>PayPal Transaction ID</div>
                  <div style={styles.txnId}>{order.customer.paypalTxnId}</div>
                </div>
                <div style={styles.orderSection}>
                  <div style={styles.orderSectionLabel}>Items</div>
                  {order.items.map((item, i) => (
                    <div key={i} style={styles.orderItemRow}>
                      {item.name} × {item.qty} — ${item.price * item.qty}
                    </div>
                  ))}
                  <div style={styles.orderTotal}>Total: ${order.total} USD</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "products" && (
        <div style={styles.productsAdminWrap}>
          <button style={styles.primaryBtn} onClick={() => setEditingProduct({})}>+ Add New Belt</button>
          <div style={styles.productsAdminList}>
            {products.map((p) => (
              <div key={p.id} style={styles.productAdminCard}>
                <div style={styles.productAdminImage}>
                  {p.image ? <img src={p.image} alt={p.name} style={styles.cartItemImg} /> : <ImageIcon size={20} color="#5A4A2A" />}
                </div>
                <div style={styles.productAdminInfo}>
                  <div style={styles.cartItemName}>{p.name}</div>
                  <div style={styles.cartItemPrice}>${p.price} USD — Stock: {p.stock}</div>
                </div>
                <button style={styles.iconBtn} onClick={() => setEditingProduct(p)}><Edit3 size={16} /></button>
                <button style={styles.iconBtn} onClick={() => deleteProduct(p.id)}><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {editingProduct !== null && (
        <ProductEditor
          product={editingProduct}
          onSave={saveProductHandler}
          onCancel={() => setEditingProduct(null)}
        />
      )}
    </div>
  );
}

// ---------- Product Editor Modal ----------
function ProductEditor({ product, onSave, onCancel }) {
  const [form, setForm] = useState({
    id: product.id || null,
    name: product.name || "",
    price: product.price || "",
    description: product.description || "",
    image: product.image || "",
    stock: product.stock !== undefined ? product.stock : 5,
  });

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm({ ...form, image: reader.result });
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, price: parseFloat(form.price), stock: parseInt(form.stock) });
  };

  return (
    <div style={styles.modalOverlay} onClick={onCancel}>
      <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
        <button style={styles.modalClose} onClick={onCancel}><X size={20} /></button>
        <h2 style={styles.loginTitle}>{product.id ? "Edit Belt" : "Add New Belt"}</h2>
        <form onSubmit={handleSubmit}>
          <label style={styles.formLabel}>Name</label>
          <input style={styles.formInput} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />

          <label style={styles.formLabel}>Price (USD)</label>
          <input style={styles.formInput} type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />

          <label style={styles.formLabel}>Stock Quantity</label>
          <input style={styles.formInput} type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required />

          <label style={styles.formLabel}>Description</label>
          <textarea style={styles.formTextarea} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

          <label style={styles.formLabel}>Image</label>
          <input style={styles.formInput} type="file" accept="image/*" onChange={handleImageUpload} />
          {form.image && <img src={form.image} alt="preview" style={styles.imagePreview} />}

          <button style={styles.primaryBtn} type="submit">Save Belt</button>
        </form>
      </div>
    </div>
  );
}

// ---------- Footer ----------
function Footer() {
  return (
    <footer style={styles.footer}>
      <div style={styles.footerText}>WILSON BELTS — Custom championship belts, shipped worldwide.</div>
    </footer>
  );
}

// ---------- Styles ----------
const colors = {
  bg: "#0B0B0C",
  bgAlt: "#15130F",
  gold: "#C9A227",
  goldBright: "#E0BB3D",
  leather: "#3D2B1F",
  text: "#EDE8DD",
  textDim: "#A89F8C",
  red: "#8A1F1F",
  cardBg: "#161412",
};

const fontDisplay = "'Oswald', sans-serif";
const fontBody = "'Inter', sans-serif";

const styles = {
  app: {
    background: colors.bg,
    color: colors.text,
    minHeight: "100vh",
    fontFamily: fontBody,
  },
  loadingScreen: {
    background: colors.bg,
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingPlate: {
    fontFamily: fontDisplay,
    fontSize: 32,
    fontWeight: 700,
    color: colors.gold,
    border: `2px solid ${colors.gold}`,
    borderRadius: 8,
    padding: "16px 28px",
    letterSpacing: 2,
  },
  header: {
    borderBottom: `1px solid #2A2620`,
    position: "sticky",
    top: 0,
    background: "rgba(11,11,12,0.95)",
    backdropFilter: "blur(8px)",
    zIndex: 50,
  },
  headerInner: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "16px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: { display: "flex", alignItems: "center", gap: 10, cursor: "pointer" },
  logoMark: {
    fontFamily: fontDisplay,
    background: colors.gold,
    color: colors.bg,
    width: 32,
    height: 32,
    borderRadius: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
  },
  logoText: { fontFamily: fontDisplay, fontSize: 16, letterSpacing: 1.5, fontWeight: 600 },
  headerRight: { display: "flex", alignItems: "center", gap: 16 },
  adminLink: { background: "none", border: "none", color: colors.textDim, cursor: "pointer", fontSize: 13, fontFamily: fontBody },
  cartButton: { background: "none", border: "none", color: colors.text, cursor: "pointer", position: "relative", padding: 4 },
  cartBadge: {
    position: "absolute", top: -4, right: -4, background: colors.gold, color: colors.bg,
    fontSize: 10, fontWeight: 700, borderRadius: 10, width: 16, height: 16,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  hero: {
    padding: "80px 20px 60px",
    textAlign: "center",
    borderBottom: `1px solid #2A2620`,
    background: `radial-gradient(ellipse at center top, rgba(201,162,39,0.08), transparent 60%)`,
  },
  heroPlate: { maxWidth: 700, margin: "0 auto" },
  heroEyebrow: { fontFamily: fontDisplay, color: colors.gold, fontSize: 13, letterSpacing: 3, marginBottom: 16 },
  heroTitle: { fontFamily: fontDisplay, fontSize: "clamp(40px, 8vw, 72px)", fontWeight: 700, lineHeight: 1.05, margin: "0 0 16px", letterSpacing: 1 },
  heroSub: { color: colors.textDim, fontSize: 16, margin: 0 },
  gridSection: { maxWidth: 1100, margin: "0 auto", padding: "50px 20px 80px" },
  sectionLabel: { fontFamily: fontDisplay, color: colors.gold, fontSize: 12, letterSpacing: 2.5, marginBottom: 20 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 24 },
  card: { background: colors.cardBg, border: `1px solid #2A2620`, borderRadius: 8, overflow: "hidden" },
  cardImageWrap: { position: "relative", aspectRatio: "1", background: "#1A1712" },
  cardImage: { width: "100%", height: "100%", objectFit: "cover" },
  cardImagePlaceholder: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" },
  cardPlateBorder: { position: "absolute", inset: 0, border: `1px solid rgba(201,162,39,0.15)`, pointerEvents: "none" },
  cardInfo: { padding: 18 },
  cardName: { fontFamily: fontDisplay, fontSize: 17, fontWeight: 600, marginBottom: 6 },
  cardPrice: { color: colors.gold, fontWeight: 600, fontSize: 15 },
  cardLowStock: { color: "#D9A441", fontSize: 12, marginTop: 6 },
  cardSoldOut: { color: colors.red, fontSize: 12, marginTop: 6, fontWeight: 600 },
  detailWrap: { maxWidth: 1000, margin: "0 auto", padding: "40px 20px 80px" },
  backLink: { background: "none", border: "none", color: colors.textDim, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 14, marginBottom: 24, fontFamily: fontBody, padding: 0 },
  detailGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 50 },
  detailImageWrap: { aspectRatio: "1", background: colors.cardBg, borderRadius: 8, overflow: "hidden", border: `1px solid #2A2620` },
  detailImage: { width: "100%", height: "100%", objectFit: "cover" },
  detailImagePlaceholder: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" },
  detailInfo: { display: "flex", flexDirection: "column" },
  detailName: { fontFamily: fontDisplay, fontSize: 34, fontWeight: 700, margin: "8px 0" },
  detailPrice: { color: colors.gold, fontSize: 22, fontWeight: 600, marginBottom: 20 },
  detailDesc: { color: colors.textDim, lineHeight: 1.6, marginBottom: 30 },
  qtyRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  qtyLabel: { fontSize: 14, color: colors.textDim },
  qtyControl: { display: "flex", alignItems: "center", gap: 12, border: `1px solid #2A2620`, borderRadius: 6, padding: "4px 8px" },
  qtyBtn: { background: "none", border: "none", color: colors.text, cursor: "pointer", display: "flex", padding: 4 },
  qtyValue: { minWidth: 20, textAlign: "center", fontWeight: 600 },
  primaryBtn: {
    background: colors.gold, color: colors.bg, border: "none", borderRadius: 6,
    padding: "14px 28px", fontSize: 15, fontWeight: 600, cursor: "pointer",
    fontFamily: fontBody, width: "100%", marginTop: 8,
  },
  soldOutBanner: { background: "rgba(138,31,31,0.15)", color: "#D9706B", padding: 16, borderRadius: 6, textAlign: "center", fontWeight: 600 },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px 20px", gap: 12, textAlign: "center" },
  emptyTitle: { fontFamily: fontDisplay, fontSize: 24, margin: "8px 0 0" },
  emptyText: { color: colors.textDim, margin: 0 },
  cartWrap: { maxWidth: 800, margin: "0 auto", padding: "40px 20px 80px" },
  pageTitle: { fontFamily: fontDisplay, fontSize: 32, fontWeight: 700, marginBottom: 30 },
  cartList: { display: "flex", flexDirection: "column", gap: 16, marginBottom: 30 },
  cartItem: { display: "flex", alignItems: "center", gap: 16, padding: 16, background: colors.cardBg, borderRadius: 8, border: `1px solid #2A2620` },
  cartItemImage: { width: 60, height: 60, background: "#1A1712", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" },
  cartItemImg: { width: "100%", height: "100%", objectFit: "cover" },
  cartItemInfo: { flex: 1 },
  cartItemName: { fontWeight: 600, marginBottom: 4 },
  cartItemPrice: { color: colors.gold, fontSize: 14 },
  removeBtn: { background: "none", border: "none", color: colors.textDim, cursor: "pointer", padding: 6 },
  cartSummary: { background: colors.cardBg, padding: 24, borderRadius: 8, border: `1px solid #2A2620` },
  cartTotalRow: { display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 600, marginBottom: 16 },
  cartTotalValue: { color: colors.gold },
  linkBtn: { background: "none", border: "none", color: colors.textDim, cursor: "pointer", width: "100%", textAlign: "center", padding: 12, fontFamily: fontBody, fontSize: 14 },
  checkoutWrap: { maxWidth: 900, margin: "0 auto", padding: "40px 20px 80px" },
  checkoutGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginTop: 20 },
  paymentBox: { background: colors.cardBg, padding: 24, borderRadius: 8, border: `1px solid #2A2620`, alignSelf: "start" },
  paymentText: { lineHeight: 1.6, marginBottom: 16 },
  paypalBtn: {
    display: "block", textAlign: "center", background: "#FFC439", color: "#0B0B0C",
    padding: "14px", borderRadius: 6, fontWeight: 700, textDecoration: "none", marginBottom: 16,
  },
  paymentNote: { fontSize: 13, color: colors.textDim, lineHeight: 1.5 },
  form: { display: "flex", flexDirection: "column" },
  formLabel: { fontSize: 13, color: colors.textDim, marginBottom: 6, marginTop: 14 },
  formInput: {
    background: "#1A1712", border: `1px solid #2A2620`, borderRadius: 6, padding: "12px 14px",
    color: colors.text, fontSize: 14, fontFamily: fontBody, width: "100%",
  },
  formTextarea: {
    background: "#1A1712", border: `1px solid #2A2620`, borderRadius: 6, padding: "12px 14px",
    color: colors.text, fontSize: 14, fontFamily: fontBody, width: "100%", minHeight: 70, resize: "vertical",
  },
  formError: { color: "#D9706B", fontSize: 13, marginTop: 10 },
  confirmWrap: { display: "flex", flexDirection: "column", alignItems: "center", padding: "100px 20px", textAlign: "center", maxWidth: 500, margin: "0 auto" },
  confirmIcon: { width: 60, height: 60, background: colors.gold, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 },
  confirmText: { color: colors.textDim, lineHeight: 1.6, marginBottom: 30 },
  loginWrap: { display: "flex", justifyContent: "center", padding: "100px 20px" },
  loginBox: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, maxWidth: 320, width: "100%" },
  loginTitle: { fontFamily: fontDisplay, fontSize: 22, margin: "8px 0 16px" },
  adminWrap: { maxWidth: 1100, margin: "0 auto", padding: "30px 20px 80px" },
  adminHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30, paddingBottom: 20, borderBottom: `1px solid #2A2620` },
  adminTabs: { display: "flex", gap: 8, marginBottom: 30 },
  adminTab: { background: "none", border: `1px solid #2A2620`, color: colors.textDim, padding: "10px 18px", borderRadius: 6, cursor: "pointer", fontFamily: fontBody, fontSize: 14 },
  adminTabActive: { background: colors.gold, border: `1px solid ${colors.gold}`, color: colors.bg, padding: "10px 18px", borderRadius: 6, cursor: "pointer", fontFamily: fontBody, fontSize: 14, fontWeight: 600 },
  ordersList: { display: "flex", flexDirection: "column", gap: 16 },
  orderCard: { background: colors.cardBg, border: `1px solid #2A2620`, borderRadius: 8, padding: 20 },
  orderHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid #2A2620` },
  orderId: { fontFamily: fontDisplay, fontWeight: 600, fontSize: 16 },
  orderDate: { fontSize: 12, color: colors.textDim, marginTop: 4 },
  statusSelect: (status) => ({
    background: status === "confirmed" ? "rgba(76,175,80,0.15)" : status === "shipped" ? "rgba(33,150,243,0.15)" : status === "cancelled" ? "rgba(138,31,31,0.2)" : "rgba(201,162,39,0.15)",
    color: status === "confirmed" ? "#7ED98A" : status === "shipped" ? "#7EC4F0" : status === "cancelled" ? "#D9706B" : colors.gold,
    border: "none", borderRadius: 6, padding: "8px 12px", fontSize: 13, fontWeight: 600, fontFamily: fontBody, cursor: "pointer",
  }),
  orderBody: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 },
  orderSection: { fontSize: 14, lineHeight: 1.6 },
  orderSectionLabel: { fontSize: 11, color: colors.gold, letterSpacing: 1, marginBottom: 6, fontFamily: fontDisplay },
  txnId: { fontFamily: "monospace", background: "#1A1712", padding: "6px 10px", borderRadius: 4, fontSize: 13, display: "inline-block" },
  orderItemRow: { fontSize: 13, marginBottom: 4 },
  orderTotal: { fontWeight: 600, marginTop: 8, color: colors.gold },
  productsAdminWrap: { display: "flex", flexDirection: "column", gap: 20 },
  productsAdminList: { display: "flex", flexDirection: "column", gap: 12 },
  productAdminCard: { display: "flex", alignItems: "center", gap: 16, background: colors.cardBg, border: `1px solid #2A2620`, borderRadius: 8, padding: 14 },
  productAdminImage: { width: 50, height: 50, background: "#1A1712", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 },
  productAdminInfo: { flex: 1 },
  iconBtn: { background: "none", border: `1px solid #2A2620`, borderRadius: 6, color: colors.textDim, cursor: "pointer", padding: 8, display: "flex" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 },
  modalBox: { background: colors.bgAlt, border: `1px solid #2A2620`, borderRadius: 10, padding: 30, maxWidth: 440, width: "100%", maxHeight: "85vh", overflowY: "auto", position: "relative" },
  modalClose: { position: "absolute", top: 16, right: 16, background: "none", border: "none", color: colors.textDim, cursor: "pointer" },
  imagePreview: { width: "100%", maxHeight: 150, objectFit: "contain", marginTop: 10, borderRadius: 6 },
  footer: { borderTop: `1px solid #2A2620`, padding: "30px 20px", textAlign: "center" },
  footerText: { color: colors.textDim, fontSize: 13 },
};
