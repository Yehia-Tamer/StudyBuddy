import styles from "./Logo.module.css";

export default function Logo({ size = 30, withWordmark = false, className = "" }) {
  return (
    <span className={`${styles.logo} ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className={styles.mark}
      >
        <defs>
          <linearGradient id="sb-logo-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#9a80ff" />
            <stop offset="0.55" stopColor="#7c5cff" />
            <stop offset="1" stopColor="#4bc3ff" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill="url(#sb-logo-grad)" />
        <path
          d="M18.4 6 10 17.2h4.6L13.2 26 22 14.4h-4.7z"
          fill="#fff"
          fillOpacity="0.96"
        />
      </svg>
      {withWordmark && <span className={styles.wordmark}>StudyBuddy</span>}
    </span>
  );
}
