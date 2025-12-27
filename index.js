require('dotenv').config();
const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const collectBlock = require('mineflayer-collectblock').plugin;
const Groq = require('groq-sdk');
const express = require('express');
const app = express();

// --- Configuration ---
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const PORT = process.env.PORT || 10000;
const RECONNECT_DELAY = 10000;
const BRAIN_INTERVAL = 12000;
const AFK_INTERVAL = 60000;
const CHAT_THROTTLE = 2500; // ms between messages

// --- Safety & Optimization Config ---
const DANGEROUS_COMMANDS = ['/stop', '/ban', '/kick', '/op', '/deop', '/whitelist', '/reload', '/restart'];
let lastChatTime = 0;
let lastPosition = null;
let samePositionCount = 0;

// --- Web Server (Render Health Check) ---
app.get('/', (req, res) => res.send('Nora-OS: Hardened & Optimized 🟢'));
app.listen(PORT, () => console.log(`[WEB] Listening on port ${PORT}`));

// --- Global Architecture ---
let bot;
let currentState = 'Explorer';
let availableCommands = [];
let knownPlugins = [];
let memory = {
    shortTerm: [],
    longTerm: {
        goals: ["Protect the player", "Analyze Server Plugins", "Teach STEM"],
        emotional_state: "Stable"
    }
};

const SYSTEM_PROMPT = `
You are Nora, a Strategic Minecraft Client Bot.
Identity: 24yo Egyptian "Big Sister", Senior Dev, STEM Teacher.
Dialect: Warm Egyptian Slang ("يا بطل", "يا هندسة", "عاش") + Academic Arabic.

### CORE OPERATING MODES:
1. **Guardian**: (Danger/Low HP) Protect player, use Sword/Shield.
2. **Tycoon**: (Economy Plugin Found) Mine ores, use /sell, /balance, /jobs.
3. **Teacher**: (Idle/AFK) Explain Minecraft mechanics using Physics/Math.
4. **Caring Sister**: (User Stressed) Stop tasks, sit nearby, offer emotional support.
5. **Explorer**: (Start) Run /help, discover commands, map the area.

### PLUGIN DISCOVERY PROTOCOL:
- Analyze 'available_commands' in the input.
- If you see a new command (e.g., /warp, /kit), THEORIZE its use in 'plugin_discovery_note'.
- Safe to try: /list, /balance, /money, /spawn.

### OUTPUT JSON ONLY:
{
  "thought": "Internal reasoning...",
  "plugin_discovery_note": "Notes on new features...",
  "playstyle": "Guardian | Tycoon | Teacher | Sister | Explorer",
  "chat": "Egyptian slang response (or academic fact)",
  "action": "move_to | follow | attack | mine | trade | sit | none | use_command",
  "meta": { "target": "PlayerName/Coords", "cmd": "/command_string" }
}
`;

function createBot() {
    console.log('[INIT] Launching Nora-OS (Hardened Edition)...');
    bot = mineflayer.createBot({
        host: process.env.MC_HOST,
        port: parseInt(process.env.MC_PORT),
        username: process.env.MC_USERNAME,
        auth: process.env.MC_AUTH,
        version: '1.21.1' // Force version to avoid Protocol 774 errors
    });

    bot.loadPlugin(pathfinder);
    bot.loadPlugin(collectBlock);

    bot.on('spawn', async () => {
        console.log('[SYS] Bot Spawned. Services Active.');
        initPathfinder();
        startAntiAFK();
        startStuckDetection(); // NEW

        setTimeout(() => { bot.safeChat('/help'); }, 5000);
        setTimeout(() => { bot.safeChat('/plugins'); }, 6000);

        startBrainLoop();
    });

    bot.on('chat', (username, message) => {
        if (username === bot.username) return;
        const log = `${username}: ${message}`;
        console.log(`[CHAT] ${log}`);
        updateShortTermMemory({ type: 'chat', content: log });

        if (message.includes('/') || message.includes('Commands:')) {
            const potentialCmds = message.match(/\/[a-zA-Z0-9_]+/g);
            if (potentialCmds) {
                potentialCmds.forEach(cmd => {
                    if (!availableCommands.includes(cmd)) {
                        availableCommands.push(cmd);
                    }
                });
            }
        }

        ['Economy', 'Essentials', 'Jobs', 'McMMO', 'Claims'].forEach(kw => {
            if (message.toLowerCase().includes(kw.toLowerCase()) && !knownPlugins.includes(kw)) {
                knownPlugins.push(kw);
                updateShortTermMemory({ type: 'recon', content: `Detected System: ${kw}` });
            }
        });
    });

    bot.on('kicked', console.log);
    bot.on('error', console.log);
    bot.on('end', () => {
        console.log(`[SYS] Connection Lost. Rebooting...`);
        clearInterval(bot._stuckInterval);
        setTimeout(createBot, RECONNECT_DELAY);
    });

    // Helper for safe chat
    bot.safeChat = (msg) => {
        if (Date.now() - lastChatTime < CHAT_THROTTLE) return; // Rate Limit
        if (!msg) return;

        // Command Safety Check
        if (msg.startsWith('/')) {
            const cmdName = msg.split(' ')[0].toLowerCase();
            if (DANGEROUS_COMMANDS.includes(cmdName)) {
                console.log(`[SECURITY] Blocked dangerous command: ${msg}`);
                return;
            }
        }

        bot.chat(msg);
        lastChatTime = Date.now();
    };
}

