// Define constants for markers
const X_MARKER = 'X';
const O_MARKER = 'O';

// Define the initial game state
let currentPlayer = X_MARKER;
let board = ['', '', '', '', '', '', '', '', ''];

const allRegions = ['Ionia', 'Demacia', 'Piltover', 'Noxus', 'Void','Darken','Zaun','Bilgewater','Freljord','ShadowIsles','Shurima','Ixtal','Targon','BandleCity','?'];
const allLanes = ['Toplane', 'Midlane', 'Botlane', 'Support', 'Jungle'];
// Champion data with regions and lanes
const championData = {
  //Toplane
  "Atrox": [
    { region: "Darken", lane: "Toplane" }
  ],
  "Akali": [
    { region: "Ionia", lane: "Toplane" },
    { region: "Ionia", lane: "Midlane" }
  ],
  "Camille": [
    { region: "Piltover", lane: "Toplane" }
  ],
  "Cho'Gath": [
    { region: "Void", lane: "Toplane" }
  ],
  "Darius": [
    { region: "Noxus", lane: "Toplane" }
  ],
  "Dr. Mundo": [
    { region: "Zaun", lane: "Toplane" }
  ],
  "Fiora": [
    { region: "Demacia", lane: "Toplane" }
  ],
  "Gangkplank": [
    { region: "Bilgewater", lane: "Toplane" }
  ],
  "Garen": [
    { region: "Demacia", lane: "Toplane" }
  ],
  "Gnar": [
    { region: "Freljord", lane: "Toplane" }
  ],
  "Gragas": [
    { region: "Freljord", lane: "Toplane" },
    { region: "Freljord", lane: "Jungle" }
  ],
  "Gwen": [
    { region: "ShadowIsles", lane: "Toplane" }
  ],
  "Heimerdinger": [
    { region: "Piltover", lane: "Toplane" }
  ],
  "Illaoi": [
    { region: "Bilgewater", lane: "Toplane" }
  ],
  "Irelia": [
    { region: "Ionia", lane: "Midlane" },
    { region: "Ionia", lane: "Toplane" }
  ],
  "Jax": [
    { region: "Shurima", lane: "Toplane" }
  ],
  "Jayce": [
    { region: "Piltover", lane: "Toplane" },
    { region: "BandleCity", lane: "Midlane" }   
  ],
  //Todo: K'Sante not working not knowing why 
  "K'Sante": [
    { region: "Shurima", lane: "Toplane" }
  ],
  "Kayle": [
    { region: "Demacia", lane: "Toplane" }
  ],
  "Kennen": [
    { region: "Ionia", lane: "Toplane" }
  ],
  "Kennen": [
    { region: "Ionia", lane: "Toplane" }
  ],
  "Kled": [
    { region: "Noxus", lane: "Toplane" }
  ],
  "Malphite": [
    { region: "Ixtal", lane: "Toplane" }
  ],
  "Mordekaiser": [
    { region: "Noxus", lane: "Toplane" }
  ],
  "Nasus": [
    { region: "Shurima", lane: "Toplane" }
  ],
  "Olaf": [
    { region: "Freljord", lane: "Toplane" }
  ],
  "Ornn": [
    { region: "Freljord", lane: "Toplane" }
  ],
  "Pantheon": [
    { region: "Targon", lane: "Toplane" }
  ],
  "Quinn": [
    { region: "Demacia", lane: "Toplane" }
  ],
  "Rek'Sai": [
    { region: "void", lane: "Toplane" },
    { region: "void", lane: "Jungle"}
  ],
  "Renekton": [
    { region: "Shurima", lane: "Toplane" }
  ],
  "Riven": [
    { region: "Noxus", lane: "Toplane" }
  ],
  "Rumble": [
    { region: "BandleCity", lane: "Toplane" }
  ],
  "Sett": [
    { region: "Ionia", lane: "Toplane" }
  ],
  "Shen": [
    { region: "Ionia", lane: "Toplane" }
  ],
  "Shen": [
    { region: "Ionia", lane: "Toplane" }
  ],
  "Singed": [
    { region: "Zaun", lane: "Toplane" }
  ],
   "Sion": [
    { region: "Noxus", lane: "Toplane" }
  ],
  "Tahm Kench": [
    { region: "Bilgewater", lane: "Toplane" }
  ],
  "Teemo": [
    { region: "BandleCity", lane: "Toplane" }
  ],
  "Trundle": [
    { region: "Freljord", lane: "Toplane" }
  ],
  "Tryndamere": [
    { region: "Freljord", lane: "Toplane" }
  ],
  "Udyr": [
    { region: "Freljord", lane: "Toplane" },
    { region: "Freljord", lane: "Jungle" }
  ],
  "Urgot": [
    { region: "Zaun", lane: "Toplane" }
  ],
  "Vayne": [
    { region: "Demacia", lane: "Toplane" }
  ],
  "Volibear": [
    { region: "Freljord", lane: "Toplane" }
  ],
  "Yasuo": [
    { region: "Ionia", lane: "Toplane" }
  ],
  "Yone": [
    { region: "Ionia", lane: "Toplane" }
  ],
  "Yorick": [
    { region: "ShadowIsles", lane: "Toplane" }
  ],
  "Zac": [
    { region: "Zaun", lane: "Toplane" },
      { region: "Zaun", lane: "Jungle" }
  ],
//Jungle
"Amumu": [
  { region: "Shurima", lane: "Jungle" }
],
"Bel'Veth": [
  { region: "Void", lane: "Jungle" }
],
"Brand": [
  { region: "Freljord", lane: "Jungle" }
],
"Briar": [
  { region: "Noxus", lane: "Jungle" }
],
"Diana": [
  { region: "Targon", lane: "Jungle" },
  { region: "Targon", lane: "Midlane" }
],
"Ekko": [
  { region: "Zaun", lane: "Jungle" },
  { region: "Zaun", lane: "Midlane" }
],
"Elise": [
  { region: "ShadowIsles", lane: "Jungle" }
],
"Evelynn": [
  { region: "?", lane: "Jungle" }
],
//not working 
"Fiddlesticks": [
  { region: "?", lane: "Jungle" }
],
"Graves": [
  { region: "Bilgewater", lane: "Jungle" }
],
"Hecarim": [
  { region: "Bilgewater", lane: "Jungle" }
],
"Ivern": [
  { region: "Ionia", lane: "Jungle" }
],
"Jarvan IV": [
  { region: "Demacia", lane: "Jungle" }
],
"Karthus": [
  { region: "ShadowIsles", lane: "Jungle" }
],
"Kayn": [
  { region: "Ionia", lane: "Jungle" }
],
"Rhaast": [
  { region: "Darken", lane: "Jungle" }
],
"Kha'Zix": [
  { region: "Void", lane: "Jungle" }
],
"Kindred": [
  { region: "?", lane: "Jungle" }
],
"Lee Sin": [
  { region: "Ionia", lane: "Jungle" }
],
"Lillia": [
  { region: "Ionia", lane: "Jungle" }
],
"Lee Sin": [
  { region: "Ionia", lane: "Jungle" }
],
"Master Yi": [
  { region: "Ionia", lane: "Jungle" }
],
"Nidalee": [
  { region: "Ionia", lane: "Jungle" }
],
"Nocturne": [
  { region: "?", lane: "Jungle" }
],
"Nunu & Wilump": [
  { region: "Freljord", lane: "Jungle" }
],
"Poppy": [
  { region: "Demacia", lane: "Jungle" }
],
"Rammus": [
  { region: "Shurima", lane: "Jungle" }
],
"Renger": [
  { region: "Ixtal", lane: "Jungle" }
],
"Sejuani": [
  { region: "Freljord", lane: "Jungle" }
],
"Shaco": [
  { region: "?", lane: "Jungle" }
],
"Shyvana": [
  { region: "Demacia", lane: "Jungle" }
],
"Skarner": [
  { region: "Ixtal", lane: "Jungle" }
],
"Taliyah": [
  { region: "Shurima", lane: "Jungle" }
],
"Vi": [
  { region: "Piltover", lane: "Jungle" }
],
"Viego": [
  { region: "ShadowIsles", lane: "Jungle" }
],
"Warwick": [
  { region: "Zaun", lane: "Jungle" }
],
"Wukong": [
  { region: "Ionia", lane: "Jungle" }
],
"Xin Zhao": [
  { region: "?", lane: "Jungle" }
],
//Midlane 
"Ahri": [
  { region: "Ionia", lane: "Midlane" }
],
"Akshan": [
  { region: "Shurima", lane: "Midlane" }
],
"Anivia": [
  { region: "Freljord", lane: "Midlane" }
],
"Annie": [
  { region: "?", lane: "Midlane" }
],
"Aurelian Sol": [
  { region: "Targon", lane: "Midlane" }
],
"Azir": [
  { region: "Shurima", lane: "Midlane" }
],
"Cassiopeia": [
  { region: "Noxus", lane: "Midlane" }
],
//not working
"Corki": [
  { region: "BandleCity", lane: "Midlane" }
],
"Fizz": [
  { region: "Bilgewater", lane: "Midlane" }
],
"Galio": [
  { region: "Demacia", lane: "Midlane" }
],
"Hwei": [
  { region: "Ionia", lane: "Midlane" }
],
"Karma": [
  { region: "Ionia", lane: "Midlane" }
],
"Kassadin": [
  { region: "Void", lane: "Midlane" }
],






"Jhin": [
 { region: "Ionia", lane: "Botlane" }
],

  "Lux": [
    { region: "Demacia", lane: "Midlane" },
    { region: "Demacia", lane: "Support" }
  ],
  // Add more champion data here
};

// Generate trivia questions from the champion data
const trivia = generateTriviaQuestions(championData);

// Function to generate trivia questions from champion data
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
        const correctAnswers = trivia.filter(q => q.region === region && q.lane === lane).map(q => q.answer.toLowerCase().trim());
        if (correctAnswers.includes(playerAnswer.toLowerCase().trim())) {
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
      } if (playerAnswer === null) {
        // Player cancelled, do nothing
        return;
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
