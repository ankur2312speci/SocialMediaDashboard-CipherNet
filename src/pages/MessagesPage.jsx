import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useSocket } from "../hooks/useSocket";
import { useWebRTC } from "../hooks/useWebRTC";
import { useE2EE } from "../hooks/useE2EE";
import { 
  Send, Shield, ShieldCheck, Phone, Video as VideoIcon, Paperclip, Smile, Mic, MicOff, 
  Search, Plus, X, Reply, CornerDownRight, Check, CheckCheck, Trash2, Edit3, Forward,
  FileText, ImageIcon, FileAudio, FileVideo, Radio
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchSuggestedUsers, searchUsers } from "../services/api";

function MessagesPage() {
  const { user } = useAuthStore();
  const { 
    conversations, 
    activeChat, 
    onlineUsers, 
    typingUsers, 
    loading, 
    fetchConversationsList, 
    loadMessages, 
    setActiveChat, 
    addMessageToActiveChat,
    createGroup
  } = useChatStore();

  const socket = useSocket();
  const { startCall } = useWebRTC();
  const { encryptMessage, decryptMessage, keysReady, generateAndRegisterKeys } = useE2EE();

  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Custom Pickers & Uploads
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Group Create Modal
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [memberSearchResults, setMemberSearchResults] = useState([]);

  // Debounced member search
  useEffect(() => {
    if (!memberSearchQuery.trim()) {
      setMemberSearchResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      try {
        const results = await searchUsers(memberSearchQuery);
        setMemberSearchResults(results);
      } catch (err) {
        console.error(err);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [memberSearchQuery]);
  
  // Message interaction states
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);
  const [editText, setEditText] = useState("");
  const [searchMsgQuery, setSearchMsgQuery] = useState("");
  const [showSearchMsg, setShowSearchMsg] = useState(false);

  // Voice Note states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioChunks, setAudioChunks] = useState([]);
  const mediaRecorderRef = useRef(null);
  const recordIntervalRef = useRef(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Initial E2EE key registration
  useEffect(() => {
    if (user) {
      generateAndRegisterKeys();
    }
  }, [user, generateAndRegisterKeys]);

  // Load conversations
  useEffect(() => {
    fetchConversationsList();
  }, [fetchConversationsList]);

  // Query parameter interceptor for starting new chats from other pages
  const [suggestedUsers, setSuggestedUsers] = useState([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetUserId = params.get("userId");
    const targetUsername = params.get("username");
    const targetName = params.get("name");
    const targetAvatar = params.get("avatar");

    if (targetUserId && targetUsername) {
      setActiveChat({
        type: "direct",
        contact: {
          id: targetUserId,
          username: targetUsername,
          name: targetName || targetUsername,
          avatar: targetAvatar || ""
        },
        messages: []
      });
      // Clean query params from the browser address bar
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [setActiveChat]);

  // Load suggested users for secure chat
  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const data = await fetchSuggestedUsers();
        setSuggestedUsers(data);
      } catch (err) {
        console.error(err);
      }
    };
    loadSuggestions();
  }, []);

  // Decrypt historical messages in activeChat on load
  useEffect(() => {
    if (!activeChat || !activeChat.messages || !user || !keysReady) return;

    const decryptAll = async () => {
      let updated = false;
      const promises = activeChat.messages.map(async (msg) => {
        if (activeChat.type === "direct" && !msg.decryptedText && msg.ciphertext && msg.iv && msg.iv !== "none") {
          const otherUserId = msg.sender._id === user._id ? msg.receiver._id : msg.sender._id;
          try {
            const dec = await decryptMessage(msg.ciphertext, msg.iv, otherUserId);
            msg.decryptedText = dec;
            updated = true;
          } catch (e) {
            msg.decryptedText = "[Decryption error]";
          }
        }
      });
      await Promise.all(promises);
      if (updated) {
        useChatStore.setState({ activeChat: { ...activeChat } });
      }
    };

    decryptAll();
  }, [activeChat?.contact?.id, activeChat?.messages?.length, decryptMessage, user, keysReady]);

  // Decrypt last message previews for the sidebar inbox roster
  useEffect(() => {
    if (conversations.length === 0 || !user || !keysReady) return;

    const decryptLastMessages = async () => {
      let updated = false;
      const promises = conversations.map(async (conv) => {
        const lm = conv.lastMessage;
        if (
          conv.type === "direct" &&
          lm &&
          !lm.decryptedText &&
          lm.ciphertext &&
          lm.iv &&
          lm.iv !== "none"
        ) {
          const otherUserId = conv.contact.id;
          try {
            const dec = await decryptMessage(lm.ciphertext, lm.iv, otherUserId);
            lm.decryptedText = dec;
            updated = true;
          } catch (e) {
            lm.decryptedText = "[Encrypted]";
          }
        }
      });
      await Promise.all(promises);
      if (updated) {
        useChatStore.setState({ conversations: [...conversations] });
      }
    };

    decryptLastMessages();
  }, [conversations.length, decryptMessage, user, keysReady]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages]);

  // Send E2EE Direct Message / Group message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!messageText.trim() && !selectedFile) || !activeChat) return;

    const socketInst = socket || getSocket();
    if (!socketInst) return;

    let encryptedPayload = messageText;
    let ivString = "none";
    let mediaPayload = [];

    // Simulate file sharing payload
    if (selectedFile) {
      mediaPayload.push({
        url: selectedFile.preview || "https://picsum.photos/400",
        fileType: selectedFile.type.split("/")[0],
        name: selectedFile.name
      });
    }

    try {
      if (activeChat.type === "direct") {
        // Encrypt message client-side
        const plaintext = messageText || `Shared a file: ${selectedFile?.name}`;
        const encrypted = await encryptMessage(plaintext, activeChat.contact.id);
        encryptedPayload = encrypted.ciphertext;
        ivString = encrypted.iv;
      } else {
        // Group chats currently bypass E2EE for indexing, or can be encrypted with group keys
        encryptedPayload = messageText || `Shared a file: ${selectedFile?.name}`;
      }

      socketInst.emit("send-message", {
        senderId: user._id,
        receiverId: activeChat.type === "direct" ? activeChat.contact.id : null,
        groupId: activeChat.type === "group" ? activeChat.contact.id : null,
        ciphertext: encryptedPayload,
        iv: ivString,
        media: mediaPayload,
        replyToId: replyingTo ? replyingTo._id : null
      });

      // Clear inputs
      setMessageText("");
      setSelectedFile(null);
      setReplyingTo(null);
      // Emit stop typing
      socketInst.emit("stop-typing", {
        senderId: user._id,
        receiverId: activeChat.type === "direct" ? activeChat.contact.id : null,
        groupId: activeChat.type === "group" ? activeChat.contact.id : null
      });
    } catch (err) {
      console.error("Failed to send message:", err.message);
    }
  };

  // Keyboard Typing states
  const handleInputChange = (e) => {
    setMessageText(e.target.value);
    const socketInst = socket;
    if (!socketInst || !activeChat) return;

    if (e.target.value.trim().length > 0) {
      socketInst.emit("typing", {
        senderId: user._id,
        receiverId: activeChat.type === "direct" ? activeChat.contact.id : null,
        groupId: activeChat.type === "group" ? activeChat.contact.id : null
      });
    } else {
      socketInst.emit("stop-typing", {
        senderId: user._id,
        receiverId: activeChat.type === "direct" ? activeChat.contact.id : null,
        groupId: activeChat.type === "group" ? activeChat.contact.id : null
      });
    }
  };

  // Voice Note handling
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          setAudioChunks((prev) => [...prev, e.data]);
        }
      };
      mediaRecorder.onstop = () => {
        // Produce simulated voice note preview
        setSelectedFile({
          name: "VoiceNote.mp3",
          type: "audio/mp3",
          preview: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
        });
        setAudioChunks([]);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordIntervalRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    clearInterval(recordIntervalRef.current);
  };

  // Drag and Drop Uploads
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFile({
        name: file.name,
        type: file.type,
        preview: reader.result
      });
    };
    reader.readAsDataURL(file);
  };

  // Message Actions
  const handleAddReaction = (msgId, emoji) => {
    // Emit reaction over socket
    if (socket) {
      socket.emit("add-reaction", { msgId, userId: user._id, emoji });
    }
  };

  const handleDeleteMsg = (msgId) => {
    if (socket) {
      socket.emit("delete-message", { msgId });
    }
  };

  const handleCreateGroupChat = async (e) => {
    e.preventDefault();
    if (!groupName.trim() || selectedUsers.length === 0) return;
    try {
      const selectedMemberIds = selectedUsers.map(u => u._id);
      await createGroup(groupName, selectedMemberIds);
      setShowGroupModal(false);
      setGroupName("");
      setSelectedUsers([]);
      setMemberSearchQuery("");
      setMemberSearchResults([]);
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle contacts filtering
  const filteredConversations = conversations.filter(c => {
    const name = c.type === "group" ? c.contact.name : c.contact.username;
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Filter messages in active room
  const filteredMessages = activeChat?.messages.filter(m => 
    (m.decryptedText || m.ciphertext || "").toLowerCase().includes(searchMsgQuery.toLowerCase())
  ) || [];

  return (
    <div className="bg-slate-950 h-screen flex relative overflow-hidden font-sans border-l border-slate-900">
      
      {/* 1. Conversations Sidebar */}
      <div className="w-full md:w-[350px] flex-shrink-0 border-r border-slate-900/60 bg-slate-900/10 flex flex-col backdrop-blur-md">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <span className="font-extrabold text-lg text-slate-100 tracking-tight">Secure Vault</span>
          </div>
          <button 
            onClick={() => setShowGroupModal(true)}
            className="p-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-850 rounded-xl text-slate-350 hover:text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Search Contacts */}
        <div className="px-4 py-3 relative">
          <Search className="absolute left-7 top-6 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search chats..."
            className="w-full bg-slate-950/40 border border-slate-850 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Contacts Roster */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-950 flex flex-col justify-between">
          {loading && conversations.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">Loading conversations...</div>
          ) : (
            <>
              {/* Existing active conversations list */}
              {filteredConversations.length > 0 && (
                <div className="divide-y divide-slate-950">
                  {filteredConversations.map(conv => {
                    const isSelected = activeChat?.contact.id === conv.contact.id;
                    const isUserOnline = conv.type === "direct" && onlineUsers.includes(conv.contact.id);
                    const typers = typingUsers[conv.contact.id] || [];

                    return (
                      <div
                        key={conv.contact.id}
                        onClick={() => setActiveChat({ type: conv.type, contact: conv.contact, messages: [] })}
                        className={`flex items-center gap-3 p-4 hover:bg-slate-900/30 cursor-pointer transition-all ${
                          isSelected ? "bg-slate-900/40 border-l-2 border-cyan-400" : ""
                        }`}
                      >
                        {/* Avatar with status indicator */}
                        <div className="relative flex-shrink-0">
                          <img
                            src={conv.contact.avatar || `https://ui-avatars.com/api/?name=${conv.contact.username}`}
                            alt="avatar"
                            className="w-12 h-12 rounded-full border border-slate-800 object-cover"
                          />
                          {isUserOnline && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-slate-950" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-1">
                            <h4 className="text-sm font-bold text-slate-200 truncate">
                              {conv.type === "group" ? conv.contact.name : `@${conv.contact.username}`}
                            </h4>
                            {conv.lastMessage && (
                              <span className="text-[10px] text-slate-600">
                                {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                          
                          {typers.length > 0 ? (
                            <span className="text-[10px] text-cyan-400 font-medium animate-pulse">Typing...</span>
                          ) : (
                            <p className="text-xs text-slate-500 truncate">
                              {conv.lastMessage ? (conv.lastMessage.decryptedText || conv.lastMessage.ciphertext) : "No messages yet"}
                            </p>
                          )}
                        </div>
                        
                        {conv.unreadCount > 0 && (
                          <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center text-[10px] font-black">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Suggestions to start a conversation */}
              {suggestedUsers.length > 0 && (
                <div className="p-4 space-y-3 border-t border-slate-900/60 mt-auto bg-slate-900/5">
                  <h4 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Start a secure chat</h4>
                  <div className="space-y-2.5">
                    {suggestedUsers
                      .filter(su => !conversations.some(c => c.contact.id === su._id))
                      .slice(0, 4)
                      .map(su => (
                        <div 
                          key={su._id} 
                          onClick={() => setActiveChat({
                            type: "direct",
                            contact: {
                              id: su._id,
                              username: su.username,
                              name: su.name,
                              avatar: su.avatar
                            },
                            messages: []
                          })}
                          className="flex items-center justify-between p-2 hover:bg-slate-900/30 rounded-xl cursor-pointer transition-colors group/msg-suggest"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img src={su.avatar} className="w-8 h-8 rounded-full border border-slate-800 object-cover transition-transform group-hover/msg-suggest:scale-105" />
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-200 group-hover/msg-suggest:text-cyan-400 transition-colors truncate">@{su.username}</div>
                              <div className="text-[9px] text-slate-550 truncate">{su.name || su.profession}</div>
                            </div>
                          </div>
                          <span className="text-[9px] text-cyan-400 font-bold bg-cyan-950/20 px-2 py-0.5 rounded border border-cyan-900/30 group-hover/msg-suggest:bg-cyan-500 group-hover/msg-suggest:text-slate-950 transition-all">
                            MESSAGE
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {filteredConversations.length === 0 && suggestedUsers.length === 0 && (
                <div className="p-8 text-center text-slate-650 text-xs">No active secure sessions.</div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 2. Chat Pane */}
      {activeChat ? (
        <div 
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="flex-1 flex flex-col bg-slate-950 relative"
        >
          {/* Drag Overlay indicator */}
          <AnimatePresence>
            {isDragging && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/80 z-50 flex flex-col items-center justify-center border-4 border-dashed border-cyan-400/40 m-4 rounded-2xl backdrop-blur-sm pointer-events-none"
              >
                <Paperclip className="w-12 h-12 text-cyan-400 animate-bounce mb-2" />
                <span className="font-bold text-white">Drag files here to upload</span>
                <span className="text-xs text-slate-500 mt-1">Images, Videos, Documents</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active Chat Header */}
          <div className="h-[70px] border-b border-slate-900/60 px-6 flex items-center justify-between bg-slate-900/10 backdrop-blur-md z-10">
            <div className="flex items-center gap-3">
              <img
                src={activeChat.contact.avatar || `https://ui-avatars.com/api/?name=${activeChat.contact.username}`}
                alt="avatar"
                className="w-10 h-10 rounded-full border border-slate-800 object-cover"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-slate-200">
                    {activeChat.type === "group" ? activeChat.contact.name : `@${activeChat.contact.username}`}
                  </span>
                  {activeChat.type === "direct" && (
                    <div className="flex items-center gap-0.5 text-xs text-cyan-400 font-bold bg-cyan-950/30 px-1.5 py-0.5 rounded border border-cyan-900/40">
                      <Shield className="w-3 h-3 text-cyan-400" />
                      E2EE
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {activeChat.type === "group" ? `${activeChat.contact.members?.length || 0} members` : (onlineUsers.includes(activeChat.contact.id) ? "Online" : "Offline")}
                </p>
              </div>
            </div>

            {/* Actions (Voice/Video Call buttons) */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowSearchMsg(!showSearchMsg)}
                className="p-2 bg-slate-900/40 border border-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all"
              >
                <Search className="w-4 h-4" />
              </button>
              {activeChat.type === "direct" && (
                <>
                  <button 
                    onClick={() => startCall(activeChat.contact, "voice")}
                    className="p-2 bg-slate-900/40 border border-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => startCall(activeChat.contact, "video")}
                    className="p-2 bg-slate-900/40 border border-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all"
                  >
                    <VideoIcon className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Search Message Box overlay */}
          {showSearchMsg && (
            <div className="px-6 py-3 border-b border-slate-900 bg-slate-900/20 flex items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search in chat history..."
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-100"
                  value={searchMsgQuery}
                  onChange={(e) => setSearchMsgQuery(e.target.value)}
                />
              </div>
              <button onClick={() => { setShowSearchMsg(false); setSearchMsgQuery(""); }} className="text-slate-500 hover:text-white text-xs font-semibold">
                Close
              </button>
            </div>
          )}

          {/* Message History Feed */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {activeChat.messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 gap-3">
                <Shield className="w-10 h-10 text-cyan-500/30 animate-pulse" />
                <h4 className="font-bold text-slate-350 text-sm">Secure E2EE Chat Session</h4>
                <p className="text-xs text-slate-600 max-w-xs leading-relaxed">
                  Messages are end-to-end encrypted. Standard cryptography is verified local-side. The server stores only ciphertext payloads.
                </p>
              </div>
            ) : (
              (searchMsgQuery ? filteredMessages : activeChat.messages).map((msg) => {
                const isSelf = msg.sender._id === user._id;
                
                return (
                  <motion.div
                    key={msg._id}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className={`flex flex-col max-w-[75%] gap-1.5 ${isSelf ? "self-end items-end ml-auto" : "self-start items-start mr-auto"}`}
                  >
                    {/* Username header for group chats */}
                    {activeChat.type === "group" && !isSelf && (
                      <span className="text-[10px] text-slate-500 ml-3">@{msg.sender.username}</span>
                    )}

                    {/* Chat Bubble container */}
                    <div className="flex items-start gap-1 group relative">
                      
                      {/* Left-side action menu for self/other */}
                      {isSelf && (
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity mr-1.5 self-center">
                          <button 
                            onClick={() => setReplyingTo(msg)}
                            className="p-1 hover:bg-slate-900 rounded text-slate-500 hover:text-white transition-colors"
                          >
                            <Reply className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteMsg(msg._id)}
                            className="p-1 hover:bg-slate-900 rounded text-slate-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Actual Bubble */}
                      <div className={`p-3.5 rounded-2xl text-sm leading-relaxed backdrop-blur-md relative ${
                        isSelf 
                          ? "bg-gradient-to-tr from-cyan-500 to-cyan-600 text-slate-950 rounded-tr-none font-medium shadow-md shadow-cyan-950/20" 
                          : "bg-slate-900/60 border border-slate-850 text-slate-100 rounded-tl-none"
                      }`}>
                        {/* If reply to parent, display snippet */}
                        {msg.replyTo && (
                          <div className="mb-2 p-2 rounded-lg bg-black/20 text-xs border border-white/5 flex items-center gap-2">
                            <CornerDownRight className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[150px] opacity-80">Reference message</span>
                          </div>
                        )}

                        {/* File uploads thumbnail */}
                        {msg.media && msg.media.map((med, i) => (
                          <div key={i} className="mb-2 max-w-sm rounded-lg overflow-hidden border border-black/10">
                            {med.fileType === "image" && (
                              <img src={med.url} alt="attached image" className="max-h-40 object-cover w-full cursor-pointer hover:opacity-90" />
                            )}
                            {med.fileType === "video" && (
                              <video src={med.url} controls className="max-h-40 w-full" />
                            )}
                            {med.fileType === "audio" && (
                              <audio src={med.url} controls className="w-full scale-90" />
                            )}
                          </div>
                        ))}

                        {/* Text */}
                        <div className="break-all">
                          {msg.decryptedText || msg.ciphertext}
                        </div>

                        {/* Timestamp */}
                        <div className={`text-[9px] mt-1 text-right block ${isSelf ? "text-cyan-950/70" : "text-slate-500"}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      {/* Right-side action menu for other */}
                      {!isSelf && (
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity ml-1.5 self-center">
                          <button 
                            onClick={() => setReplyingTo(msg)}
                            className="p-1 hover:bg-slate-900 rounded text-slate-500 hover:text-white transition-colors"
                          >
                            <Reply className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                    </div>

                    {/* Message Read / Delivered Status (Only for self messages) */}
                    {isSelf && (
                      <div className="flex items-center gap-1 text-[9px] text-slate-500 mt-0.5 mr-1.5">
                        {msg.status === "sent" && <Check className="w-3 h-3" />}
                        {msg.status === "delivered" && <CheckCheck className="w-3 h-3 text-slate-500" />}
                        {msg.status === "read" && <CheckCheck className="w-3 h-3 text-cyan-400" />}
                      </div>
                    )}

                  </motion.div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Active Typing indicators */}
          {activeChat && (typingUsers[activeChat.contact.id] || []).length > 0 && (
            <div className="px-6 py-2 text-xs text-cyan-400 font-semibold animate-pulse flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              <span>Secure connection actively typing...</span>
            </div>
          )}

          {/* Replying block header */}
          {replyingTo && (
            <div className="px-6 py-2 bg-slate-900/40 border-t border-slate-850 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Reply className="w-3.5 h-3.5 text-cyan-400" />
                <span>Replying to reference message</span>
              </div>
              <button onClick={() => setReplyingTo(null)} className="text-slate-500 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* File preview block header */}
          {selectedFile && (
            <div className="px-6 py-3 bg-slate-900/40 border-t border-slate-850 flex items-center justify-between text-xs text-slate-200">
              <div className="flex items-center gap-2">
                {selectedFile.type.startsWith("image") ? <ImageIcon className="w-4 h-4 text-cyan-400" /> : <FileText className="w-4 h-4 text-purple-400" />}
                <span className="font-bold">{selectedFile.name}</span>
              </div>
              <button onClick={() => setSelectedFile(null)} className="text-slate-500 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Message Input panel */}
          <div className="p-4 border-t border-slate-900/60 bg-slate-900/10 backdrop-blur-md z-10">
            <form onSubmit={handleSendMessage} className="bg-slate-950/60 border border-slate-850 rounded-2xl px-4 py-3 flex items-center gap-3 relative">
              
              {/* File upload clicker */}
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 hover:bg-slate-900 text-slate-400 hover:text-white rounded-xl transition-colors"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length > 0) processFile(e.target.files[0]);
                }}
              />

              {/* Text Input */}
              {isRecording ? (
                <div className="flex-1 flex items-center gap-3 text-red-500 text-sm font-semibold py-2">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                  <span>Recording Voice Note ({recordingDuration}s)</span>
                  <div className="h-4 flex items-center gap-0.5 flex-1 max-w-[200px] overflow-hidden">
                    {/* Simulated recording wave */}
                    {[...Array(20)].map((_, i) => (
                      <div 
                        key={i} 
                        className="w-[2px] bg-red-500 rounded-full" 
                        style={{ height: `${Math.floor(Math.random() * 16) + 4}px` }} 
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <input
                  type="text"
                  placeholder={activeChat.type === "direct" ? "Send E2EE message..." : "Type group message..."}
                  className="flex-1 bg-transparent outline-none border-none text-sm text-slate-100 placeholder-slate-650"
                  value={messageText}
                  onChange={handleInputChange}
                />
              )}

              {/* Emoji/Voice buttons */}
              <div className="flex items-center gap-1">
                {/* Emoji toggle */}
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 hover:bg-slate-900 text-slate-400 hover:text-white rounded-xl transition-colors"
                >
                  <Smile className="w-5 h-5" />
                </button>

                {/* Voice Note Trigger */}
                {isRecording ? (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="p-2 bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                  >
                    <MicOff className="w-5 h-5 animate-pulse" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="p-2 hover:bg-slate-900 text-slate-400 hover:text-white rounded-xl transition-colors"
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                )}

                {/* Send submit button */}
                <button 
                  type="submit" 
                  disabled={!messageText.trim() && !selectedFile}
                  className="p-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 text-slate-950 font-bold rounded-xl transition-all"
                >
                  <Send className="w-4 h-4 fill-slate-950" />
                </button>
              </div>

              {/* Simple inline Emojis tray dropdown */}
              {showEmojiPicker && (
                <div className="absolute bottom-16 right-4 p-4 bg-slate-900 border border-slate-800 rounded-2xl grid grid-cols-6 gap-2.5 shadow-2xl z-20 w-56 backdrop-blur-md">
                  {["😊", "👍", "❤️", "🔥", "😂", "🎉", "😢", "🚀", "🤔", "😮", "💯", "🙏"].map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setMessageText(messageText + emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="text-lg p-1.5 hover:bg-slate-800 rounded-lg"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

            </form>
          </div>

        </div>
      ) : (
        /* 3. Empty Chat Pane */
        <div className="flex-1 flex flex-col items-center justify-center text-center bg-slate-950 p-8 relative overflow-hidden">
          <div className="absolute w-[400px] h-[400px] rounded-full bg-cyan-500/5 blur-[100px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
          <ShieldCheck className="w-16 h-16 text-slate-800 animate-pulse mb-4" />
          <h3 className="text-xl font-bold text-slate-350">Secure Chat Console</h3>
          <p className="text-sm text-slate-600 max-w-sm mt-2 leading-relaxed">
            Select a contact to derive secure ECDH credentials and start an encrypted conversation.
          </p>
        </div>
      )}

      {/* 4. Create Group Chat Dialog overlay */}
      <AnimatePresence>
        {showGroupModal && (
          <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl relative"
            >
              <div className="flex justify-between items-center border-b border-slate-850 pb-3">
                <h3 className="text-lg font-bold text-slate-100">Create Secure Group</h3>
                <button onClick={() => setShowGroupModal(false)} className="text-slate-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateGroupChat} className="space-y-4">
                <div>
                  <label className="block text-slate-400 text-xs font-semibold mb-1.5 uppercase">Group Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Design Team"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-4 text-sm text-slate-100 placeholder-slate-650 focus:outline-none focus:border-cyan-500"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-xs font-semibold mb-1.5 uppercase">Invite Members</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 pl-9 pr-4 text-sm text-slate-100 placeholder-slate-650 focus:outline-none focus:border-cyan-500"
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {/* Horizontal Selected Chips */}
                {selectedUsers.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar max-w-full">
                    {selectedUsers.map(u => (
                      <div key={u._id} className="flex items-center gap-1.5 bg-slate-950 border border-slate-850 rounded-full pl-1.5 pr-2.5 py-1 flex-shrink-0">
                        <img src={u.avatar} className="w-5 h-5 rounded-full object-cover" />
                        <span className="text-[11px] font-semibold text-slate-200">@{u.username}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedUsers(selectedUsers.filter(item => item._id !== u._id))}
                          className="text-slate-500 hover:text-red-400 ml-1 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Roster Scrollable List */}
                <div className="max-h-[180px] overflow-y-auto divide-y divide-slate-950 pr-1 space-y-1">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest pb-1">
                    {memberSearchQuery ? "Search Results" : "Suggested Contacts"}
                  </span>
                  {(memberSearchQuery ? memberSearchResults : suggestedUsers).map(su => {
                    const isSelected = selectedUsers.some(u => u._id === su._id);
                    return (
                      <div
                        key={su._id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedUsers(selectedUsers.filter(u => u._id !== su._id));
                          } else {
                            setSelectedUsers([...selectedUsers, su]);
                          }
                        }}
                        className="flex items-center justify-between p-2 hover:bg-slate-900/40 rounded-xl cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img src={su.avatar} className="w-8 h-8 rounded-full border border-slate-800 object-cover" />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-200">@{su.username}</div>
                            <div className="text-[10px] text-slate-500 truncate">{su.name}</div>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                          isSelected 
                            ? "bg-cyan-500 border-cyan-500 text-slate-950" 
                            : "border-slate-800 bg-slate-950"
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                  {(memberSearchQuery ? memberSearchResults : suggestedUsers).length === 0 && (
                    <div className="py-4 text-center text-xs text-slate-650">No users found.</div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={selectedUsers.length === 0 || !groupName.trim()}
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 disabled:opacity-30 disabled:pointer-events-none text-slate-950 font-bold text-sm rounded-xl transition-all shadow-lg shadow-cyan-950/20"
                >
                  Assemble Group ({selectedUsers.length})
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default MessagesPage;
