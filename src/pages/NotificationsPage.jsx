import { useState, useEffect } from "react";
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from "../services/api";
import { Bell, CheckCheck, Trash2, Heart, MessageSquare, UserPlus, PhoneCall, Mail } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await fetchNotifications();
      setNotifications(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkOneRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case "like":
        return <Heart className="w-4 h-4 text-red-500 fill-red-500/20" />;
      case "comment":
        return <MessageSquare className="w-4 h-4 text-blue-400" />;
      case "follow":
        return <UserPlus className="w-4 h-4 text-green-400" />;
      case "call":
        return <PhoneCall className="w-4 h-4 text-purple-400 animate-bounce" />;
      case "message":
        return <Mail className="w-4 h-4 text-yellow-400" />;
      default:
        return <Bell className="w-4 h-4 text-cyan-400" />;
    }
  };

  const parseTime = (dateStr) => {
    try {
      const diff = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return "Just now";
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      return new Date(dateStr).toLocaleDateString();
    } catch (e) {
      return "some time ago";
    }
  };

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Notifications</h2>
            <p className="text-slate-400 text-sm mt-1">Stay updated with likes, comments, and messages.</p>
          </div>
          {notifications.some(n => !n.isRead) && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-cyan-400 font-semibold hover:bg-slate-850 hover:text-cyan-300 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
        </div>

        {/* Notifications list */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 w-full bg-slate-900/40 rounded-xl animate-pulse border border-slate-850" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/10 border border-slate-900 rounded-2xl text-slate-500 text-sm flex flex-col items-center justify-center gap-3">
              <Bell className="w-8 h-8 text-slate-600" />
              <span>No notifications yet. Enjoy your day!</span>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map(n => (
                <div
                  key={n._id}
                  onClick={() => !n.isRead && handleMarkOneRead(n._id)}
                  className={`flex items-start justify-between p-4 rounded-2xl border transition-all ${
                    n.isRead 
                      ? "bg-slate-900/10 border-slate-900 text-slate-400" 
                      : "bg-slate-900/40 border-slate-800/80 text-white cursor-pointer hover:bg-slate-900/60"
                  }`}
                >
                  <div className="flex gap-4">
                    <div className="relative mt-1">
                      <img
                        src={n.sender?.avatar}
                        alt={n.sender?.username}
                        className="w-10 h-10 rounded-full border border-slate-800 object-cover"
                      />
                      <div className="absolute -bottom-1 -right-1 p-1 bg-slate-950 border border-slate-800 rounded-full flex items-center justify-center">
                        {getNotifIcon(n.type)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        <span className="font-bold text-slate-200 mr-1.5">@{n.sender?.username}</span>
                        <span className="text-slate-350">{n.content}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{parseTime(n.createdAt)}</div>
                    </div>
                  </div>
                  
                  {!n.isRead && (
                    <div className="w-2 h-2 rounded-full bg-cyan-400 mt-2.5 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default NotificationsPage;
