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

function handleJoinRandom(ws) {
  if (ws.roomId) {
    return;
  }

  if (!waitingClient || waitingClient.readyState !== waitingClient.OPEN || waitingClient === ws) {
    waitingClient = ws;
    send(ws, { type: 'queued' });
    return;
  }

  const opponent = waitingClient;
  waitingClient = null;

  const roomId = randomId();
  const boardConfig = makeBoardConfig();

  const waitingGetsX = Math.random() > 0.5;
  const xPlayer = waitingGetsX ? opponent : ws;
  const oPlayer = waitingGetsX ? ws : opponent;

  xPlayer.roomId = roomId;
  oPlayer.roomId = roomId;
  xPlayer.symbol = 'X';
  oPlayer.symbol = 'O';

  rooms.set(roomId, {
    roomId,
    players: { X: xPlayer, O: oPlayer },
    board: ['', '', '', '', '', '', '', '', ''],
    currentPlayer: 'X',
    over: false,
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

function handleMove(ws, payload) {
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

    if (payload.type === 'move') {
      handleMove(ws, payload);
      return;
    }

    if (payload.type === 'turn_pass') {
      handleTurnPass(ws);
      return;
    }

    if (payload.type === 'opponent_selecting') {
      // Broadcast opponent's selection to the waiting player
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
