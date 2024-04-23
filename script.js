// Define constants for markers
const X_MARKER = 'X';
const O_MARKER = 'O';

// Define the initial game state
let currentPlayer = X_MARKER;
let board = ['', '', '', '', '', '', '', '', ''];

const allRegions = ['Ionia', 'Demacia', 'Piltover', 'Noxus', 'Void','Darkin','Zaun','Bilgewater','Freljord','ShadowIsles','Shurima','Ixtal','Targon','BandleCity','Unknown'];
const allLanes = ['Toplane', 'Midlane', 'Botlane', 'Support', 'Jungle'];
// Champion data with regions and lanes
const championData = {
  //Toplane
  "Aatrox": [
    { region: "Darkin", lane: "Toplane", image: "/home/omar2300/tikitakalol/ChampionIMG/AatroxSquare.jpg" }
  ],
  "Akali": [
    { region: "Ionia", lane: "Toplane" },
    { region: "Ionia", lane: "Midlane" }
  ],
  "Camille": [
    { region: "Piltover", lane: "Toplane" },
    { region: "Piltover", lane: "Support" }
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
  "Gangplank": [
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
    { region: "Targon", lane: "Toplane" },
    { region: "Targon", lane: "Support" }
  ],
  "Quinn": [
    { region: "Demacia", lane: "Toplane" }
  ],
  "Rek'Sai": [
    { region: "Void", lane: "Toplane" },
    { region: "Void", lane: "Jungle"}
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
    { region: "Demacia", lane: "Toplane" },
    { region: "Demacia", lane: "Botlane" }

  ],
  "Volibear": [
    { region: "Freljord", lane: "Toplane" }
  ],
  "Yasuo": [
    { region: "Ionia", lane: "Toplane" },
    { region: "Ionia", lane: "Midlane" },
    { region: "Ionia", lane: "Botlane" }
  ],
  "Yone": [
    { region: "Ionia", lane: "Toplane" },
    { region: "Ionia", lane: "Midlane" }
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
  { region: "Freljord", lane: "Jungle" },
  { region: "Freljord", lane: "Support" }
  
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
  { region: "Unknown", lane: "Jungle" }
],
//not working 
"Fiddlesticks": [
  { region: "Unknown", lane: "Jungle" }
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
  { region: "Darkin", lane: "Jungle" }
],
"Kha'Zix": [
  { region: "Void", lane: "Jungle" }
],
"Kindred": [
  { region: "Unknown", lane: "Jungle" }
],
"Lee Sin": [
  { region: "Ionia", lane: "Jungle" }
],
"Lillia": [
  { region: "Ionia", lane: "Jungle" }
],
"Master Yi": [
  { region: "Ionia", lane: "Jungle" }
],
"Nidalee": [
  { region: "Ionia", lane: "Jungle" }
],
"Nocturne": [
  { region: "Unknown", lane: "Jungle" }
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
"Rengar": [
  { region: "Ixtal", lane: "Jungle" }
],
"Sejuani": [
  { region: "Freljord", lane: "Jungle" }
],
"Shaco": [
  { region: "Unknown", lane: "Jungle" },
  { region: "Unknown", lane: "Support" }
],
"Shyvana": [
  { region: "Demacia", lane: "Jungle" }
],
"Skarner": [
  { region: "Ixtal", lane: "Jungle" }
],
"Taliyah": [
  { region: "Shurima", lane: "Jungle" },
  { region: "Shurima", lane: "Midlane" }
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
  { region: "Unknown", lane: "Jungle" }
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
  { region: "Unknown", lane: "Midlane" }
],
"Aurelion Sol": [
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
  { region: "Ionia", lane: "Midlane" },
  { region: "Ionia", lane: "Support" }
],
"Karma": [
  { region: "Ionia", lane: "Midlane" },
  { region: "Ionia", lane: "Support" }
],
"Kassadin": [
  { region: "Void", lane: "Midlane" }
],
"Katarina": [
  { region: "Noxus", lane: "Midlane" }
],
"LeBlanc": [
  { region: "Noxus", lane: "Midlane" }
],
"Lissandra": [
  { region: "Freljord", lane: "Midlane" }
],
"Lux": [
  { region: "Demacia", lane: "Midlane" },
  { region: "Demacia", lane: "Support" }
],
"Malzahar": [
  { region: "Void", lane: "Midlane" }
],
"Naafiri": [
  { region: "Darkin", lane: "Midlane" }
],
"Neeko": [
  { region: "Ixtal", lane: "Midlane" },
  { region: "Ixtal", lane: "Support" }
],
"Orianna": [
  { region: "Piltover", lane: "Midlane" }
],
"Qiyana": [
  { region: "Ixtal", lane: "Midlane" }
],
"Ryze": [
  { region: "Unknown", lane: "Midlane" }
],
"Smolder": [
  { region: "Unknown", lane: "Midlane" },
  { region: "Unknown", lane: "Botlane" }
],
"Sylas": [
  { region: "Demacia", lane: "Midlane" }
],
"Syndra": [
  { region: "Ionia", lane: "Midlane" }
],
"Talon": [
  { region: "Noxus", lane: "Midlane" }
],
"Tristana": [
  { region: "BandleCity", lane: "Midlane" },
  { region: "BandleCity", lane: "Botlane" }
],
"Twisted Fate": [
  { region: "Bilgewater", lane: "Midlane" }
],
"Veigar": [
  { region: "BandleCity", lane: "Midlane" }
],
"Vex": [
  { region: "ShadowIsles", lane: "Midlane" }
],
"Viktor": [
  { region: "Zaun", lane: "Midlane" }
],
"Vladimir": [
  { region: "Noxus", lane: "Midlane" }

],
"Xerath": [
  { region: "Shurima", lane: "Midlane" },
  { region: "Shurima", lane: "Support" }
],
"Zed": [
  { region: "Ionia", lane: "Midlane" }
],
"Zoe": [
  { region: "Targon", lane: "Midlane" }
],
//Botlane
"Aphelios": [
  { region: "Targon", lane: "Botlane" }
],
"Ashe": [
  { region: "Freljord", lane: "Botlane" },
  { region: "Freljord", lane: "Support" }
  
],
"Caitlyn": [
  { region: "Piltover", lane: "Botlane" }
],
"Draven": [
  { region: "Noxus", lane: "Botlane" }
],
"Ezreal": [
  { region: "Piltover", lane: "Botlane" }
],
"Jhin": [
 { region: "Ionia", lane: "Botlane" }
],
"Jinx": [
  { region: "Zaun", lane: "Botlane" }
],
"Kai'Sa": [
  { region: "Void", lane: "Botlane" }
],
"Kalista": [
  { region: "ShadowIsles", lane: "Botlane" }
],
"Kog'Maw": [
  { region: "Void", lane: "Botlane" }
],
"Lucian": [
  { region: "Demacia", lane: "Botlane" }
],
"Miss Fortune": [
  { region: "Bilgewater", lane: "Botlane" }
],
"Nilah": [
  { region: "Bilgewater", lane: "Botlane" }
],
"Samira": [
  { region: "Noxus", lane: "Botlane" }
],
"Senna": [
  { region: "Unknown", lane: "Botlane" },
  { region: "Unknown", lane: "Support" }
 
],
"Sivir": [
  { region: "Shurima", lane: "Botlane" }
],
"Twitch": [
  { region: "Zaun", lane: "Botlane" }
],
"Varus": [
  { region: "Darkin", lane: "Botlane" }
],
//xavier
"Xayah": [
  { region: "Ionia", lane: "Botlane" }
],
"Zeri": [
  { region: "Zaun", lane: "Botlane" }
],
"Ziggs": [
  { region: "Zaun", lane: "Botlane" }
],
//Suport
"Alistar": [
  { region: "Unknown", lane: "Support" }
],
"Bard": [
  { region: "Targon", lane: "Support" }
],
"Blitzcrank": [
  { region: "Piltover", lane: "Support" }
],
"Braum": [
  { region: "Freljord", lane: "Support" }
],
"Janna": [
  { region: "Zaun", lane: "Support" }
],
"Leona": [
  { region: "Targon", lane: "Support" }
],
"Lulu": [
  { region: "BandleCity", lane: "Support" }
],
"Maokai": [
  { region: "ShadowIsles", lane: "Support" }
],
"Milio": [
  { region: "Ixtal", lane: "Support" }
],
"Morgana": [
  { region: "Demacia", lane: "Support" }
],
"Nami": [
  { region: "Bilgewater", lane: "Support" }
],
"Nautilus": [
  { region: "Bilgewater", lane: "Support" }
],
"Pyke": [
  { region: "Bilgewater", lane: "Support" }
],
"Rakan": [
  { region: "Ionia", lane: "Support" }
],
"Rell": [
  { region: "Noxus", lane: "Support" }
],
"Renata Glasc": [
  { region: "Zaun", lane: "Support" }
],
"Seraphine": [
  { region: "Piltover", lane: "Support" }
],
"Sona": [
  { region: "Demacia", lane: "Support" }
],
"Soraka": [
  { region: "Targon", lane: "Support" }
],
"Swain": [
  { region: "Noxus", lane: "Support" }
],
"Taric": [
  { region: "Targon", lane: "Support" }
],
"Thresh": [
  { region: "ShadowIsles", lane: "Support" }
],
"Vel'Koz": [
  { region: "Void", lane: "Support" }
],
"Yuumi": [
  { region: "BandleCity", lane: "Support" }
],
"Zilean": [
  { region: "Shurima", lane: "Support" }
],
"Zyra": [
  { region: "Ixtal", lane: "Support" }
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

    const correctAnswers = questionObj ? 
      trivia
        .filter((q) => q.region === region && q.lane === lane)
        .map((q) => q.answer.toLowerCase().trim()) 
      : [];

    if (correctAnswers.length === 0) {
      // If there are no possible answers, give the point directly
      board[cellIndex] = currentPlayer;
      currentPlayer = currentPlayer === X_MARKER ? O_MARKER : X_MARKER;
        renderBoard(); // Render the board with updated currentPlayer
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
    } else {
      // Use a custom modal instead of prompt
      const modal = document.createElement('div');
      modal.classList.add('modal');
      modal.innerHTML = `
        <div class="modal-content">
          <span class="close">&times;</span>
          <label for="championInput">${questionObj.question}</label>
          <input list="championList" id="championInput" />
          <datalist id="championList">
            <!-- Add options dynamically based on championData -->
            ${Object.keys(championData)
              .map((champion) => `<option value="${champion}"></option>`)
              .join('')}
          </datalist>
          <button id="confirmBtn">Confirm</button>
        </div>
      `;
      document.body.appendChild(modal);

      
      
      // Focus on the input element when the modal is closed
      document.getElementById('championInput').focus();

      // Close the modal when the close button is clicked
      const closeButton = modal.querySelector('.close');
      closeButton.addEventListener('click', () => {
        document.body.removeChild(modal);
      });

      // Confirm the selected champion when the confirm button is clicked
      const confirmButton = modal.querySelector('#confirmBtn');
      confirmButton.addEventListener('click', () => {
        const selectedChampion = document.getElementById('championInput').value;

        if (correctAnswers.includes(selectedChampion.toLowerCase().trim())) {
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
        } else {
          alert('Incorrect answer. Turn skipped.');
          currentPlayer = currentPlayer === X_MARKER ? O_MARKER : X_MARKER;
          renderBoard(); // Render the board with updated currentPlayer
        }

        // Remove the modal from the DOM
        document.body.removeChild(modal);
      });
      
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
// Update the datalist options with images
const datalist = document.getElementById('championList');
datalist.innerHTML = Object.entries(championData)
  .map(([champion, data]) => {
    const options = data.map(({ region, lane, image }) => {
      return `<option value="${champion}" style="background-image: url('${image}');">${champion}</option>`;
    });
    return options.join('');
  })
  .join('');
  
 
   // Add options dynamically based on championData
   for (const champion in championData) {
     const option = document.createElement('option');
     option.value = champion;
     if (championData[champion].image) {
       option.setAttribute('data-image', championData[champion].image);
     }
     championList.appendChild(option);
   }
 
}


// Initialize the game
renderBoard();
