# 🎲 Ludo Game

A fully playable, browser-based **Ludo board game** built from scratch with pure HTML, CSS, and vanilla JavaScript — no frameworks, no libraries, no dependencies.

![Technologies](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![Technologies](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![Technologies](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)

---

## ✨ Features

### 🎮 Gameplay
- **2–4 player support** — choose Green, Red, Yellow, and/or Blue
- **4 tokens per player** with proper piece movement
- **Working dice** (1–6) with rolling animation
- **Turn-based system** with current-player display
- **Roll a 6** to enter a token onto the board
- **Extra turn** when you roll a 6
- **Three consecutive 6s** forfeit the turn
- **Clickable tokens** — select which piece to move
- **Auto-move** when only one valid move exists

### 🏁 Rules
- **52-cell main track** with clockwise movement
- **Safe/star positions** (★) where tokens cannot be captured
- **Opponent capture** — land on an opponent to send them back to base
- **Individual home columns** — each player has a unique 5-cell final stretch
- **Exact roll required** to enter the center (home)
- **Winner detection** — first player to get all 4 tokens home wins

### 🎨 Design
- Modern **dark glassmorphic** UI
- **Vibrant colour-coded** players (🟢 🔴 🟡 🔵)
- **Dice roll animation** with rotating effect
- **Token pulse animation** for clickable pieces
- **Smooth transitions** and hover effects
- **Responsive design** — works on desktop, tablet, and mobile
- **Google Fonts** (Outfit) for premium typography

---

## 🚀 How to Run

1. Clone or download this repository
2. Open `index.html` directly in any modern web browser
3. Select the number of players (2, 3, or 4)
4. Click **Start Game**
5. Roll the dice and play!

```
No server, no build step, no installation required.
Just open index.html in your browser.
```

---

## 📁 Project Structure

```
ludo-game/
├── index.html   ← Main HTML page (game structure & layout)
├── style.css    ← All styling (board, tokens, dice, animations, responsive)
├── script.js    ← Complete game logic (path, dice, movement, captures, win)
└── README.md    ← This file
```

### What Each File Does

| File | Purpose |
|------|---------|
| `index.html` | Page structure: setup screen, 15×15 board grid, dice area, player scores, game log, winner overlay |
| `style.css` | Dark theme, glassmorphic cards, CSS Grid board, token/dice animations, responsive breakpoints |
| `script.js` | All game logic: 52-cell path array, player turns, dice rolling, token movement/positioning, captures, safe zones, home columns, win detection |

---

## 🧠 How the Game Logic Works

### Board & Path System
- The board is a **15×15 CSS Grid** (225 cells)
- The main track is a **52-cell clockwise loop** defined as `[row, col]` coordinate pairs in the `PATH` array
- Each player has a **start index** on this shared path (Green=0, Red=13, Yellow=26, Blue=39)

### Token Position Model
Each token's position is stored as a **player-relative number** from -1 to 56:

| Position | Meaning |
|----------|---------|
| `-1` | In home base (not on board) |
| `0–50` | On the main track (mapped to `PATH[(startIndex + pos) % 52]`) |
| `51–55` | On the player's home column |
| `56` | Reached center — completed! |

### Movement Flow
1. Player rolls the dice
2. Game checks which tokens can legally move
3. If only one can move → auto-moved. If multiple → player clicks to choose
4. Token position is updated, captures are checked, board re-renders
5. Rolling a 6 grants an extra turn

### Capture Logic
- When a token lands on a main-track cell, the game checks if any opponent token occupies the same **absolute path index**
- If yes (and the cell is NOT a safe/star position), the opponent is sent back to base

---

## 🔧 What You Can Improve Later

- **AI/computer players** — add basic or smart AI opponents
- **Sound effects** — dice roll, capture, and victory sounds
- **Animated token movement** — step-by-step animation along the path
- **Online multiplayer** — add WebSocket-based real-time play
- **Game history** — save/load game state with localStorage
- **Custom themes** — light mode, different colour schemes
- **Scoreboard** — track wins across multiple games
- **Block rule** — two tokens on the same cell form a blockade
- **More visual polish** — particle effects on captures, confetti on win

---

## 📜 Game Rules Reference

1. Each player starts with 4 tokens in their home base
2. Roll a **6** to move a token from base onto the board
3. Tokens move clockwise around the 52-cell main track
4. Landing on an opponent's token **captures** it (sent back to base)
5. Tokens on **★ star cells** and **start cells** are safe from capture
6. After completing the loop, tokens enter their **home column** (5 cells)
7. An **exact roll** is needed to move a token into the center (home)
8. Rolling a **6** grants an extra turn (max 2 consecutive; 3rd forfeits)
9. First player to get **all 4 tokens home** wins!

---

## 📄 License

This project is open source and free to use for learning and personal projects.

---

Built with ❤️ using pure HTML, CSS & JavaScript.
