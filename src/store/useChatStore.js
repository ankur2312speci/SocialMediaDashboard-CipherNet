import { create } from "zustand";
import { fetchConversations, fetchDirectMessages, fetchGroupMessages, createChatGroup } from "../services/api";

export const useChatStore = create((set, get) => ({
  conversations: [],
  activeChat: null, // { type: 'direct'|'group', contact: { id, name, username, avatar }, messages: [] }
  onlineUsers: [], // Array of online userIds
  typingUsers: {}, // Map of contactId/groupId -> array of typing usernames
  loading: false,
  error: null,

  setConversations: (conversations) => set({ conversations }),
  
  updateOnlineUsers: (onlineUsers) => set({ onlineUsers }),

  setTyping: (id, username, isTyping) => {
    set((state) => {
      const current = state.typingUsers[id] || [];
      let updated;
      if (isTyping) {
        if (current.includes(username)) return state;
        updated = [...current, username];
      } else {
        updated = current.filter(u => u !== username);
      }
      return {
        typingUsers: {
          ...state.typingUsers,
          [id]: updated
        }
      };
    });
  },

  fetchConversationsList: async () => {
    set({ loading: true });
    try {
      const data = await fetchConversations();
      set({ conversations: data, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  loadMessages: async (contactId, isGroup = false) => {
    set({ loading: true });
    try {
      let messages = [];
      if (isGroup) {
        messages = await fetchGroupMessages(contactId);
      } else {
        messages = await fetchDirectMessages(contactId);
      }
      
      set((state) => ({
        activeChat: {
          ...state.activeChat,
          messages
        },
        loading: false
      }));

      // Refresh conversations list to update unread counts
      get().fetchConversationsList();
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  addMessageToActiveChat: (message) => {
    set((state) => {
      if (!state.activeChat) return {};
      
      const isActiveMsg = 
        (state.activeChat.type === "group" && message.group === state.activeChat.contact.id) ||
        (state.activeChat.type === "direct" && 
          (message.sender._id === state.activeChat.contact.id || message.receiver?._id === state.activeChat.contact.id));

      if (isActiveMsg) {
        // Prevent duplicate loads
        if (state.activeChat.messages.some(m => m._id === message._id)) return {};
        return {
          activeChat: {
            ...state.activeChat,
            messages: [...state.activeChat.messages, message]
          }
        };
      }
      return {};
    });
    
    // Refresh conversations list to update last message and unread badge
    get().fetchConversationsList();
  },

  updateMessageStatus: (messageIds, status) => {
    set((state) => {
      if (!state.activeChat) return {};
      const updatedMessages = state.activeChat.messages.map(m => 
        messageIds.includes(m._id) ? { ...m, status } : m
      );
      return {
        activeChat: {
          ...state.activeChat,
          messages: updatedMessages
        }
      };
    });
  },

  setActiveChat: (chat) => {
    set({ activeChat: chat });
    if (chat) {
      get().loadMessages(chat.contact.id, chat.type === "group");
    }
  },

  createGroup: async (name, members, avatar) => {
    try {
      const newGroup = await createChatGroup({ name, members, avatar });
      get().fetchConversationsList();
      return newGroup;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  }
}));
