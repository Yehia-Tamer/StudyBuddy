import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import styles from "./AppShell.module.css";

const NAV_ITEMS = [
  { to: "/documents", label: "Documents" },
  { to: "/chat", label: "Chat" },
  { to: "/flashcards", label: "Flashcards" },
  { to: "/quizzes", label: "Quizzes" },
  { to: "/study-plans", label: "Study plans" },
  { to: "/cheat-sheets", label: "Cheat sheets" },
];

export default function AppShell({ children }) {
  const { logout } = useAuth();

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>StudyBuddy</div>
        <ul className={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  isActive
                    ? `${styles.navLink} ${styles.navLinkActive}`
                    : styles.navLink
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <button
          onClick={logout}
          style={{
            marginTop: "auto",
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.6)",
            textAlign: "left",
            padding: "10px 12px",
            fontSize: 14,
          }}
        >
          Log out
        </button>
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
