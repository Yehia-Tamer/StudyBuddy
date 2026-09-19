import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Logo from "../Logo";
import Icon from "../Icon";
import ThemeToggle from "../ThemeToggle";
import styles from "./AppShell.module.css";

const NAV_ITEMS = [
  { to: "/documents", label: "Documents", icon: "documents" },
  { to: "/chat", label: "Chat", icon: "chat" },
  { to: "/flashcards", label: "Flashcards", icon: "flashcards" },
  { to: "/quizzes", label: "Quizzes", icon: "quizzes" },
  { to: "/study-plans", label: "Study plans", icon: "plans" },
  { to: "/cheat-sheets", label: "Cheat sheets", icon: "cheatsheet" },
];

function initials(name) {
  if (!name) return "SB";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "SB";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const username = user?.username || "";

  function renderNav() {
    return (
      <nav className={styles.nav}>
        <span className={styles.navLabel}>Workspace</span>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              isActive
                ? `${styles.navLink} ${styles.navLinkActive}`
                : styles.navLink
            }
            onClick={() => setMobileOpen(false)}
          >
            <Icon name={item.icon} size={19} className={styles.navIcon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    );
  }

  function renderFooter() {
    return (
      <div className={styles.sidebarFooter}>
        <div className={styles.user}>
          <span className={styles.avatar} aria-hidden="true">
            {initials(username)}
          </span>
          <div className={styles.userMeta}>
            <span className={styles.userName}>{username || "Signed in"}</span>
            <span className={styles.userStatus}>Free plan</span>
          </div>
        </div>
        <div className={styles.footerActions}>
          <ThemeToggle />
          <button type="button" className={styles.logout} onClick={logout}>
            <Icon name="logout" size={18} />
            <span>Log out</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <header className={styles.mobileBar}>
        <button
          type="button"
          className={styles.iconButton}
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
        >
          <Icon name="menu" size={22} />
        </button>
        <Logo size={26} withWordmark />
        <ThemeToggle />
      </header>

      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <Logo size={30} withWordmark />
        </div>
        {renderNav()}
        {renderFooter()}
      </aside>

      <div
        className={`${styles.drawer} ${mobileOpen ? styles.drawerOpen : ""}`}
        aria-hidden={!mobileOpen}
      >
        <div
          className={styles.drawerScrim}
          onClick={() => setMobileOpen(false)}
        />
        <aside className={styles.drawerPanel}>
          <div className={styles.drawerHead}>
            <Logo size={28} withWordmark />
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
            >
              <Icon name="x" size={20} />
            </button>
          </div>
          {renderNav()}
          {renderFooter()}
        </aside>
      </div>

      <main className={styles.main}>
        <div className={styles.mainInner}>{children}</div>
      </main>
    </div>
  );
}
