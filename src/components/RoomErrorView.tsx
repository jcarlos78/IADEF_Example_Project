import Link from "next/link";

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
    <section role="alert" aria-labelledby="room-error-title">
      <h1 id="room-error-title">{title}</h1>
      <p>{description}</p>
      <Link href={ctaHref}>{ctaLabel}</Link>
    </section>
  );
}
