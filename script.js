// Champion data is now loaded from championData.json 
// Run `npm run update` once a month to pull in new champion data.


// Define constants for markers
const X_MARKER = 'X';
const O_MARKER = 'O';

// Tuning: confetti behavior. Increase piece counts for denser effects.
const CONFETTI_TUNING = {
  topRainPieces: 34,
  sideGunPiecesPerSide: 12,
  rainSizeMin: 1.2,
  rainSizeRange: 1.5,
  rainDurationMin: 3.6,
  rainDurationRange: 1.6,
  rainDelayMax: 0.35,
  sideSizeMin: 1.2,
  sideSizeRange: 1.4,
  sideDurationMin: 3.6,
  sideDurationRange: 1.6,
  sideDelayMax: 0.2,
};

// Tuning: fuzzy matching aggressiveness and ranking weights.
// Lower confidence gaps = more aggressive auto-correct.
const FUZZY_TUNING = {
  maxSuggestions: 8,
  prefixConfidenceGap: 8,
  subsequenceConfidenceGap: 16,
  subsequenceMinLength: 3,
  exactScore: -100,
  wordScoreBase: 30,
  subsequenceScoreBase: 70,
  containsScoreBase: 140,
};

// Tuning: online matchmaking endpoint.
// For local/home server, point this to your Debian host and open the port.
const DEFAULT_PROD_MATCH_URL = 'wss://tikitakalol.duckdns.org';
const ONLINE_TUNING = {
  serverUrl: (() => {
    const configured = typeof window.MATCH_SERVER_URL === 'string'
      ? window.MATCH_SERVER_URL.trim()
      : '';
    if (configured) return configured;

    // On GitHub Pages, default to the public secure endpoint.
    if (window.location.hostname.endsWith('github.io')) {
      return DEFAULT_PROD_MATCH_URL;
    }

    return `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}:8787`;
  })(),
};

// Tuning: desktop autocomplete panel layout and mobile/desktop split behavior.
const AUTOCOMPLETE_UI_TUNING = {
  phoneMediaQuery: '(pointer: coarse), (max-width: 860px)',
  maxPanelWidth: 620,
  panelWidthMultiplier: 1.45,
  viewportPadding: 12,
  panelYOffset: 8,
};

// Local champion portrait overrides by canonical champion name.
// Add entries here when a local filename does not follow normal naming patterns.
const CHAMPION_IMAGE_OVERRIDES = {
  rhaast: './ChampionIMG/64px-Kayn_OriginalSquare_Rhaast.png',
};

const boardElement = document.getElementById('board');
const boardPanelElement = boardElement ? boardElement.closest('.board-panel') : null;
const gameStatusElement = document.getElementById('game-status');
const celebrationLayer = document.getElementById('celebration-layer');
const rerollBoardBtn = document.getElementById('rerollBoardBtn');
const onlineModeToggle = document.getElementById('online-mode-toggle');
const matchCodeInput = document.getElementById('match-code-input');
const findMatchButton = document.getElementById('find-match-btn');
const rematchButton = document.getElementById('rematch-btn');
const onlineStatusElement = document.getElementById('online-status');

// Define the initial game state
let currentPlayer = X_MARKER;
let board = ['', '', '', '', '', '', '', '', ''];
let claimedChampions = Array(9).fill('');
let gameOver = false;
let onlineModeEnabled = false;
let onlineSocket = null;
let onlineQueued = false;
let onlineMatched = false;
let onlineRoomId = '';
let onlineSymbol = '';
let opponentSelectedCell = -1; // Track opponent's selection for visual feedback

const allRegions = ['Ionia', 'Demacia', 'Piltover', 'Noxus', 'Void','Darkin','Zaun','Bilgewater','Freljord','ShadowIsles','Shurima','Ixtal','Targon','BandleCity','?'];
const allLanes = ['Toplane', 'Midlane', 'Botlane', 'Support', 'Jungle'];

// Will be populated after championData.json loads
let championData = {};
let championNameLookup = new Map();
let championIdLookup = new Map();
let ddragonVersion = '';
let championNames = [];
let trivia = [];
let lane1, lane2, lane3;
let reg1, reg2, reg3;
const pressedKeys = new Set();
let shortcutReady = true;

// Show a loading message while the JSON fetches
boardElement.textContent = 'Loading champion data...';
setStatus('Loading champion data...', 'info');
setOnlineStatus(`Server: ${ONLINE_TUNING.serverUrl}`);

// ─── Async boot ───────────────────────────────────────────────────────────────
async function loadChampionData() {
  const res = await fetch('./championData.json');
  if (!res.ok) throw new Error(`Could not load championData.json: ${res.status}`);
  const json = await res.json();
  // Support both { championData: {...} } wrapper and bare { "Aatrox": [...] }
  return json.championData ?? json;
}

loadChampionData().then(data => {
  // Filter out any uncomplete data added by the update script that haven't been reviewed yet
  championData = Object.fromEntries(
    Object.entries(data).filter(([, entries]) =>
      entries.some(e => e.lane !== 'REVIEW_NEEDED')
    )
  );
  championNameLookup = new Map(
    Object.keys(championData).map((name) => [name.toLowerCase(), name])
  );
  championNames = Object.keys(championData).sort((a, b) => a.localeCompare(b));

  trivia = generateTriviaQuestions(championData);
  loadChampionIdLookup()
    .then(() => renderBoard())
    .catch((error) => {
      console.warn('Could not load champion id map for remote images.', error);
    });
  resetGame({ reroll: true });
}).catch(err => {
  boardElement.textContent =
    'Failed to load champion data. Make sure championData.json is accessible.';
  boardElement.classList.add('board-loading');
  setStatus('Could not load champion data.', 'error');
  console.error(err);
});

