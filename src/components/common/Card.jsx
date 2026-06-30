export default function Card({ children, className = "" }) {
  return (
    <div className={`glass-card p-5 rounded-2xl border border-slate-900/60 shadow-xl ${className}`}>
      {children}
    </div>
  );
}