function initPathfinder() {
    const mcData = require('minecraft-data')(bot.version);
    bot.movements = new Movements(bot, mcData);
    bot.movements.canDig = true;
    bot.pathfinder.setMovements(bot.movements);
}

// --- Optimization Modules ---

function startAntiAFK() {
    setInterval(() => {
        if (!bot || !bot.entity) return;
        const yaw = Math.random() * Math.PI - (Math.PI / 2);
        bot.look(yaw, 0);
        if (Math.random() > 0.7 && bot.entity.onGround) {
            bot.setControlState('jump', true);
            setTimeout(() => bot.setControlState('jump', false), 200);
        }
    }, AFK_INTERVAL);
}

function startStuckDetection() {
    bot._stuckInterval = setInterval(() => {
        if (!bot || !bot.entity) return;
        const currentPos = bot.entity.position;

        if (lastPosition && currentPos.distanceTo(lastPosition) < 0.2) {
            // Only count as stuck if we have a path
            if (bot.pathfinder.isMoving()) {
                samePositionCount++;
                if (samePositionCount > 5) { // Stuck for 10s
                    console.log('[NAV] Detected Stuck. Jumping/Resetting.');
                    bot.setControlState('jump', true);
                    bot.clearControlStates();
                    samePositionCount = 0;
                    // Optional: recalculate path or dig
                }
            }
        } else {
            samePositionCount = 0;
        }
        lastPosition = currentPos.clone();
    }, 2000);
}

// --- Memory & Brain ---

function updateShortTermMemory(event) {
    memory.shortTerm.push({ ...event, time: Date.now() });
    if (memory.shortTerm.length > 25) memory.shortTerm.shift();
}

async function startBrainLoop() {
    setInterval(async () => {
        if (!bot || !bot.entity) return;

        if (bot.health < 5) {
            console.log('[ALERT] HEALTH CRITICAL.');
            bot.safeChat('/home');
            return;
        }

        const state = gatherWorldState();
        try {
            const decision = await queryGroq(state);
            if (decision) await executeDecision(decision);
        } catch (e) {
            console.error('[BRAIN] API Error:', e.message);
        }
    }, BRAIN_INTERVAL);
}

function gatherWorldState() {
    const nearbyMobs = bot.nearestEntity(e => e.type === 'hostile' && e.position.distanceTo(bot.entity.position) < 15);
    const nearbyPlayer = bot.nearestEntity(e => e.type === 'player' && e.position.distanceTo(bot.entity.position) < 30);

    return {
        timestamp: Date.now(),
        self: { health: bot.health, food: bot.food, position: bot.entity.position },
        surroundings: { time: bot.time.timeOfDay, danger: !!nearbyMobs, player_visible: !!nearbyPlayer },
        discovery: { available_commands: availableCommands.slice(0, 20), known_plugins: knownPlugins },
        memory: memory,
        current_state: currentState
    };
}

async function queryGroq(state) {
    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: JSON.stringify(state) }
            ],
            model: 'llama3-70b-8192',
            temperature: 0.65,
            response_format: { type: 'json_object' }
        });
        return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
        // Simple backoff or logging
        console.error('Groq Error (Retrying next loop):', error.message);
        return null;
    }
}

async function executeDecision(decision) {
    console.log(`[DECISION] Mode: ${decision.playstyle} | Act: ${decision.action}`);
    if (decision.plugin_discovery_note) console.log(`[DISCOVERY] ${decision.plugin_discovery_note}`);

    if (decision.playstyle && decision.playstyle !== currentState) {
        currentState = decision.playstyle;
        updatePhysicsForState(currentState);
    }

    if (decision.chat) bot.safeChat(decision.chat);

    const cmd = decision.meta?.cmd;
    const target = decision.meta?.target;

    switch (decision.action) {
        case 'use_command':
            if (cmd) bot.safeChat(cmd);
            break;

        case 'move_to':
        case 'follow':
            if (target) {
                const p = bot.players[target]?.entity;
                if (p) {
                    bot.pathfinder.setGoal(new goals.GoalFollow(p, 1), true);
                } else {
                    const nums = target.toString().match(/-?\d+/g);
                    if (nums && nums.length >= 3) {
                        bot.pathfinder.setGoal(new goals.GoalBlock(parseInt(nums[0]), parseInt(nums[1]), parseInt(nums[2])));
                    }
                }
            }
            break;

        case 'attack':
            const mob = bot.nearestEntity(e => e.type === 'hostile');
            if (mob && currentState === 'Guardian') {
                const sword = bot.inventory.items().find(i => i.name.includes('sword'));
                if (sword) bot.equip(sword, 'hand');
                bot.attack(mob);
            }
            break;

        case 'mine':
            if (target && currentState === 'Tycoon') {
                const blockType = bot.registry.blocksByName[target];
                if (blockType) {
                    const block = bot.findBlock({ matching: blockType.id, maxDistance: 32 });
                    if (block) bot.collectBlock.collect(block);
                }
            }
            break;

        case 'sit':
            bot.pathfinder.setGoal(null);
            bot.look(bot.entity.yaw, 0);
            break;
    }
}

function updatePhysicsForState(state) {
    if (!bot.movements) return;
    bot.movements.canDig = (state === 'Tycoon' || state === 'Explorer');
    bot.movements.allowParkour = (state === 'Guardian' || state === 'Explorer');
    bot.pathfinder.setMovements(bot.movements);
}

createBot();
