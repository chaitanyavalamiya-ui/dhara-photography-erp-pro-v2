export type CalendarGlyphKind =
  | 'wedding'
  | 'birthday'
  | 'anniversary'
  | 'engagement'
  | 'other'
  | 'booked';

export function calendarEventGlyph(eventType: string): CalendarGlyphKind {
  switch (eventType) {
    case 'Wedding':
      return 'wedding';
    case 'Engagement':
      return 'engagement';
    case 'Birthday':
      return 'birthday';
    default:
      return 'other';
  }
}

export function calendarEventTone(eventType: string): string {
  switch (eventType) {
    case 'Wedding':
      return 'is-wedding';
    case 'Engagement':
      return 'is-engagement';
    case 'Birthday':
      return 'is-bday';
    case 'Pre-wedding':
      return 'is-prewedding';
    case 'Baby Shower':
      return 'is-shower';
    case 'Couple Photography':
      return 'is-couple';
    default:
      return 'is-other';
  }
}

export function CalendarGlyph({
  kind,
  label,
}: {
  kind: CalendarGlyphKind;
  label?: string;
}) {
  const labelled = Boolean(label);
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      fill="none"
      className={`dhara-cal-glyph is-${kind}`}
      aria-label={label}
      role={labelled ? 'img' : undefined}
      aria-hidden={labelled ? undefined : true}
    >
      {kind === 'wedding' || kind === 'booked' || kind === 'anniversary' ? <HeartMark /> : null}
      {kind === 'birthday' ? <CakeMark /> : null}
      {kind === 'engagement' ? <RingMark /> : null}
      {kind === 'other' ? <OtherMark /> : null}
    </svg>
  );
}

function HeartMark() {
  return (
    <>
      <path
        fill="currentColor"
        stroke="#fff6f2"
        strokeWidth="1.35"
        strokeLinejoin="round"
        d="M12 20.7 10.4 19.25C6.15 15.4 3.4 12.9 3.4 9.85 3.4 7.35 5.35 5.4 7.85 5.4c1.4 0 2.75.66 3.6 1.7.85-1.04 2.2-1.7 3.6-1.7 2.5 0 4.45 1.95 4.45 4.45 0 3.05-2.75 5.55-7 9.4Z"
      />
      <path
        fill="#fff"
        fillOpacity="0.42"
        d="M8.15 7.55c-1.15.08-2.05.95-2.15 2.12-.06.72.18 1.4.55 1.95.22-1.7 1.15-3.05 2.55-3.7-.3-.2-.62-.32-.95-.37Z"
      />
    </>
  );
}

function CakeMark() {
  return (
    <>
      <path
        fill="#f5d76e"
        stroke="#fff4d6"
        strokeWidth="1.25"
        strokeLinejoin="round"
        d="M4.2 19.6h15.6v1.35H4.2Z"
      />
      <rect
        x="4.15"
        y="13.15"
        width="15.7"
        height="6.45"
        rx="1.35"
        fill="#ff4ec8"
        stroke="#ffe3f4"
        strokeWidth="1.35"
      />
      <path
        fill="#ffd45a"
        d="M4.15 14.7c1.35-1.05 2.7-.35 4.05.15 1.35.5 2.7 1.15 4.05.1 1.35-1.05 2.7-.4 4.05.1 1.35.5 2.35.55 3.5-.2v1.85c-1.2.7-2.35.35-3.7-.15-1.35-.5-2.7-.85-4.05.15-1.35 1-2.7.35-4.05-.15-1.15-.42-2.2.05-3.85.85V14.7Z"
      />
      <rect
        x="7.05"
        y="8.55"
        width="9.9"
        height="4.7"
        rx="1.2"
        fill="#ff79d4"
        stroke="#ffe3f4"
        strokeWidth="1.3"
      />
      <path stroke="#ffe08a" strokeWidth="1.7" strokeLinecap="round" d="M9.1 6.15V8.6" />
      <path stroke="#ffe08a" strokeWidth="1.7" strokeLinecap="round" d="M12 5.35V8.55" />
      <path stroke="#ffe08a" strokeWidth="1.7" strokeLinecap="round" d="M14.9 6.15V8.6" />
      <path fill="#ffd45a" d="M9.1 5.15c.55-.7 1.15-.15 1.15.55 0 .4-.35.6-.55.6-.55 0-.85-.55-.6-1.15Z" />
      <path fill="#ffd45a" d="M12 4.35c.55-.7 1.15-.15 1.15.55 0 .4-.35.6-.55.6-.55 0-.85-.55-.6-1.15Z" />
      <path fill="#ffd45a" d="M14.9 5.15c.55-.7 1.15-.15 1.15.55 0 .4-.35.6-.55.6-.55 0-.85-.55-.6-1.15Z" />
    </>
  );
}

function RingMark() {
  return (
    <>
      <circle
        cx="12"
        cy="15.05"
        r="5.55"
        fill="none"
        stroke="#e8c15a"
        strokeWidth="2.35"
      />
      <circle
        cx="12"
        cy="15.05"
        r="3.55"
        fill="none"
        stroke="#fff6d6"
        strokeWidth="1.15"
        opacity="0.85"
      />
      <path
        fill="#f4f8ff"
        stroke="#dbefff"
        strokeWidth="1.2"
        strokeLinejoin="round"
        d="M12 3.2 15.35 7.05 12 10.7 8.65 7.05Z"
      />
      <path fill="#7dd3fc" fillOpacity="0.95" d="M12 3.2 15.35 7.05 12 7.7Z" />
      <path fill="#fff" fillOpacity="0.92" d="M12 3.2 8.65 7.05 12 7.7Z" />
      <path fill="#bae6fd" d="M8.65 7.05 12 10.7 12 7.7Z" />
      <path fill="#38bdf8" fillOpacity="0.55" d="M15.35 7.05 12 10.7 12 7.7Z" />
    </>
  );
}

function OtherMark() {
  return (
    <>
      <rect
        x="3.7"
        y="5.1"
        width="16.6"
        height="15.1"
        rx="2.2"
        fill="currentColor"
        fillOpacity="0.18"
        stroke="currentColor"
        strokeWidth="1.85"
      />
      <path stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" d="M3.7 9.15h16.6" />
      <path stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" d="M8.05 3.35v3.35" />
      <path stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" d="M15.95 3.35v3.35" />
      <rect x="7.1" y="11.7" width="3.2" height="2.7" rx="0.55" fill="currentColor" />
      <rect x="11.9" y="11.7" width="3.2" height="2.7" rx="0.55" fill="currentColor" opacity="0.7" />
    </>
  );
}
