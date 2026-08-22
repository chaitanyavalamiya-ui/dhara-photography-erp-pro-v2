export function DashboardHero() {
  return (
    <section className="dhara-dash-hero">
      <span className="dhara-dash-lens" aria-hidden />
      <div className="dhara-dash-hero-copy">
        <p className="dhara-dash-kicker">Dhara Photography ERP Pro</p>
        <h2>Studio Overview</h2>
        <p>Your business, beautifully organized.</p>
      </div>
      <div className="dhara-dash-hero-art" aria-hidden>
        <svg viewBox="0 0 220 180" fill="none">
          <defs>
            <linearGradient id="dharaCamGold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f0d060" />
              <stop offset="100%" stopColor="#8a4a16" />
            </linearGradient>
          </defs>
          <circle cx="118" cy="92" r="68" stroke="url(#dharaCamGold)" strokeOpacity="0.28" strokeWidth="1.2" />
          <circle cx="118" cy="92" r="48" stroke="url(#dharaCamGold)" strokeOpacity="0.45" strokeWidth="1.4" />
          <circle cx="118" cy="92" r="28" stroke="#e8c547" strokeOpacity="0.7" strokeWidth="2" />
          <circle cx="118" cy="92" r="10" fill="#e8c547" fillOpacity="0.85" />
          <rect x="42" y="62" width="86" height="58" rx="10" stroke="url(#dharaCamGold)" strokeWidth="2" />
          <rect x="54" y="50" width="28" height="14" rx="4" stroke="#e8c547" strokeOpacity="0.8" />
          <path d="M28 92 L52 92" stroke="#e8c547" strokeOpacity="0.5" />
          <path d="M184 92 L208 92" stroke="#e8c547" strokeOpacity="0.5" />
          <path d="M118 18 L118 40" stroke="#e8c547" strokeOpacity="0.4" />
        </svg>
      </div>
    </section>
  );
}
