// Define constants for markers
const X_MARKER = 'X';
const O_MARKER = 'O';

// Define the initial game state
let currentPlayer = X_MARKER;
let board = ['', '', '', '', '', '', '', '', ''];

const allRegions = ['Ionia', 'Demacia', 'Piltover', 'Noxus', 'Void'];
const allLanes = ['Toplane', 'Midlane', 'Botlane', 'Support', 'Jungle'];

// League of Legends trivia questions
const trivia = [
  {
    region: 'Ionia',
    lane: 'Toplane',
    question:
      'Which champion is associated with the region of Ionia and the role of Toplane?',
    answer: 'Kennen',
  },
  {
    region: 'Ionia',
    lane: 'Midlane',
    question:
      'Which champion is associated with the region of Ionia and the role of Midlane?',
    answer: 'Irelia',
  },
  {
    region: 'Ionia',
    lane: 'Toplane',
    question:
      'Which champion is associated with the region of Ionia and the role of Toplane?',
    answer: 'Irelia',
  },
  {
    region: 'Ionia',
    lane: 'Botlane',
    question:
      'Which champion is associated with the region of Ionia and the role of Botlane?',
    answer: 'Jhin',
  },
  {
    region: 'Demacia',
    lane: 'Toplane',
    question:
      'Which champion is associated with the region of Demacia and the role of Toplane?',
    answer: 'Garen',
  },
  {
    region: 'Demacia',
    lane: 'Midlane',
    question:
      'Which champion is associated with the region of Demacia and the role of Midlane?',
    answer: 'Lux',
  },
  {
    region: 'Demacia',
    lane: 'Support',
    question:
      'Which champion is associated with the region of Demacia and the role of Support?',
    answer: 'Lux',
  },
  {
    region: 'Demacia',
    lane: 'Botlane',
    question:
      'Which champion is associated with the region of Demacia and the role of Botlane?',
    answer: 'Vayne',
  },
  
  {
    region: 'Ionia',
    lane: 'Support',
    question:
      'Which champion is associated with the region of Ionia and the role of Support?',
    answer: 'Karma',
  },
  {
    region: 'Ionia',
    lane: 'Jungle',
    question:
      'Which champion is associated with the region of Ionia and the role of Jungle?',
    answer: 'Master Yi',
  },
  {
    region: 'Demacia',
    lane: 'Jungle',
    question:
      'Which champion is associated with the region of Demacia and the role of Jungle?',
    answer: 'Jarvan IV',
  },
  {
    region: 'Piltover',
    lane: 'Jungle',
    question:
      'Which champion is associated with the region of Piltover and the role of Jungle?',
    answer: 'Vi',
  },
  {
    region: 'Noxus',
    lane: 'Support',
    question:
      'Which champion is associated with the region of Noxus and the role of Support?',
    answer: 'Swain',
  },
  {
    region: 'Noxus',
    lane: 'Midlane',
    question:
      'Which champion is associated with the region of Noxus and the role of Midlane?',
    answer: 'Swain',
  },
  {
    region: 'Void',
    lane: 'Support',
    question:
      'Which champion is associated with the region of Void and the role of Support?',
    answer: "Vel'Koz",
  },
  {
    region: 'Void',
    lane: 'Midlane',
    question:
      'Which champion is associated with the region of Void and the role of Midlane?',
    answer: "Vel'Koz",
  },
  {
    region: 'Void',
    lane: 'Jungle',
    question:
      'Which champion is associated with the region of Void and the role of Jungle?',
    answer: "Rek'Sai",
  },
  {
    region: 'Piltover',
    lane: 'Toplane',
    question:
      'Which champion is associated with the region of Piltover and the role of Toplane?',
    answer: 'camille',
  },
  {
    region: 'Void',
    lane: 'Toplane',
    question:
      'Which champion is associated with the region of Void and the role of Toplane?',
    answer: "Cho'Gath",
  },
  {
    region: 'Void',
    lane: 'Midlane',
    question:
      'Which champion is associated with the region of Void and the role of Midlane?',
    answer: 'Malzahar',
  },
  {
    region: 'Void',
    lane: 'Botlane',
    question:
      'Which champion is associated with the region of Void and the role of Botlane?',
    answer: "Kai'Sa",
  },
  {
    region: 'Void',
    lane: 'Support',
    question:
      'Which champion is associated with the region of Void and the role of Support?',
    answer: "Vel'Koz",
  },
  {
    region: 'Noxus',
    lane: 'Jungle',
    question:
      'Which champion is associated with the region of Noxus and the role of Jungle?',
    answer: 'Katarina',
  },
  {
    region: 'Void',
    lane: 'Jungle',
    question:
      'Which champion is associated with the region of Void and the role of Jungle?',
    answer: "Rek'Sai",
  },
  {
    region: 'Piltover',
    lane: 'Toplane',
    question:
      'Which champion is associated with the region of Piltover and the role of Toplane?',
    answer: 'Jayce',
  },
  {
    region: 'Piltover',
    lane: 'Midlane',
    question:
      'Which champion is associated with the region of Piltover and the role of Midlane?',
    answer: 'Orianna',
  },
  {
    region: 'Piltover',
    lane: 'Botlane',
    question:
      'Which champion is associated with the region of Piltover and the role of Botlane?',
    answer: 'Jinx',
  },
  {
    region: 'Noxus',
    lane: 'Toplane',
    question:
      'Which champion is associated with the region of Noxus and the role of Toplane?',
    answer: 'Darius',
  },
  {
    region: 'Noxus',
    lane: 'Botlane',
    question:
      'Which champion is associated with the region of Noxus and the role of Botlane?',
    answer: 'Draven',
  },

  // Add more trivia questions here
];
let [lane1, lane2, lane3] = getRandomUniqueItems(allLanes, 3);
let [reg1, reg2, reg3] = getRandomUniqueItems(allRegions, 3);
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
// Function to handle player moves
function makeMove(cellIndex) {
  if (board[cellIndex] === '') {
    // Find the region and lane associated with the selected cell
    const row = Math.floor(cellIndex / 3); // Row index
    const col = cellIndex % 3; // Column index
    const region =
      document.getElementsByClassName('regions')[0].children[col].textContent;
    const lane =
      document.getElementsByClassName('lanes')[0].children[row + 1].textContent;

    // Find the trivia question associated with the selected region and lane
    const questionObj = trivia.find(
      (q) => q.region === region && q.lane === lane
    );

    // Prompt the player with the trivia question
    if (questionObj) {
      const playerAnswer = prompt(questionObj.question);
      if (playerAnswer) {
        const correctAnswer = questionObj.answer.toLowerCase().trim();
        if (playerAnswer.toLowerCase().trim() === correctAnswer) {
          board[cellIndex] = currentPlayer;
          renderBoard(); // Render the board without updating lanes and regions
          const winner = checkWinner();
          if (winner) {
            alert(`Player ${winner} wins!`);
            resetGame();
          } else if (!board.includes('')) {
            alert("It's a draw!");
            resetGame();
          } else {
            currentPlayer = currentPlayer === X_MARKER ? O_MARKER : X_MARKER;
            renderBoard(); // Render the board with updated currentPlayer
          }
          return;
        }
      }
      currentPlayer = currentPlayer === X_MARKER ? O_MARKER : X_MARKER;
      renderBoard(); // Render the board with updated currentPlayer
      alert('Incorrect answer. Turn skipped.');
      return;
    } else {
      alert('No trivia question found for this region and lane.');
      // No trivia question found, allow the player to place their marker
      board[cellIndex] = currentPlayer;
      renderBoard();
      const winner = checkWinner();
      if (winner) {
        alert(`Player ${winner} wins!`);
        resetGame();
      } else if (!board.includes('')) {
        alert("It's a draw!");
        resetGame();
      } else {
        currentPlayer = currentPlayer === X_MARKER ? O_MARKER : X_MARKER;
        renderBoard(); // Render the board with updated currentPlayer
      }
    }
  }
}