if (rerollBoardBtn) {
  rerollBoardBtn.addEventListener('click', () => resetGame({ reroll: true }));
}

if (onlineModeToggle) {
  onlineModeToggle.addEventListener('change', () => {
    onlineModeEnabled = onlineModeToggle.checked;
    if (findMatchButton) {
      findMatchButton.disabled = !onlineModeEnabled;
      updateFindMatchButtonLabel();
    }

    if (!onlineModeEnabled) {
      teardownOnlineSession('Switched to offline mode.');
      resetGame({ reroll: true });
      return;
    }

    setOnlineStatus('Online mode ready. Use Random Match or enter a code.', 'status-ok');
  });
}

if (matchCodeInput) {
  matchCodeInput.addEventListener('input', () => {
    updateFindMatchButtonLabel();
  });
}

if (findMatchButton) {
  findMatchButton.addEventListener('click', () => {
    if (!onlineModeEnabled) return;
    if (onlineQueued || onlineMatched) {
      teardownOnlineSession('Matchmaking stopped.');
      return;
    }
    const code = matchCodeInput ? matchCodeInput.value.trim() : '';
    startOnlineMatchmaking(code);
  });
}

if (rematchButton) {
  rematchButton.addEventListener('click', () => {
    if (!onlineModeEnabled || !onlineMatched || !gameOver) return;
    sendOnlineMessage({
      type: 'rematch_request',
      roomId: onlineRoomId,
    });
    rematchButton.disabled = true;
    setOnlineStatus('Rematch requested. Waiting for opponent...', 'status-warn');
  });
}

function setOnlineStatus(message, tone = '') {
  if (!onlineStatusElement) return;
  onlineStatusElement.textContent = message;
  onlineStatusElement.classList.remove('status-ok', 'status-warn', 'status-error');
  if (tone) {
    onlineStatusElement.classList.add(tone);
  }
}

function updateRematchButtonState() {
  if (!rematchButton) return;
  rematchButton.disabled = !(onlineModeEnabled && onlineMatched && gameOver);
}

function updateFindMatchButtonLabel() {
  if (!findMatchButton) return;
  if (onlineQueued) {
    findMatchButton.textContent = 'Cancel Matchmaking';
    return;
  }
  if (onlineMatched) {
    findMatchButton.textContent = 'Leave Match';
    return;
  }
  const hasCode = Boolean(matchCodeInput && matchCodeInput.value.trim());
  findMatchButton.textContent = hasCode ? 'Find Match' : 'Random Match';
}

// Client -> server transport helper. All online packets go through this.
function sendOnlineMessage(payload) {
  if (!onlineSocket || onlineSocket.readyState !== WebSocket.OPEN) return;
  onlineSocket.send(JSON.stringify(payload));
}

function startOnlineMatchmaking(code = '') {
  setOnlineStatus('Connecting to matchmaking server...', 'status-warn');
  if (findMatchButton) {
    findMatchButton.textContent = 'Cancel Matchmaking';
  }

  try {
    const wsUrl = String(ONLINE_TUNING.serverUrl || '').trim();
    if (!/^wss?:\/\//i.test(wsUrl)) {
      throw new Error(`Invalid WebSocket URL: ${wsUrl || '(empty)'}`);
    }
    onlineSocket = new WebSocket(wsUrl);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown URL error';
    setOnlineStatus(`Could not open WebSocket (${reason}).`, 'status-error');
    updateFindMatchButtonLabel();
    return;
  }

  // WebSocket lifecycle: open => join queue, message => state sync,
  // close/error => reset client session UI/state.
  onlineSocket.addEventListener('open', () => {
    if (code) {
      sendOnlineMessage({ type: 'join_code', code });
    } else {
      sendOnlineMessage({ type: 'join_random' });
    }
  });

  onlineSocket.addEventListener('message', (event) => {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch {
      return;
    }
    handleOnlineMessage(data);
  });

  onlineSocket.addEventListener('close', () => {
    if (!onlineModeEnabled) return;
    if (onlineMatched || onlineQueued) {
      setOnlineStatus('Connection closed.', 'status-error');
      setStatus('Online connection lost.', 'error');
    }
    onlineQueued = false;
    onlineMatched = false;
    onlineRoomId = '';
    onlineSymbol = '';
    updateFindMatchButtonLabel();
    updateRematchButtonState();
  });

  onlineSocket.addEventListener('error', () => {
    setOnlineStatus(`Could not reach server (${ONLINE_TUNING.serverUrl}).`, 'status-error');
  });
}

function teardownOnlineSession(statusMessage = 'Offline mode.') {
  onlineQueued = false;
  onlineMatched = false;
  onlineRoomId = '';
  onlineSymbol = '';
  if (onlineSocket) {
    sendOnlineMessage({ type: 'leave' });
    onlineSocket.close();
  }
  onlineSocket = null;
  updateFindMatchButtonLabel();
  setOnlineStatus(statusMessage);
  updateRematchButtonState();
}

