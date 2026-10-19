import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  right?: ReactNode;
}

export function CardHeader({ title, subtitle, icon, right }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3 border-b border-slate-100">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-base font-semibold text-slate-900 leading-tight">{title}</h3>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

interface StatTileProps {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  accent?: string;
  icon?: ReactNode;
}

export function StatTile({ label, value, unit, hint, accent = "slate", icon }: StatTileProps) {
  const accentMap: Record<string, string> = {
    slate: "bg-slate-50 text-slate-700",
    red: "bg-red-50 text-red-700",
    blue: "bg-blue-50 text-blue-700",
    teal: "bg-teal-50 text-teal-700",
    amber: "bg-amber-50 text-amber-700",
    green: "bg-emerald-50 text-emerald-700",
    violet: "bg-violet-50 text-violet-700",
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
        {icon && <div className={`h-7 w-7 rounded-md flex items-center justify-center ${accentMap[accent]}`}>{icon}</div>}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-2xl font-semibold text-slate-900 tabular-nums">{value}</span>
        {unit && <span className="text-sm text-slate-500 font-medium">{unit}</span>}
      </div>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

interface BadgeProps {
  children: ReactNode;
  color?: "slate" | "red" | "blue" | "teal" | "amber" | "green" | "violet";
}

export function Badge({ children, color = "slate" }: BadgeProps) {
  const map: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
    teal: "bg-teal-100 text-teal-700",
    amber: "bg-amber-100 text-amber-700",
    green: "bg-emerald-100 text-emerald-700",
    violet: "bg-violet-100 text-violet-700",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${map[color]}`}>
      {children}
    </span>
  );
}

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  type?: "button" | "submit";
  disabled?: boolean;
  title?: string;
}

export function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  type = "button",
  disabled,
  title,
}: ButtonProps) {
  const variants: Record<string, string> = {
    primary: "bg-slate-900 text-white hover:bg-slate-800 shadow-sm",
    secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-100",
    danger: "bg-white text-red-600 border border-red-200 hover:bg-red-50",
  };
  const sizes: Record<string, string> = {
    sm: "px-2.5 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]}`}
    >
      {children}
    </button>
  );
}

interface SectionTitleProps {
  title: string;
  description?: string;
}

export function SectionTitle({ title, description }: SectionTitleProps) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
    </div>
  );
}
