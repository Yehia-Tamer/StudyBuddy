import styles from "./PageHeader.module.css";

export default function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <header className={styles.header}>
      <div className={styles.headingText}>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
