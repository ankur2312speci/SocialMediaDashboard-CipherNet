import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import https from "https";
import User from "../models/User.js";
import { authenticateJWT } from "../middleware/auth.js";
import { seedDatabase } from "../config/seeder.js";

const router = express.Router();

// Generate JWT Access and Refresh Tokens
function generateTokens(user) {
  const payload = { id: user._id, username: user.username, email: user.email };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET || "default_jwt_secret", { expiresIn: "1h" });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET || "default_refresh_secret", { expiresIn: "7d" });
  return { accessToken, refreshToken };
}

// Native Node HTTPS GET requester wrapper
function makeHttpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(url);
      const reqOptions = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: options.method || "GET",
        headers: {
          "User-Agent": "CipherNet-Server",
          ...options.headers
        }
      };

      const req = https.request(reqOptions, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const contentType = res.headers["content-type"] || "";
            if (contentType.includes("application/json")) {
              resolve(JSON.parse(data));
            } else {
              resolve(data);
            }
          } catch (err) {
            resolve(data);
          }
        });
      });

      req.on("error", (err) => reject(err));
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

// Native Node HTTPS POST requester wrapper (for Form/URL-encoded OAuth token exchanges)
function oauthHttpsPost(url, bodyParams = {}) {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(url);
      const postData = new URLSearchParams(bodyParams).toString();

      const options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(postData),
          "User-Agent": "CipherNet-Server",
          Accept: "application/json"
        }
      };

      const req = https.request(options, (res) => {
        let responseString = "";
        res.on("data", (chunk) => {
          responseString += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(responseString));
          } catch (e) {
            resolve(responseString);
          }
        });
      });

      req.on("error", (err) => reject(err));
      req.write(postData);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

// Helper to generate a unique username from email
async function generateUniqueUsername(email, name = "") {
  let baseUsername = email.split("@")[0].replace(/[^a-zA-Z0-9_.]/g, "").toLowerCase();
  if (!baseUsername && name) {
    baseUsername = name.replace(/[^a-zA-Z0-9_.]/g, "").toLowerCase();
  }
  if (!baseUsername) baseUsername = "user";

  let username = baseUsername;
  let count = 1;
  while (true) {
    const existing = await User.findOne({ username });
    if (!existing) return username;
    username = `${baseUsername}${count}`;
    count++;
  }
}

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { username, email, password, name } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ error: "Username or Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      name: name || username,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name || username)}&background=7C3AED`,
      cover: `https://picsum.photos/seed/${encodeURIComponent(username)}/800/300`
    });

    await newUser.save();

    const { accessToken, refreshToken } = generateTokens(newUser);

    const userResponse = newUser.toObject();
    delete userResponse.password;

    res.status(201).json({
      message: "Registration successful",
      user: userResponse,
      accessToken,
      refreshToken
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { loginKey, password } = req.body;

    if (!loginKey || !password) {
      return res.status(400).json({ error: "Missing credentials" });
    }

    const user = await User.findOne({
      $or: [{ email: loginKey.toLowerCase() }, { username: loginKey }]
    });

    if (!user || !user.password) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const { accessToken, refreshToken } = generateTokens(user);

    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      message: "Login successful",
      user: userResponse,
      accessToken,
      refreshToken
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// REFRESH TOKEN
router.post("/refresh-token", (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ error: "Refresh token required" });
  }

  jwt.verify(refreshToken, REFRESH_SECRET, async (err, payload) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired refresh token" });
    }

    try {
      const user = await User.findById(payload.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const tokens = generateTokens(user);
      res.json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});

// ========================================================
// REAL GOOGLE OAUTH 2.0 FLOWS
// ========================================================

// 1. Google Auth Redirect Route
router.get("/google", (req, res) => {
  const host = req.get("host");
  const protocol = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
  
  // Auto-resolve callback URI based on runtime environment
  const redirectUri = host.includes("localhost")
    ? "http://localhost:5000/api/auth/google/callback"
    : "https://ciphernet-api.onrender.com/api/auth/google/callback";

  const googleUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=profile%20email`;
  
  console.log(`OAuth: Initiating Google redirect code grant -> ${redirectUri}`);
  res.redirect(googleUrl);
});

// 2. Google OAuth Callback Handler
router.get("/google/callback", async (req, res) => {
  const { code } = req.query;
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

  if (!code) {
    return res.redirect(`${clientUrl}/auth?error=google_auth_failed`);
  }

  try {
    const host = req.get("host");
    const redirectUri = host.includes("localhost")
      ? "http://localhost:5000/api/auth/google/callback"
      : "https://ciphernet-api.onrender.com/api/auth/google/callback";

    // Exchange auth code for google access/id token
    const tokenResponse = await oauthHttpsPost("https://oauth2.googleapis.com/token", {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri
    });

    if (!tokenResponse || !tokenResponse.access_token) {
      console.error("Google token exchange error:", tokenResponse);
      return res.redirect(`${clientUrl}/auth?error=token_exchange_failed`);
    }

    // Retrieve userinfo profile using access token
    const profile = await makeHttpsRequest(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${tokenResponse.access_token}`);
    
    if (!profile || !profile.email) {
      console.error("Failed to fetch Google profile details:", profile);
      return res.redirect(`${clientUrl}/auth?error=profile_fetch_failed`);
    }

    const sub = profile.sub;
    const email = profile.email;
    const name = profile.name;
    const picture = profile.picture;

    // Check if user already exists
    let user = await User.findOne({ $or: [{ providerId: sub }, { email: email.toLowerCase() }] });

    if (user) {
      user.provider = "google";
      user.providerId = sub;
      if (!user.avatar) user.avatar = picture;
      user.lastActive = new Date();
      await user.save();
    } else {
      const username = await generateUniqueUsername(email, name);
      user = new User({
        username,
        email: email.toLowerCase(),
        name: name || username,
        avatar: picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || username)}&background=7C3AED`,
        cover: `https://picsum.photos/seed/${username}/800/300`,
        bio: "Connect Securely. Communicate Freely. E2EE secure channels ready.",
        profession: "Developer Specialist",
        location: "Silicon Valley, CA",
        provider: "google",
        providerId: sub,
        followers: [],
        following: [],
        bookmarks: [],
        publicKey: "",
        joinedDate: new Date()
      });
      await user.save();
    }

    const { accessToken, refreshToken } = generateTokens(user);
    
    // Redirect back to SPA with query tokens
    res.redirect(`${clientUrl}/?token=${accessToken}&refreshToken=${refreshToken}`);
  } catch (err) {
    console.error("Google Auth Exception:", err.message);
    res.redirect(`${clientUrl}/auth?error=google_server_error`);
  }
});

