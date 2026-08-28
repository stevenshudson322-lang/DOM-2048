(function () {
  "use strict";

  const GRID_SIZE = 4;
  const WIN_VALUE = 2048;
  const STORAGE_KEY_BEST = "2048-best-score";

  const boardEl = document.getElementById("board");
  const gridCellsEl = document.getElementById("grid-cells");
  const tileContainerEl = document.getElementById("tile-container");
  const scoreEl = document.getElementById("score");
  const bestScoreEl = document.getElementById("best-score");
  const newGameBtn = document.getElementById("new-game-btn");
  const tryAgainBtn = document.getElementById("try-again-btn");
  const messageOverlay = document.getElementById("message-overlay");
  const messageText = document.getElementById("message-text");

  function readBestScore() {
    try {
      return Number(localStorage.getItem(STORAGE_KEY_BEST)) || 0;
    } catch (err) {
      return 0;
    }
  }

  function writeBestScore(value) {
    try {
      localStorage.setItem(STORAGE_KEY_BEST, String(value));
    } catch (err) {
      // Storage unavailable (e.g. some browsers restrict it for local
      // file:// pages) - best score just won't persist across reloads.
    }
  }

  /** @type {(number|null)[][]} */
  let grid = [];
  let score = 0;
  let bestScore = readBestScore();
  let tileIdCounter = 0;
  let hasWon = false;
  let isGameOver = false;

  function createEmptyGrid() {
    return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
  }

  function buildGridCellsBackground() {
    gridCellsEl.innerHTML = "";
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
      const cell = document.createElement("div");
      cell.className = "grid-cell";
      gridCellsEl.appendChild(cell);
    }
  }

  const CELL_GAP_PX = 12;

  function getMetrics() {
    const styles = getComputedStyle(tileContainerEl);
    const paddingLeft = parseFloat(styles.paddingLeft) || 0;
    const paddingRight = parseFloat(styles.paddingRight) || 0;
    const innerWidth = tileContainerEl.clientWidth - paddingLeft - paddingRight;
    const cellSize = (innerWidth - CELL_GAP_PX * (GRID_SIZE - 1)) / GRID_SIZE;
    return { cellSize, gap: CELL_GAP_PX };
  }

  function getTileBox(row, col, cellSize, gap) {
    return {
      left: col * (cellSize + gap),
      top: row * (cellSize + gap),
      size: cellSize,
    };
  }

  function getRandomEmptyCell() {
    const empty = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c] === null) empty.push({ r, c });
      }
    }
    if (empty.length === 0) return null;
    return empty[Math.floor(Math.random() * empty.length)];
  }

  function addRandomTile() {
    const cell = getRandomEmptyCell();
    if (!cell) return null;
    const value = Math.random() < 0.9 ? 2 : 4;
    grid[cell.r][cell.c] = value;
    return { ...cell, value };
  }

  function tileClassForValue(value) {
    return value <= WIN_VALUE ? `tile-${value}` : "tile-super";
  }

  function render(newTileCells, mergedCells) {
    tileContainerEl.innerHTML = "";
    const { cellSize, gap } = getMetrics();

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const value = grid[r][c];
        if (value === null) continue;

        const tile = document.createElement("div");
        tile.className = `tile ${tileClassForValue(value)}`;

        const { left, top, size } = getTileBox(r, c, cellSize, gap);
        tile.style.left = `${left}px`;
        tile.style.top = `${top}px`;
        tile.style.width = `${size}px`;
        tile.style.height = `${size}px`;

        const isNew = newTileCells && newTileCells.some((cell) => cell.r === r && cell.c === c);
        const isMerged = mergedCells && mergedCells.some((cell) => cell.r === r && cell.c === c);
        if (isNew) tile.classList.add("tile-new");
        if (isMerged) tile.classList.add("tile-merged");

        tileContainerEl.appendChild(tile);
      }
    }

    scoreEl.textContent = String(score);
    bestScoreEl.textContent = String(bestScore);
  }

  function updateBestScore() {
    if (score > bestScore) {
      bestScore = score;
      writeBestScore(bestScore);
    }
  }

  function showMessage(text) {
    messageText.textContent = text;
    messageOverlay.classList.remove("hidden");
  }

  function hideMessage() {
    messageOverlay.classList.add("hidden");
  }

  function startNewGame() {
    grid = createEmptyGrid();
    score = 0;
    hasWon = false;
    isGameOver = false;
    tileIdCounter = 0;
    hideMessage();
    addRandomTile();
    addRandomTile();
    render();
  }

  /**
   * Collapses a single line (array of values, empty slots as null) to the left,
   * merging equal adjacent values once per move, and returns the resulting line
   * plus the indices where a merge occurred and whether the line changed.
   */
  function collapseLine(line) {
    const values = line.filter((v) => v !== null);
    const result = [];
    const mergedIndices = [];
    let gained = 0;

    for (let i = 0; i < values.length; i++) {
      if (i < values.length - 1 && values[i] === values[i + 1]) {
        const mergedValue = values[i] * 2;
        result.push(mergedValue);
        mergedIndices.push(result.length - 1);
        gained += mergedValue;
        i++;
      } else {
        result.push(values[i]);
      }
    }

    while (result.length < GRID_SIZE) result.push(null);

    const changed = line.some((v, idx) => v !== result[idx]);

    return { result, mergedIndices, gained, changed };
  }

  function getLine(r, c, dr, dc) {
    const line = [];
    let row = r;
    let col = c;
    while (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
      line.push(grid[row][col]);
      row += dr;
      col += dc;
    }
    return line;
  }

  function setLine(r, c, dr, dc, values) {
    let row = r;
    let col = c;
    let i = 0;
    while (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
      grid[row][col] = values[i];
      row += dr;
      col += dc;
      i++;
    }
  }

  /**
   * direction: "up" | "down" | "left" | "right"
   * Each move is expressed as iterating GRID_SIZE lines, each walked in the
   * direction tiles should slide toward (dr/dc), starting from the edge
   * opposite that direction.
   */
  const MOVE_CONFIG = {
    left: { dr: 0, dc: 1, startCells: (i) => ({ r: i, c: 0 }) },
    right: { dr: 0, dc: -1, startCells: (i) => ({ r: i, c: GRID_SIZE - 1 }) },
    up: { dr: 1, dc: 0, startCells: (i) => ({ r: 0, c: i }) },
    down: { dr: -1, dc: 0, startCells: (i) => ({ r: GRID_SIZE - 1, c: i }) },
  };

  function move(direction) {
    if (isGameOver) return;

    const config = MOVE_CONFIG[direction];
    let anyChanged = false;
    let totalGained = 0;
    const mergedCells = [];

    for (let i = 0; i < GRID_SIZE; i++) {
      const { r, c } = config.startCells(i);
      const line = getLine(r, c, config.dr, config.dc);
      const { result, mergedIndices, gained, changed } = collapseLine(line);

      if (changed) {
        anyChanged = true;
        setLine(r, c, config.dr, config.dc, result);

        mergedIndices.forEach((idx) => {
          let row = r + config.dr * idx;
          let col = c + config.dc * idx;
          mergedCells.push({ r: row, c: col });
        });
      }
      totalGained += gained;
    }

    if (!anyChanged) return;

    score += totalGained;
    updateBestScore();

    const newTile = addRandomTile();
    render(newTile ? [newTile] : [], mergedCells);

    checkWin();
    checkGameOver();
  }

  function checkWin() {
    if (hasWon) return;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c] === WIN_VALUE) {
          hasWon = true;
          showMessage("You Win!");
          return;
        }
      }
    }
  }

  function hasAnyMovesLeft() {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c] === null) return true;
        const right = c < GRID_SIZE - 1 ? grid[r][c + 1] : null;
        const down = r < GRID_SIZE - 1 ? grid[r + 1][c] : null;
        if (grid[r][c] === right || grid[r][c] === down) return true;
      }
    }
    return false;
  }

  function checkGameOver() {
    if (!hasAnyMovesLeft()) {
      isGameOver = true;
      showMessage("Game Over!");
    }
  }

  const KEY_TO_DIRECTION = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    s: "down",
    a: "left",
    d: "right",
  };

  function handleKeydown(event) {
    const direction = KEY_TO_DIRECTION[event.key];
    if (!direction) return;
    event.preventDefault();
    move(direction);
  }

  let touchStartX = 0;
  let touchStartY = 0;

  function handleTouchStart(event) {
    const touch = event.changedTouches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }

  function handleTouchEnd(event) {
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const SWIPE_THRESHOLD = 30;

    if (Math.max(absDx, absDy) < SWIPE_THRESHOLD) return;

    if (absDx > absDy) {
      move(dx > 0 ? "right" : "left");
    } else {
      move(dy > 0 ? "down" : "up");
    }
  }

  function handleResize() {
    render();
  }

  function init() {
    buildGridCellsBackground();
    bestScoreEl.textContent = String(bestScore);
    startNewGame();

    document.addEventListener("keydown", handleKeydown);
    boardEl.addEventListener("touchstart", handleTouchStart, { passive: true });
    boardEl.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("resize", handleResize);

    newGameBtn.addEventListener("click", startNewGame);
    tryAgainBtn.addEventListener("click", startNewGame);
  }

  init();
})();
