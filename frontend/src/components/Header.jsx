import { useAuth } from "../context/AuthContext.jsx";

export default function Header({
  onLoginClick,
  onDashboardClick,
  onHomeClick,
  onProfileClick,
  onOpenAi,
  onOpenWallet,
  currentView
}) {
  const { user, logout } = useAuth();

  const navLinkClass = (isActive) =>
    `text-xs sm:text-sm font-mono font-semibold px-3 py-1.5 rounded-lg border transition-colors ${isActive
      ? "bg-forest text-paper border-forest shadow-sm"
      : "bg-white text-ink border-line hover:border-forest hover:text-forest"
    }`;

  const dashboardLabel =
    user?.role === "business" ? "Business dashboard" : user?.role === "admin" ? "Admin panel" : "Dashboard";

  return (
    <header className="border-b border-line bg-paper sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
        <button onClick={onHomeClick} className="flex items-center gap-2 shrink-0">
          <span
            className="
              font-['Playfair_Display']
              text-[clamp(2rem,5vw,4.5rem)]
              italic
              font-semibold
              leading-none
              tracking-[-0.04em]
              text-[#14211d]
            "
          >Claim Perks
          </span>
        </button>

        <nav className="hidden sm:flex items-center gap-5">
          <button onClick={onHomeClick} className={navLinkClass(currentView === "home")}>
            Home
          </button>
          <button onClick={onDashboardClick} className={navLinkClass(currentView === "dashboard")}>
            {dashboardLabel}
          </button>
          {onOpenAi && (
            <button
              onClick={onOpenAi}
              className="text-xs font-semibold text-forest bg-forest/10 hover:bg-forest/20 border border-forest/30 px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <span>🤖</span>
              <span>Ask Perks AI</span>
            </button>
          )}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {user && user.role === "user" && onOpenWallet && (
            <button
              onClick={onOpenWallet}
              title="Perks Rewards Wallet"
              className="flex items-center gap-1 text-xs font-mono font-bold text-forest bg-white border border-line rounded-lg px-2.5 py-1.5 hover:border-forest shadow-sm"
            >
              <span>💳 Wallet</span>
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={onProfileClick}
                title="Edit Profile & Bank Preferences"
                className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-ink bg-white border border-line rounded-lg px-2.5 py-1.5 hover:border-forest transition-colors shadow-sm"
              >
                <span>👤</span>
                <span className="hidden sm:inline">{(user.businessName || user.name).split(" ")[0]}</span>
                <span className="text-[10px] text-forest font-mono">⚙️</span>
              </button>
              <button
                onClick={logout}
                className="text-xs sm:text-sm text-muted hover:text-coral border border-line rounded-lg px-3 py-1.5 transition-colors"
              >
                Log out
              </button>
            </div>
          ) : (
            <button
              onClick={onLoginClick}
              className="text-sm font-medium bg-forest text-paper rounded-lg px-4 py-1.5 hover:bg-forest-light transition-colors shadow-sm"
            >
              Log in
            </button>
          )}
        </div>
      </div>

      <nav className="sm:hidden flex items-center justify-between px-6 pb-3 border-t border-line/40 pt-2">
        <div className="flex items-center gap-4">
          <button onClick={onHomeClick} className={navLinkClass(currentView === "home")}>
            Home
          </button>
          <button onClick={onDashboardClick} className={navLinkClass(currentView === "dashboard")}>
            {dashboardLabel}
          </button>
        </div>
        {onOpenAi && (
          <button
            onClick={onOpenAi}
            className="text-[11px] font-semibold text-forest bg-forest/10 border border-forest/30 px-2.5 py-1 rounded-full flex items-center gap-1"
          >
            <span>🤖</span>
            <span>Perks AI</span>
          </button>
        )}
      </nav>
    </header>
  );
}
