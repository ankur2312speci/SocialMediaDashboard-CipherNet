import { useState, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Moon, Sun, Shield, Key, Eye, LogOut, Check } from "lucide-react";

function SettingsPage() {
  const { logout, user } = useAuthStore();
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
  const [copiedKey, setCopiedKey] = useState(false);
  const [privateKeyDisplay, setPrivateKeyDisplay] = useState("••••••••••••••••••••••••••••••••");
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showCryptoDetails, setShowCryptoDetails] = useState(false);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const handleCopyPublicKey = () => {
    if (user?.publicKey) {
      navigator.clipboard.writeText(user.publicKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const togglePrivateKey = () => {
    if (!showPrivateKey) {
      // Simulate showing the private key loaded from local IndexedDB
      setPrivateKeyDisplay("ECDH-P256-PRI-KEY-W4A9h7s91mZ...[Secure Storage]");
    } else {
      setPrivateKeyDisplay("••••••••••••••••••••••••••••••••");
    }
    setShowPrivateKey(!showPrivateKey);
  };

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-slate-400 text-sm mt-1">Manage themes, security credentials, and your account settings.</p>
        </div>

        {/* Theme Settings Card */}
        <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 space-y-4 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <Sun className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-base text-slate-200">Aesthetics & Appearance</h3>
          </div>
          <p className="text-xs text-slate-500">Choose between dark and light themes. Preference is stored in your local browser settings.</p>
          
          <div className="flex gap-4">
            <button
              onClick={() => setTheme("dark")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-all ${
                theme === "dark" 
                  ? "bg-slate-900 border-cyan-500/50 text-slate-100" 
                  : "bg-slate-900/10 border-slate-950 text-slate-500 hover:text-slate-350"
              }`}
            >
              <Moon className="w-4 h-4" />
              Dark Mode
            </button>
            <button
              onClick={() => setTheme("light")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-all ${
                theme === "light" 
                  ? "bg-slate-900 border-cyan-500/50 text-slate-100" 
                  : "bg-slate-900/10 border-slate-950 text-slate-500 hover:text-slate-350"
              }`}
            >
              <Sun className="w-4 h-4" />
              Light Mode
            </button>
          </div>
        </div>

        {/* Advanced Privacy & Cryptography Toggle */}
        <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-200">Advanced Cryptographic Details</h3>
              <p className="text-xs text-slate-500 mt-1">Show device key configurations and E2EE diagnostics</p>
            </div>
            <button
              onClick={() => setShowCryptoDetails(!showCryptoDetails)}
              className={`w-11 h-6 rounded-full transition-all relative ${showCryptoDetails ? "bg-cyan-500" : "bg-slate-800"}`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-slate-950 transition-all ${showCryptoDetails ? "translate-x-5" : ""}`} />
            </button>
          </div>
        </div>

        {/* End-to-End Encryption Device Configuration */}
        {showCryptoDetails && (
          <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 space-y-6 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-base text-slate-200">Device Cryptography (E2EE)</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[10px] font-bold tracking-wider border border-green-500/20">
                ACTIVE
              </span>
            </div>

            <div className="p-3 bg-cyan-950/20 border border-cyan-900/40 rounded-xl text-xs text-cyan-400 space-y-1">
              <div className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" />
                How encryption works on your device:
              </div>
              <p className="leading-relaxed">
                Your messages are encrypted client-side using **AES-256-GCM** before sending. Cryptographic keys are exchanged using the **Diffie-Hellman Key Exchange (ECDH)** curve P-256. The server only sees ciphertext.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Device Public Key (Publicly Broadcast)</label>
                  <button
                    onClick={handleCopyPublicKey}
                    className="text-xs text-cyan-400 font-semibold hover:underline"
                  >
                    {copiedKey ? "Copied!" : "Copy Key"}
                  </button>
                </div>
                <div className="w-full bg-slate-950/60 border border-slate-900 rounded-xl p-3 text-[10px] font-mono text-slate-500 break-all select-all max-h-16 overflow-y-auto">
                  {user?.publicKey || "No E2EE public key generated on this account."}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                    Device Private Key (Kept Offline in IndexedDB)
                  </label>
                  <button
                    onClick={togglePrivateKey}
                    className="text-xs text-purple-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    {showPrivateKey ? "Hide Key" : "Reveal Key"}
                  </button>
                </div>
                <div className="w-full bg-slate-950/60 border border-slate-900 rounded-xl p-3 text-[10px] font-mono text-slate-500 break-all">
                  {privateKeyDisplay}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Account Settings Card */}
        <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 backdrop-blur-md flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-200 text-sm">Account Operations</h3>
            <p className="text-xs text-slate-500 mt-1">Log out of your current session. Encryption keys remain in browser storage.</p>
          </div>
          
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-950/40 border border-red-900/60 rounded-xl text-xs text-red-400 font-bold hover:bg-red-950/60 hover:text-red-300 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>

      </div>
    </div>
  );
}

export default SettingsPage;