function handleOnlineMessage(data) {
  // Server -> client protocol messages:
  // queued, matched, opponent_selecting, move, turn_pass,
  // rematch_requested, rematch_started, opponent_left, error
  if (data.type === 'queued') {
    onlineQueued = true;
    setOnlineStatus(
      data.code
        ? `Waiting for code match: ${data.code}`
        : 'Searching for an opponent...',
      'status-warn'
    );
    return;
  }

  if (data.type === 'matched') {
    onlineQueued = false;
    onlineMatched = true;
    onlineRoomId = data.roomId;
    onlineSymbol = data.symbol;

    [lane1, lane2, lane3] = data.lanes;
    [reg1, reg2, reg3] = data.regions;
    board = ['', '', '', '', '', '', '', '', ''];
    claimedChampions = Array(9).fill('');
    currentPlayer = data.startingPlayer || X_MARKER;
    gameOver = false;

    if (findMatchButton) {
      findMatchButton.textContent = 'Leave Match';
    }
    setOnlineStatus(`Matched. You are ${onlineSymbol}.`, 'status-ok');
    setStatus(
      currentPlayer === onlineSymbol
        ? `Matched as ${onlineSymbol}. Your turn.`
        : `Matched as ${onlineSymbol}. Opponent's turn.`,
      'info'
    );
    updateRematchButtonState();
    renderBoard();
    return;
  }

  if (data.type === 'opponent_selecting') {
    // Show opponent's selected cell visually
    opponentSelectedCell = data.cellIndex;
    renderBoard();
    return;
  }

  if (data.type === 'move') {
    if (!onlineMatched) return;
    if (data.player === onlineSymbol) return;
    if (board[data.cellIndex] !== '') return;

    currentPlayer = data.player;
    board[data.cellIndex] = data.player;
    if (data.champion) {
      claimedChampions[data.cellIndex] = data.champion;
    }
    opponentSelectedCell = -1; // Clear opponent selection
    finishTurn('Opponent claimed that square.');
    return;
  }

  if (data.type === 'turn_pass') {
    if (!onlineMatched) return;
    if (data.player === onlineSymbol) return;
    opponentSelectedCell = -1; // Clear opponent selection
    currentPlayer = data.player;
    finishTurn('Opponent missed and lost the turn.');
    return;
  }

  if (data.type === 'opponent_left') {
    onlineMatched = false;
    gameOver = true;
    opponentSelectedCell = -1;
    updateFindMatchButtonLabel();
    setOnlineStatus('Opponent disconnected.', 'status-warn');
    setStatus('Opponent left the match.', 'error');
    updateRematchButtonState();
    renderBoard();
    return;
  }

  if (data.type === 'rematch_requested') {
    if (!onlineMatched) return;
    setOnlineStatus('Opponent requested a rematch. Click Rematch to accept.', 'status-warn');
    if (rematchButton && gameOver) {
      rematchButton.disabled = false;
    }
    return;
  }

  if (data.type === 'rematch_started') {
    if (!onlineMatched) return;
    if (data.symbol) {
      onlineSymbol = data.symbol;
    }
    [lane1, lane2, lane3] = data.lanes;
    [reg1, reg2, reg3] = data.regions;
    board = ['', '', '', '', '', '', '', '', ''];
    claimedChampions = Array(9).fill('');
    currentPlayer = data.startingPlayer || X_MARKER;
    gameOver = false;
    opponentSelectedCell = -1;
    setOnlineStatus('Rematch started.', 'status-ok');
    setStatus(
      currentPlayer === onlineSymbol
        ? `Rematch started. You are ${onlineSymbol}. Your turn.`
        : `Rematch started. You are ${onlineSymbol}. Opponent's turn.`,
      'info'
    );
    updateRematchButtonState();
    renderBoard();
    return;
  }

  if (data.type === 'error') {
    setOnlineStatus(data.message || 'Matchmaking error.', 'status-error');
  }
}

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (key === 'p' || key === 'o') {
    pressedKeys.add(key);
  }

  if (pressedKeys.has('p') && pressedKeys.has('o') && shortcutReady) {
    shortcutReady = false;
    launchEmojiConfetti();
    setStatus('Confetti mode.', 'info');
  }
});

window.addEventListener('keyup', (event) => {
  const key = event.key.toLowerCase();
  if (key === 'p' || key === 'o') {
    pressedKeys.delete(key);
  }

  if (!pressedKeys.has('p') || !pressedKeys.has('o')) {
    shortcutReady = true;
  }
});



// Trivia generation 
function generateTriviaQuestions(championData) {
  const trivia = [];
  for (const [champion, regionsLanes] of Object.entries(championData)) {
    regionsLanes.forEach(({ region, lane }) => {
      trivia.push({
        region,
        lane,
        question: `Which champion is associated with the region of ${region} and the role of ${lane}?`,
        answer: champion,
      });
    });
  }
  return trivia;
}


// Function to check for a winner
function checkWinner() {
  const winningCombos = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8], // Rows
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8], // Columns
    [0, 4, 8],
    [2, 4, 6], // Diagonals
  ];

  for (let combo of winningCombos) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  return null;
}

function setStatus(message, tone = '') {
  if (!gameStatusElement) return;
  gameStatusElement.textContent = message;
  gameStatusElement.classList.remove('is-win', 'is-error', 'is-info');
  if (tone) {
    gameStatusElement.classList.add(`is-${tone}`);
  }
}

