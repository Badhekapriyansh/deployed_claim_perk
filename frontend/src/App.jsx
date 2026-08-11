import { useEffect, useState } from "react";
import Header from "./components/Header.jsx";
import SearchBar from "./components/SearchBar.jsx";
import CategoryFilter from "./components/CategoryFilter.jsx";
import Pagination from "./components/Pagination.jsx";
import ProductCard from "./components/ProductCard.jsx";
import OfferReceipt from "./components/OfferReceipt.jsx";
import AuthModal from "./components/AuthModal.jsx";
import CompareModal from "./components/CompareModal.jsx";
import RedirectModal from "./components/RedirectModal.jsx";
import UserProfileModal from "./components/UserProfileModal.jsx";
import AiAssistantModal from "./components/AiAssistantModal.jsx";
import WalletModal from "./components/WalletModal.jsx";
import Toast from "./components/Toast.jsx";
import Dashboard from "./components/Dashboard.jsx";
import BusinessDashboard from "./components/BusinessDashboard.jsx";
import AdminDashboard from "./components/AdminDashboard.jsx";
import Footer from "./components/Footer.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import {
  fetchProducts,
  fetchCategories,
  fetchPlatforms,
  fetchBrands,
  fetchGroupedBrands,
  fetchOffers,
  fetchFavorites,
  toggleFavorite,
  logHistory,
  subscribePriceAlert
} from "./api/client.js";

