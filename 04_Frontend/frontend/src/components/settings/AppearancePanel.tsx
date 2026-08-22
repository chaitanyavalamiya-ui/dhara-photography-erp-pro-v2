import { Palette } from 'lucide-react';
import { ThemeSelector } from '@/components/settings/ThemeSelector';
import { settingsBoxTone } from '@/components/settings/settings-visual';
import { cn } from '@/utils/cn';
import '@/pages/settings/settings-page.css';

export function AppearancePanel() {
  return (
    <section className={cn('dhara-set-panel', settingsBoxTone(6))}>
      <div className="mb-6 flex items-start gap-3">
        <span className="dhara-set-icon">
          <Palette />
        </span>
        <div>
          <h3 className="dhara-set-section-title" style={{ margin: 0 }}>
            Appearance / Themes
          </h3>
          <p className="dhara-set-note" style={{ marginTop: '0.35rem' }}>
            Choose a visual theme. It is saved on this computer and does not change studio data.
          </p>
        </div>
      </div>
      <ThemeSelector />
    </section>
  );
}
