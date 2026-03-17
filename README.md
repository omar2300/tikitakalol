# tikitakalol

[Edit in StackBlitz next generation editor ⚡️](https://stackblitz.com/~/github.com/omar2300/tikitakalol)
;=)

## Online Mode (Random Match)

This project now includes a lightweight WebSocket matchmaking server for online 1v1.

### Important architecture note

GitHub Pages can host your static frontend, but it cannot host a persistent WebSocket matchmaking server.

Use one of these:

1. Your Debian home server (best for now)
2. A cloud VM / container
3. A hosted realtime backend

### Run the matchmaking server

Install deps:

```bash
npm install
```

Start server (default port `8787`):

```bash
npm run match-server
```

Optional custom port:

```bash
MATCH_PORT=8787 npm run match-server
```

### Point the frontend to your server

By default, client uses:

`ws(s)://<current-host>:8787`

You can override it globally before `script.js` loads:

```html
<script>
	window.MATCH_SERVER_URL = 'wss://your-domain-or-ip:8787';
</script>
```

### Deploy pattern that works

1. Frontend on GitHub Pages
2. Match server on Debian box
3. `window.MATCH_SERVER_URL` set to your Debian public endpoint
