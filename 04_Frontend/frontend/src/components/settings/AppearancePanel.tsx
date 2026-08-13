import { Palette } from 'lucide-react';
import { ThemeSelector } from '@/components/settings/ThemeSelector';

export function AppearancePanel() {
  return (
    <div className="card border-gold/20">
      <div className="mb-6 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/15">
          <Palette className="h-5 w-5 text-gold" />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold text-gold">Appearance / Themes</h3>
          <p className="text-sm text-gray-500">
            Choose a visual theme. It is saved on this computer and does not change studio data.
          </p>
        </div>
      </div>
      <ThemeSelector />
    </div>
  );
}