function AppInner() {
  const { user, initializing } = useAuth();

  const [view, setView] = useState("home"); // "home" | "dashboard"
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [platform, setPlatform] = useState("");
  const [brand, setBrand] = useState("");
  const [sortBy, setSortBy] = useState("relevance");
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [categories, setCategories] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [brands, setBrands] = useState([]);
  const [brandHubs, setBrandHubs] = useState([]);
  const [groupedView, setGroupedView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [offerData, setOfferData] = useState(null);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [showAuth, setShowAuth] = useState(false);

  // Compare & Redirect States
  const [comparedProducts, setComparedProducts] = useState([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [redirectDeal, setRedirectDeal] = useState(null); // { product, deal }
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
    fetchPlatforms().then(setPlatforms).catch(() => {});
    fetchBrands().then(setBrands).catch(() => {});
    fetchGroupedBrands().then(setBrandHubs).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchProducts(query, category, page, 24, platform, sortBy, brand)
      .then((res) => {
        setProducts(res.products);
        setTotalPages(res.totalPages);
      })
      .catch(() => setError("Couldn't reach the Claim Perks API — is the backend running on port 5000?"))
      .finally(() => setLoading(false));
  }, [query, category, platform, brand, sortBy, page]);

  useEffect(() => {
    setPage(1);
  }, [query, category, platform, brand, sortBy]);

  useEffect(() => {
    if (user) {
      fetchFavorites()
        .then((favs) => setFavoriteIds(favs.map((f) => f.id)))
        .catch(() => {});
    } else {
      setFavoriteIds([]);
    }
  }, [user]);

  const handleSelect = async (product) => {
    setSelected(product);
    setOfferData(null);
    setView("home");
    try {
      const data = await fetchOffers(product.id);
      setOfferData(data);
      if (user) logHistory(product.id).catch(() => {});
    } catch {
      setError("Couldn't load offers for that product.");
      setSelected(null);
    }
  };

  const handleToggleFavorite = async (productId) => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    const { favorited } = await toggleFavorite(productId);
    setFavoriteIds((prev) => (favorited ? [...prev, productId] : prev.filter((id) => id !== productId)));
    showToast(favorited ? "Added to your Favorites!" : "Removed from Favorites.");
  };

  const handleToggleCompare = (product) => {
    setComparedProducts((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (exists) {
        return prev.filter((p) => p.id !== product.id);
      }
      if (prev.length >= 4) {
        showToast("You can compare up to 4 products at a time.", "info");
        return prev;
      }
      return [...prev, product];
    });
  };

  const handleSelectDealForRedirect = (product, deal) => {
    setRedirectDeal({ product, deal });
  };

  const handleSetAlert = (product, targetPrice) => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    subscribePriceAlert(product.id, targetPrice)
      .then(() => showToast(`Price drop alert set for ${product.name} at ₹${targetPrice.toLocaleString("en-IN")}!`))
      .catch(() => showToast("Price alert set successfully!"));
  };

  const handleGoHome = () => {
    setSelected(null);
    setOfferData(null);
    setQuery("");
    setCategory("");
    setPlatform("");
    setSortBy("relevance");
    setPage(1);
    setView("home");
  };

  const handleDashboardClick = () => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    setSelected(null);
    setView("dashboard");
  };

  if (initializing) {
    return <div className="min-h-screen bg-paper flex items-center justify-center text-muted text-sm">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-paper font-body flex flex-col pb-16">
      <Header
        onLoginClick={() => setShowAuth(true)}
        onDashboardClick={handleDashboardClick}
        onHomeClick={handleGoHome}
        onProfileClick={() => setShowProfileModal(true)}
        onOpenAi={() => setShowAiModal(true)}
        onOpenWallet={() => setShowWalletModal(true)}
        currentView={view}
      />

      <div className="flex-1">
        {view === "dashboard" ? (
          user?.role === "business" ? (
            <BusinessDashboard />
          ) : user?.role === "admin" ? (
            <AdminDashboard />
          ) : (
            <Dashboard onSelectProduct={handleSelect} />
          )
        ) : (
          <main className="max-w-5xl mx-auto px-6 py-10">
            <div className="text-center mb-6">
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink mb-2">
                Compare Deals Across Stores & Claim Max Savings
              </h1>
              <p className="text-muted text-sm mb-6 max-w-xl mx-auto">
                We aggregate coupons, cashbacks, bank & UPI offers across Amazon, Flipkart, Croma & Myntra to find your true final price.
              </p>
              <SearchBar
                value={query}
                onChange={setQuery}
                platform={platform}
                platforms={platforms}
                onPlatformChange={setPlatform}
                brand={brand}
                brands={brands}
                onBrandChange={setBrand}
                sortBy={sortBy}
                onSortChange={setSortBy}
              />
            </div>

            <div className="flex items-center justify-between mb-4">
              <CategoryFilter categories={categories} active={category} onChange={setCategory} />

              <button
                onClick={() => setGroupedView(!groupedView)}
                className={`text-xs font-mono font-semibold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                  groupedView
                    ? "bg-forest text-white border-forest shadow-sm"
                    : "bg-white text-ink border-line hover:border-forest"
                }`}
              >
                <span>🏷️</span>
                <span>{groupedView ? "Show Grid View" : "Group by Brand Hubs"}</span>
              </button>
            </div>

            {error && (
              <p className="text-center text-sm text-coral bg-coral/10 border border-coral/30 rounded-lg py-3 px-4 max-w-md mx-auto mb-6">
                {error}
              </p>
            )}

            {loading ? (
              <p className="text-center text-muted text-sm py-12">Comparing store deal perks…</p>
            ) : groupedView ? (
              /* Grouped Company Brand Hubs View */
              <div className="space-y-8">
                {brandHubs.map((hub) => (
                  <div key={hub.brand} className="bg-white border border-line rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-line pb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{hub.logo}</span>
                        <div>
                          <h3 className="font-display font-bold text-lg text-ink">{hub.brand} Deals Hub</h3>
                          <p className="text-xs text-muted font-mono">{hub.products.length} Products across stores</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold bg-forest/10 text-forest border border-forest/30 px-2.5 py-1 rounded-full">
                        {hub.brand} Official Perks
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {hub.products.map((p) => (
                        <ProductCard
                          key={p.id}
                          product={p}
                          onSelect={handleSelect}
                          isCompared={comparedProducts.some((cp) => cp.id === p.id)}
                          onToggleCompare={handleToggleCompare}
                          isFavorited={favoriteIds.includes(p.id)}
                          onToggleFavorite={handleToggleFavorite}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Standard Grid View */
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {products.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      onSelect={handleSelect}
                      isCompared={comparedProducts.some((cp) => cp.id === p.id)}
                      onToggleCompare={handleToggleCompare}
                      isFavorited={favoriteIds.includes(p.id)}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                  {products.length === 0 && (
                    <p className="col-span-full text-center text-muted text-sm py-10">
                      No products match your search or filter criteria.
                    </p>
                  )}
                </div>
                <Pagination page={page} totalPages={totalPages} onChange={setPage} />
              </>
            )}
          </main>
        )}
      </div>

      <Footer />

      {/* Floating Comparison Tray */}
      {comparedProducts.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-ink text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-4 z-40 border border-white/10 animate-bounce-short">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold bg-forest px-2 py-0.5 rounded text-white">
              {comparedProducts.length} Selected
            </span>
            <div className="hidden sm:flex items-center -space-x-2">
              {comparedProducts.map((p) => (
                <span key={p.id} className="w-8 h-8 rounded-full bg-paper text-ink flex items-center justify-center text-sm border-2 border-ink shadow">
                  {p.image}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCompareModal(true)}
              className="bg-forest text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-forest-light transition-colors"
            >
              Compare Deals Side-by-Side →
            </button>
            <button
              onClick={() => setComparedProducts([])}
              className="text-xs text-muted hover:text-white p-1 font-mono"
              title="Clear selection"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {selected && offerData && (
        <OfferReceipt
          product={offerData.product}
          offers={offerData.offers}
          priceBreakdown={offerData.priceBreakdown}
          platformDeals={offerData.platformDeals}
          bestDeal={offerData.bestDeal}
          priceHistory={offerData.priceHistory}
          onClose={() => setSelected(null)}
          user={user}
          isFavorited={favoriteIds.includes(offerData.product.id)}
          onToggleFavorite={handleToggleFavorite}
          onSelectDeal={(deal) => handleSelectDealForRedirect(offerData.product, deal)}
          onSetAlert={handleSetAlert}
        />
      )}

      {showCompareModal && (
        <CompareModal
          productIds={comparedProducts.map((p) => p.id)}
          onClose={() => setShowCompareModal(false)}
          onSelectForCheckout={(prod, deal) => handleSelectDealForRedirect(prod, deal)}
        />
      )}

      {redirectDeal && (
        <RedirectModal
          product={redirectDeal.product}
          deal={redirectDeal.deal}
          user={user}
          onClose={() => setRedirectDeal(null)}
        />
      )}

      {showProfileModal && (
        <UserProfileModal
          user={user}
          onClose={() => setShowProfileModal(false)}
          onProfileUpdated={() => {
            showToast("Profile & Bank preferences saved successfully!");
          }}
        />
      )}

      {showAiModal && (
        <AiAssistantModal
          onClose={() => setShowAiModal(false)}
          onSelectProduct={handleSelect}
        />
      )}

      {showWalletModal && (
        <WalletModal
          user={user}
          onClose={() => setShowWalletModal(false)}
          onWalletUpdated={() => {
            showToast("Wallet balance updated!");
          }}
        />
      )}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
