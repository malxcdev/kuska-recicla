import type { ReactNode } from "react";
import { MATERIALS, STATUS_FLOW, STATUS_LABELS } from "@/data/catalog";
import { initials } from "@/app/navigation";
import { Icon } from "./Icon";
import { materialStyle } from "./materialStyle";
import type { IconName, MaterialId, RequestStatus } from "@/types";

/** Logotipo en `public/brand/kuska-mark.png` (emblema) y `kuska-logo.png` (logotipo completo). */
export const BRAND_MARK_SRC = `${import.meta.env.BASE_URL}brand/kuska-mark.png`;

export function Brand() {
  return (
    <div className="brand">
      <img className="brand-logo" src={BRAND_MARK_SRC} alt="" width={44} height={44} decoding="async" />
      <div><strong>KUSKA</strong><b>RECICLA</b><small>Reciclemos juntos</small></div>
    </div>
  );
}

export function MaterialIcon({ material }: { material: MaterialId }) {
  return (
    <span className="material-icon" style={materialStyle(material)}>
      <Icon name={MATERIALS[material].icon} />
    </span>
  );
}

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span className={`status ${status}`}>
      {status === "entregado" && <Icon name="check" size={13} />} {STATUS_LABELS[status]}
    </span>
  );
}

export function StatusTracker({ status }: { status: RequestStatus }) {
  const current = STATUS_FLOW.indexOf(status);
  return (
    <ol className="tracking" aria-label={`Estado: ${STATUS_LABELS[status]}`}>
      {STATUS_FLOW.map((step, index) => (
        <li key={step} className={index <= current ? "done" : ""} aria-current={index === current ? "step" : undefined}>
          <i>{index <= current ? <Icon name="check" size={11} /> : index + 1}</i>
          <span>{STATUS_LABELS[step]}</span>
        </li>
      ))}
    </ol>
  );
}

export function Avatar({ name, tone = "earth" }: { name: string; tone?: "earth" | "sage" }) {
  return <div className={`avatar ${tone === "sage" ? "rosa" : ""}`} aria-hidden="true">{initials(name)}</div>;
}

export function PageIntro({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) {
  return (
    <div className="section-intro">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}

export function EmptyState({ icon, title, text, children }: { icon: IconName; title: string; text: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-green-soft text-green"><Icon name={icon} size={22} /></span>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      <p className="max-w-sm text-sm text-muted">{text}</p>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}

export function ProgressBar({ value, color, label }: { value: number; color?: string; label: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="progress" role="progressbar" aria-label={label} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function StatCard({ icon, label, value, detail, tone = "green", trend = false }: { icon: IconName; label: string; value: ReactNode; detail: string; tone?: "green" | "ochre" | "teal"; trend?: boolean }) {
  return (
    <article className="stat-card">
      <span className={`stat-icon ${tone}`}><Icon name={icon} /></span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span className={trend ? "trend" : undefined}>{detail}</span>
      </div>
    </article>
  );
}

export function FilterChips<T extends string>({ options, value, onChange, label }: { options: { id: T; label: string; count?: number }[]; value: T; onChange: (id: T) => void; label: string }) {
  return (
    <div className="filter-chips" role="group" aria-label={label}>
      {options.map((option) => (
        <button key={option.id} type="button" aria-pressed={value === option.id} className={value === option.id ? "active" : ""} onClick={() => onChange(option.id)}>
          {option.label}
          {option.count !== undefined && <span>{option.count}</span>}
        </button>
      ))}
    </div>
  );
}