function finishTurn(turnMessage = '') {
  const winner = checkWinner();
  if (winner) {
    gameOver = true;
    const winMessage = turnMessage
      ? `${turnMessage} Player ${winner} wins.`
      : `Player ${winner} wins.`;
    setStatus(winMessage, 'win');
    
    // Launch sad confetti if player lost in online mode
    if (onlineModeEnabled && onlineMatched && winner !== onlineSymbol) {
      launchSadEmojiConfetti();
    } else {
      launchEmojiConfetti();
    }
    updateRematchButtonState();
    renderBoard();
    return;
  }

  if (!board.includes('')) {
    gameOver = true;
    const drawMessage = turnMessage
      ? `${turnMessage} Draw.`
      : 'Draw.';
    setStatus(drawMessage, 'info');
    updateRematchButtonState();
    renderBoard();
    return;
  }

  currentPlayer = currentPlayer === X_MARKER ? O_MARKER : X_MARKER;
  const nextTurnMessage = turnMessage
    ? `${turnMessage} Player ${currentPlayer}'s turn.`
    : `Player ${currentPlayer}'s turn.`;
  setStatus(nextTurnMessage, '');
  updateRematchButtonState();
  renderBoard();
}

function launchEmojiConfetti() {
  // Confetti UI: top rain + side cannon streams.
  const emojis = ['🎉', '✨', '🏆', '🔥', '👑', '💥'];

  for (let index = 0; index < CONFETTI_TUNING.topRainPieces; index++) {
    const piece = document.createElement('div');
    piece.className = 'emoji-confetti emoji-confetti--rain';
    piece.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    piece.style.setProperty('--size', `${CONFETTI_TUNING.rainSizeMin + Math.random() * CONFETTI_TUNING.rainSizeRange}rem`);
    piece.style.setProperty('--duration', `${CONFETTI_TUNING.rainDurationMin + Math.random() * CONFETTI_TUNING.rainDurationRange}s`);
    piece.style.setProperty('--delay', `${Math.random() * CONFETTI_TUNING.rainDelayMax}s`);
    piece.style.setProperty('--x-start', `${Math.random() * 100}vw`);
    piece.style.setProperty('--x-end', `${Math.max(0, Math.min(100, (Math.random() * 100) + (Math.random() * 20 - 10)))}vw`);
    piece.style.setProperty('--spin', `${(Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 560)}deg`);
    celebrationLayer.appendChild(piece);
    piece.addEventListener('animationend', () => piece.remove(), { once: true });
  }

  for (let index = 0; index < CONFETTI_TUNING.sideGunPiecesPerSide * 2; index++) {
    const piece = document.createElement('div');
    const fromLeft = index < CONFETTI_TUNING.sideGunPiecesPerSide;
    piece.className = 'emoji-confetti emoji-confetti--gun';
    piece.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    piece.style.setProperty('--size', `${CONFETTI_TUNING.sideSizeMin + Math.random() * CONFETTI_TUNING.sideSizeRange}rem`);
    piece.style.setProperty('--duration', `${CONFETTI_TUNING.sideDurationMin + Math.random() * CONFETTI_TUNING.sideDurationRange}s`);
    piece.style.setProperty('--delay', `${Math.random() * CONFETTI_TUNING.sideDelayMax}s`);
    piece.style.setProperty('--gun-start-x', fromLeft ? `${-6 - Math.random() * 6}vw` : `${102 + Math.random() * 6}vw`);
    piece.style.setProperty('--gun-start-y', `${62 + Math.random() * 20}vh`);
    piece.style.setProperty('--gun-apex-x', fromLeft ? `${34 + Math.random() * 12}vw` : `${54 + Math.random() * 12}vw`);
    piece.style.setProperty('--gun-apex-y', `${28 + Math.random() * 26}vh`);
    piece.style.setProperty('--gun-end-x', `${32 + Math.random() * 36}vw`);
    piece.style.setProperty('--spin', `${(Math.random() > 0.5 ? 1 : -1) * (420 + Math.random() * 520)}deg`);
    celebrationLayer.appendChild(piece);
    piece.addEventListener('animationend', () => piece.remove(), { once: true });
  }
}

function launchSadEmojiConfetti() {
  // Sad confetti for loss: falling emojis with sad/disappointed theme.
  const sadEmojis = ['😭', '💔', '😢', '😩', '😞', '🥺'];

  for (let index = 0; index < CONFETTI_TUNING.topRainPieces; index++) {
    const piece = document.createElement('div');
    piece.className = 'emoji-confetti emoji-confetti--rain sad-confetti';
    piece.textContent = sadEmojis[Math.floor(Math.random() * sadEmojis.length)];
    piece.style.setProperty('--size', `${CONFETTI_TUNING.rainSizeMin + Math.random() * CONFETTI_TUNING.rainSizeRange}rem`);
    piece.style.setProperty('--duration', `${CONFETTI_TUNING.rainDurationMin + Math.random() * CONFETTI_TUNING.rainDurationRange}s`);
    piece.style.setProperty('--delay', `${Math.random() * CONFETTI_TUNING.rainDelayMax}s`);
    piece.style.setProperty('--x-start', `${Math.random() * 100}vw`);
    piece.style.setProperty('--x-end', `${Math.max(0, Math.min(100, (Math.random() * 100) + (Math.random() * 20 - 10)))}vw`);
    piece.style.setProperty('--spin', `${(Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 560)}deg`);
    celebrationLayer.appendChild(piece);
    piece.addEventListener('animationend', () => piece.remove(), { once: true });
  }

  for (let index = 0; index < CONFETTI_TUNING.sideGunPiecesPerSide * 2; index++) {
    const piece = document.createElement('div');
    const fromLeft = index < CONFETTI_TUNING.sideGunPiecesPerSide;
    piece.className = 'emoji-confetti emoji-confetti--gun sad-confetti';
    piece.textContent = sadEmojis[Math.floor(Math.random() * sadEmojis.length)];
    piece.style.setProperty('--size', `${CONFETTI_TUNING.sideSizeMin + Math.random() * CONFETTI_TUNING.sideSizeRange}rem`);
    piece.style.setProperty('--duration', `${CONFETTI_TUNING.sideDurationMin + Math.random() * CONFETTI_TUNING.sideDurationRange}s`);
    piece.style.setProperty('--delay', `${Math.random() * CONFETTI_TUNING.sideDelayMax}s`);
    piece.style.setProperty('--gun-start-x', fromLeft ? `${-6 - Math.random() * 6}vw` : `${102 + Math.random() * 6}vw`);
    piece.style.setProperty('--gun-start-y', `${62 + Math.random() * 20}vh`);
    piece.style.setProperty('--gun-apex-x', fromLeft ? `${34 + Math.random() * 12}vw` : `${54 + Math.random() * 12}vw`);
    piece.style.setProperty('--gun-apex-y', `${28 + Math.random() * 26}vh`);
    piece.style.setProperty('--gun-end-x', `${32 + Math.random() * 36}vw`);
    piece.style.setProperty('--spin', `${(Math.random() > 0.5 ? 1 : -1) * (420 + Math.random() * 520)}deg`);
    celebrationLayer.appendChild(piece);
    piece.addEventListener('animationend', () => piece.remove(), { once: true });
  }
}
 

