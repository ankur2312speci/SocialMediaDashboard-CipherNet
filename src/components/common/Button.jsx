import { motion } from "framer-motion";

export default function Button({ children, onClick, type = "button", variant = "primary", className = "", disabled = false }) {
  const baseStyle = "px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-950/10",
    secondary: "bg-slate-900 border border-slate-800 text-slate-350 hover:text-white hover:bg-slate-850",
    outline: "bg-transparent border border-cyan-550/20 text-cyan-400 hover:bg-cyan-950/20",
    danger: "bg-red-500 hover:bg-red-400 text-white shadow-md shadow-red-950/10",
  };

  const selectedClass = `${baseStyle} ${variants[variant] || variants.primary} ${className}`;

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={selectedClass}
    >
      {children}
    </motion.button>
  );
}
