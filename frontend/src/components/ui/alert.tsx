export function Alert({
  variant = 'error',
  children,
}: {
  variant?: 'error' | 'success' | 'info';
  children: React.ReactNode;
}) {
  const styles = {
    error: 'border-red-200 bg-red-50 text-red-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    info: 'border-slate-200 bg-slate-50 text-slate-700',
  };
  return (
    <p
      className={`rounded-md border px-3 py-2 text-sm ${styles[variant]}`}
      role="alert"
    >
      {children}
    </p>
  );
}