async function loadChampionIdLookup() {
  // Remote portrait fallback source: Data Dragon champion IDs.
  const versionsRes = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
  if (!versionsRes.ok) {
    throw new Error(`Could not load versions list: ${versionsRes.status}`);
  }

  const versions = await versionsRes.json();
  const latestVersion = Array.isArray(versions) ? versions[0] : '';
  if (!latestVersion) {
    throw new Error('No Data Dragon version found.');
  }

  const championRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`);
  if (!championRes.ok) {
    throw new Error(`Could not load champion list: ${championRes.status}`);
  }

  const championJson = await championRes.json();
  const championEntries = Object.values(championJson.data || {});
  championIdLookup = new Map(
    championEntries.map((champion) => [champion.name.toLowerCase(), champion.id])
  );
  ddragonVersion = latestVersion;
}

function getCanonicalChampionName(inputName) {
  if (!inputName) return '';
  const normalized = inputName.trim().toLowerCase();
  return championNameLookup.get(normalized) || inputName.trim();
}

function normalizeChampionKey(inputName) {
  return inputName.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeRegionKey(regionName) {
  const raw = (regionName || '').trim();
  if (!raw) return '';
  if (raw === '?' || raw.toLowerCase() === 'unknown') return '?';
  return raw;
}

function getSubsequenceScore(query, target) {
  let queryIndex = 0;
  let lastMatchedIndex = -1;
  let gapPenalty = 0;

  for (let i = 0; i < target.length && queryIndex < query.length; i++) {
    if (target[i] === query[queryIndex]) {
      if (lastMatchedIndex >= 0) {
        gapPenalty += Math.max(0, i - lastMatchedIndex - 1);
      }
      lastMatchedIndex = i;
      queryIndex += 1;
    }
  }

  if (queryIndex !== query.length) {
    return null;
  }

  return gapPenalty;
}

// Fuzzy search: ranks by exact -> prefix -> word boundary -> in-order subsequence -> contains.
function rankChampionMatches(rawInput, limit = 8) {
  const query = (rawInput || '').trim().toLowerCase();
  if (!query) return [];

  const ranked = championNames
    .map((name) => {
      const lower = name.toLowerCase();
      const normalizedName = normalizeChampionKey(name);
      const normalizedQuery = normalizeChampionKey(query);

      if (lower === query || normalizedName === normalizedQuery) {
        return { name, score: FUZZY_TUNING.exactScore, matchType: 'exact' };
      }

      if (lower.startsWith(query)) {
        return {
          name,
          score: lower.length - query.length,
          matchType: 'prefix',
        };
      }

      const wordBoundaryIndex = lower.indexOf(` ${query}`);
      if (wordBoundaryIndex >= 0) {
        return {
          name,
          score: FUZZY_TUNING.wordScoreBase + wordBoundaryIndex,
          matchType: 'word',
        };
      }

      const subsequenceGap = getSubsequenceScore(query, lower);
      if (subsequenceGap !== null) {
        return {
          name,
          score: FUZZY_TUNING.subsequenceScoreBase + subsequenceGap,
          matchType: 'subsequence',
        };
      }

      const containsIndex = lower.indexOf(query);
      if (containsIndex >= 0) {
        return {
          name,
          score: FUZZY_TUNING.containsScoreBase + containsIndex,
          matchType: 'contains',
        };
      }

      return {
        name,
        score: Number.POSITIVE_INFINITY,
        matchType: 'none',
      };
    })
    .filter((entry) => Number.isFinite(entry.score))
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      return a.name.localeCompare(b.name);
    });

  return ranked.slice(0, limit);
}

function resolveChampionInput(inputName) {
  // Auto-correct resolver used on submit for both desktop and mobile input flows.
  const raw = (inputName || '').trim();
  if (!raw) return '';

  const exact = championNameLookup.get(raw.toLowerCase());
  if (exact) return exact;

  const normalizedRaw = normalizeChampionKey(raw);
  const normalizedMatches = championNames.filter(
    (name) => normalizeChampionKey(name) === normalizedRaw
  );
  if (normalizedMatches.length === 1) return normalizedMatches[0];

  const prefixMatches = championNames.filter((name) =>
    name.toLowerCase().startsWith(raw.toLowerCase())
  );
  if (prefixMatches.length === 1) return prefixMatches[0];

  const ranked = rankChampionMatches(raw, 2);
  if (ranked.length === 1) return ranked[0].name;
  if (ranked.length >= 2) {
    const [best, second] = ranked;
    const confidenceGap = second.score - best.score;
    if ((best.matchType === 'prefix' || best.matchType === 'word') && confidenceGap >= FUZZY_TUNING.prefixConfidenceGap) {
      return best.name;
    }
    if (
      best.matchType === 'subsequence'
      && raw.length >= FUZZY_TUNING.subsequenceMinLength
      && confidenceGap >= FUZZY_TUNING.subsequenceConfidenceGap
    ) {
      return best.name;
    }
  }

  return raw;
}

function getChampionImageCandidates(championName) {
  // Image source order: explicit override -> championData image -> local naming patterns -> Data Dragon.
  const canonical = getCanonicalChampionName(championName);
  const entries = championData[canonical] || [];
  const dataImage = entries.find((entry) => entry.image)?.image;
  const ddragonChampionId = championIdLookup.get(canonical.toLowerCase());
  const candidates = [];
  const overrideImage = CHAMPION_IMAGE_OVERRIDES[canonical.toLowerCase()];

  if (overrideImage) {
    candidates.push(overrideImage);
  }

  if (dataImage) {
    candidates.push(dataImage);
  }

  const compact = canonical.replace(/\s+/g, '');
  const strict = canonical.replace(/[^a-zA-Z0-9]/g, '');
  const underscored = canonical.replace(/\s+/g, '_');
  const nameVariants = [canonical, compact, strict, underscored];
  const extensions = ['jpg', 'jpeg', 'png', 'webp', 'avif'];

  nameVariants.forEach((nameVariant) => {
    const encodedName = encodeURIComponent(nameVariant);
    extensions.forEach((ext) => {
      candidates.push(`./ChampionIMG/${encodedName}Square.${ext}`);
      candidates.push(`./ChampionIMG/${encodedName}.${ext}`);
    });
  });

  if (ddragonChampionId) {
    if (ddragonVersion) {
      candidates.push(`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${ddragonChampionId}.png`);
    }
    candidates.push(`https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${ddragonChampionId}_0.jpg`);
  }

  return [...new Set(candidates)];
}

function createChampionImageElement(championName) {
  const imageCandidates = getChampionImageCandidates(championName);
  if (imageCandidates.length === 0) return null;

  const imageElement = document.createElement('img');
  imageElement.classList.add('champion-art');
  imageElement.alt = championName;
  imageElement.loading = 'lazy';
  imageElement.decoding = 'async';

  let currentCandidate = 0;
  imageElement.src = imageCandidates[currentCandidate];
  imageElement.addEventListener('error', () => {
    currentCandidate += 1;
    if (currentCandidate < imageCandidates.length) {
      imageElement.src = imageCandidates[currentCandidate];
    } else {
      imageElement.remove();
    }
  });

  return imageElement;
}

function attachChampionAutocomplete(modal, championInput, onConfirmSelection) {
  // Mobile keeps native datalist UX; desktop uses the richer image picker.
  const isPhoneLike = window.matchMedia(AUTOCOMPLETE_UI_TUNING.phoneMediaQuery).matches;
  const datalist = modal.querySelector('#championList');
  const suggestionList = isPhoneLike
    ? null
    : document.createElement('div');
  let suggestions = [];
  let activeIndex = -1;

  if (datalist) {
    datalist.innerHTML = championNames
      .map((name) => `<option value="${name}"></option>`)
      .join('');
  }

  if (isPhoneLike) {
    championInput.setAttribute('list', 'championList');
    const phoneKeydownHandler = (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        onConfirmSelection();
      }
    };
    championInput.addEventListener('keydown', phoneKeydownHandler);
    return () => {
      championInput.removeEventListener('keydown', phoneKeydownHandler);
    };
  }

  suggestionList.classList.add('champion-autocomplete', 'champion-autocomplete-floating');
  document.body.appendChild(suggestionList);

  function positionSuggestions() {
    const inputRect = championInput.getBoundingClientRect();
    const maxWidth = Math.min(
      AUTOCOMPLETE_UI_TUNING.maxPanelWidth,
      window.innerWidth - AUTOCOMPLETE_UI_TUNING.viewportPadding * 2
    );
    const desiredWidth = Math.max(
      inputRect.width,
      Math.floor(inputRect.width * AUTOCOMPLETE_UI_TUNING.panelWidthMultiplier)
    );
    const panelWidth = Math.min(maxWidth, desiredWidth);
    const unclampedLeft = inputRect.left - (panelWidth - inputRect.width) / 2;
    const left = Math.min(
      window.innerWidth - panelWidth - AUTOCOMPLETE_UI_TUNING.viewportPadding,
      Math.max(AUTOCOMPLETE_UI_TUNING.viewportPadding, unclampedLeft)
    );

    suggestionList.style.left = `${left}px`;
    suggestionList.style.top = `${inputRect.bottom + AUTOCOMPLETE_UI_TUNING.panelYOffset}px`;
    suggestionList.style.width = `${panelWidth}px`;
  }

  function hideSuggestions() {
    suggestionList.innerHTML = '';
    suggestionList.classList.remove('is-open');
    suggestions = [];
    activeIndex = -1;
  }

  function chooseSuggestion(name) {
    championInput.value = name;
    hideSuggestions();
  }

  function drawSuggestions() {
    const query = championInput.value.trim().toLowerCase();
    if (!query) {
      hideSuggestions();
      return;
    }

    suggestions = rankChampionMatches(query, FUZZY_TUNING.maxSuggestions).map((entry) => entry.name);

    if (suggestions.length === 0) {
      hideSuggestions();
      return;
    }

    suggestionList.classList.add('is-open');
    positionSuggestions();
    suggestionList.innerHTML = '';

    suggestions.forEach((name, index) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.classList.add('champion-suggestion');
      if (index === activeIndex) {
        item.classList.add('is-active');
      }

      const portrait = createChampionImageElement(name);
      if (portrait) {
        portrait.classList.add('suggestion-art');
        item.appendChild(portrait);
      } else {
        const fallback = document.createElement('span');
        fallback.classList.add('suggestion-art', 'suggestion-art-fallback');
        fallback.textContent = name.charAt(0).toUpperCase();
        item.appendChild(fallback);
      }

      const label = document.createElement('span');
      label.classList.add('suggestion-name');
      label.textContent = name;
      item.appendChild(label);

      item.addEventListener('mousedown', (event) => {
        event.preventDefault();
        chooseSuggestion(name);
        onConfirmSelection();
      });

      suggestionList.appendChild(item);
    });
  }

  championInput.addEventListener('input', () => {
    activeIndex = -1;
    drawSuggestions();
  });

  championInput.addEventListener('focus', () => {
    drawSuggestions();
  });

  championInput.addEventListener('blur', () => {
    window.setTimeout(() => hideSuggestions(), 120);
  });

  championInput.addEventListener('keydown', (event) => {
    if (!suggestions.length) {
      if (event.key === 'Enter') {
        onConfirmSelection();
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      activeIndex = (activeIndex + 1) % suggestions.length;
      drawSuggestions();
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      activeIndex = (activeIndex - 1 + suggestions.length) % suggestions.length;
      drawSuggestions();
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        chooseSuggestion(suggestions[activeIndex]);
      }
      onConfirmSelection();
      return;
    }

    if (event.key === 'Escape') {
      hideSuggestions();
    }
  });

  const repositionHandler = () => {
    if (suggestionList.classList.contains('is-open')) {
      positionSuggestions();
    }
  };
  window.addEventListener('resize', repositionHandler);
  window.addEventListener('scroll', repositionHandler, true);

  return () => {
    hideSuggestions();
    window.removeEventListener('resize', repositionHandler);
    window.removeEventListener('scroll', repositionHandler, true);
    suggestionList.remove();
  };
}

function triggerWrongAnswerFeedback() {
  if (!boardPanelElement) return;
  boardPanelElement.classList.remove('board-wrong-feedback');
  // Force reflow so the same class can retrigger on fast consecutive misses.
  void boardPanelElement.offsetWidth;
  boardPanelElement.classList.add('board-wrong-feedback');
  window.setTimeout(() => {
    boardPanelElement.classList.remove('board-wrong-feedback');
  }, 1000);
}

// Function to handle player moves
function makeMove(cellIndex) {
  if (gameOver || board[cellIndex] !== '') {
    return;
  }

  if (onlineModeEnabled) {
    if (!onlineMatched) {
      setStatus('Find an online match first.', 'info');
      return;
    }
    if (currentPlayer !== onlineSymbol) {
      setStatus('Wait for your turn.', 'info');
      return;
    }

    // Send live selection feedback as soon as this player clicks a square.
    sendOnlineMessage({
      type: 'opponent_selecting',
      roomId: onlineRoomId,
      cellIndex,
    });
  }

    const row = Math.floor(cellIndex / 3);
    const col = cellIndex % 3;
    const region = [reg1, reg2, reg3][col];
    const lane = [lane1, lane2, lane3][row];

    // Find the trivia question associated with the selected region and lane
    const normalizedRegion = normalizeRegionKey(region);
    const questionObj = trivia.find(
      (q) => normalizeRegionKey(q.region) === normalizedRegion && q.lane === lane
    );
    const correctAnswers = questionObj ? 
      trivia
        .filter((q) => normalizeRegionKey(q.region) === normalizedRegion && q.lane === lane)
        .map((q) => q.answer.toLowerCase().trim()) 
      : [];

    if (correctAnswers.length === 0) {
      // If there are no possible answers, give the point directly.
      const movePlayer = currentPlayer;
      board[cellIndex] = movePlayer;
      finishTurn(`No valid answers there. ${movePlayer} gets the square.`);

      if (onlineModeEnabled && onlineMatched) {
        // Authoritative board update packet for auto-claim cells.
        sendOnlineMessage({
          type: 'move',
          roomId: onlineRoomId,
          cellIndex,
          player: movePlayer,
          champion: '',
        });
      }
    } else {
      // Use a custom modal instead of prompt.
      const modal = document.createElement('div');
      modal.classList.add('modal');
      modal.innerHTML = `
        <div class="modal-content">
          <span class="close">&times;</span>
          <label for="championInput">${questionObj.question}</label>
          <input id="championInput" autocomplete="off" />
          <datalist id="championList"></datalist>
          <button id="confirmBtn">Confirm</button>
        </div>
      `;
      document.body.appendChild(modal);

      // Highlight the selected cell while answering
      const cellElements = boardElement.querySelectorAll('.game-grid .cell');
      if (cellElements[cellIndex]) {
        cellElements[cellIndex].classList.add('player-selecting');
      }

      // Focus on the input element.
      const championInput = modal.querySelector('#championInput');
      championInput.focus();
      let cleanupAutocomplete = () => {};

      // Close the modal when the close button is clicked.
      const closeButton = modal.querySelector('.close');
      closeButton.addEventListener('click', () => {
        setStatus(`Question closed. Player ${currentPlayer}'s turn.`, '');
        cleanupAutocomplete();
        document.body.removeChild(modal);
        // Clear selection highlight
        if (cellElements[cellIndex]) {
          cellElements[cellIndex].classList.remove('player-selecting');
        }
        // Clear opponent selection feedback
        if (onlineModeEnabled && onlineMatched) {
          opponentSelectedCell = -1;
          renderBoard();
        }
      });

      // Confirm the selected champion when the confirm button is clicked.
      const confirmButton = modal.querySelector('#confirmBtn');
      const submitAnswer = () => {
        const selectedChampion = resolveChampionInput(championInput.value);

        if (correctAnswers.includes(selectedChampion.toLowerCase().trim())) {
          const movePlayer = currentPlayer;
          const canonicalChampion = getCanonicalChampionName(selectedChampion);
          board[cellIndex] = movePlayer;
          claimedChampions[cellIndex] = canonicalChampion;
          finishTurn(`Correct. ${movePlayer} claimed that square.`);

          if (onlineModeEnabled && onlineMatched) {
            // Authoritative board update packet for a successful answer.
            sendOnlineMessage({
              type: 'move',
              roomId: onlineRoomId,
              cellIndex,
              player: movePlayer,
              champion: canonicalChampion,
            });
          }
        } else {
          const missPlayer = currentPlayer;
          triggerWrongAnswerFeedback();
          finishTurn(`Wrong answer. ${missPlayer} loses the turn.`);

          if (onlineModeEnabled && onlineMatched) {
            // Turn handoff packet when current player misses.
            sendOnlineMessage({
              type: 'turn_pass',
              roomId: onlineRoomId,
              player: missPlayer,
            });
          }
        }

        // Remove the modal from the DOM.
        cleanupAutocomplete();
        document.body.removeChild(modal);
      };

      confirmButton.addEventListener('click', submitAnswer);
      cleanupAutocomplete = attachChampionAutocomplete(modal, championInput, submitAnswer);
    }
}



