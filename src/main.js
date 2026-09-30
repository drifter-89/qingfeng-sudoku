import './style.css';

const SAVE_KEY = 'qingfeng-sudoku-game-v1';
const BEST_KEY = 'qingfeng-sudoku-best-v1';
const DIFFICULTIES = {
  easy: { label: '简单', holes: 39 },
  medium: { label: '中等', holes: 47 },
  hard: { label: '困难', holes: 53 },
};

const boardEl = document.querySelector('#board');
const padEl = document.querySelector('#number-pad');
const timerEl = document.querySelector('#timer');
const mistakesEl = document.querySelector('#mistakes');
const hintsEl = document.querySelector('#hints');
const difficultyLabel = document.querySelector('#difficulty-label');
const pauseCover = document.querySelector('#pause-cover');
const newGameDialog = document.querySelector('#new-game-dialog');
const completeDialog = document.querySelector('#complete-dialog');
const toastEl = document.querySelector('#toast');
const installTip = document.querySelector('#install-tip');

let state;
let timerId;
let toastTimer;

function shuffled(values) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function makeSolvedBoard() {
  const pattern = (row, col) => (row * 3 + Math.floor(row / 3) + col) % 9;
  const bands = shuffled([0, 1, 2]);
  const rows = bands.flatMap((band) => shuffled([0, 1, 2]).map((row) => band * 3 + row));
  const stacks = shuffled([0, 1, 2]);
  const cols = stacks.flatMap((stack) => shuffled([0, 1, 2]).map((col) => stack * 3 + col));
  const numbers = shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  return rows.flatMap((row) => cols.map((col) => numbers[pattern(row, col)]));
}

function candidates(board, index) {
  if (board[index]) return [];
  const row = Math.floor(index / 9);
  const col = index % 9;
  const used = new Set();
  for (let i = 0; i < 9; i++) {
    used.add(board[row * 9 + i]);
    used.add(board[i * 9 + col]);
  }
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let r = startRow; r < startRow + 3; r++) {
    for (let c = startCol; c < startCol + 3; c++) used.add(board[r * 9 + c]);
  }
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((number) => !used.has(number));
}

function countSolutions(board, limit = 2) {
  let bestIndex = -1;
  let bestCandidates = null;
  for (let index = 0; index < 81; index++) {
    if (!board[index]) {
      const options = candidates(board, index);
      if (!options.length) return 0;
      if (!bestCandidates || options.length < bestCandidates.length) {
        bestIndex = index;
        bestCandidates = options;
        if (options.length === 1) break;
      }
    }
  }
  if (bestIndex === -1) return 1;
  let count = 0;
  for (const number of bestCandidates) {
    board[bestIndex] = number;
    count += countSolutions(board, limit - count);
    board[bestIndex] = 0;
    if (count >= limit) return count;
  }
  return count;
}

function makePuzzle(solution, holes) {
  const puzzle = [...solution];
  let removed = 0;
  for (const index of shuffled(Array.from({ length: 81 }, (_, i) => i))) {
    const value = puzzle[index];
    puzzle[index] = 0;
    if (countSolutions(puzzle) === 1) removed++;
    else puzzle[index] = value;
    if (removed >= holes) break;
  }
  return puzzle;
}

function blankNotes() {
  return Array.from({ length: 81 }, () => []);
}

function startNewGame(difficulty = 'medium') {
  stopTimer();
  const solution = makeSolvedBoard();
  const puzzle = makePuzzle(solution, DIFFICULTIES[difficulty].holes);
  state = {
    solution,
    puzzle,
    board: [...puzzle],
    notes: blankNotes(),
    history: [],
    difficulty,
    selected: puzzle.findIndex((value) => value === 0),
    noteMode: false,
    elapsed: 0,
    mistakes: 0,
    hintsLeft: 3,
    status: 'playing',
  };
  saveGame();
  render();
  startTimer();
}

function restoreGame() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    const valid = saved && saved.solution?.length === 81 && saved.board?.length === 81 && saved.notes?.length === 81;
    if (!valid || saved.status === 'completed') return false;
    state = { ...saved, history: saved.history || [], status: 'playing' };
    return true;
  } catch {
    return false;
  }
}

function saveGame() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function snapshot() {
  state.history.push({
    board: [...state.board],
    notes: state.notes.map((notes) => [...notes]),
    mistakes: state.mistakes,
    hintsLeft: state.hintsLeft,
  });
  if (state.history.length > 100) state.history.shift();
}

function isPeer(a, b) {
  const ar = Math.floor(a / 9), ac = a % 9;
  const br = Math.floor(b / 9), bc = b % 9;
  return ar === br || ac === bc || (Math.floor(ar / 3) === Math.floor(br / 3) && Math.floor(ac / 3) === Math.floor(bc / 3));
}

