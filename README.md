# `koper`

Peer-to-peer collaborative code playground in a single <1MB HTML file

https://github.com/user-attachments/assets/50f77fea-29d1-4465-b1a7-75839a035baa

## Getting started

Easiest way: open https://koper.powierz.art on both devices and connect.

Or download `index.html` from the [release](https://github.com/micouy/koper/releases) on your device. The person you want to collaborate with needs to download the same file on their device. Then both of you need to open the file.

One of you needs to copy your ID (just click on it) and give it to the other person, who needs to paste it into their app and click Connect. When you see 'connected', you're good to go.

The app should work on any device with a web browser.

## Using the app

Once you're paired, you can start collaborating. The easiest way is to click on **Load Example** and then **Run**. You can extend (or reduce) the game in any way you want using [p5.js](https://p5js.org/), just remember to prefix any p5-specific variables with `p5.<variable name>`.

The code and the app state are persisted even if you close the tab.

## Using shared state

In `koper`, you have two types of synced state: shared state and player state.

Shared state is for data that is not specific to any player. All players read and write the same shared values.

```javascript
// Shared state - everyone sees and can modify this
state.set('gameStarted', true);
state.set('totalCount', 10);
```

Player state is specific to each peer. Each player has their own state that only they can write to, but everyone can read all players' states.

```javascript
// Get this player's state - only you can write here
const player = state.getPlayer();
player.set('score', 5);

// Get all players' states - read-only
const allPlayers = state.getPlayers();
```

Local state is not synced and exists only on your device.

```javascript
let temp = 0;  // Local - only your device sees this
```

## Troubleshooting

**Multiple tabs on the same device**

Opening the same HTML file in multiple tabs will not work properly. Use separate devices.

**Peers not connecting**

WebRTC connections are blocked in some networks, for example behind corporate firewalls, on university networks, or with restrictive VPNs. If the connection fails or stays in "connecting" state, you may need to use TURN. TURN servers relay traffic between peers when direct connection is not possible. Options include [Twilio](https://www.twilio.com/), [Metered](https://metered.ca/), or self-host with [Coturn](https://github.com/coturn/coturn).

To add a TURN server to `koper`:

1. Click the chevron (▸) in the navbar to expand settings
2. Enter your TURN server details:
   - TURN URL: `turn:your-server.com:3478`
   - Username: your TURN username
   - Credential: your TURN password
3. Reconnect

## How It Works

`koper` uses peer-to-peer WebRTC to connect devices without a central server. Code synchronization uses Y.js, a CRDT system that handles concurrent edits without conflicts.

When you type, the change is captured in Y.js, a diff is computed, and sent via WebRTC to peers. The receiving device applies the diff to its Y.js document. Both devices remain synced.

Tech stack: WebRTC via PeerJS, Y.js for synchronization, IndexedDB for local persistence, P5.js for code execution.

## Development

To modify or build the app, clone the repo and run:

```bash
npm install
npm run dev
```

This starts a development server with hot reload.

To build for production:

```bash
npm run build
```

The built `dist/index.html` contains everything bundled. Upload it anywhere and it works.

## License

MIT
