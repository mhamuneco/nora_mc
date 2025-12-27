# Nora AI - Intelligent Minecraft Client 🤖🇪🇬

Nora is an autonomous Minecraft bot driven by `Groq Llama-3-70b`. She acts as a **Guardian**, **Tycoon**, **Sister**, and **Teacher**.

## 🚀 Deployment Guide (Render.com)

1.  **Fork/Clone this Repo**:
    - Push this code to your GitHub account (Private Repo recommended).

2.  **Create Service on Render**:
    - Go to [Render Dashboard](https://dashboard.render.com/).
    - Click **New +** -> **Web Service**.
    - Connect your GitHub repository.

3.  **Configuration**:
    - **Runtime**: Node
    - **Build Command**: `npm install`
    - **Start Command**: `node index.js`

4.  **Environment Variables (CRITICAL)**:
    - Add the following in the "Environment" tab:
    
    | Key | Value | Description |
    | :--- | :--- | :--- |
    | `GROQ_API_KEY` | `gsk_...` | Your Groq Cloud API Key |
    | `MC_HOST` | `your.server.ip` | Minecraft Server IP |
    | `MC_PORT` | `25565` | Server Port (Default is 25565) |
    | `MC_USERNAME` | `NoraAI` | Bot Username |
    | `MC_AUTH` | `offline` | Set to `microsoft` for Premium servers |
    | `PORT` | `10000` | Required for Render Health Checks |

5.  **Deploy**:
    - Click **Create Web Service**.
    - Wait for the logs to show `[INIT] Launching Nora-OS...`.

## 🧠 Features

- **Dynamic Persona**: Switches between "Caring Sister" and "Expert Developer" based on your chat.
- **Adaptive Strategy**: Automatically farms, fights, or explores based on server plugins and danger levels.
- **Plugin Discovery**: Reads `/help` on join to learn server commands automatically.
- **Anti-AFK**: Does micro-movements to stay connected 24/7.
