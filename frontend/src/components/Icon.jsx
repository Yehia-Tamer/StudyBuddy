/*
 * A small, consistent inline-SVG icon set (24px grid, 1.6 stroke,
 * round caps/joins, currentColor). Kept inline + dependency-free on
 * purpose so the app has no icon-library install to break.
 */
const PATHS = {
  documents: (
    <path d="M4 20a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2z" />
  ),
  chat: (
    <path d="M21 15a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" />
  ),
  flashcards: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </>
  ),
  quizzes: (
    <>
      <rect x="6" y="4" width="12" height="16" rx="2" />
      <path d="M9.5 4.5A1.5 1.5 0 0 1 11 3h2a1.5 1.5 0 0 1 1.5 1.5V5a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1z" />
      <path d="m9.5 13 1.8 1.8L15 11" />
    </>
  ),
  plans: (
    <>
      <circle cx="6" cy="19" r="2.4" />
      <circle cx="18" cy="5" r="2.4" />
      <path d="M8.4 19H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.6" />
    </>
  ),
  cheatsheet: (
    <>
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M9 13h6M9 17h4" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  trash: (
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M10 11v6M14 11v6" />
  ),
  upload: (
    <>
      <path d="M12 15V4M8 8l4-4 4 4" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </>
  ),
  arrowLeft: <path d="M19 12H5M11 18l-6-6 6-6" />,
  send: <path d="m21 4-9.5 9.5M21 4l-6.5 17-3.5-8L3 9.5z" />,
  sparkle: (
    <>
      <path d="M12 3l1.7 4.9L18.6 9.6l-4.9 1.7L12 16.2l-1.7-4.9L5.4 9.6l4.9-1.7z" />
      <path d="M19 14.5l.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6z" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  file: (
    <>
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    </>
  ),
  presentation: (
    <>
      <path d="M3 4h18M4 4v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V4" />
      <path d="M12 14v4M9.5 21 12 18l2.5 3" />
    </>
  ),
  audio: (
    <>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <path d="M20 15.5a2 2 0 0 1-2 2h-.5v-5H18a2 2 0 0 1 2 2zM4 15.5a2 2 0 0 0 2 2h.5v-5H6a2 2 0 0 0-2 2z" />
    </>
  ),
  video: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="3" />
      <path d="m10 9.5 5 2.5-5 2.5z" />
    </>
  ),
  web: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3.5 12h17M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  book: (
    <>
      <path d="M12 6.4C10.6 5 8.2 4.4 4 5v13c4.2-.6 6.6 0 8 1.4 1.4-1.4 3.8-2 8-1.4V5c-4.2-.6-6.6 0-8 1.4z" />
      <path d="M12 6.4V19.4" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 9 5-9 5-9-5z" />
      <path d="m3 13 9 5 9-5" />
    </>
  ),
};

export default function Icon({
  name,
  size = 20,
  strokeWidth = 1.6,
  className,
  title,
  ...rest
}) {
  const content = PATHS[name];
  if (!content) return null;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : "true"}
      aria-label={title}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {content}
    </svg>
  );
}
