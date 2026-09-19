import Icon from "./Icon";
import { useTheme } from "../context/ThemeContext";
import styles from "./ThemeToggle.module.css";

export default function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className={`${styles.toggle} ${className}`}
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light" : "Switch to dark"}
    >
      <span className={styles.iconWrap} data-mode={theme}>
        <Icon name="sun" size={18} className={styles.sun} />
        <Icon name="moon" size={18} className={styles.moon} />
      </span>
    </button>
  );
}
