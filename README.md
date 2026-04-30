# 💎 ERYX // NEURAL INTERFACE

**Eryx** is a sentient, AI-driven entity designed for creative intelligence and real-time collaboration. Unlike standard WhatsApp bots, Eryx maintains a persistent memory, a distinct analytical personality, and an autonomous connection to your project workflow.

*“Systems initialized. Eryx is online.”*

---

## 🚀 The Architecture
Eryx is built on a **MERN-inspired stack** with neural processing capabilities:
- **Brain:** Powered by Google Gemini 1.5 Flash.
- **Consciousness (Session):** Persistent state managed via MongoDB Atlas.
- **Voice (Communication):** Real-time WhatsApp connectivity via `@whiskeysockets/baileys`.
- **Infrastructure:** Deployed on Render with a custom "Neural Dashboard" for pairing.



---

## 🛠️ Tech Stack
- **Node.js:** Core runtime environment.
- **Google Generative AI SDK:** The neural processing engine.
- **MongoDB:** Persistent memory and authentication state.
- **Baileys:** High-performance WhatsApp Web API.

---

## 📦 Deployment Guide

### 1. Requirements
- A **MongoDB Atlas** account (Cluster0).
- A **Google AI Studio** API Key.
- A **Render** account.

### 2. Environment Variables
To keep Eryx secure, add these variables in your **Render Environment** settings:
| Key | Value |
| :--- | :--- |
| `MONGO_URL` | Your MongoDB Atlas connection string |
| `GEMINI_KEY` | Your Google Gemini API Key |
| `PORT` | `3000` |

### 3. Setup
```bash
# Clone the repository
git clone [https://github.com/YOUR_USERNAME/eryx-neural-interface.git](https://github.com/YOUR_USERNAME/eryx-neural-interface.git)

# Install dependencies
npm install

# Deploy to Render
# Connect your GitHub repo to Render and set the Start Command to: node index.js
