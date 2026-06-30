import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, Shield, Info } from "lucide-react";
import CipherNetLogo from "../components/common/CipherNetLogo";

function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);
  
  const { login, register, loading, error } = useAuthStore();
  const [validationError, setValidationError] = useState("");

  const handleGoogleSignIn = () => {
    const backendUrl = window.location.hostname === "localhost"
      ? "http://localhost:5000"
      : "https://socialmediadashboard-ciphernet.onrender.com";
    window.location.href = `${backendUrl}/api/auth/google`;
  };

  const handleGitHubSignIn = () => {
    const backendUrl = window.location.hostname === "localhost"
      ? "http://localhost:5000"
      : "https://socialmediadashboard-ciphernet.onrender.com";
    window.location.href = `${backendUrl}/api/auth/github`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError("");
    
    if (isLogin) {
      if (!username || !password) {
        setValidationError("Please fill in all fields.");
        return;
      }
      try {
        await login(username, password, rememberMe);
      } catch (err) {
        // Handled in store
      }
    } else {
      if (!username || !email || !password || !name) {
        setValidationError("All fields are required.");
        return;
      }
      if (username.length < 3) {
        setValidationError("Username must be at least 3 characters.");
        return;
      }
      if (password.length < 6) {
        setValidationError("Password must be at least 6 characters.");
        return;
      }
      try {
        await register(username, email, password, name);
      } catch (err) {
        // Handled in store
      }
    }
  };

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    if (!forgotEmail) return;
    // Mock forgot password
    setForgotSuccess(true);
    setTimeout(() => {
      setForgotSuccess(false);
      setShowForgot(false);
      setForgotEmail("");
    }, 3000);
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden bg-slate-950 font-sans">
      
      {/* Background Decorative Blurs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tr from-pink-500/20 to-indigo-500/20 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md p-6 z-10">
        
        {/* Logo Header */}
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/60 border border-slate-800 text-xs text-cyan-400 font-semibold mb-3 tracking-wider backdrop-blur-md"
          >
            <Shield className="w-4 h-4 text-cyan-400 animate-pulse" />
            SECURED END-TO-END
          </motion.div>
          <motion.div className="flex justify-center mb-2">
            <CipherNetLogo className="w-12 h-12 animate-bounce" />
          </motion.div>
          <motion.h1 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-450 bg-clip-text text-transparent"
          >
            CipherNet
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-slate-400 mt-2 text-sm font-semibold"
          >
            Connect Securely. Communicate Freely.
          </motion.p>
        </div>

        {/* Card Body */}
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
          className="relative bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl rounded-2xl shadow-2xl p-8 overflow-hidden"
        >
          {/* Card Border glow */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-purple-500 opacity-70" />

          <AnimatePresence mode="wait">
            {!showForgot ? (
              <motion.div
                key="auth"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {/* Form Tabs */}
                <div className="flex border-b border-slate-800/60 mb-6 pb-0.5">
                  <button
                    onClick={() => { setIsLogin(true); setValidationError(""); }}
                    className={`flex-1 pb-3 text-sm font-semibold transition-colors relative ${isLogin ? "text-white" : "text-slate-500 hover:text-slate-300"}`}
                  >
                    Login
                    {isLogin && (
                      <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />
                    )}
                  </button>
                  <button
                    onClick={() => { setIsLogin(false); setValidationError(""); }}
                    className={`flex-1 pb-3 text-sm font-semibold transition-colors relative ${!isLogin ? "text-white" : "text-slate-500 hover:text-slate-300"}`}
                  >
                    Register
                    {!isLogin && (
                      <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />
                    )}
                  </button>
                </div>

                {/* Validation and Request Errors */}
                {(validationError || error) && (
                  <div className="mb-4 p-3 rounded-lg bg-red-950/40 border border-red-900/60 text-red-400 text-xs flex items-start gap-2">
                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{validationError || error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Register Fields */}
                  {!isLogin && (
                    <>
                      <div>
                        <label className="block text-slate-400 text-xs font-semibold mb-1.5 uppercase tracking-wide">Full Name</label>
                        <div className="relative">
                          <User className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                          <input
                            type="text"
                            placeholder="Alex Mercer"
                            className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-slate-400 text-xs font-semibold mb-1.5 uppercase tracking-wide">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                          <input
                            type="email"
                            placeholder="alex@example.com"
                            className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Username Field */}
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold mb-1.5 uppercase tracking-wide">
                      {isLogin ? "Username or Email" : "Username"}
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder={isLogin ? "user@example.com or user123" : "username"}
                        className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Password</label>
                      {isLogin && (
                        <button
                          type="button"
                          onClick={() => { setShowForgot(true); setValidationError(""); }}
                          className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
                        >
                          Forgot?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                      <input
                        type="password"
                        placeholder="••••••••"
                        className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Remember Me */}
                  {isLogin && (
                    <div className="flex items-center">
                      <input
                        id="remember-me"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-950 focus:ring-2 accent-cyan-500"
                      />
                      <label htmlFor="remember-me" className="ml-2 text-xs text-slate-400 font-semibold select-none cursor-pointer">
                        Remember session
                      </label>
                    </div>
                  )}

                  {/* Submit Button */}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white rounded-xl py-3 text-sm font-bold flex items-center justify-center shadow-lg shadow-cyan-950/20 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      isLogin ? "Sign In" : "Create Account"
                    )}
                  </motion.button>
                </form>

                {/* Social Auth Separator */}
                <div className="relative my-6 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-800/60" />
                  </div>
                  <span className="relative px-3 bg-[#0d1527] text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    Or sign in with
                  </span>
                </div>

                {/* Social Auth Buttons */}
                <div className="space-y-2">
                  <button 
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="w-full flex items-center justify-center py-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80 hover:bg-slate-900/60 transition-colors text-slate-200 hover:text-white text-xs font-semibold cursor-pointer"
                  >
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.51 0-6.357-2.846-6.357-6.357s2.847-6.356 6.357-6.356c1.614 0 3.08.6 4.217 1.583L21.2 4.4A11.95 11.95 0 0 0 12.24 0C5.48 0 0 5.48 0 12.24s5.48 12.24 12.24 12.24c6.8 0 11.76-4.788 11.76-11.952 0-.816-.072-1.608-.216-2.243H12.24z"/></svg>
                    Continue with Google
                  </button>
                  <button 
                    type="button"
                    onClick={handleGitHubSignIn}
                    className="w-full flex items-center justify-center py-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80 hover:bg-slate-900/60 transition-colors text-slate-200 hover:text-white text-xs font-semibold cursor-pointer"
                  >
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
                    Continue with GitHub
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="forgot"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="text-center mb-2">
                  <h3 className="text-lg font-bold text-white">Reset Password</h3>
                  <p className="text-slate-400 text-xs mt-1">Enter your registered email address to receive password reset link.</p>
                </div>

                {forgotSuccess && (
                  <div className="p-3 rounded-lg bg-green-950/40 border border-green-900/60 text-green-400 text-xs">
                    Password reset link sent successfully! Check your inbox.
                  </div>
                )}

                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold mb-1.5 uppercase tracking-wide">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                      <input
                        type="email"
                        required
                        placeholder="your-email@example.com"
                        className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowForgot(false)}
                      className="flex-1 py-3 border border-slate-850 hover:bg-slate-900/40 text-slate-300 font-semibold rounded-xl text-sm transition-colors"
                    >
                      Back to Login
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-bold rounded-xl text-sm transition-colors shadow-md"
                    >
                      Send Instructions
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

    </div>
  );
}

export default AuthPage;
