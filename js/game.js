const Canvas = document.getElementById('gameCanvas');
const Ctx = Canvas.getContext('2d');

// 响应式画布大小
function getCanvasSize() {
    const maxWidth = Math.min(window.innerWidth - 60, 450);
    return Math.floor(maxWidth / 9) * 9;
}

const CELL_SIZE = 50;
const PADDING = 25;
const BOARD_WIDTH = CELL_SIZE * 8;
const BOARD_HEIGHT = CELL_SIZE * 9;
const CANVAS_WIDTH = BOARD_WIDTH + PADDING * 2;
const CANVAS_HEIGHT = BOARD_HEIGHT + PADDING * 2;

Canvas.width = CANVAS_WIDTH;
Canvas.height = CANVAS_HEIGHT;

// 响应式缩放
function resizeCanvas() {
    const scale = Math.min(1, (window.innerWidth - 60) / CANVAS_WIDTH);
    Canvas.style.width = (CANVAS_WIDTH * scale) + 'px';
    Canvas.style.height = (CANVAS_HEIGHT * scale) + 'px';
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// 棋子类型
const PIECE_TYPES = {
    GENERAL: 'general',
    ADVISOR: 'advisor',
    ELEPHANT: 'elephant',
    HORSE: 'horse',
    CHARIOT: 'chariot',
    CANNON: 'cannon',
    SOLDIER: 'soldier'
};

// 棋子中文名称
const PIECE_NAMES = {
    red: {
        general: '帅',
        advisor: '仕',
        elephant: '相',
        horse: '马',
        chariot: '车',
        cannon: '炮',
        soldier: '兵'
    },
    black: {
        general: '将',
        advisor: '士',
        elephant: '象',
        horse: '马',
        chariot: '车',
        cannon: '炮',
        soldier: '卒'
    }
};

// 初始棋盘布局
const INITIAL_BOARD = [
    // 黑方 (上方)
    ['black_chariot', 'black_horse', 'black_elephant', 'black_advisor', 'black_general', 'black_advisor', 'black_elephant', 'black_horse', 'black_chariot'],
    [null, null, null, null, null, null, null, null, null],
    [null, 'black_cannon', null, null, null, null, null, 'black_cannon', null],
    ['black_soldier', null, 'black_soldier', null, 'black_soldier', null, 'black_soldier', null, 'black_soldier'],
    [null, null, null, null, null, null, null, null, null],
    // 楚河汉界
    [null, null, null, null, null, null, null, null, null],
    ['red_soldier', null, 'red_soldier', null, 'red_soldier', null, 'red_soldier', null, 'red_soldier'],
    [null, 'red_cannon', null, null, null, null, null, 'red_cannon', null],
    [null, null, null, null, null, null, null, null, null],
    // 红方 (下方)
    ['red_chariot', 'red_horse', 'red_elephant', 'red_advisor', 'red_general', 'red_advisor', 'red_elephant', 'red_horse', 'red_chariot']
];

class ChineseChessGame {
    constructor() {
        this.aiEnabled = false;
        this.aiDifficulty = 3; // 默认中级难度
        this.init();
        this.bindEvents();
    }

    init() {
                this.board = JSON.parse(JSON.stringify(INITIAL_BOARD));
                this.currentTurn = 'red';
                this.selectedPiece = null;
                this.validMoves = [];
                this.history = [];
                this.gameOver = false;
                this.aiThinking = false;
                this.lastMove = null;
                this.inCheck = { red: false, black: false };
                this.updateUI();
                this.draw();
            }

            restart() {
                // 保存当前AI设置
                const wasAiEnabled = this.aiEnabled;
                const currentDifficulty = this.aiDifficulty;
                
                this.init();
                document.getElementById('gameStatus').textContent = '';
                document.getElementById('undoBtn').disabled = true;
                
                // 恢复AI设置
                this.aiEnabled = wasAiEnabled;
                this.aiDifficulty = currentDifficulty;
                
                // 更新UI以反映AI状态
                const btn = document.getElementById('aiBtn');
                const diffBtn = document.getElementById('difficultyBtn');
                const diffDesc = document.getElementById('difficultyDesc');
                
                if (this.aiEnabled) {
                    // 为本局抽取一个算法（按难度算法池加权随机）
                    ChineseChessAI.selectAlgorithm(this.aiDifficulty);
                    btn.textContent = `AI: ${ChineseChessAI.getDifficultyName(this.aiDifficulty)}`;
                    btn.classList.add('active');
                    diffBtn.style.display = 'inline-block';
                    diffBtn.textContent = `难度: ${ChineseChessAI.getDifficultyName(this.aiDifficulty)}`;
                    diffDesc.textContent = ChineseChessAI.getDifficultyDesc(this.aiDifficulty);
                } else {
                    btn.textContent = 'AI对战: 关';
                    btn.classList.remove('active');
                    diffBtn.style.display = 'none';
                    diffDesc.textContent = '';
                }
            }

            toggleAI() {
                this.aiEnabled = !this.aiEnabled;
                this.restart();
            }

            cycleDifficulty() {
                if (!this.aiEnabled) return;
                this.aiDifficulty = this.aiDifficulty >= 5 ? 1 : this.aiDifficulty + 1;
                this.restart();
            }

    // 获取棋子信息
    getPieceInfo(pieceKey) {
        if (!pieceKey) return null;
        const [color, type] = pieceKey.split('_');
        return { color, type, key: pieceKey };
    }

    // 检查位置是否在棋盘内
    isValidPos(row, col) {
        return row >= 0 && row < 10 && col >= 0 && col < 9;
    }

    // 检查是否是己方棋子
    isOwnPiece(row, col, color) {
        const piece = this.board[row][col];
        return piece && piece.startsWith(color);
    }

    // 检查是否是敌方棋子
    isEnemyPiece(row, col, color) {
        const piece = this.board[row][col];
        return piece && !piece.startsWith(color);
    }

    // 获取所有棋子位置
    getAllPieces(color) {
        const pieces = [];
        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 9; c++) {
                if (this.board[r][c] && this.board[r][c].startsWith(color)) {
                    pieces.push({ row: r, col: c, key: this.board[r][c] });
                }
            }
        }
        return pieces;
    }

    // 查找将/帅位置
    findGeneral(color) {
        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 9; c++) {
                const piece = this.board[r][c];
                if (piece === `${color}_general`) {
                    return { row: r, col: c };
                }
            }
        }
        return null;
    }

    // 检查是否飞将（两帅相对）
    isFlyingGeneral() {
        const redGeneral = this.findGeneral('red');
        const blackGeneral = this.findGeneral('black');
        if (!redGeneral || !blackGeneral) return false;
        if (redGeneral.col !== blackGeneral.col) return false;

        const col = redGeneral.col;
        const minRow = Math.min(redGeneral.row, blackGeneral.row);
        const maxRow = Math.max(redGeneral.row, blackGeneral.row);

        for (let r = minRow + 1; r < maxRow; r++) {
            if (this.board[r][col]) return false;
        }
        return true;
    }

    // 获取棋子的合法移动（不考虑将军）
    getRawMoves(row, col) {
        const piece = this.getPieceInfo(this.board[row][col]);
        if (!piece) return [];

        const moves = [];
        const { color, type } = piece;

        switch (type) {
            case PIECE_TYPES.GENERAL:
                // 将帅移动：九宫内一步
                const gDirections = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                for (const [dr, dc] of gDirections) {
                    const nr = row + dr;
                    const nc = col + dc;
                    if (this.isGeneralValidPos(color, nr, nc) && !this.isOwnPiece(nr, nc, color)) {
                        moves.push({ row: nr, col: nc });
                    }
                }
                break;

            case PIECE_TYPES.ADVISOR:
                // 士仕移动：九宫内斜走一步
                const aDirections = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
                for (const [dr, dc] of aDirections) {
                    const nr = row + dr;
                    const nc = col + dc;
                    if (this.isGeneralValidPos(color, nr, nc) && !this.isOwnPiece(nr, nc, color)) {
                        moves.push({ row: nr, col: nc });
                    }
                }
                break;

            case PIECE_TYPES.ELEPHANT:
                // 象相移动：田字格，不能过河，有塞象眼
                const eDirections = [
                    { move: [2, 2], eye: [1, 1] },
                    { move: [2, -2], eye: [1, -1] },
                    { move: [-2, 2], eye: [-1, 1] },
                    { move: [-2, -2], eye: [-1, -1] }
                ];
                for (const { move, eye } of eDirections) {
                    const nr = row + move[0];
                    const nc = col + move[1];
                    const er = row + eye[0];
                    const ec = col + eye[1];
                    if (this.isElephantValidPos(color, nr, nc) &&
                        !this.board[er][ec] && // 象眼无子
                        !this.isOwnPiece(nr, nc, color)) {
                        moves.push({ row: nr, col: nc });
                    }
                }
                break;

            case PIECE_TYPES.HORSE:
                // 马移动：日字格，有蹩马腿
                const hDirections = [
                    { move: [2, 1], leg: [1, 0] },
                    { move: [2, -1], leg: [1, 0] },
                    { move: [-2, 1], leg: [-1, 0] },
                    { move: [-2, -1], leg: [-1, 0] },
                    { move: [1, 2], leg: [0, 1] },
                    { move: [1, -2], leg: [0, -1] },
                    { move: [-1, 2], leg: [0, 1] },
                    { move: [-1, -2], leg: [0, -1] }
                ];
                for (const { move, leg } of hDirections) {
                    const nr = row + move[0];
                    const nc = col + move[1];
                    const lr = row + leg[0];
                    const lc = col + leg[1];
                    if (this.isValidPos(nr, nc) &&
                        !this.board[lr][lc] && // 马腿无子
                        !this.isOwnPiece(nr, nc, color)) {
                        moves.push({ row: nr, col: nc });
                    }
                }
                break;

            case PIECE_TYPES.CHARIOT:
                // 车移动：直线，遇子停止
                const cDirections = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                for (const [dr, dc] of cDirections) {
                    let nr = row + dr;
                    let nc = col + dc;
                    while (this.isValidPos(nr, nc)) {
                        if (this.isOwnPiece(nr, nc, color)) break;
                        moves.push({ row: nr, col: nc });
                        if (this.isEnemyPiece(nr, nc, color)) break;
                        nr += dr;
                        nc += dc;
                    }
                }
                break;

            case PIECE_TYPES.CANNON:
                // 炮移动：直线，隔子吃子
                const cnDirections = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                for (const [dr, dc] of cnDirections) {
                    let nr = row + dr;
                    let nc = col + dc;
                    let jumped = false;
                    while (this.isValidPos(nr, nc)) {
                        if (!jumped) {
                            if (this.board[nr][nc]) {
                                jumped = true;
                            } else {
                                moves.push({ row: nr, col: nc });
                            }
                        } else {
                            if (this.board[nr][nc]) {
                                if (this.isEnemyPiece(nr, nc, color)) {
                                    moves.push({ row: nr, col: nc });
                                }
                                break;
                            }
                        }
                        nr += dr;
                        nc += dc;
                    }
                }
                break;

            case PIECE_TYPES.SOLDIER:
                // 兵卒移动：过河前向前，过河后可左右前
                const forward = color === 'red' ? -1 : 1;
                const crossedRiver = color === 'red' ? row < 5 : row > 4;

                // 向前
                const fr = row + forward;
                if (this.isValidPos(fr, col) && !this.isOwnPiece(fr, col, color)) {
                    moves.push({ row: fr, col: col });
                }

                // 过河后可以左右
                if (crossedRiver) {
                    if (this.isValidPos(row, col - 1) && !this.isOwnPiece(row, col - 1, color)) {
                        moves.push({ row: row, col: col - 1 });
                    }
                    if (this.isValidPos(row, col + 1) && !this.isOwnPiece(row, col + 1, color)) {
                        moves.push({ row: row, col: col + 1 });
                    }
                }
                break;
        }

        return moves;
    }

    // 检查将帅位置是否有效
    isGeneralValidPos(color, row, col) {
        if (col < 3 || col > 5) return false;
        if (color === 'red') {
            return row >= 7 && row <= 9;
        } else {
            return row >= 0 && row <= 2;
        }
    }

    // 检查象相位置是否有效（不能过河）
    isElephantValidPos(color, row, col) {
        if (col < 0 || col > 8) return false;
        if (color === 'red') {
            return row >= 5 && row <= 9;
        } else {
            return row >= 0 && row <= 4;
        }
    }

    // 模拟移动（用于检查将军）
    simulateMove(fromRow, fromCol, toRow, toCol) {
        const original = this.board[toRow][toCol];
        this.board[toRow][toCol] = this.board[fromRow][fromCol];
        this.board[fromRow][fromCol] = null;
        return original;
    }

    // 撤销模拟
    undoSimulation(fromRow, fromCol, toRow, toCol, captured) {
        this.board[fromRow][fromCol] = this.board[toRow][toCol];
        this.board[toRow][toCol] = captured;
    }

    // 检查某一方是否被将军
    isInCheck(color) {
        const general = this.findGeneral(color);
        if (!general) return true; // 将帅被吃

        const enemyColor = color === 'red' ? 'black' : 'red';
        const enemyPieces = this.getAllPieces(enemyColor);

        for (const piece of enemyPieces) {
            const moves = this.getRawMoves(piece.row, piece.col);
            for (const move of moves) {
                if (move.row === general.row && move.col === general.col) {
                    return true;
                }
            }
        }
        return false;
    }

    // 获取所有合法移动（考虑将军）
    getValidMoves(row, col) {
        const rawMoves = this.getRawMoves(row, col);
        const validMoves = [];
        const piece = this.board[row][col];
        const color = piece.split('_')[0];

        for (const move of rawMoves) {
            const captured = this.simulateMove(row, col, move.row, move.col);

            // 检查移动后是否飞将或被将军
            let legal = true;
            if (this.isFlyingGeneral() || this.isInCheck(color)) {
                legal = false;
            }

            this.undoSimulation(row, col, move.row, move.col, captured);
            if (legal) {
                validMoves.push(move);
            }
        }

        return validMoves;
    }

    // 检查是否将死
    isCheckmate(color) {
        const pieces = this.getAllPieces(color);
        for (const piece of pieces) {
            if (this.getValidMoves(piece.row, piece.col).length > 0) {
                return false;
            }
        }
        return true;
    }

    // 选择和移动棋子
    selectPiece(row, col) {
        const piece = this.board[row][col];
        if (!piece) return false;

        const color = piece.split('_')[0];
        if (color !== this.currentTurn) return false;

        this.selectedPiece = { row, col };
        this.validMoves = this.getValidMoves(row, col);
        return true;
    }

    movePiece(toRow, toCol) {
        if (!this.selectedPiece) return false;

        const isValid = this.validMoves.some(m => m.row === toRow && m.col === toCol);
        if (!isValid) return false;

        const { row: fromRow, col: fromCol } = this.selectedPiece;
        const movingPiece = this.board[fromRow][fromCol];
        const capturedPiece = this.board[toRow][toCol];

        // 保存历史
        this.history.push({
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            piece: movingPiece,
            captured: capturedPiece,
            turn: this.currentTurn
        });

        // 执行移动
        this.board[toRow][toCol] = movingPiece;
        this.board[fromRow][fromCol] = null;

        // 记录最后一步
        this.lastMove = {
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol }
        };

        // 切换回合
        this.currentTurn = this.currentTurn === 'red' ? 'black' : 'red';
        this.selectedPiece = null;
        this.validMoves = [];

        // 检查游戏状态
        this.checkGameState();

        this.updateUI();
        this.draw();

        // AI回合
        if (this.aiEnabled && !this.gameOver && this.currentTurn === 'black') {
            this.aiThinking = true;
            setTimeout(() => this.makeAIMove(), 500);
        }

        return true;
    }

    checkGameState() {
        // 检查飞将
        if (this.isFlyingGeneral()) {
            this.gameOver = true;
            const winner = this.currentTurn === 'red' ? '黑方' : '红方';
            document.getElementById('gameStatus').textContent = `飞将！${winner}胜利！`;
            return;
        }

        // 检查将死
        if (this.isCheckmate(this.currentTurn)) {
            this.gameOver = true;
            const winner = this.currentTurn === 'red' ? '黑方' : '红方';
            document.getElementById('gameStatus').textContent = `将死！${winner}胜利！`;
            return;
        }

        // 检查将军
        if (this.isInCheck(this.currentTurn)) {
            document.getElementById('gameStatus').textContent = '将军！';
        } else {
            document.getElementById('gameStatus').textContent = '';
        }
    }

    // AI移动
            makeAIMove() {
                if (this.gameOver) {
                    this.aiThinking = false;
                    return;
                }

                const move = ChineseChessAI.getMove(this.board, this.aiDifficulty);
                if (move) {
                    this.selectedPiece = { row: move.from.row, col: move.from.col };
                    this.validMoves = [{ row: move.to.row, col: move.to.col }];
                    this.movePiece(move.to.row, move.to.col);
                }
                this.aiThinking = false;
            }

    // 悔棋
    undo() {
        if (this.history.length === 0 || this.aiThinking) return;

        // 如果开启AI，悔两步
        const steps = this.aiEnabled && this.history.length >= 2 ? 2 : 1;

        for (let i = 0; i < steps && this.history.length > 0; i++) {
            const last = this.history.pop();
            this.board[last.from.row][last.from.col] = last.piece;
            this.board[last.to.row][last.to.col] = last.captured;
            this.currentTurn = last.turn;
        }

        this.gameOver = false;
        this.selectedPiece = null;
        this.validMoves = [];
        this.lastMove = null;
        document.getElementById('gameStatus').textContent = '';

        this.updateUI();
        this.draw();
    }

    // 更新UI
    updateUI() {
        const indicator = document.getElementById('turnIndicator');
        indicator.textContent = this.currentTurn === 'red' ? '红方走棋' : '黑方走棋';
        indicator.className = `turn-indicator ${this.currentTurn === 'red' ? 'turn-red' : 'turn-black'}`;
        document.getElementById('undoBtn').disabled = this.history.length === 0;
    }

    // 获取点击位置对应的棋盘坐标
    getBoardPosition(x, y) {
        const rect = Canvas.getBoundingClientRect();
        const scaleX = Canvas.width / rect.width;
        const scaleY = Canvas.height / rect.height;
        const boardX = (x - rect.left) * scaleX;
        const boardY = (y - rect.top) * scaleY;

        const col = Math.round((boardX - PADDING) / CELL_SIZE);
        const row = Math.round((boardY - PADDING) / CELL_SIZE);

        if (this.isValidPos(row, col)) {
            return { row, col };
        }
        return null;
    }

    // 绑定事件
    bindEvents() {
        const handleClick = (e) => {
            if (this.gameOver || this.aiThinking) return;
            if (this.aiEnabled && this.currentTurn === 'black') return;

            const pos = e.touches ? e.touches[0] : e;
            const boardPos = this.getBoardPosition(pos.clientX, pos.clientY);
            if (!boardPos) return;

            this.handleClick(boardPos.row, boardPos.col);
        };

        Canvas.addEventListener('click', handleClick);
        Canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleClick(e);
        }, { passive: false });
    }

    handleClick(row, col) {
        // 如果已选中棋子，尝试移动
        if (this.selectedPiece) {
            if (this.selectedPiece.row === row && this.selectedPiece.col === col) {
                // 点击同一位置，取消选择
                this.selectedPiece = null;
                this.validMoves = [];
                this.draw();
                return;
            }

            if (this.movePiece(row, col)) {
                return;
            }

            // 如果移动失败，尝试选择新棋子
            if (this.selectPiece(row, col)) {
                this.draw();
                return;
            }

            // 取消选择
            this.selectedPiece = null;
            this.validMoves = [];
            this.draw();
        } else {
            // 选择棋子
            if (this.selectPiece(row, col)) {
                this.draw();
            }
        }
    }

    // 绘制棋盘
    draw() {
        Ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // 绘制背景
        Ctx.fillStyle = '#f5deb3';
        Ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // 绘制网格线
        Ctx.strokeStyle = '#5d4037';
        Ctx.lineWidth = 1.5;

        // 横线
        for (let i = 0; i < 10; i++) {
            Ctx.beginPath();
            Ctx.moveTo(PADDING, PADDING + i * CELL_SIZE);
            Ctx.lineTo(PADDING + BOARD_WIDTH, PADDING + i * CELL_SIZE);
            Ctx.stroke();
        }

        // 竖线（上半部分）
        for (let i = 0; i < 9; i++) {
            if (i === 0 || i === 8) {
                Ctx.beginPath();
                Ctx.moveTo(PADDING + i * CELL_SIZE, PADDING);
                Ctx.lineTo(PADDING + i * CELL_SIZE, PADDING + BOARD_HEIGHT);
                Ctx.stroke();
            } else {
                Ctx.beginPath();
                Ctx.moveTo(PADDING + i * CELL_SIZE, PADDING);
                Ctx.lineTo(PADDING + i * CELL_SIZE, PADDING + 4 * CELL_SIZE);
                Ctx.stroke();

                Ctx.beginPath();
                Ctx.moveTo(PADDING + i * CELL_SIZE, PADDING + 5 * CELL_SIZE);
                Ctx.lineTo(PADDING + i * CELL_SIZE, PADDING + BOARD_HEIGHT);
                Ctx.stroke();
            }
        }

        // 九宫斜线
        Ctx.beginPath();
        Ctx.moveTo(PADDING + 3 * CELL_SIZE, PADDING);
        Ctx.lineTo(PADDING + 5 * CELL_SIZE, PADDING + 2 * CELL_SIZE);
        Ctx.stroke();

        Ctx.beginPath();
        Ctx.moveTo(PADDING + 5 * CELL_SIZE, PADDING);
        Ctx.lineTo(PADDING + 3 * CELL_SIZE, PADDING + 2 * CELL_SIZE);
        Ctx.stroke();

        Ctx.beginPath();
        Ctx.moveTo(PADDING + 3 * CELL_SIZE, PADDING + 7 * CELL_SIZE);
        Ctx.lineTo(PADDING + 5 * CELL_SIZE, PADDING + 9 * CELL_SIZE);
        Ctx.stroke();

        Ctx.beginPath();
        Ctx.moveTo(PADDING + 5 * CELL_SIZE, PADDING + 7 * CELL_SIZE);
        Ctx.lineTo(PADDING + 3 * CELL_SIZE, PADDING + 9 * CELL_SIZE);
        Ctx.stroke();

        // 楚河汉界
        Ctx.font = 'bold 24px "Microsoft YaHei", serif';
        Ctx.fillStyle = '#5d4037';
        Ctx.textAlign = 'center';
        Ctx.textBaseline = 'middle';
        Ctx.fillText('楚 河', PADDING + 2 * CELL_SIZE, PADDING + 4.5 * CELL_SIZE);
        Ctx.fillText('汉 界', PADDING + 6 * CELL_SIZE, PADDING + 4.5 * CELL_SIZE);

        // 绘制兵炮位置标记
        this.drawPositionMarkers();

        // 绘制最后一步指示
        if (this.lastMove) {
            Ctx.strokeStyle = '#2196F3';
            Ctx.lineWidth = 2;
            Ctx.setLineDash([5, 3]);

            const fromX = PADDING + this.lastMove.from.col * CELL_SIZE;
            const fromY = PADDING + this.lastMove.from.row * CELL_SIZE;
            const toX = PADDING + this.lastMove.to.col * CELL_SIZE;
            const toY = PADDING + this.lastMove.to.row * CELL_SIZE;

            Ctx.beginPath();
            Ctx.moveTo(fromX, fromY);
            Ctx.lineTo(toX, toY);
            Ctx.stroke();
            Ctx.setLineDash([]);
        }

        // 绘制合法移动指示
        for (const move of this.validMoves) {
            const x = PADDING + move.col * CELL_SIZE;
            const y = PADDING + move.row * CELL_SIZE;

            if (this.board[move.row][move.col]) {
                // 可吃子 - 红色圆圈
                Ctx.strokeStyle = '#e74c3c';
                Ctx.lineWidth = 3;
                Ctx.beginPath();
                Ctx.arc(x, y, 22, 0, Math.PI * 2);
                Ctx.stroke();
            } else {
                // 可移动 - 绿色圆点
                Ctx.fillStyle = 'rgba(46, 204, 113, 0.6)';
                Ctx.beginPath();
                Ctx.arc(x, y, 8, 0, Math.PI * 2);
                Ctx.fill();
            }
        }

        // 绘制棋子
        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 9; c++) {
                if (this.board[r][c]) {
                    this.drawPiece(r, c, this.board[r][c]);
                }
            }
        }

        // 绘制选中框
        if (this.selectedPiece) {
            const x = PADDING + this.selectedPiece.col * CELL_SIZE;
            const y = PADDING + this.selectedPiece.row * CELL_SIZE;

            Ctx.strokeStyle = '#f39c12';
            Ctx.lineWidth = 3;
            Ctx.beginPath();
            Ctx.arc(x, y, 24, 0, Math.PI * 2);
            Ctx.stroke();
        }
    }

    // 绘制位置标记
    drawPositionMarkers() {
        Ctx.strokeStyle = '#5d4037';
        Ctx.lineWidth = 1;

        const markers = [
            { row: 2, col: 1 }, { row: 2, col: 7 },
            { row: 7, col: 1 }, { row: 7, col: 7 },
            { row: 3, col: 0 }, { row: 3, col: 2 }, { row: 3, col: 4 }, { row: 3, col: 6 }, { row: 3, col: 8 },
            { row: 6, col: 0 }, { row: 6, col: 2 }, { row: 6, col: 4 }, { row: 6, col: 6 }, { row: 6, col: 8 }
        ];

        for (const m of markers) {
            this.drawCornerMarker(m.row, m.col);
        }
    }

    drawCornerMarker(row, col) {
        const x = PADDING + col * CELL_SIZE;
        const y = PADDING + row * CELL_SIZE;
        const size = 5;
        const offset = 8;

        Ctx.beginPath();

        // 左上
        if (col > 0 && row > 0) {
            Ctx.moveTo(x - offset, y - offset + size);
            Ctx.lineTo(x - offset, y - offset);
            Ctx.lineTo(x - offset + size, y - offset);
        }

        // 右上
        if (col < 8 && row > 0) {
            Ctx.moveTo(x + offset - size, y - offset);
            Ctx.lineTo(x + offset, y - offset);
            Ctx.lineTo(x + offset, y - offset + size);
        }

        // 左下
        if (col > 0 && row < 9) {
            Ctx.moveTo(x - offset, y + offset - size);
            Ctx.lineTo(x - offset, y + offset);
            Ctx.lineTo(x - offset + size, y + offset);
        }

        // 右下
        if (col < 8 && row < 9) {
            Ctx.moveTo(x + offset - size, y + offset);
            Ctx.lineTo(x + offset, y + offset);
            Ctx.lineTo(x + offset, y + offset - size);
        }

        Ctx.stroke();
    }

    // 绘制棋子
    drawPiece(row, col, pieceKey) {
        const { color, type } = this.getPieceInfo(pieceKey);
        const x = PADDING + col * CELL_SIZE;
        const y = PADDING + row * CELL_SIZE;
        const radius = 21;

        // 棋子阴影
        Ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        Ctx.shadowBlur = 5;
        Ctx.shadowOffsetX = 2;
        Ctx.shadowOffsetY = 2;

        // 棋子底色
        const gradient = Ctx.createRadialGradient(x - 5, y - 5, 0, x, y, radius);
        gradient.addColorStop(0, '#fff8e7');
        gradient.addColorStop(0.7, '#f5deb3');
        gradient.addColorStop(1, '#deb887');

        Ctx.fillStyle = gradient;
        Ctx.beginPath();
        Ctx.arc(x, y, radius, 0, Math.PI * 2);
        Ctx.fill();

        // 重置阴影
        Ctx.shadowColor = 'transparent';
        Ctx.shadowBlur = 0;
        Ctx.shadowOffsetX = 0;
        Ctx.shadowOffsetY = 0;

        // 棋子边框
        Ctx.strokeStyle = color === 'red' ? '#c0392b' : '#2c3e50';
        Ctx.lineWidth = 2;
        Ctx.beginPath();
        Ctx.arc(x, y, radius, 0, Math.PI * 2);
        Ctx.stroke();

        // 内圈
        Ctx.strokeStyle = color === 'red' ? '#c0392b' : '#2c3e50';
        Ctx.lineWidth = 1;
        Ctx.beginPath();
        Ctx.arc(x, y, radius - 4, 0, Math.PI * 2);
        Ctx.stroke();

        // 棋子文字
        Ctx.fillStyle = color === 'red' ? '#c0392b' : '#2c3e50';
        Ctx.font = 'bold 22px "Microsoft YaHei", "SimHei", serif';
        Ctx.textAlign = 'center';
        Ctx.textBaseline = 'middle';
        Ctx.fillText(PIECE_NAMES[color][type], x, y + 1);
    }
}

// 启动游戏
const game = new ChineseChessGame();
