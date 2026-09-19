import Logo from "./Logo";
import Icon from "./Icon";
import ThemeToggle from "./ThemeToggle";
import styles from "./AuthLayout.module.css";

const FEATURES = [
  {
    icon: "upload",
    label: "Bring your material",
    detail: "PDFs, slide decks, lecture audio, YouTube, or web articles.",
  },
  {
    icon: "chat",
    label: "Ask it anything",
    detail: "Chat grounded in your sources, with citations back to the page.",
  },
  {
    icon: "sparkle",
    label: "Revise faster",
    detail: "Flashcards, quizzes, cheat sheets, and a study plan, made for you.",
  },
];

export default function AuthLayout({ eyebrow, title, subtitle, children }) {
  return (
    <div className={styles.shell}>
      <aside className={styles.brandPanel}>
        <div className={styles.brandTop}>
          <Logo size={30} />
          <span className={styles.brandWordmark}>StudyBuddy</span>
        </div>

        <div className={styles.brandBody}>
          <h1 className={styles.headline}>
            Turn your course material into something you can talk to.
          </h1>
          <p className={styles.brandSub}>
            StudyBuddy reads what you upload, then helps you understand it,
            question it, and actually remember it.
          </p>

          <ul className={styles.features}>
            {FEATURES.map((f) => (
              <li key={f.label} className={styles.feature}>
                <span className={styles.featureIcon}>
                  <Icon name={f.icon} size={18} />
                </span>
                <span className={styles.featureText}>
                  <span className={styles.featureLabel}>{f.label}</span>
                  <span className={styles.featureDetail}>{f.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.brandFoot}>
          Grounded in your sources. No made-up answers.
        </div>
      </aside>

      <div className={styles.formSide}>
        <div className={styles.formTopBar}>
          <span className={styles.mobileBrand}>
            <Logo size={26} withWordmark />
          </span>
          <ThemeToggle />
        </div>

        <div className={styles.formWrap}>
          <div className={styles.formCard}>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h2 className={styles.formTitle}>{title}</h2>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