// Reset the game.
function resetGame(options = {}) {
  const { reroll = false } = options;
  if (onlineModeEnabled && onlineMatched) {
    setStatus('Finish or leave the online match to reroll.', 'info');
    return;
  }
  board = ['', '', '', '', '', '', '', '', ''];
  claimedChampions = Array(9).fill('');
  currentPlayer = X_MARKER;
  gameOver = false;
  if (reroll || !lane1 || !reg1) {
    [lane1, lane2, lane3] = getRandomUniqueItems(allLanes, 3);
    [reg1, reg2, reg3] = getRandomUniqueItems(allRegions, 3);
  }
  setStatus(`Player ${currentPlayer}'s turn.`, '');
  updateRematchButtonState();
  renderBoard();
}

// Function to randomly select n items from an array.
function getRandomUniqueItems(array, n) {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function renderBoard() {
  const boardContainer = boardElement;
  boardContainer.classList.remove('board-loading');
  boardContainer.innerHTML = '';

  // Current player cell.
  const currentPlayerCell = document.createElement('div');
  currentPlayerCell.classList.add('cell', 'current-player');
  // Color-code in online mode
  if (onlineModeEnabled && onlineMatched) {
    if (currentPlayer === onlineSymbol) {
      currentPlayerCell.classList.add('online-player-turn');
    } else {
      currentPlayerCell.classList.add('online-opponent-turn');
    }
  }
  currentPlayerCell.textContent = currentPlayer;
  boardContainer.appendChild(currentPlayerCell);

  // Regions row.
  const regionsRow = document.createElement('div');
  regionsRow.classList.add('regions');
  [reg1, reg2, reg3].forEach((region) => {
    const regionCell = document.createElement('div');
    regionCell.classList.add('cell');
    regionCell.textContent = region;
    regionsRow.appendChild(regionCell);
  });
  boardContainer.appendChild(regionsRow);

  // Lanes column.
  const lanesColumn = document.createElement('div');
  lanesColumn.classList.add('lanes');
  [lane1, lane2, lane3].forEach((lane) => {
    const laneCell = document.createElement('div');
    laneCell.classList.add('cell');
    laneCell.textContent = lane;
    lanesColumn.appendChild(laneCell);
  });
  boardContainer.appendChild(lanesColumn);

  // Game grid.
  const gameGrid = document.createElement('div');
  gameGrid.classList.add('game-grid');
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.classList.add('cell');
    if (board[i]) {
      cell.classList.add('is-filled');
    }
    if (gameOver) {
      cell.classList.add('is-locked');
    }
    // Highlight opponent's selected cell
    if (i === opponentSelectedCell && opponentSelectedCell >= 0) {
      cell.classList.add('opponent-selecting');
    }
    if (board[i] && claimedChampions[i]) {
      cell.classList.add('has-champion-image');
      const championImage = createChampionImageElement(claimedChampions[i]);
      if (championImage) {
        cell.appendChild(championImage);
      }

      const markerBadge = document.createElement('span');
      markerBadge.classList.add('marker-badge', board[i] === X_MARKER ? 'marker-x' : 'marker-o');
      // If online, add color class based on who owns the marker
      if (onlineModeEnabled && onlineMatched) {
        if (board[i] === onlineSymbol) {
          markerBadge.classList.add('marker-player');
        } else {
          markerBadge.classList.add('marker-opponent');
        }
      }
      markerBadge.textContent = board[i];
      cell.appendChild(markerBadge);
      cell.title = claimedChampions[i];
    } else {
      cell.textContent = board[i];
    }
    cell.addEventListener('click', () => makeMove(i));
    gameGrid.appendChild(cell);
  }
  boardContainer.appendChild(gameGrid);

}