function inputNumber(number) {
  const index = state.selected;
  if (state.status !== 'playing' || index < 0 || state.puzzle[index]) return;
  snapshot();
  if (state.noteMode) {
    if (state.board[index]) state.board[index] = 0;
    const notes = state.notes[index];
    const position = notes.indexOf(number);
    if (position >= 0) notes.splice(position, 1);
    else notes.push(number);
    notes.sort();
  } else {
    state.board[index] = number;
    state.notes[index] = [];
    if (number !== state.solution[index]) {
      state.mistakes++;
      showToast('这个数字好像不太对');
    } else {
      state.notes.forEach((notes, peer) => {
        if (isPeer(index, peer)) state.notes[peer] = notes.filter((item) => item !== number);
      });
    }
  }
  saveGame();
  render();
  checkComplete();
}

function eraseSelected() {
  const index = state.selected;
  if (state.status !== 'playing' || index < 0 || state.puzzle[index]) return;
  if (!state.board[index] && !state.notes[index].length) return;
  snapshot();
  state.board[index] = 0;
  state.notes[index] = [];
  saveGame();
  render();
}

function undo() {
  if (state.status !== 'playing') return;
  const previous = state.history.pop();
  if (!previous) return showToast('还没有可以撤销的操作');
  Object.assign(state, previous);
  saveGame();
  render();
}

function useHint() {
  if (state.status !== 'playing') return;
  if (!state.hintsLeft) return showToast('这一局的提示已经用完啦');
  let index = state.selected;
  if (index < 0 || state.puzzle[index] || state.board[index] === state.solution[index]) {
    index = state.board.findIndex((value, i) => !state.puzzle[i] && value !== state.solution[i]);
  }
  if (index < 0) return;
  snapshot();
  state.selected = index;
  state.board[index] = state.solution[index];
  state.notes[index] = [];
  state.hintsLeft--;
  state.notes.forEach((notes, peer) => {
    if (isPeer(index, peer)) state.notes[peer] = notes.filter((item) => item !== state.solution[index]);
  });
  saveGame();
  render();
  checkComplete();
}

function toggleNotes() {
  if (state.status !== 'playing') return;
  state.noteMode = !state.noteMode;
  saveGame();
  renderMeta();
}

function togglePause(forcePlay = false) {
  if (state.status === 'completed') return;
  state.status = forcePlay || state.status === 'paused' ? 'playing' : 'paused';
  if (state.status === 'playing') startTimer(); else stopTimer();
  pauseCover.hidden = state.status !== 'paused';
  saveGame();
}

function moveSelection(dx, dy) {
  if (state.status !== 'playing') return;
  const current = state.selected < 0 ? 0 : state.selected;
  const row = Math.floor(current / 9);
  const col = current % 9;
  state.selected = ((row + dy + 9) % 9) * 9 + ((col + dx + 9) % 9);
  renderBoard();
}

function checkComplete() {
  if (!state.board.every((value, index) => value === state.solution[index])) return;
  state.status = 'completed';
  stopTimer();
  const best = JSON.parse(localStorage.getItem(BEST_KEY) || '{}');
  const previousBest = best[state.difficulty];
  const isBest = !previousBest || state.elapsed < previousBest;
  if (isBest) {
    best[state.difficulty] = state.elapsed;
    localStorage.setItem(BEST_KEY, JSON.stringify(best));
  }
  localStorage.removeItem(SAVE_KEY);
  document.querySelector('#result-time').textContent = formatTime(state.elapsed);
  document.querySelector('#result-mistakes').textContent = state.mistakes;
  document.querySelector('#result-best').textContent = formatTime(best[state.difficulty]);
  document.querySelector('#complete-copy').textContent = isBest ? '新的最佳成绩，今天状态真不错。' : `你完成了${DIFFICULTIES[state.difficulty].label}难度。`;
  completeDialog.showModal();
}

function render() {
  renderBoard();
  renderPad();
  renderMeta();
  pauseCover.hidden = state.status !== 'paused';
}

