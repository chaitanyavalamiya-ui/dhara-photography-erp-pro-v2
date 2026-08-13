import { useState } from 'react';
import {
  BookOpen,
  Bot,
  CalendarDays,
  Camera,
  Image,
  LayoutDashboard,
  Settings,
  Wallet,
} from 'lucide-react';
import { ThemeSelector } from '@/components/settings/ThemeSelector';
import '@/styles/dhara-themes.css';
import '@/styles/dhara-shell.css';

const NAV = [
  { id: 'Dashboard', icon: LayoutDashboard },
  { id: 'Bookings', icon: BookOpen },
  { id: 'Gallery', icon: Image },
  { id: 'Accounts', icon: Wallet },
  { id: 'Settings', icon: Settings },
] as const;

const KPIS = [
  { label: "Today's bookings", value: '4' },
  { label: 'Upcoming weddings', value: '12' },
  { label: 'Total clients', value: '86' },
  { label: 'Pending payments', value: '₹ 1.2 L' },
  { label: 'This month', value: '₹ 4.8 L' },
];

const ROWS = [
  { couple: 'Meera & Aarav', event: 'Wedding', date: '18 Oct 2026', amount: '₹ 1,25,000', status: 'Confirmed', tone: 'is-ok' },
  { couple: 'Riya & Kabir', event: 'Engagement', date: '02 Nov 2026', amount: '₹ 55,000', status: 'Advance paid', tone: 'is-warn' },
  { couple: 'Anjali & Dev', event: 'Reception', date: '21 Nov 2026', amount: '₹ 80,000', status: 'Planning', tone: 'is-danger' },
];

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function UiPrototypePage() {
  const [nav, setNav] = useState('Dashboard');
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [clientName, setClientName] = useState('Meera Patel');

  return (
    <div className="dhara-prototype">
      <div className="dhara-banner">
        Theme prototype · 10 Dhara themes · original studio branding · not rolled out to every ERP page yet
      </div>
      <div className="dhara-shell">
        <aside className="dhara-sidebar" aria-label="Prototype sidebar">
          <div className="dhara-brand">
            <div className="dhara-mark">D</div>
            <div>
              <div className="dhara-brand-name">Dhara Photography</div>
              <div className="dhara-brand-meta">Patan</div>
            </div>
          </div>
          <nav className="dhara-nav">
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                className={item.id === nav ? 'dhara-nav-item is-active' : 'dhara-nav-item'}
                onClick={() => setNav(item.id)}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.id}</span>
              </button>
            ))}
          </nav>
          <button type="button" className="dhara-robo dhara-glow-pulse">
            <Bot className="h-4 w-4" />
            Robo AI Assistant
          </button>
        </aside>

        <div className="dhara-main">
          <header className="dhara-header">
            <div>
              <div className="dhara-kicker">Studio management</div>
              <h1 className="dhara-title">Welcome back, Dhara Photography</h1>
            </div>
            <input
              className="dhara-search"
              placeholder="Search  ·  Ctrl + K"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search"
            />
            <div className="dhara-user">
              <div className="dhara-mark" style={{ width: 30, height: 30, fontSize: 14 }}>
                SP
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>Studio Admin</div>
                <div className="dhara-kicker">owner@dhara.local</div>
              </div>
            </div>
          </header>

          <main className="dhara-content dhara-page-transition">
            <section className="dhara-hero">
              <div className="dhara-kicker">Luxury wedding photography</div>
              <h2>A cinematic day, remembered with grace.</h2>
              <p className="dhara-gujarati">ધારા ફોટોગ્રાફી · પાટણ · લગ્ન ફોટોગ્રાફી</p>
              <p style={{ margin: 0, color: 'var(--dhara-text-secondary)', maxWidth: 640 }}>
                Original Dhara studio theme system. Switch themes below — colors, glass, glow and
                atmosphere change. Routes and data stay the same.
              </p>
            </section>

            <div className="dhara-kpis">
              {KPIS.map((item) => (
                <article key={item.label} className="dhara-kpi dhara-glass dhara-card-hover">
                  <div className="dhara-kicker">{item.label}</div>
                  <div className="dhara-metric">{item.value}</div>
                </article>
              ))}
            </div>

            <div className="dhara-grid">
              <article className="dhara-card dhara-glass">
                <div className="dhara-kicker">Upcoming events</div>
                <h3>Recent bookings</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Couple</th>
                      <th>Event</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ROWS.map((row) => (
                      <tr key={row.couple}>
                        <td>{row.couple}</td>
                        <td>{row.event}</td>
                        <td>{row.date}</td>
                        <td>{row.amount}</td>
                        <td>
                          <span className={`dhara-badge ${row.tone}`}>{row.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="dhara-actions">
                  <button type="button" className="dhara-btn dhara-btn-primary" onClick={() => setModalOpen(true)}>
                    New enquiry
                  </button>
                  <button type="button" className="dhara-btn dhara-btn-ghost">
                    Export
                  </button>
                </div>
              </article>

              <article className="dhara-card dhara-glass">
                <div className="dhara-kicker">Studio</div>
                <h3>Revenue overview</h3>
                <svg viewBox="0 0 260 120" width="100%" height="120" aria-label="Revenue chart">
                  <polyline
                    fill="none"
                    stroke="var(--dhara-accent)"
                    strokeWidth="3"
                    points="8,96 48,80 88,84 128,52 168,60 208,28 248,36"
                  />
                  <polyline
                    fill="var(--dhara-glow)"
                    stroke="none"
                    points="8,96 48,80 88,84 128,52 168,60 208,28 248,36 248,120 8,120"
                    opacity="0.35"
                  />
                </svg>
                <div className="dhara-shortcuts" style={{ marginTop: 12 }}>
                  <button type="button" className="dhara-shortcut">
                    <Camera className="mb-1 h-4 w-4" />
                    Gallery
                  </button>
                  <button type="button" className="dhara-shortcut">
                    <BookOpen className="mb-1 h-4 w-4" />
                    Albums
                  </button>
                  <button type="button" className="dhara-shortcut">
                    <CalendarDays className="mb-1 h-4 w-4" />
                    Equipment
                  </button>
                  <button type="button" className="dhara-shortcut">
                    <Bot className="mb-1 h-4 w-4" />
                    Robo AI
                  </button>
                </div>
              </article>

              <article className="dhara-card dhara-glass">
                <div className="dhara-kicker">October 2026</div>
                <h3>Calendar</h3>
                <div className="dhara-calendar">
                  {DAYS.map((day, index) => (
                    <div key={`${day}-${index}`} className="dhara-day" style={{ color: 'var(--dhara-text-secondary)' }}>
                      {day}
                    </div>
                  ))}
                  {Array.from({ length: 31 }, (_, index) => (
                    <div key={index} className={index + 1 === 13 ? 'dhara-day is-today' : 'dhara-day'}>
                      {index + 1}
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <article className="dhara-card dhara-glass" style={{ marginTop: 16 }}>
              <div className="dhara-kicker">Appearance</div>
              <h3>Theme selector</h3>
              <ThemeSelector />
            </article>
          </main>
        </div>
      </div>

      {modalOpen && (
        <div className="dhara-overlay dhara-fade-in" role="presentation" onClick={() => setModalOpen(false)}>
          <form
            className="dhara-modal dhara-glass dhara-modal-enter"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              setModalOpen(false);
            }}
          >
            <h3>New enquiry</h3>
            <p style={{ margin: 0, color: 'var(--dhara-text-secondary)' }}>
              Theme-aware form. Saving here is visual only.
            </p>
            <label htmlFor="dhara-client">Client</label>
            <input
              id="dhara-client"
              className="dhara-input"
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
            />
            <div className="dhara-actions">
              <button type="submit" className="dhara-btn dhara-btn-primary">
                Save enquiry
              </button>
              <button type="button" className="dhara-btn dhara-btn-ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
