import Link from "next/link";
import styles from "./RoomErrorView.module.css";

export interface RoomErrorViewProps {
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export function RoomErrorView({
  title,
  description,
  ctaLabel = "Criar nova sala",
  ctaHref = "/",
}: RoomErrorViewProps) {
  return (
    <div className={styles.page}>
      <section role="alert" aria-labelledby="room-error-title" className={styles.section}>
        <span aria-hidden="true" className={styles.icon}>
          ⚠
        </span>
        <h1 id="room-error-title" className={styles.title}>
          {title}
        </h1>
        <p className={styles.description}>{description}</p>
        <Link href={ctaHref} className={styles.cta}>
          {ctaLabel}
        </Link>
      </section>
    </div>
  );
}
