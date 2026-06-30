import { motion } from "framer-motion";
import CipherNetLogo from "./CipherNetLogo";

function LoadingScreen() {
  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden font-sans">
      {/* Decorative Blurs */}
      <div className="absolute w-[300px] h-[300px] rounded-full bg-cyan-500/10 blur-[100px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-4 z-10"
      >
        <div className="relative">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="w-16 h-16 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center"
          >
            <CipherNetLogo className="w-8 h-8" />
          </motion.div>
        </div>

        <div className="flex flex-col items-center">
          <h2 className="text-xl font-bold text-white tracking-wide">CipherNet</h2>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-semibold">Initializing Cryptography Vault</p>
        </div>

        {/* Custom Progress bar */}
        <div className="w-36 h-[2px] bg-slate-800 rounded-full overflow-hidden mt-2">
          <motion.div
            initial={{ left: "-100%" }}
            animate={{ left: "100%" }}
            transition={{
              repeat: Infinity,
              duration: 1.5,
              ease: "easeInOut"
            }}
            className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 w-[50%] relative"
          />
        </div>
      </motion.div>
    </div>
  );
}

export default LoadingScreen;
