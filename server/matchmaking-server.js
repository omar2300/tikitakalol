import { WebSocketServer } from 'ws';

const PORT = Number(process.env.MATCH_PORT || 8787);

const allRegions = [
  'Ionia',
  'Demacia',
  'Piltover',
  'Noxus',
  'Void',
  'Darkin',
  'Zaun',
  'Bilgewater',
  'Freljord',
  'ShadowIsles',
  'Shurima',
  'Ixtal',
  'Targon',
  'BandleCity',
  '?',
];
const allLanes = ['Toplane', 'Midlane', 'Botlane', 'Support', 'Jungle'];

const wss = new WebSocketServer({ port: PORT });
let waitingClient = null;
const waitingByCode = new Map(); // code -> ws
// roomId -> { players, board, currentPlayer, over }
const rooms = new Map();

function send(ws, payload) {
  if (ws && ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

function uniqueRandom(source, count) {
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function makeBoardConfig() {
  return {
    regions: uniqueRandom(allRegions, 3),
    lanes: uniqueRandom(allLanes, 3),
  };
}

function checkWinner(board) {
  const winningCombos = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const [a, b, c] of winningCombos) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

function removeClientFromRoom(ws, notifyOpponent = true) {
  if (waitingClient === ws) {
    waitingClient = null;
  }

  if (ws.waitCode && waitingByCode.get(ws.waitCode) === ws) {
    waitingByCode.delete(ws.waitCode);
  }
  ws.waitCode = null;

  const roomId = ws.roomId;
  if (!roomId || !rooms.has(roomId)) {
    ws.roomId = null;
    ws.symbol = null;
    return;
  }

  const room = rooms.get(roomId);
  const opponent = room.players.X === ws ? room.players.O : room.players.X;

  ws.roomId = null;
  ws.symbol = null;

  if (opponent) {
    opponent.roomId = null;
    opponent.symbol = null;
    if (notifyOpponent) {
      send(opponent, { type: 'opponent_left' });
    }
  }

  rooms.delete(roomId);
}

function startRoom(a, b) {
  const roomId = randomId();
  const boardConfig = makeBoardConfig();

  const aGetsX = Math.random() > 0.5;
  const xPlayer = aGetsX ? a : b;
  const oPlayer = aGetsX ? b : a;

  xPlayer.roomId = roomId;
  oPlayer.roomId = roomId;
  xPlayer.symbol = 'X';
  oPlayer.symbol = 'O';
  xPlayer.waitCode = null;
  oPlayer.waitCode = null;

  rooms.set(roomId, {
    roomId,
    players: { X: xPlayer, O: oPlayer },
    board: ['', '', '', '', '', '', '', '', ''],
    currentPlayer: 'X',
    over: false,
    rematchVotes: { X: false, O: false },
  });

  send(xPlayer, {
    type: 'matched',
    roomId,
    symbol: 'X',
    startingPlayer: 'X',
    regions: boardConfig.regions,
    lanes: boardConfig.lanes,
  });

  send(oPlayer, {
    type: 'matched',
    roomId,
    symbol: 'O',
    startingPlayer: 'X',
    regions: boardConfig.regions,
    lanes: boardConfig.lanes,
  });
}

function handleJoinRandom(ws) {
  // Simple random matchmaking: first player waits, second player creates a room.
  if (ws.roomId) {
    return;
  }

  if (!waitingClient || waitingClient.readyState !== waitingClient.OPEN || waitingClient === ws) {
    waitingClient = ws;
    ws.waitCode = null;
    send(ws, { type: 'queued' });
    return;
  }

  const opponent = waitingClient;
  waitingClient = null;
  startRoom(opponent, ws);
}

function handleJoinCode(ws, payload) {
  if (ws.roomId) {
    return;
  }

  const raw = typeof payload.code === 'string' ? payload.code : '';
  const code = raw.trim().toLowerCase();
  if (!code) {
    send(ws, { type: 'error', message: 'Enter a match code.' });
    return;
  }
  if (code.length > 32) {
    send(ws, { type: 'error', message: 'Match code is too long.' });
    return;
  }

  if (waitingClient === ws) {
    waitingClient = null;
  }

  const waiting = waitingByCode.get(code);
  if (!waiting || waiting.readyState !== waiting.OPEN || waiting === ws) {
    waitingByCode.set(code, ws);
    ws.waitCode = code;
    send(ws, { type: 'queued', code });
    return;
  }

  waitingByCode.delete(code);
  ws.waitCode = null;
  waiting.waitCode = null;
  startRoom(waiting, ws);
}

function handleMove(ws, payload) {
  // Server-authoritative move validation: turn, bounds, and cell occupancy.
  const roomId = ws.roomId;
  if (!roomId || !rooms.has(roomId)) {
    send(ws, { type: 'error', message: 'Room not found.' });
    return;
  }

  const room = rooms.get(roomId);
  if (room.over) {
    send(ws, { type: 'error', message: 'Match is already over.' });
    return;
  }

  const symbol = ws.symbol;
  if (!symbol || symbol !== room.currentPlayer) {
    send(ws, { type: 'error', message: 'Not your turn.' });
    return;
  }

  const cellIndex = Number(payload.cellIndex);
  if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex > 8) {
    send(ws, { type: 'error', message: 'Invalid cell index.' });
    return;
  }

  if (room.board[cellIndex] !== '') {
    send(ws, { type: 'error', message: 'Cell already claimed.' });
    return;
  }

  room.board[cellIndex] = symbol;
  room.currentPlayer = symbol === 'X' ? 'O' : 'X';

  // Broadcast the accepted move to both clients to keep states in sync.
  send(room.players.X, {
    type: 'move',
    roomId,
    cellIndex,
    player: symbol,
    champion: payload.champion || '',
  });

  send(room.players.O, {
    type: 'move',
    roomId,
    cellIndex,
    player: symbol,
    champion: payload.champion || '',
  });

  const winner = checkWinner(room.board);
  if (winner || !room.board.includes('')) {
    room.over = true;
  }
}

function handleTurnPass(ws) {
  // Turn-pass is also server-authoritative to prevent client desync.
  const roomId = ws.roomId;
  if (!roomId || !rooms.has(roomId)) {
    send(ws, { type: 'error', message: 'Room not found.' });
    return;
  }

  const room = rooms.get(roomId);
  if (room.over) {
    send(ws, { type: 'error', message: 'Match is already over.' });
    return;
  }

  const symbol = ws.symbol;
  if (!symbol || symbol !== room.currentPlayer) {
    send(ws, { type: 'error', message: 'Not your turn.' });
    return;
  }

  room.currentPlayer = symbol === 'X' ? 'O' : 'X';

  send(room.players.X, {
    type: 'turn_pass',
    roomId,
    player: symbol,
  });

  send(room.players.O, {
    type: 'turn_pass',
    roomId,
    player: symbol,
  });
}

function handleRematchRequest(ws) {
  const roomId = ws.roomId;
  if (!roomId || !rooms.has(roomId)) {
    send(ws, { type: 'error', message: 'Room not found.' });
    return;
  }

  const room = rooms.get(roomId);
  const symbol = ws.symbol;
  if (!symbol || !room.players[symbol]) {
    send(ws, { type: 'error', message: 'Invalid rematch requester.' });
    return;
  }

  room.rematchVotes = room.rematchVotes || { X: false, O: false };
  room.rematchVotes[symbol] = true;
  const opponentSymbol = symbol === 'X' ? 'O' : 'X';
  const opponent = room.players[opponentSymbol];

  // Wait until both players request rematch.
  if (!room.rematchVotes[opponentSymbol]) {
    send(ws, { type: 'rematch_requested' });
    send(opponent, { type: 'rematch_requested', by: symbol });
    return;
  }

  // Both accepted: swap roles and reset board state, keep room/socket pair intact.
  const previousX = room.players.X;
  const previousO = room.players.O;
  room.players.X = previousO;
  room.players.O = previousX;
  room.players.X.symbol = 'X';
  room.players.O.symbol = 'O';

  room.board = ['', '', '', '', '', '', '', '', ''];
  room.currentPlayer = 'X';
  room.over = false;
  room.rematchVotes = { X: false, O: false };
  const boardConfig = makeBoardConfig();

  send(room.players.X, {
    type: 'rematch_started',
    roomId,
    symbol: 'X',
    startingPlayer: 'X',
    regions: boardConfig.regions,
    lanes: boardConfig.lanes,
  });

  send(room.players.O, {
    type: 'rematch_started',
    roomId,
    symbol: 'O',
    startingPlayer: 'X',
    regions: boardConfig.regions,
    lanes: boardConfig.lanes,
  });
}

wss.on('connection', (ws) => {
  ws.roomId = null;
  ws.symbol = null;

  ws.on('message', (raw) => {
    let payload;
    try {
      payload = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (payload.type === 'join_random') {
      handleJoinRandom(ws);
      return;
    }

    if (payload.type === 'join_code') {
      handleJoinCode(ws, payload);
      return;
    }

    if (payload.type === 'move') {
      handleMove(ws, payload);
      return;
    }

    if (payload.type === 'turn_pass') {
      handleTurnPass(ws);
      return;
    }

    if (payload.type === 'rematch_request') {
      handleRematchRequest(ws);
      return;
    }

    if (payload.type === 'opponent_selecting') {
      // Ephemeral UX packet: tells opponent which square is being answered now.
      const roomId = ws.roomId;
      if (roomId && rooms.has(roomId)) {
        const room = rooms.get(roomId);
        const opponent = room.players.X === ws ? room.players.O : room.players.X;
        if (opponent) {
          send(opponent, {
            type: 'opponent_selecting',
            cellIndex: payload.cellIndex,
          });
        }
      }
      return;
    }

    if (payload.type === 'leave') {
      removeClientFromRoom(ws, true);
    }
  });

  ws.on('close', () => {
    removeClientFromRoom(ws, true);
  });
});

console.log(`Matchmaking server running on ws://0.0.0.0:${PORT}`);