// Function to reset the game
function resetGame() {
  board = ['', '', '', '', '', '', '', '', ''];
  currentPlayer = X_MARKER;
  // Randomly select 3 unique lanes and regions
  [lane1, lane2, lane3] = getRandomUniqueItems(allLanes, 3);
  [reg1, reg2, reg3] = getRandomUniqueItems(allRegions, 3);
  renderBoard(); // Render the board with new lanes and regions
}

// Function to randomly select n items from an array, too make it uniqe
function getRandomUniqueItems(array, n) {
  const shuffled = array.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// Function to render the game board
function renderBoard() {
  const boardContainer = document.getElementById('board');
  boardContainer.innerHTML = '';

  // Display lanes on the left side
  const lanesContainer = document.createElement('div');
  lanesContainer.classList.add('lanes');
  [currentPlayer, lane1, lane2, lane3].forEach((lane) => {
    const laneCell = document.createElement('div');
    laneCell.classList.add('cell');
    laneCell.textContent = lane;
    lanesContainer.appendChild(laneCell);
  });
  boardContainer.appendChild(lanesContainer);

  // Display regions on top
  const regionsRow = document.createElement('div');
  regionsRow.classList.add('row', 'regions');
  [reg1, reg2, reg3].forEach((region) => {
    const regionCell = document.createElement('div');
    regionCell.classList.add('cell');
    regionCell.textContent = region;
    regionsRow.appendChild(regionCell);
  });
  boardContainer.appendChild(regionsRow);

  // Render the game board
  for (let i = 0; i < 9; i++) {
    if (i % 3 === 0) {
      const column = document.createElement('div');
      column.classList.add('column');
      boardContainer.appendChild(column);
    }
    const cell = document.createElement('div');
    cell.classList.add('cell');
    cell.textContent = board[i];
    cell.addEventListener('click', () => makeMove(i));
    boardContainer.lastChild.appendChild(cell);
  }
}

// Initialize the game
renderBoard();
