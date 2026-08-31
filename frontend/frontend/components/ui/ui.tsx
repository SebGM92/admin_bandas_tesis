"use client";

// BandAdmin — componentes base.
// Importar tokens.css y ui.css una vez en el layout raíz.

import { useEffect, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

const cx = (...parts: unknown[]) => parts.filter(Boolean).join(" ");

/* ================================ Card ================================ */
interface CardProps extends HTMLAttributes<HTMLDivElement> {
  nested?: boolean;
  flush?: boolean;
  interactive?: boolean;
}

export function Card({ children, nested, flush, interactive, className, ...rest }: CardProps) {
  return (
    <div
      className={cx(
        "ba-card",
        nested && "ba-card--nested",
        flush && "ba-card--flush",
        interactive && "ba-card--interactive",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

Card.Header = function CardHeader({ title, action, children }: { title?: ReactNode; action?: ReactNode; children?: ReactNode }) {
  return (
    <div className="ba-card__header">
      {title ? <h2 className="ba-section-title">{title}</h2> : children}
      {action}
    </div>
  );
};

/* =============================== Button =============================== */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm";
  block?: boolean;
  icon?: string;
}

export function Button({
  variant = "secondary",
  size,
  block,
  icon,
  children,
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        "ba-btn",
        `ba-btn--${variant}`,
        size === "sm" && "ba-btn--sm",
        block && "ba-btn--block",
        className
      )}
      {...rest}
    >
      {icon && <i className={`ti ti-${icon}`} aria-hidden="true" />}
      {children}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  label: string;
  danger?: boolean;
}

export function IconButton({ icon, label, danger, className, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx("ba-icon-btn", danger && "ba-icon-btn--danger", className)}
      {...rest}
    >
      <i className={`ti ti-${icon}`} aria-hidden="true" />
    </button>
  );
}

/* ================================ Badge =============================== */
type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  dot?: boolean;
  icon?: string;
}

export function Badge({ tone = "neutral", dot, icon, children, className, ...rest }: BadgeProps) {
  return (
    <span
      className={cx("ba-badge", tone !== "neutral" && `ba-badge--${tone}`, className)}
      {...rest}
    >
      {dot && <span className="ba-dot" />}
      {icon && <i className={`ti ti-${icon}`} aria-hidden="true" />}
      <span>{children}</span>
    </span>
  );
}

// Mapa único de estados del catálogo. Cambiar aquí, no en cada vista.
export const ESTADOS_CANCION: Record<string, { label: string; tone: BadgeTone }> = {
  POR_TOCAR:   { label: "Por tocar",   tone: "neutral" },
  APRENDIZAJE: { label: "En aprendizaje", tone: "warning" },
  ACTIVO:      { label: "Repertorio activo", tone: "success" },
};

export function EstadoBadge({ estado }: { estado: string }) {
  const e = ESTADOS_CANCION[estado] ?? ESTADOS_CANCION.POR_TOCAR;
  return <Badge tone={e.tone} dot>{e.label}</Badge>;
}

/* ============================== StatCard ============================== */
interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  hintTone?: "brand" | "success" | "warning";
  icon?: string;
}

export function StatCard({ label, value, hint, hintTone, icon }: StatCardProps) {
  return (
    <div className="ba-stat">
      <p className="ba-stat__label">
        {icon && <i className={`ti ti-${icon}`} aria-hidden="true" style={{ marginRight: 6 }} />}
        {label}
      </p>
      <p className="ba-stat__value">{value}</p>
      {hint && <p className={cx("ba-stat__hint", hintTone && `ba-stat__hint--${hintTone}`)}>{hint}</p>}
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="ba-stat-grid">{children}</div>;
}

/* ============================= EmptyState ============================= */
interface EmptyStateProps {
  icon?: string;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ icon = "music-off", title, body, action }: EmptyStateProps) {
  return (
    <div className="ba-empty">
      <i className={`ti ti-${icon} ba-empty__icon`} aria-hidden="true" />
      <p className="ba-empty__title">{title}</p>
      {body && <p className="ba-empty__body">{body}</p>}
      {action}
    </div>
  );
}

/* ================================ Field =============================== */
interface FieldProps {
  label?: ReactNode;
  error?: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
}

export function Field({ label, error, hint, children }: FieldProps) {
  return (
    <div className={cx("ba-field", error && "ba-field--invalid")}>
      {label && <label className="ba-label">{label}</label>}
      {children}
      {error ? (
        <p className="ba-field__error">{error}</p>
      ) : hint ? (
        <p className="ba-field__error" style={{ color: "var(--ba-text-subtle)" }}>{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx("ba-input", className)} {...rest} />;
}
export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx("ba-textarea", className)} {...rest} />;
}
export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx("ba-select", className)} {...rest}>
      {children}
    </select>
  );
}

/* ================================ Modal =============================== */
interface ModalProps {
  open: boolean;
  onClose?: () => void;
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="ba-modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="ba-modal" role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined}>
        {title && (
          <div className="ba-card__header">
            <h2 className="ba-section-title">{title}</h2>
            <IconButton icon="x" label="Cerrar" onClick={onClose} />
          </div>
        )}
        {children}
        {footer && <div className="ba-modal__footer">{footer}</div>}
      </div>
    </div>
  );
}

/* ============================= StatusIcon =============================== */
type StatusTone = "brand" | "success" | "danger" | "warning";

export function StatusIcon({ icon, tone = "brand", size = 64 }: { icon: string; tone?: StatusTone; size?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto var(--ba-space-4)",
        background: `var(--ba-${tone}-soft)`,
        color: `var(--ba-${tone})`,
      }}
    >
      <i className={`ti ti-${icon}`} style={{ fontSize: size * 0.44 }} aria-hidden="true" />
    </div>
  );
}

/* =============================== Avatar =============================== */
export function Avatar({ name = "?", size = 32 }: { name?: string; size?: number }) {
  const initials = name.trim().slice(0, 1).toUpperCase();
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--ba-brand)",
        color: "var(--ba-on-brand)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.42,
        fontWeight: 500,
        flex: "none",
      }}
    >
      {initials}
    </div>
  );
}
