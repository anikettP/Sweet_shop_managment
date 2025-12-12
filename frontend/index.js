
import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithCustomToken, 
  signInAnonymously, 
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  where,
  getDocs,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { 
  ShoppingBag, 
  Plus, 
  Trash2, 
  LogOut, 
  Search, 
  Package, 
  Edit,
  User,
  ShieldAlert,
  IndianRupee,
  X,
  CheckCircle,
  Filter,
  Minus,
  ChevronRight,
  Store
} from 'lucide-react';

// --- Firebase Initialization ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- Components ---

// 1. Auth Component (Professional Login)
const AuthPage = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    
    try {
      if (!auth.currentUser) throw new Error("Connecting to services...");
      const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');

      if (isRegistering) {
        const q = query(usersRef, where('email', '==', cleanEmail));
        const snap = await getDocs(q);
        if (!snap.empty) throw new Error("Account already exists with this email.");

        const newUser = {
          email: cleanEmail,
          password, 
          role: cleanEmail.includes('admin') ? 'admin' : 'user',
          createdAt: serverTimestamp()
        };
        await addDoc(usersRef, newUser);
        onLogin(newUser);
      } else {
        const q = query(usersRef, where('email', '==', cleanEmail));
        const snap = await getDocs(q);
        if (snap.empty) throw new Error("Account not found.");
        const userDoc = snap.docs[0].data();
        if (userDoc.password !== password) throw new Error("Invalid credentials.");
        onLogin(userDoc);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
      <div className="bg-white p-8 rounded-lg shadow-xl border border-gray-200 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-amber-600 p-3 rounded-full mb-4">
            <Store className="text-white" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Mithai & More</h2>
          <p className="text-gray-500 text-sm mt-1">Premium Sweet Management System</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Email Address</label>
            <input 
              type="email" required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition text-gray-900"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Password</label>
            <input 
              type="password" required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition text-gray-900"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm flex items-start gap-2">
              <ShieldAlert size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 rounded-md transition-all shadow-sm flex justify-center items-center gap-2">
            {loading ? 'Processing...' : (isRegistering ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <button onClick={() => setIsRegistering(!isRegistering)} className="text-amber-600 hover:text-amber-700 font-medium text-sm transition-colors">
            {isRegistering ? 'Already have an account? Sign In' : 'Create a new account'}
          </button>
        </div>
      </div>
    </div>
  );
};

// 2. Sweet Card Component (E-commerce Style)
const SweetCard = ({ sweet, isAdmin, onAddToCart, onRestock, onDelete, onEdit }) => {
  const isOutOfStock = sweet.quantity === 0;
  const [restockAmount, setRestockAmount] = useState(10);
  const [showRestock, setShowRestock] = useState(false);

  // SVG patterns for realism instead of plain colors
  const getCategoryPattern = (cat) => {
    switch(cat) {
      case 'Chocolate': return 'bg-amber-900';
      case 'Hard Candy': return 'bg-rose-600';
      case 'Gummies': return 'bg-emerald-500';
      case 'Beverage': return 'bg-blue-500';
      case 'Mithai': return 'bg-orange-500';
      default: return 'bg-gray-700';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow duration-300 group">
      {/* Product Image Area */}
      <div className={`h-48 relative overflow-hidden ${getCategoryPattern(sweet.category)} flex items-center justify-center`}>
        {/* Simple realistic SVG overlay */}
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/food.png')]"></div>
        
        {/* Central Icon */}
        <div className="z-10 bg-white p-4 rounded-full shadow-lg">
          <ShoppingBag className="text-gray-800" size={32} />
        </div>

        {/* Price Tag */}
        <div className="absolute bottom-3 right-3 bg-white px-3 py-1 rounded shadow-sm text-sm font-bold text-gray-900 flex items-center">
          <IndianRupee size={12} strokeWidth={3} />
          {sweet.price.toFixed(2)}
        </div>

        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-20">
            <span className="border-2 border-red-600 text-red-600 px-4 py-1 font-bold text-lg uppercase tracking-widest transform -rotate-12">
              Sold Out
            </span>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 border border-gray-200 px-2 py-0.5 rounded">
            {sweet.category}
          </span>
        </div>
        
        <h3 className="font-bold text-gray-900 text-lg mb-2 leading-tight">{sweet.name}</h3>
        
        <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-1 leading-relaxed">
          {sweet.description || "Premium confectionery item."}
        </p>

        <div className="flex items-center justify-between mb-4 pt-4 border-t border-gray-50">
          <span className={`flex items-center gap-1.5 text-sm font-medium ${sweet.quantity < 10 ? 'text-amber-600' : 'text-gray-500'}`}>
            <Package size={16} />
            {sweet.quantity} Units Stock
          </span>
        </div>

        <div className="space-y-3 mt-auto">
          {/* User Action: Add to Cart */}
          <button
            onClick={() => onAddToCart(sweet)}
            disabled={isOutOfStock}
            className={`w-full py-2.5 rounded-md font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
              isOutOfStock 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-gray-900 hover:bg-gray-800 text-white'
            }`}
          >
            <Plus size={16} />
            {isOutOfStock ? 'Unavailable' : 'Add to Cart'}
          </button>

          {/* Admin Actions */}
          {isAdmin && (
            <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
              {showRestock ? (
                <div className="col-span-2 flex gap-2">
                  <input 
                    type="number" 
                    value={restockAmount}
                    onChange={(e) => setRestockAmount(parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1 bg-gray-50 border border-gray-300 rounded text-sm focus:border-amber-500 outline-none"
                  />
                  <button 
                    onClick={() => { onRestock(sweet, restockAmount); setShowRestock(false); }}
                    className="bg-green-600 text-white px-3 rounded hover:bg-green-700 font-medium text-sm flex items-center"
                  >
                    <CheckCircle size={14} />
                  </button>
                  <button 
                    onClick={() => setShowRestock(false)}
                    className="bg-gray-200 text-gray-600 px-3 rounded hover:bg-gray-300 font-medium text-sm flex items-center"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setShowRestock(true)}
                  className="bg-blue-50 text-blue-700 hover:bg-blue-100 py-2 rounded border border-blue-200 text-xs font-semibold flex items-center justify-center gap-1"
                >
                  <Plus size={14} /> STOCK
                </button>
              )}
              
              <div className="col-span-1 flex gap-2">
                 <button 
                  onClick={() => onEdit(sweet)}
                  className="flex-1 bg-amber-50 text-amber-700 hover:bg-amber-100 py-2 rounded border border-amber-200 text-xs font-semibold flex items-center justify-center gap-1"
                >
                  <Edit size={14} /> EDIT
                </button>
                <button 
                  onClick={() => onDelete(sweet)}
                  className="flex-1 bg-red-50 text-red-700 hover:bg-red-100 py-2 rounded border border-red-200 text-xs font-semibold flex items-center justify-center gap-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 3. Cart Drawer
const CartDrawer = ({ isOpen, onClose, cart, onRemove, onCheckout, total }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Drawer */}
      <div className="relative bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-slideInRight">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ShoppingBag size={20} /> Your Cart
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <ShoppingBag size={48} className="mb-4 opacity-20" />
              <p>Your cart is empty.</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={`${item.id}-${idx}`} className="flex justify-between items-center border-b border-gray-50 pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                    <ShoppingBag size={16} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">{item.name}</h4>
                    <p className="text-sm text-gray-500 flex items-center">
                      <IndianRupee size={10} /> {item.price.toFixed(2)}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => onRemove(idx)}
                  className="text-red-400 hover:text-red-600 p-2"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50">
          <div className="flex justify-between items-center mb-6">
            <span className="text-gray-600 font-medium">Total Amount</span>
            <span className="text-2xl font-bold text-gray-900 flex items-center">
              <IndianRupee size={20} /> {total.toFixed(2)}
            </span>
          </div>
          <button 
            onClick={onCheckout}
            disabled={cart.length === 0}
            className={`w-full py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2 transition-colors ${
              cart.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-black'
            }`}
          >
            Checkout Securely <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

// 4. Modal Wrapper (Professional)
const ModalWrapper = ({ isOpen, title, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

const SweetForm = ({ initialData, onSubmit, onClose, buttonText }) => {
  const [formData, setFormData] = useState(initialData);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      price: parseFloat(formData.price),
      quantity: parseInt(formData.quantity)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Product Name</label>
        <input 
          required
          className="w-full px-3 py-2 border border-gray-300 rounded focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
          value={formData.name}
          onChange={e => setFormData({...formData, name: e.target.value})}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
          <select 
            className="w-full px-3 py-2 border border-gray-300 rounded focus:border-amber-500 outline-none bg-white"
            value={formData.category}
            onChange={e => setFormData({...formData, category: e.target.value})}
          >
            <option>Chocolate</option>
            <option>Hard Candy</option>
            <option>Gummies</option>
            <option>Mithai</option>
            <option>Beverage</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Price (₹)</label>
          <input 
            type="number" step="0.01" required
            className="w-full px-3 py-2 border border-gray-300 rounded focus:border-amber-500 outline-none"
            value={formData.price}
            onChange={e => setFormData({...formData, price: e.target.value})}
          />
        </div>
      </div>
      {initialData.quantity !== undefined && (
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Initial Stock</label>
          <input 
            type="number" required
            className="w-full px-3 py-2 border border-gray-300 rounded focus:border-amber-500 outline-none"
            value={formData.quantity}
            onChange={e => setFormData({...formData, quantity: e.target.value})}
          />
        </div>
      )}
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
        <textarea 
          className="w-full px-3 py-2 border border-gray-300 rounded focus:border-amber-500 outline-none h-24 resize-none"
          value={formData.description}
          onChange={e => setFormData({...formData, description: e.target.value})}
        />
      </div>
      <div className="flex gap-3 pt-4">
        <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded text-gray-600 hover:bg-gray-50 font-medium">Cancel</button>
        <button type="submit" className="flex-1 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 font-medium shadow-sm">{buttonText}</button>
      </div>
    </form>
  );
}

// --- Main App Component ---

export default function App() {
  const [appUser, setAppUser] = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(null);
  
  const [sweets, setSweets] = useState([]);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [maxPrice, setMaxPrice] = useState(1000); // Default max price range

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSweet, setEditingSweet] = useState(null);
  const [notification, setNotification] = useState(null);

  // Auth & Data Logic
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        try { await signInWithCustomToken(auth, __initial_auth_token); } 
        catch (e) { await signInAnonymously(auth); }
      } else { await signInAnonymously(auth); }
    };
    initAuth();
    return onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
    const sweetsRef = collection(db, 'artifacts', appId, 'public', 'data', 'sweets');
    const q = query(sweetsRef, orderBy('name'));
    return onSnapshot(q, (snapshot) => {
      setSweets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, console.error);
  }, [firebaseUser]);

  const isAdmin = appUser && (appUser.role === 'admin'); 

  // Advanced Filtering
  const filteredSweets = useMemo(() => {
    return sweets.filter(sweet => {
      const matchesSearch = sweet.name.toLowerCase().includes(search.toLowerCase()) || 
                            sweet.category.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || sweet.category === categoryFilter;
      const matchesPrice = sweet.price <= maxPrice;
      return matchesSearch && matchesCategory && matchesPrice;
    });
  }, [sweets, search, categoryFilter, maxPrice]);

  const categories = ['All', ...new Set(sweets.map(s => s.category))];
  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleActions = {
    add: async (data) => {
      try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'sweets'), { ...data, createdAt: serverTimestamp() });
        showNotification("Product added to inventory");
        setIsAddModalOpen(false);
      } catch (e) { showNotification("Failed to add product", "error"); }
    },
    update: async (data) => {
      try {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sweets', data.id), {
          name: data.name, category: data.category, price: data.price, description: data.description
        });
        showNotification("Product details updated");
        setEditingSweet(null);
      } catch (e) { showNotification("Update failed", "error"); }
    },
    delete: async (sweet) => {
      if (!confirm(`Permanently delete ${sweet.name}?`)) return;
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sweets', sweet.id));
        showNotification("Product removed");
      } catch (e) { showNotification("Delete failed", "error"); }
    },
    restock: async (sweet, amount) => {
      try {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sweets', sweet.id), { quantity: increment(amount) });
        showNotification(`Stock updated: +${amount}`);
      } catch (e) { showNotification("Restock failed", "error"); }
    },
    addToCart: (sweet) => {
      setCart(prev => [...prev, sweet]);
      showNotification(`${sweet.name} added to cart`);
      setIsCartOpen(true);
    },
    checkout: async () => {
      try {
        // Process each item (Simulating the /api/sweets/:id/purchase endpoint for each item)
        // In a real batch scenario, we would use a batch write, but we are mimicking the specific API constraint
        for (const item of cart) {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sweets', item.id), { 
                quantity: increment(-1) 
            });
        }
        setCart([]);
        setIsCartOpen(false);
        showNotification("Order placed successfully!");
      } catch (e) {
        showNotification("Checkout failed. Some items may be out of stock.", "error");
      }
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-gray-600 font-medium">Loading Inventory...</div>;
  if (!appUser) return <AuthPage onLogin={setAppUser} />;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans text-gray-900">
      
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-gray-900 p-2 rounded text-white">
              <Store size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900">Mithai & More</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end text-right">
                <span className="text-sm font-semibold text-gray-900">{appUser.email}</span>
                {isAdmin && <span className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">Administrator</span>}
            </div>
            
            <button 
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
                <ShoppingBag size={24} />
                {cart.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
                        {cart.length}
                    </span>
                )}
            </button>

            <div className="h-6 w-px bg-gray-200"></div>

            <button onClick={() => setAppUser(null)} className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-red-600 transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 pt-8">
        
        {/* Controls Bar */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-8">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                
                {/* Search & Category */}
                <div className="flex flex-1 w-full gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search inventory..." 
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none transition text-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <select 
                        className="px-4 py-2 bg-white border border-gray-300 rounded outline-none focus:border-amber-500 text-sm font-medium"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                {/* Price Range Filter */}
                <div className="flex items-center gap-2 w-full md:w-auto px-4 py-2 bg-gray-50 rounded border border-gray-200">
                    <span className="text-xs font-bold text-gray-500 uppercase">Max Price:</span>
                    <input 
                        type="range" 
                        min="0" max="2000" step="10" 
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                        className="w-32 h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-sm font-bold w-16 text-right">₹{maxPrice}</span>
                </div>

                {/* Admin Add */}
                {isAdmin && (
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="w-full md:w-auto bg-amber-600 text-white px-6 py-2 rounded font-medium hover:bg-amber-700 transition flex items-center justify-center gap-2 shadow-sm text-sm"
                    >
                        <Plus size={16} /> New Product
                    </button>
                )}
            </div>
        </div>

        {/* Grid */}
        {sweets.length === 0 ? (
          <div className="text-center py-20">
            <h3 className="text-xl font-bold text-gray-400">Inventory Empty</h3>
          </div>
        ) : filteredSweets.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg border border-dashed border-gray-300">
            <p className="text-gray-500 font-medium">No products match your filters.</p>
            <button onClick={() => {setSearch(''); setCategoryFilter('All'); setMaxPrice(2000);}} className="mt-2 text-amber-600 font-bold text-sm hover:underline">Clear Filters</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredSweets.map(sweet => (
              <SweetCard 
                key={sweet.id} 
                sweet={sweet} 
                isAdmin={isAdmin} 
                onAddToCart={handleActions.addToCart}
                onRestock={handleActions.restock}
                onDelete={handleActions.delete}
                onEdit={setEditingSweet}
              />
            ))}
          </div>
        )}
      </main>

      {/* Cart Drawer */}
      <CartDrawer 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onRemove={(idx) => setCart(prev => prev.filter((_, i) => i !== idx))}
        onCheckout={handleActions.checkout}
        total={cartTotal}
      />

      {/* Modals */}
      <ModalWrapper isOpen={isAddModalOpen} title="Add Inventory Item" onClose={() => setIsAddModalOpen(false)}>
        <SweetForm 
          initialData={{ name: '', category: 'Mithai', price: '', quantity: '', description: '' }}
          onSubmit={handleActions.add}
          onClose={() => setIsAddModalOpen(false)}
          buttonText="Save Product"
        />
      </ModalWrapper>
      
      <ModalWrapper isOpen={!!editingSweet} title="Edit Product" onClose={() => setEditingSweet(null)}>
        {editingSweet && (
          <SweetForm 
            initialData={editingSweet}
            onSubmit={handleActions.update}
            onClose={() => setEditingSweet(null)}
            buttonText="Update Changes"
          />
        )}
      </ModalWrapper>

      {/* Toast Notification */}
      {notification && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded shadow-lg text-white font-medium flex items-center gap-3 z-50 animate-slideUp
          ${notification.type === 'error' ? 'bg-red-600' : 'bg-gray-900'}
        `}>
          {notification.type === 'success' ? <CheckCircle size={18} /> : <ShieldAlert size={18} />}
          {notification.msg}
        </div>
      )}
    </div>
  );
}
