import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useFeedStore } from "../store/useFeedStore";
import { useE2EE } from "./useE2EE";

const SOCKET_URL = typeof window !== "undefined" && window.location.hostname !== "localhost"
  ? "https://socialmediadashboard-ciphernet.onrender.com"
  : "http://localhost:5000";

let socketInstance = null;

export function getSocket() {
  return socketInstance;
}

export function useSocket() {
  const { user, token } = useAuthStore();
  const { addMessageToActiveChat, updateMessageStatus, updateOnlineUsers, setOnlineStatus, setTyping, activeChat } = useChatStore();
  const { decryptMessage } = useE2EE();
  const activeChatRef = useRef(activeChat);

  // Sync activeChat state to ref for socket callback closure
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  useEffect(() => {
    if (!token || !user) {
      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
      }
      return;
    }

    if (!socketInstance) {
      console.log("WebSocket: Connecting to server...");
      socketInstance = io(SOCKET_URL, {
        auth: { token }
      });

      // 1. Join event
      socketInstance.emit("join", user._id);

      // 2. Listeners
      socketInstance.on("online-list", (list) => {
        updateOnlineUsers(list);
      });

      socketInstance.on("user-status", ({ userId, status }) => {
        useChatStore.setState((state) => {
          const current = state.onlineUsers;
          let updated = [...current];
          if (status === "online" && !updated.includes(userId)) {
            updated.push(userId);
          } else if (status === "offline") {
            updated = updated.filter(id => id !== userId);
          }
          return { onlineUsers: updated };
        });
      });

      socketInstance.on("user-typing", ({ userId, groupId }) => {
        // Find username from active chat if possible
        const id = groupId || userId;
        setTyping(id, userId === user._id ? "You" : "Someone", true);
      });

      socketInstance.on("user-stop-typing", ({ userId, groupId }) => {
        const id = groupId || userId;
        setTyping(id, userId === user._id ? "You" : "Someone", false);
      });

      // 3. Receive encrypted messages
      socketInstance.on("receive-message", async (msg) => {
        // If it is a direct message, decrypt it!
        if (msg.receiver) {
          const otherUserId = msg.sender._id === user._id ? msg.receiver._id : msg.sender._id;
          try {
            const decryptedText = await decryptMessage(msg.ciphertext, msg.iv, otherUserId);
            msg.decryptedText = decryptedText;
          } catch (e) {
            msg.decryptedText = "[Error decrypting message]";
          }
        } else {
          // Group chat is currently plaintext or handled similarly
          msg.decryptedText = msg.ciphertext;
        }

        addMessageToActiveChat(msg);

        // If the chat window with this sender is currently active, mark it as read!
        const currentActive = activeChatRef.current;
        if (
          currentActive &&
          currentActive.type === "direct" &&
          currentActive.contact.id === msg.sender._id &&
          msg.sender._id !== user._id
        ) {
          socketInstance.emit("mark-read", {
            messageIds: [msg._id],
            senderId: msg.sender._id,
            readerId: user._id
          });
        }
      });

      // Acknowledgement of sent messages
      socketInstance.on("message-sent-acknowledgment", async (msg) => {
        // Decrypt self-sent message for consistency
        if (msg.receiver) {
          const otherUserId = msg.receiver._id;
          try {
            const decryptedText = await decryptMessage(msg.ciphertext, msg.iv, otherUserId);
            msg.decryptedText = decryptedText;
          } catch (e) {
            msg.decryptedText = msg.ciphertext;
          }
        }
        addMessageToActiveChat(msg);
      });

      // Read updates
      socketInstance.on("messages-read-update", ({ messageIds, readerId }) => {
        updateMessageStatus(messageIds, "read");
      });

      // Real-time Social Feeds
      socketInstance.on("post-liked-update", ({ postId, userId, isLiked }) => {
        useFeedStore.getState().likePostFromSocket(postId, userId, isLiked);
      });

      socketInstance.on("post-commented-update", ({ postId, comment }) => {
        useFeedStore.getState().commentPostFromSocket(postId, comment);
      });

      socketInstance.on("user-followed-update", () => {
        useChatStore.getState().fetchConversationsList();
      });

      // Receive notifications
      socketInstance.on("receive-notification", (notif) => {
        // Inject into global notification store / list
        console.log("Real-time notification received:", notif);
        // We can dispatch simple browser notifications or toast popups
        useChatStore.getState().fetchConversationsList();
      });
    }

    return () => {
      // Keep socket open unless log out to support background events like calls/messages
    };
  }, [token, user, decryptMessage]);

  return socketInstance;
}
