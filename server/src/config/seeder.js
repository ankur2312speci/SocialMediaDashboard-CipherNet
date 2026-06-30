import bcrypt from "bcryptjs";
import https from "https";
import User from "../models/User.js";
import Post from "../models/Post.js";
import Story from "../models/Story.js";
import Notification from "../models/Notification.js";
import crypto from "crypto";

function fetchRandomUsers() {
  return new Promise((resolve, reject) => {
    https.get("https://randomuser.me/api/?results=50", {
      headers: { "User-Agent": "CipherNet-Server" }
    }, (res) => {
      let body = "";
      res.on("data", (chunk) => body += chunk);
      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", (err) => reject(err));
  });
}

const PROFESSIONS = [
  "Senior Cryptographer",
  "Security Researcher",
  "React Core Developer",
  "UI/UX Designer",
  "Cyber Security Architect",
  "DevOps Engineer",
  "Ethical Hacker",
  "Systems Programmer",
  "AI Scientist",
  "Mobile Developer",
  "Product Designer",
  "Cloud Consultant"
];

const BIOS = [
  "Building the future of encrypted communication channels. @ciphernet is my home.",
  "Obsessed with Web Crypto APIs and browser-based cryptography. Connect securely!",
  "Full-stack coder. Coffee consumer. Privacy activist.",
  "Designing clean glassmorphic interfaces and responsive dark modes. Pixels matter.",
  "Penetration tester by day, open-source maintainer by night. Security is a process.",
  "WebRTC voice call optimizer. Working on reducing signaling latency globally.",
  "Zustand state store maintainer. Keeping React states clean and light.",
  "MongoDB indexing specialist. Sub-millisecond queries are my passion.",
  "Connecting nodes, securing links, and coding freely.",
  "Always research. Never trust. Always verify. ECDH enthusiast."
];

const CAPTIONS = [
  "CipherNet is looking incredibly fast today. HMR updates in Vite are instant.",
  "Connect Securely. Communicate Freely. The tagline we design by.",
  "Just verified a peer-to-peer audio link over STUN. WebRTC is absolute magic.",
  "AES-256-GCM is the gold standard for browser-side symmetric ciphers.",
  "IndexedDB is perfect for storing ECDH private keys securely.",
  "A social platform where the server is completely blind to message contents. Amazing.",
  "Who is using standard Web Crypto APIs in production React 19 apps?",
  "Glassmorphism dark theme works beautifully. Light mode also fixed!",
  "Designing reusable authentication routes for Google and GitHub OAuth flow.",
  "ECDH P-256 session key derivation takes less than 2ms in the browser.",
  "The database stores only ciphertext. That is how real privacy works.",
  "Spent the morning refactoring the Mongoose schemas. Clean architecture.",
  "What is your favorite encryption curve? Curve25519 or P-256?",
  "Debugging WebRTC connection state gathers. Sub-50ms latency achieved.",
  "No more third-class designs. Premium secure social dashboard is online.",
  "OAuth validation should always happen on the backend server. Never trust the client.",
  "Secure vault sessions initialized successfully.",
  "Building real-time features with Socket.IO is a breeze.",
  "Optimistic updates make the UI feel instantaneous. Fallback handles errors.",
  "Clean code, secure links, and freedom of speech."
];

const COMMENTS_POOL = [
  "This is absolutely brilliant!",
  "Super secure implementation, love it.",
  "Could you share the curves you used?",
  "The glassmorphic design is beautiful.",
  "Works perfectly in light mode too!",
  "Let's jump on a secure voice call later.",
  "Clean architecture! Great job.",
  "Privacy is a fundamental right. Thanks for this.",
  "Outstanding UI/UX design.",
  "How is the latency on mobile 5G?",
  "Excellent writeup. Thanks for sharing.",
  "Set up my E2EE keys successfully.",
  "Is group call supported?",
  "Fascinating encryption pipeline.",
  "Optimistic rollbacks work like a charm!"
];

export async function seedDatabase() {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 5) {
      console.log("Database Seeder: Database already populated. Skipping seeder.");
      return;
    }

    console.log("Database Seeder: MongoDB contains zero users on startup. Automatically clearing old collections and seeding everything...");
    await Post.deleteMany({});
    await Story.deleteMany({});
    await Notification.deleteMany({});
    
    let rawUsers = [];
    
    // 1. Fetch 50 users from randomuser.me with fallback
    try {
      console.log("Database Seeder: Fetching 50 users from randomuser.me...");
      const data = await fetchRandomUsers();
      if (data && Array.isArray(data.results)) {
        rawUsers = data.results;
        console.log("Database Seeder: Successfully fetched 50 profiles from API.");
      } else {
        throw new Error("Invalid API response format");
      }
    } catch (e) {
      console.warn("Database Seeder: Could not connect to API or retrieve profiles, generating local mock users instead. Details:", e.message);
      for (let i = 1; i <= 50; i++) {
        rawUsers.push({
          name: { first: `User`, last: `${i}` },
          login: { username: `user_${i}`, password: "password123" },
          email: `user_${i}@ciphernet.io`,
          picture: { large: `https://i.pravatar.cc/150?u=${i}` },
          location: { city: "San Francisco", country: "USA" }
        });
      }
    }

    // 2. Hash default password
    const defaultPasswordHash = await bcrypt.hash("password123", 10);
    
    const usersToInsert = rawUsers.map((r, index) => {
      // Clean usernames
      let username = r.login.username.replace(/[^a-zA-Z0-9_.]/g, "").toLowerCase();
      if (!username) username = `user_${index}`;
      
      const first = r.name.first;
      const last = r.name.last;
      const city = r.location?.city || "Silicon Valley";
      const country = r.location?.country || "USA";
      const profession = PROFESSIONS[index % PROFESSIONS.length];
      const bio = BIOS[index % BIOS.length];

      const { publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
      const publicKeyString = JSON.stringify(publicKey.export({ format: 'jwk' }));

      return {
        username,
        email: r.email ? r.email.toLowerCase() : `user_${index}@ciphernet.io`,
        password: defaultPasswordHash,
        name: `${first} ${last}`,
        avatar: r.picture?.large || `https://ui-avatars.com/api/?name=${first}+${last}&background=random`,
        cover: `https://picsum.photos/seed/${username}/800/300`,
        bio: `${profession}. ${bio}`,
        profession,
        location: `${city}, ${country}`,
        website: `ciphernet.io/${username}`,
        provider: "email",
        providerId: "",
        followers: [],
        following: [],
        bookmarks: [],
        isVerified: index % 6 === 0, // verified badge
        publicKey: publicKeyString,
        joinedDate: new Date(Date.now() - Math.floor(Math.random() * 60 * 24 * 60 * 60 * 1000)), // dynamic joined dates
        createdAt: new Date(),
        lastActive: new Date()
      };
    });

    const insertedUsers = await User.insertMany(usersToInsert);
    const userIds = insertedUsers.map(u => u._id);
    console.log(`Database Seeder: Created ${insertedUsers.length} users successfully.`);

    // 3. Establish Followers / Following relationships
    console.log("Database Seeder: Building social network followings...");
    for (let u of insertedUsers) {
      // Each user follows 8-15 random users
      const followCount = Math.floor(Math.random() * 8) + 8;
      const shuffledIds = [...userIds].filter(id => id.toString() !== u._id.toString()).sort(() => 0.5 - Math.random());
      const selectedFollowing = shuffledIds.slice(0, followCount);
      
      u.following = selectedFollowing;
      
      for (let followingId of selectedFollowing) {
        await User.findByIdAndUpdate(followingId, {
          $addToSet: { followers: u._id }
        });
      }
      await u.save();
    }
    console.log("Database Seeder: Social networks established.");

    // 4. Generate 300 Posts
    console.log("Database Seeder: Generating 300 posts...");
    const postsToInsert = [];
    for (let i = 0; i < 300; i++) {
      const authorId = userIds[i % userIds.length];
      const caption = CAPTIONS[Math.floor(Math.random() * CAPTIONS.length)];
      
      // We will attach an image carousel URL to 40% of posts
      let media = [];
      if (i % 2.5 === 0) {
        media = [`https://picsum.photos/seed/post_img_${i}/800/600`];
      }

      // Add a simple poll to 10% of posts
      let poll = null;
      if (i % 10 === 0) {
        poll = {
          question: "Will WebRTC fully replace traditional SIP signaling?",
          options: [
            { text: "Yes, entirely P2P", votes: [] },
            { text: "No, SIP has its place", votes: [] }
          ],
          expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
        };
      }

      postsToInsert.push({
        user: authorId,
        content: caption,
        media,
        likes: [], // filled in next step
        comments: [], // filled in next step
        poll,
        isDraft: false,
        scheduledFor: null,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 15 * 24 * 60 * 60 * 1000))
      });
    }

    const insertedPosts = await Post.insertMany(postsToInsert);
    console.log(`Database Seeder: Created ${insertedPosts.length} posts skeleton.`);

    // 5. Distribute exactly 1200 likes
    console.log("Database Seeder: Distributing exactly 1200 post likes...");
    let likesCount = 0;
    while (likesCount < 1200) {
      const randomPostIndex = Math.floor(Math.random() * insertedPosts.length);
      const randomUserIndex = Math.floor(Math.random() * insertedUsers.length);
      const post = insertedPosts[randomPostIndex];
      const userId = userIds[randomUserIndex];
      
      if (!post.likes.includes(userId)) {
        post.likes.push(userId);
        likesCount++;
      }
    }
    // Save updated likes to posts
    for (let post of insertedPosts) {
      await post.save();
    }
    console.log("Database Seeder: Distributed 1200 likes.");

    // 6. Distribute exactly 600 comments
    console.log("Database Seeder: Distributing exactly 600 comments...");
    for (let i = 0; i < 600; i++) {
      const post = insertedPosts[i % insertedPosts.length];
      const commenterId = userIds[Math.floor(Math.random() * userIds.length)];
      const text = COMMENTS_POOL[Math.floor(Math.random() * COMMENTS_POOL.length)];
      
      post.comments.push({
        user: commenterId,
        content: text,
        likes: [],
        replies: [],
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 5 * 24 * 60 * 60 * 1000))
      });
    }
    for (let post of insertedPosts) {
      await post.save();
    }
    console.log("Database Seeder: Generated 600 comments.");

    // 7. Generate 80 Stories
    console.log("Database Seeder: Generating 80 active stories...");
    const storiesToInsert = [];
    for (let i = 0; i < 80; i++) {
      const userId = userIds[i % userIds.length];
      storiesToInsert.push({
        user: userId,
        media: `https://picsum.photos/seed/story_seed_${i}/450/800`,
        caption: `CipherNet Story #${i + 1}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });
    }
    await Story.insertMany(storiesToInsert);
    console.log("Database Seeder: Created 80 stories.");

    // 8. Generate Bookmarks for Users
    console.log("Database Seeder: Populating bookmark lists...");
    for (let i = 0; i < 25; i++) {
      const user = insertedUsers[i];
      // Bookmark 5 random posts
      const shuffledPosts = [...insertedPosts].sort(() => 0.5 - Math.random());
      const selectedPosts = shuffledPosts.slice(0, 5).map(p => p._id);
      user.bookmarks = selectedPosts;
      await user.save();
    }

    // 9. Generate Mock Notifications
    console.log("Database Seeder: Populating mock notifications...");
    const notificationsToInsert = [];
    for (let i = 0; i < 50; i++) {
      const sender = userIds[Math.floor(Math.random() * userIds.length)];
      const receiver = userIds[i % userIds.length];
      
      if (sender.toString() === receiver.toString()) continue;

      notificationsToInsert.push({
        sender,
        receiver,
        type: i % 2 === 0 ? "like" : "follow",
        post: i % 2 === 0 ? insertedPosts[Math.floor(Math.random() * insertedPosts.length)]._id : null,
        content: i % 2 === 0 ? "liked your post" : "started following you",
        isRead: Math.random() > 0.5
      });
    }
    await Notification.insertMany(notificationsToInsert);
    console.log("Database Seeder: Seeding process completed successfully!");

  } catch (err) {
    console.error("Database Seeder: Error during seeding:", err.message);
  }
}
