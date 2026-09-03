import styles from './AuthLayout.module.css';

const FEATURES = [
  { label: 'Upload', detail: 'PDFs, slide decks, lecture audio, YouTube videos, or web articles' },
  { label: 'Ask', detail: 'Chat with your material, grounded in the source with citations' },
  { label: 'Review', detail: 'Flashcards, quizzes, cheat sheets, and a study plan — generated for you' },
];

export default function AuthLayout({ eyebrow, title, subtitle, children }) {
  return (
    <div className={styles.shell}>
      <div className={styles.panel}>
        <div className={styles.brand}>StudyBuddy</div>
        <h1 className={styles.headline}>
          Turn your course material into something you can talk to.
        </h1>
        <ul className={styles.features}>
          {FEATURES.map((f) => (
            <li key={f.label}>
              <span className={styles.featureLabel}>{f.label}</span>
              <span className={styles.featureDetail}>{f.detail}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.formSide}>
        <div className={styles.formCard}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h2 className={styles.formTitle}>{title}</h2>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}