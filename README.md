# CipherNet: Connect Securely. Communicate Freely.

CipherNet is a modern, premium, client-side end-to-end encrypted (E2EE) social platform designed for secure communication, real-time messaging, and high-fidelity peer-to-peer voice and video calls. It features a stunning glassmorphic UI, dynamic charts, persistent user settings, and real-time interaction feeds.

---

## 🛡️ Core Security Architecture (E2EE)

CipherNet prioritizes cybersecurity engineering by performing all cryptographic ciphering locally in the browser:
*   **Asymmetric Key Negotiation**: Upon first signup or login, the client generates an **ECDH P-256** key pair using standard browser Web Crypto APIs.
*   **Secure Hardware-backed Storage**: The private key is saved offline inside the browser's local **IndexedDB** database (`CipherNetE2EE`) and is never sent to the network.
*   **Diffie-Hellman Key Exchange**: When initiating a direct chat, the client pulls the contact's public key JWK string from MongoDB, performs a Diffie-Hellman key agreement against the user's private key, hashes the result, and derives a shared **AES-256 symmetric session key**.
*   **AES-256-GCM Encryption**: Messages are encrypted using AES-256-GCM with a unique 12-byte initialization vector (IV) before broadcasting. MongoDB stores only random bytes (ciphertext) and IVs, keeping the backend completely blind to message contents.

---

## ⚡ Key Features

*   **Real-time Encrypted Chat**: Dynamic typing flags, delivery/read checkmarks, voice note waveforms, and instant media drops.
*   **WebRTC P2P Voice & Video Calls**: Secure connections using STUN NAT traversals with incoming/outgoing ring screens, and picture-in-picture floating widgets.
*   **Instagram-style Likes & Feed**: Fast, database-backed optimistic UI updates.
*   **Unified Comments Engine**: Supports adding comments, replying to comment threads, editing, and deleting comments.
*   **Follow Network**: Follow users to populate feeds dynamically and view mutual lists.
*   **Saved Bookmarks**: Pin posts to profile boards, persisting forever across page reloads.
*   **Automatic Database Seeder**: Generates 100 random user accounts, 500 tech posts, and 1000 comments automatically on first connection to MongoDB.
*   **Creator Analytics**: View dynamic area and bar charts tracking weekly follower trends and engagement statistics.
*   **Dynamic Theme Persistence**: Choose between sleek glassmorphic Dark and Light themes.

---

## 🛠️ Installation & Setup

### Prerequisites
*   Node.js (v18+)
*   MongoDB (running locally on port `27017` or using a URI in `.env`)

### 1. Backend Server Setup
Navigate to the `/server` directory, configure your variables, and run the server:
```bash
cd server
npm install
npm start
```
*The server will connect to MongoDB and automatically seed 100 users, 500 posts, and comments on the first run.*

### 2. Frontend Client Setup
From the project root directory:
```bash
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🚀 Technology Stack
*   **Frontend**: React, Vite, Tailwind CSS v4, Framer Motion, Zustand, Socket.IO Client, Recharts, Lucide Icons.
*   **Backend**: Node.js, Express, MongoDB, Mongoose, Socket.IO Server, Helmet, CORS, Express-Rate-Limit.
