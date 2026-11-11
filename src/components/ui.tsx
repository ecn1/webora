import React, { useEffect } from 'react';
import { Loader2, X, type LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

/* ------------------------------- buttons ------------------------------- */

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'dark';
type Size = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent text-white hover:bg-accent-soft shadow-[0_10px_30px_-12px_rgba(124,92,255,0.9)]',
  secondary:
    'bg-white/[0.06] text-[#ececf6] border border-white/10 hover:bg-white/[0.1] hover:border-white/15',
  outline:
    'border border-white/10 text-[#d4d4e4] hover:bg-white/[0.05] hover:text-white',
  ghost: 'text-[#9d9db6] hover:bg-white/[0.06] hover:text-white',
  danger:
    'bg-red-500/15 text-red-300 border border-red-500/25 hover:bg-red-500/25 hover:text-red-200',
  dark: 'bg-ink-800 text-white border border-white/10 hover:bg-ink-700',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[12px] rounded-lg gap-1.5',
  md: 'h-9 px-4 text-[13px] rounded-lg gap-2',
  lg: 'h-11 px-5 text-[14px] rounded-xl gap-2',
  icon: 'h-8 w-8 rounded-lg',
  'icon-sm': 'h-7 w-7 rounded-md',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: LucideIcon;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading,
  icon: Icon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition duration-150 focus-visible:ring-2 focus-visible:ring-accent/50 disabled:pointer-events-none disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : Icon ? <Icon size={15} /> : null}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  icon: Icon,
  active,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon: LucideIcon;
  active?: boolean;
}) {
  return (
    <button
      {...props}
      title={label}
      aria-label={label}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#9292aa] transition hover:bg-white/[0.07] hover:text-white disabled:pointer-events-none disabled:opacity-35',
        active && 'bg-accent/15 text-accent-soft',
        className
      )}
    >
      <Icon size={16} />
    </button>
  );
}

/* -------------------------------- inputs ------------------------------- */

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} {...props} className={cn('input', className)} />;
  }
);

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} {...props} className={cn('input resize-y leading-relaxed', className)} />;
  }
);

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={cn(
          'input appearance-none pr-8',
          '[&>option]:bg-ink-850 [&>option]:text-[#e8e8f4]',
          className
        )}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6e6e88]"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
  action,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#70708a]">{label}</label>
        {action}
      </div>
      {children}
      {hint ? <p className="mt-1.5 text-[11px] leading-relaxed text-[#5f5f78]">{hint}</p> : null}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  description?: string;
}) {
  const control = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200',
        checked ? 'bg-accent' : 'bg-white/10 hover:bg-white/15'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-200',
          checked ? 'left-[18px]' : 'left-0.5'
        )}
      />
    </button>
  );
  if (!label) return control;
  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <div className="text-[13px] font-medium text-[#e2e2ef]">{label}</div>
        {description ? <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#71718a]">{description}</p> : null}
      </div>
      {control}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: Array<{ value: T; label?: string; icon?: LucideIcon; title?: string }>;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn('inline-flex items-center rounded-lg border border-white/10 bg-ink-900/70 p-0.5', className)}>
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            title={opt.title || opt.label}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex h-7 items-center justify-center gap-1.5 rounded-md px-2.5 text-[11.5px] font-medium transition',
              active ? 'bg-white/[0.09] text-white shadow-sm' : 'text-[#85859e] hover:text-white'
            )}
          >
            {Icon ? <Icon size={14} /> : null}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------- modal -------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'max-w-2xl',
  bodyClassName,
  headerRight,
  closeOnOverlay = true,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
  bodyClassName?: string;
  headerRight?: React.ReactNode;
  closeOnOverlay?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-5 sm:p-8">
      <div
        className="absolute inset-0 animate-fade bg-black/70 backdrop-blur-[6px]"
        onClick={closeOnOverlay ? onClose : undefined}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative flex max-h-[92vh] w-full animate-pop flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-ink-850 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)]',
          width
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-6 py-4">
          <div className="min-w-0">
            <h2 className="font-display text-[16px] font-semibold tracking-tight text-white">{title}</h2>
            {subtitle ? <p className="mt-1 text-[12px] text-[#7f7f98]">{subtitle}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {headerRight}
            <IconButton label="Close" icon={X} onClick={onClose} />
          </div>
        </div>
        <div className={cn('min-h-0 flex-1 overflow-y-auto px-6 py-5', bodyClassName)}>{children}</div>
        {footer ? (
          <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] bg-ink-900/60 px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width="max-w-md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-[13px] leading-relaxed text-[#a4a4bc]">{message}</p>
    </Modal>
  );
}

/* ------------------------------ misc pieces ----------------------------- */

export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={cn('animate-spin text-accent-soft', className)} />;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.015] text-center',
        compact ? 'px-6 py-10' : 'px-8 py-16'
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-accent-soft">
        <Icon size={22} />
      </div>
      <h3 className="font-display text-[15px] font-semibold text-white">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-[#77778f]">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function WeboraMark({ size = 36, glow = false }: { size?: number; glow?: boolean }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {glow ? (
        <div className="absolute inset-0 animate-pulse-soft rounded-[28%] bg-accent/50 blur-xl" />
      ) : null}
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        className="relative block drop-shadow-[0_6px_18px_rgba(124,92,255,0.35)]"
      >
        <defs>
          <linearGradient id="wb-mark" x1="2" y1="2" x2="46" y2="46" gradientUnits="userSpaceOnUse">
            <stop stopColor="#a78bfa" />
            <stop offset="0.52" stopColor="#7c5cff" />
            <stop offset="1" stopColor="#5b3ae6" />
          </linearGradient>
          <linearGradient id="wb-mark-shine" x1="10" y1="0" x2="30" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="rgba(255,255,255,0.38)" />
            <stop offset="1" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="46" height="46" rx="13" fill="url(#wb-mark)" />
        <rect x="1" y="1" width="46" height="46" rx="13" fill="url(#wb-mark-shine)" />
        <path
          d="M11.5 16.5 17.6 33h4.9l2-6.4 2 6.4h4.9l6.1-16.5h-5.2l-3.6 10.9-1.7-5.6h-5l-1.7 5.6-3.6-10.9h-5.2Z"
          fill="#fff"
        />
      </svg>
    </div>
  );
}

export function KeyHint({ children }: { children: React.ReactNode }) {
  return <span className="kbd">{children}</span>;
}
