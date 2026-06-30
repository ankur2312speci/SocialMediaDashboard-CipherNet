import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { 
  Home, Search, Compass, Mail, Bell, Settings, User, LogOut
} from "lucide-react";
import { motion } from "framer-motion";
import CipherNetLogo from "./common/CipherNetLogo";

function Navbar() {
  const { user, logout } = useAuthStore();
  const { conversations } = useChatStore();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  // Calculate unread badge count
  const unreadMessageCount = conversations.reduce((acc, conv) => acc + (conv.unreadCount || 0), 0);

  const navItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/search", label: "Search", icon: Search },
    { path: "/explore", label: "Explore", icon: Compass },
    { path: "/messages", label: "Messages", icon: Mail, badge: unreadMessageCount },
    { path: "/notifications", label: "Notifications", icon: Bell, badge: 3 }, // Mock notifications badge
    { path: `/profile`, label: "Profile", icon: User },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <>
      {/* Desktop Collapsible Glassmorphic Sidebar */}
      <nav className="hidden md:flex flex-col fixed left-0 top-0 h-full w-[245px] border-r border-slate-900 bg-slate-950/40 backdrop-blur-xl px-4 py-6 z-50">
        
        {/* Brand Logo */}
        <Link to="/" className="mb-10 px-3 flex items-center gap-2">
          <CipherNetLogo className="w-7 h-7" />
          <span className="text-xl font-black tracking-wider bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent uppercase font-mono">
            CipherNet
          </span>
        </Link>

        {/* Navigation Roster */}
        <div className="flex flex-col gap-2.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <Link
                key={item.label}
                to={item.path}
                className={`flex items-center justify-between p-3.5 rounded-xl transition-all group ${
                  active 
                    ? "bg-slate-900/60 text-white font-bold border border-slate-800" 
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/20"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${active ? "text-cyan-400" : ""}`} />
                    {item.badge > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 bg-cyan-400 text-slate-950 text-[9px] font-black rounded-full flex items-center justify-center px-1">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-semibold">{item.label}</span>
                </div>

                {active && (
                  <motion.div 
                    layoutId="activeIndicator" 
                    className="w-1.5 h-1.5 rounded-full bg-cyan-450 shadow-[0_0_8px_#22d3ee]" 
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Footer Profile / Log Out */}
        <div className="mt-auto pt-6 border-t border-slate-900">
          {user && (
            <div className="flex items-center justify-between p-2 mb-4 bg-slate-900/20 border border-slate-900 rounded-xl">
              <div className="flex items-center gap-2.5 min-w-0">
                <img 
                  src={user.avatar || `https://ui-avatars.com/api/?name=${user.username}`} 
                  alt="profile" 
                  className="w-8 h-8 rounded-full border border-slate-800 object-cover" 
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-200 truncate">@{user.username}</div>
                  <div className="text-[10px] text-slate-500 truncate">{user.name}</div>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={logout}
            className="w-full flex items-center gap-4 p-3.5 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-950/20 transition-all font-semibold text-sm"
          >
            <LogOut className="w-5 h-5 text-red-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-slate-950/70 border-t border-slate-900/80 backdrop-blur-xl flex justify-around items-center py-2.5 z-50">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <Link key={item.label} to={item.path} className="relative p-2">
              <Icon className={`w-5 h-5 ${active ? "text-cyan-400" : "text-slate-500"}`} />
              {item.badge > 0 && (
                <span className="absolute top-0 right-0 min-w-4 h-4 bg-cyan-400 text-slate-950 text-[9px] font-black rounded-full flex items-center justify-center px-1">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
        {user && (
          <Link to="/profile">
            <img 
              src={user.avatar} 
              alt="profile" 
              className={`w-6 h-6 rounded-full object-cover border ${
                isActive("/profile") ? "border-cyan-400" : "border-slate-800"
              }`} 
            />
          </Link>
        )}
      </nav>
    </>
  );
}

export default Navbar;