// ========================================================
// REAL GITHUB OAUTH FLOWS
// ========================================================

// 1. GitHub Auth Redirect Route
router.get("/github", (req, res) => {
  const host = req.get("host");
  const redirectUri = host.includes("localhost")
    ? "http://localhost:5000/api/auth/github/callback"
    : "https://ciphernet-api.onrender.com/api/auth/github/callback";

  const githubUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email`;
  
  console.log(`OAuth: Initiating GitHub redirect code grant -> ${redirectUri}`);
  res.redirect(githubUrl);
});

// 2. GitHub OAuth Callback Handler
router.get("/github/callback", async (req, res) => {
  const { code } = req.query;
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

  if (!code) {
    return res.redirect(`${clientUrl}/auth?error=github_auth_failed`);
  }

  try {
    const host = req.get("host");
    const redirectUri = host.includes("localhost")
      ? "http://localhost:5000/api/auth/github/callback"
      : "https://ciphernet-api.onrender.com/api/auth/github/callback";

    // Exchange auth code for access token
    const tokenResponse = await oauthHttpsPost("https://github.com/login/oauth/access_token", {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri
    });

    if (!tokenResponse || !tokenResponse.access_token) {
      console.error("GitHub token exchange error:", tokenResponse);
      return res.redirect(`${clientUrl}/auth?error=token_exchange_failed`);
    }

    const accessToken = tokenResponse.access_token;

    // Fetch user profile info
    const githubUser = await makeHttpsRequest("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!githubUser || !githubUser.login) {
      console.error("Failed to fetch GitHub profile:", githubUser);
      return res.redirect(`${clientUrl}/auth?error=profile_fetch_failed`);
    }

    // Retrieve emails if private
    if (!githubUser.email) {
      const emails = await makeHttpsRequest("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      if (Array.isArray(emails)) {
        const primaryEmail = emails.find(e => e.primary && e.verified);
        if (primaryEmail) {
          githubUser.email = primaryEmail.email;
        } else if (emails.length > 0) {
          githubUser.email = emails[0].email;
        }
      }
    }

    if (!githubUser.email) {
      githubUser.email = `${githubUser.login}@github.ciphernet.io`;
    }

    const sub = githubUser.id.toString();
    const email = githubUser.email;
    const name = githubUser.name || githubUser.login;
    const avatar = githubUser.avatar_url;

    // Check if user already exists
    let user = await User.findOne({ $or: [{ providerId: sub }, { email: email.toLowerCase() }] });

    if (user) {
      user.provider = "github";
      user.providerId = sub;
      if (!user.avatar) user.avatar = avatar;
      user.lastActive = new Date();
      await user.save();
    } else {
      const username = await generateUniqueUsername(email, name);
      user = new User({
        username,
        email: email.toLowerCase(),
        name,
        avatar: avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=06B6D4`,
        cover: `https://picsum.photos/seed/${username}/800/300`,
        bio: "Connect Securely. Communicate Freely. GitHub OAuth Account.",
        profession: "Software Specialist",
        location: "San Francisco, CA",
        provider: "github",
        providerId: sub,
        followers: [],
        following: [],
        bookmarks: [],
        publicKey: "",
        joinedDate: new Date()
      });
      await user.save();
    }

    const tokens = generateTokens(user);
    
    // Redirect back to SPA with query tokens
    res.redirect(`${clientUrl}/?token=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`);
  } catch (err) {
    console.error("GitHub Auth Exception:", err.message);
    res.redirect(`${clientUrl}/auth?error=github_server_error`);
  }
});

// LOGOUT
router.post("/logout", (req, res) => {
  res.json({ message: "Logout successful" });
});

// ME (Fetch current profile)
router.get("/me", authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