function renderBoard() {
  boardEl.replaceChildren();
  const selectedValue = state.selected >= 0 ? state.board[state.selected] : 0;
  state.board.forEach((value, index) => {
    const button = document.createElement('button');
    const row = Math.floor(index / 9);
    const col = index % 9;
    button.type = 'button';
    button.className = 'cell';
    button.setAttribute('role', 'gridcell');
    button.setAttribute('aria-label', `第 ${row + 1} 行第 ${col + 1} 列${value ? `，数字 ${value}` : '，空白'}`);
    if (col === 2 || col === 5) button.classList.add('box-right');
    if (row === 2 || row === 5) button.classList.add('box-bottom');
    if (state.selected >= 0 && isPeer(index, state.selected)) button.classList.add('peer');
    if (selectedValue && value === selectedValue) button.classList.add('same');
    if (index === state.selected) button.classList.add('selected');
    if (state.puzzle[index]) button.classList.add('given');
    else if (value) button.classList.add('user-value');
    if (value && !state.puzzle[index] && value !== state.solution[index]) button.classList.add('wrong');
    if (value) button.textContent = value;
    else if (state.notes[index].length) {
      const notesGrid = document.createElement('span');
      notesGrid.className = 'notes-grid';
      for (let number = 1; number <= 9; number++) {
        const note = document.createElement('i');
        note.textContent = state.notes[index].includes(number) ? number : '';
        notesGrid.append(note);
      }
      button.append(notesGrid);
    }
    button.addEventListener('click', () => {
      if (state.status !== 'playing') return;
      state.selected = index;
      renderBoard();
    });
    boardEl.append(button);
  });
}

function renderPad() {
  padEl.replaceChildren();
  for (let number = 1; number <= 9; number++) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'number-button';
    button.textContent = number;
    button.setAttribute('aria-label', `输入数字 ${number}`);
    if (state.board.filter((value) => value === number).length === 9) button.classList.add('done');
    button.addEventListener('click', () => inputNumber(number));
    padEl.append(button);
  }
}

function renderMeta() {
  difficultyLabel.textContent = DIFFICULTIES[state.difficulty].label;
  mistakesEl.textContent = state.mistakes;
  hintsEl.textContent = state.hintsLeft;
  timerEl.textContent = formatTime(state.elapsed);
  const notesButton = document.querySelector('[data-action="notes"]');
  notesButton.classList.toggle('active', state.noteMode);
  notesButton.setAttribute('aria-pressed', String(state.noteMode));
  document.querySelector('#notes-badge').textContent = state.noteMode ? '开' : '关';
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function startTimer() {
  stopTimer();
  timerId = window.setInterval(() => {
    if (state.status !== 'playing') return;
    state.elapsed++;
    timerEl.textContent = formatTime(state.elapsed);
    if (state.elapsed % 5 === 0) saveGame();
  }, 1000);
}

function stopTimer() {
  window.clearInterval(timerId);
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toastEl.textContent = message;
  toastEl.classList.add('show');
  toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 1800);
}

document.querySelector('#new-game-button').addEventListener('click', () => newGameDialog.showModal());
document.querySelector('#difficulty-button').addEventListener('click', () => newGameDialog.showModal());
document.querySelectorAll('[data-start]').forEach((button) => {
  button.addEventListener('click', () => startNewGame(button.dataset.start));
});
document.querySelector('#complete-new-game').addEventListener('click', () => {
  window.setTimeout(() => newGameDialog.showModal(), 0);
});
pauseCover.addEventListener('click', () => togglePause(true));
document.querySelector('.toolbar').addEventListener('click', (event) => {
  const action = event.target.closest('button')?.dataset.action;
  if (action === 'undo') undo();
  if (action === 'erase') eraseSelected();
  if (action === 'notes') toggleNotes();
  if (action === 'hint') useHint();
  if (action === 'pause') togglePause();
});

document.addEventListener('keydown', (event) => {
  if (newGameDialog.open || completeDialog.open) return;
  if (/^[1-9]$/.test(event.key)) inputNumber(Number(event.key));
  else if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') eraseSelected();
  else if (event.key.toLowerCase() === 'n') toggleNotes();
  else if (event.key === 'ArrowLeft') moveSelection(-1, 0);
  else if (event.key === 'ArrowRight') moveSelection(1, 0);
  else if (event.key === 'ArrowUp') moveSelection(0, -1);
  else if (event.key === 'ArrowDown') moveSelection(0, 1);
  else if (event.key === ' ') togglePause();
});

window.addEventListener('beforeunload', saveGame);

// HTTPS 网页启用离线缓存；Electron 的 file:// 桌面版不注册 Service Worker。
if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL });
  });
}

const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
if (isIos && !isStandalone && localStorage.getItem('qingfeng-install-tip-dismissed') !== '1') {
  installTip.hidden = false;
}
document.querySelector('#dismiss-install-tip').addEventListener('click', () => {
  installTip.hidden = true;
  localStorage.setItem('qingfeng-install-tip-dismissed', '1');
});

if (!restoreGame()) startNewGame('medium');
else {
  render();
  startTimer();
}
