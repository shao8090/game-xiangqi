/**
 * 中国象棋 AI 引擎
 * 包含 5 个难度等级：
 * 1. 简单 - 随机走法，略有偏好吃子
 * 2. 初级 - 单层评估，优先吃子和将军
 * 3. 中级 - 2层 Minimax + Alpha-Beta 剪枝
 * 4. 高级 - 3层 Minimax + Alpha-Beta 剪枝 + 位置评估
 * 5. 大师 - 4层 Minimax + Alpha-Beta 剪枝 + 高级评估
 */

const ChineseChessAI = (function() {
    'use strict';

    // ==================== 棋子价值表 ====================
    
    // 基础棋子价值
    const PIECE_VALUES = {
        general: 10000,
        chariot: 900,
        cannon: 450,
        horse: 400,
        elephant: 200,
        advisor: 200,
        soldier: 100
    };

    // 棋子位置价值表 (从黑方视角，红方需要镜像)
    // 将/帅位置价值
    const GENERAL_TABLE = [
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0]
    ];

    // 士/仕位置价值
    const ADVISOR_TABLE = [
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0]
    ];

    // 象/相位置价值
    const ELEPHANT_TABLE = [
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0]
    ];

    // 马位置价值表
    const HORSE_TABLE = [
        [0, 2, 4, 4, 2, 4, 4, 2, 0],
        [2, 8, 8, 8, 6, 8, 8, 8, 2],
        [4, 8, 12, 12, 10, 12, 12, 8, 4],
        [4, 10, 14, 16, 14, 16, 14, 10, 4],
        [6, 12, 16, 18, 16, 18, 16, 12, 6],
        [6, 12, 16, 18, 16, 18, 16, 12, 6],
        [4, 10, 14, 16, 14, 16, 14, 10, 4],
        [4, 8, 12, 12, 10, 12, 12, 8, 4],
        [2, 8, 8, 8, 6, 8, 8, 8, 2],
        [0, 2, 4, 4, 2, 4, 4, 2, 0]
    ];

    // 车位置价值表
    const CHARIOT_TABLE = [
        [6, 8, 8, 10, 10, 10, 8, 8, 6],
        [6, 10, 10, 12, 12, 12, 10, 10, 6],
        [6, 8, 10, 12, 12, 12, 10, 8, 6],
        [8, 10, 10, 12, 12, 12, 10, 10, 8],
        [8, 10, 10, 12, 12, 12, 10, 10, 8],
        [8, 10, 10, 12, 12, 12, 10, 10, 8],
        [8, 10, 10, 12, 12, 12, 10, 10, 8],
        [6, 8, 10, 12, 12, 12, 10, 8, 6],
        [6, 10, 10, 12, 12, 12, 10, 10, 6],
        [6, 8, 8, 10, 10, 10, 8, 8, 6]
    ];

    // 炮位置价值表
    const CANNON_TABLE = [
        [4, 4, 6, 8, 8, 8, 6, 4, 4],
        [4, 6, 8, 10, 10, 10, 8, 6, 4],
        [6, 8, 10, 12, 12, 12, 10, 8, 6],
        [6, 8, 10, 12, 12, 12, 10, 8, 6],
        [6, 8, 10, 12, 12, 12, 10, 8, 6],
        [6, 8, 10, 12, 12, 12, 10, 8, 6],
        [6, 8, 10, 12, 12, 12, 10, 8, 6],
        [6, 8, 10, 12, 12, 12, 10, 8, 6],
        [4, 6, 8, 10, 10, 10, 8, 6, 4],
        [4, 4, 6, 8, 8, 8, 6, 4, 4]
    ];

    // 兵/卒位置价值表
    const SOLDIER_TABLE = [
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [2, 4, 6, 8, 10, 8, 6, 4, 2],
        [4, 6, 8, 12, 14, 12, 8, 6, 4],
        [6, 8, 12, 16, 18, 16, 12, 8, 6],
        [8, 12, 16, 20, 22, 20, 16, 12, 8],
        [8, 12, 16, 20, 22, 20, 16, 12, 8],
        [8, 12, 16, 20, 22, 20, 16, 12, 8],
        [0, 0, 0, 0, 0, 0, 0, 0, 0]
    ];

    // 获取位置价值表
    function getPositionTable(type) {
        switch (type) {
            case 'general': return GENERAL_TABLE;
            case 'advisor': return ADVISOR_TABLE;
            case 'elephant': return ELEPHANT_TABLE;
            case 'horse': return HORSE_TABLE;
            case 'chariot': return CHARIOT_TABLE;
            case 'cannon': return CANNON_TABLE;
            case 'soldier': return SOLDIER_TABLE;
            default: return null;
        }
    }

    // ==================== 工具函数 ====================

    // 检查位置是否在棋盘内
    function isValidPos(row, col) {
        return row >= 0 && row < 10 && col >= 0 && col < 9;
    }

    // 检查是否是己方棋子
    function isOwnPiece(board, row, col, color) {
        const piece = board[row][col];
        return piece && piece.startsWith(color);
    }

    // 检查是否是敌方棋子
    function isEnemyPiece(board, row, col, color) {
        const piece = board[row][col];
        return piece && !piece.startsWith(color);
    }

    // 获取棋子信息
    function getPieceInfo(pieceKey) {
        if (!pieceKey) return null;
        const [color, type] = pieceKey.split('_');
        return { color, type, key: pieceKey };
    }

    // 获取所有棋子位置
    function getAllPieces(board, color) {
        const pieces = [];
        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 9; c++) {
                if (board[r][c] && board[r][c].startsWith(color)) {
                    pieces.push({ row: r, col: c, key: board[r][c] });
                }
            }
        }
        return pieces;
    }

    // 查找将/帅位置
    function findGeneral(board, color) {
        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 9; c++) {
                if (board[r][c] === `${color}_general`) {
                    return { row: r, col: c };
                }
            }
        }
        return null;
    }

    // 检查将帅位置是否有效
    function isGeneralValidPos(color, row, col) {
        if (col < 3 || col > 5) return false;
        if (color === 'red') {
            return row >= 7 && row <= 9;
        } else {
            return row >= 0 && row <= 2;
        }
    }

    // 检查象相位置是否有效
    function isElephantValidPos(color, row, col) {
        if (col < 0 || col > 8) return false;
        if (color === 'red') {
            return row >= 5 && row <= 9;
        } else {
            return row >= 0 && row <= 4;
        }
    }

    // 模拟移动
    function simulateMove(board, fromRow, fromCol, toRow, toCol) {
        const original = board[toRow][toCol];
        board[toRow][toCol] = board[fromRow][fromCol];
        board[fromRow][fromCol] = null;
        return original;
    }

    // 撤销模拟
    function undoSimulation(board, fromRow, fromCol, toRow, toCol, captured) {
        board[fromRow][fromCol] = board[toRow][toCol];
        board[toRow][toCol] = captured;
    }

    // 检查是否飞将
    function isFlyingGeneral(board) {
        const redGeneral = findGeneral(board, 'red');
        const blackGeneral = findGeneral(board, 'black');
        if (!redGeneral || !blackGeneral) return false;
        if (redGeneral.col !== blackGeneral.col) return false;

        const col = redGeneral.col;
        const minRow = Math.min(redGeneral.row, blackGeneral.row);
        const maxRow = Math.max(redGeneral.row, blackGeneral.row);

        for (let r = minRow + 1; r < maxRow; r++) {
            if (board[r][col]) return false;
        }
        return true;
    }

    // ==================== 走法生成 ====================

    // 获取棋子的原始合法移动（不考虑将军）
    function getRawMoves(board, row, col) {
        const piece = getPieceInfo(board[row][col]);
        if (!piece) return [];

        const moves = [];
        const { color, type } = piece;

        switch (type) {
            case 'general':
                const gDirections = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                for (const [dr, dc] of gDirections) {
                    const nr = row + dr;
                    const nc = col + dc;
                    if (isGeneralValidPos(color, nr, nc) && !isOwnPiece(board, nr, nc, color)) {
                        moves.push({ row: nr, col: nc });
                    }
                }
                break;

            case 'advisor':
                const aDirections = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
                for (const [dr, dc] of aDirections) {
                    const nr = row + dr;
                    const nc = col + dc;
                    if (isGeneralValidPos(color, nr, nc) && !isOwnPiece(board, nr, nc, color)) {
                        moves.push({ row: nr, col: nc });
                    }
                }
                break;

            case 'elephant':
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
                    if (isElephantValidPos(color, nr, nc) &&
                        !board[er][ec] &&
                        !isOwnPiece(board, nr, nc, color)) {
                        moves.push({ row: nr, col: nc });
                    }
                }
                break;

            case 'horse':
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
                    if (isValidPos(nr, nc) &&
                        !board[lr][lc] &&
                        !isOwnPiece(board, nr, nc, color)) {
                        moves.push({ row: nr, col: nc });
                    }
                }
                break;

            case 'chariot':
                const cDirections = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                for (const [dr, dc] of cDirections) {
                    let nr = row + dr;
                    let nc = col + dc;
                    while (isValidPos(nr, nc)) {
                        if (isOwnPiece(board, nr, nc, color)) break;
                        moves.push({ row: nr, col: nc });
                        if (isEnemyPiece(board, nr, nc, color)) break;
                        nr += dr;
                        nc += dc;
                    }
                }
                break;

            case 'cannon':
                const cnDirections = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                for (const [dr, dc] of cnDirections) {
                    let nr = row + dr;
                    let nc = col + dc;
                    let jumped = false;
                    while (isValidPos(nr, nc)) {
                        if (!jumped) {
                            if (board[nr][nc]) {
                                jumped = true;
                            } else {
                                moves.push({ row: nr, col: nc });
                            }
                        } else {
                            if (board[nr][nc]) {
                                if (isEnemyPiece(board, nr, nc, color)) {
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

            case 'soldier':
                const forward = color === 'red' ? -1 : 1;
                const crossedRiver = color === 'red' ? row < 5 : row > 4;

                const fr = row + forward;
                if (isValidPos(fr, col) && !isOwnPiece(board, fr, col, color)) {
                    moves.push({ row: fr, col: col });
                }

                if (crossedRiver) {
                    if (isValidPos(row, col - 1) && !isOwnPiece(board, row, col - 1, color)) {
                        moves.push({ row: row, col: col - 1 });
                    }
                    if (isValidPos(row, col + 1) && !isOwnPiece(board, row, col + 1, color)) {
                        moves.push({ row: row, col: col + 1 });
                    }
                }
                break;
        }

        return moves;
    }

    // 检查某一方是否被将军
    function isInCheck(board, color) {
        const general = findGeneral(board, color);
        if (!general) return true;

        const enemyColor = color === 'red' ? 'black' : 'red';
        const enemyPieces = getAllPieces(board, enemyColor);

        for (const piece of enemyPieces) {
            const moves = getRawMoves(board, piece.row, piece.col);
            for (const move of moves) {
                if (move.row === general.row && move.col === general.col) {
                    return true;
                }
            }
        }
        return false;
    }

    // 获取所有合法移动（考虑将军）
    function getValidMoves(board, row, col) {
        const rawMoves = getRawMoves(board, row, col);
        const validMoves = [];
        const piece = board[row][col];
        const color = piece.split('_')[0];

        for (const move of rawMoves) {
            const captured = simulateMove(board, row, col, move.row, move.col);

            let legal = true;
            if (isFlyingGeneral(board) || isInCheck(board, color)) {
                legal = false;
            }

            undoSimulation(board, row, col, move.row, move.col, captured);
            if (legal) {
                validMoves.push(move);
            }
        }

        return validMoves;
    }

    // 获取某一方所有合法移动
    function getAllValidMoves(board, color) {
        const allMoves = [];
        const pieces = getAllPieces(board, color);

        for (const piece of pieces) {
            const moves = getValidMoves(board, piece.row, piece.col);
            for (const move of moves) {
                allMoves.push({
                    from: { row: piece.row, col: piece.col },
                    to: { row: move.row, col: move.col },
                    piece: piece.key,
                    captured: board[move.row][move.col]
                });
            }
        }

        return allMoves;
    }

    // 检查是否将死
    function isCheckmate(board, color) {
        const pieces = getAllPieces(board, color);
        for (const piece of pieces) {
            if (getValidMoves(board, piece.row, piece.col).length > 0) {
                return false;
            }
        }
        return true;
    }

    // ==================== 评估函数 ====================

    // 基础评估函数
    function evaluateBoard(board) {
        let score = 0;

        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 9; c++) {
                const piece = board[r][c];
                if (piece) {
                    const info = getPieceInfo(piece);
                    const baseValue = PIECE_VALUES[info.type] || 0;
                    
                    // 获取位置价值
                    const posTable = getPositionTable(info.type);
                    let posValue = 0;
                    if (posTable) {
                        // 红方需要镜像
                        const tableRow = info.color === 'red' ? 9 - r : r;
                        posValue = posTable[tableRow][c];
                    }

                    if (info.color === 'black') {
                        score += baseValue + posValue;
                    } else {
                        score -= baseValue + posValue;
                    }
                }
            }
        }

        return score;
    }

    // 高级评估函数（包含更多因素）
    function evaluateBoardAdvanced(board) {
        let score = 0;
        
        // 基础评估
        score += evaluateBoard(board);

        // 机动性评估（可移动数量）
        const blackMoves = getAllValidMoves(board, 'black').length;
        const redMoves = getAllValidMoves(board, 'red').length;
        score += (blackMoves - redMoves) * 5;

        // 将军奖励
        if (isInCheck(board, 'red')) score += 100;
        if (isInCheck(board, 'black')) score -= 100;

        // 将帅安全评估
        const blackGeneral = findGeneral(board, 'black');
        const redGeneral = findGeneral(board, 'red');
        
        if (blackGeneral) {
            // 黑将被攻击惩罚
            if (isSquareAttacked(board, blackGeneral.row, blackGeneral.col, 'red')) {
                score -= 150;
            }
        }
        
        if (redGeneral) {
            // 红帅被攻击惩罚
            if (isSquareAttacked(board, redGeneral.row, redGeneral.col, 'black')) {
                score += 150;
            }
        }

        // 过河兵额外奖励
        for (let c = 0; c < 9; c++) {
            for (let r = 0; r < 10; r++) {
                const piece = board[r][c];
                if (piece === 'black_soldier' && r >= 5) {
                    score += 20 + (r - 5) * 10;
                } else if (piece === 'red_soldier' && r <= 4) {
                    score -= 20 + (4 - r) * 10;
                }
            }
        }

        return score;
    }

    // 检查某个格子是否被某方攻击
    function isSquareAttacked(board, row, col, byColor) {
        const pieces = getAllPieces(board, byColor);
        for (const piece of pieces) {
            const moves = getRawMoves(board, piece.row, piece.col);
            for (const move of moves) {
                if (move.row === row && move.col === col) {
                    return true;
                }
            }
        }
        return false;
    }

    // ==================== AI 难度等级 ====================

    const Difficulty = {
        SIMPLE: 1,      // 简单
        EASY: 2,        // 初级
        MEDIUM: 3,      // 中级
        HARD: 4,        // 高级
        EXPERT: 5       // 大师
    };

    // 简单：随机走法，略有偏好吃子
    function getSimpleMove(board) {
        const moves = getAllValidMoves(board, 'black');
        if (moves.length === 0) return null;

        // 按吃子价值排序，但主要随机
        const captureMoves = moves.filter(m => m.captured);
        
        // 70%概率吃子，30%概率随机
        if (captureMoves.length > 0 && Math.random() < 0.7) {
            // 选择价值最高的吃子
            captureMoves.sort((a, b) => {
                return (PIECE_VALUES[b.captured.split('_')[1]] || 0) - 
                       (PIECE_VALUES[a.captured.split('_')[1]] || 0);
            });
            return captureMoves[0];
        }

        return moves[Math.floor(Math.random() * moves.length)];
    }

    // 初级：单层评估，优先吃子和将军
    function getEasyMove(board) {
        const moves = getAllValidMoves(board, 'black');
        if (moves.length === 0) return null;

        let bestMove = null;
        let bestScore = -Infinity;

        for (const move of moves) {
            let score = 0;
            const captured = move.captured;

            // 吃子得分
            if (captured) {
                score += (PIECE_VALUES[captured.split('_')[1]] || 0) * 10;
            }

            // 模拟移动
            const origCapture = simulateMove(board, move.from.row, move.from.col, move.to.row, move.to.col);

            // 将军奖励
            if (isInCheck(board, 'red')) {
                score += 50;
            }

            // 被将军惩罚
            if (isInCheck(board, 'black')) {
                score -= 100;
            }

            // 位置评估
            const targetRow = move.to.row;
            score += (9 - Math.abs(targetRow - 9)) * 0.5;

            undoSimulation(board, move.from.row, move.from.col, move.to.row, move.to.col, origCapture);

            // 随机因素
            score += Math.random() * 5;

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        return bestMove;
    }

    // 中级：2层 Minimax + Alpha-Beta
    function getMediumMove(board) {
        return minimax(board, 2, -Infinity, Infinity, true).move;
    }

    // 高级：3层 Minimax + Alpha-Beta
    function getHardMove(board) {
        return minimax(board, 3, -Infinity, Infinity, true).move;
    }

    // 大师：4层 Minimax + Alpha-Beta
    function getExpertMove(board) {
        return minimax(board, 4, -Infinity, Infinity, true).move;
    }

    // ==================== Minimax 算法 + Alpha-Beta 剪枝 ====================

    function minimax(board, depth, alpha, beta, isMaximizing) {
        // 终止条件
        if (depth === 0) {
            return { score: evaluateBoardAdvanced(board), move: null };
        }

        const color = isMaximizing ? 'black' : 'red';
        const moves = getAllValidMoves(board, color);

        // 无合法移动（被将死）
        if (moves.length === 0) {
            return { score: isMaximizing ? -99999 : 99999, move: null };
        }

        // 打乱走法顺序以提高剪枝效率
        shuffleArray(moves);

        let bestMove = moves[0];

        if (isMaximizing) {
            let maxScore = -Infinity;

            for (const move of moves) {
                const captured = simulateMove(board, move.from.row, move.from.col, move.to.row, move.to.col);
                
                const result = minimax(board, depth - 1, alpha, beta, false);
                
                undoSimulation(board, move.from.row, move.from.col, move.to.row, move.to.col, captured);

                if (result.score > maxScore) {
                    maxScore = result.score;
                    bestMove = move;
                }

                alpha = Math.max(alpha, result.score);
                if (beta <= alpha) break; // Beta 剪枝
            }

            return { score: maxScore, move: bestMove };
        } else {
            let minScore = Infinity;

            for (const move of moves) {
                const captured = simulateMove(board, move.from.row, move.from.col, move.to.row, move.to.col);
                
                const result = minimax(board, depth - 1, alpha, beta, true);
                
                undoSimulation(board, move.from.row, move.from.col, move.to.row, move.to.col, captured);

                if (result.score < minScore) {
                    minScore = result.score;
                    bestMove = move;
                }

                beta = Math.min(beta, result.score);
                if (beta <= alpha) break; // Alpha 剪枝
            }

            return { score: minScore, move: bestMove };
        }
    }

    // 数组洗牌（Fisher-Yates算法）
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // ==================== 公共接口 ====================

    /**
     * 获取AI走法
     * @param {Array} board - 棋盘状态
     * @param {number} difficulty - 难度等级 (1-5)
     * @returns {Object} - { from: {row, col}, to: {row, col} }
     */
    function getMove(board, difficulty) {
        const boardCopy = JSON.parse(JSON.stringify(board));
        
        switch (difficulty) {
            case Difficulty.SIMPLE:
                return getSimpleMove(boardCopy);
            case Difficulty.EASY:
                return getEasyMove(boardCopy);
            case Difficulty.MEDIUM:
                return getMediumMove(boardCopy);
            case Difficulty.HARD:
                return getHardMove(boardCopy);
            case Difficulty.EXPERT:
                return getExpertMove(boardCopy);
            default:
                return getEasyMove(boardCopy);
        }
    }

    /**
     * 获取难度等级名称
     * @param {number} level - 难度等级
     * @returns {string}
     */
    function getDifficultyName(level) {
        const names = {
            1: '简单',
            2: '初级',
            3: '中级',
            4: '高级',
            5: '大师'
        };
        return names[level] || '未知';
    }

    /**
     * 获取难度等级描述
     * @param {number} level - 难度等级
     * @returns {string}
     */
    function getDifficultyDesc(level) {
        const descs = {
            1: '随机走法，适合新手熟悉规则',
            2: '简单评估，会吃子和将军',
            3: '2层搜索，有一定策略',
            4: '3层搜索，较强的对手',
            5: '4层搜索，大师级AI'
        };
        return descs[level] || '';
    }

    // 导出公共接口
    return {
        getMove: getMove,
        Difficulty: Difficulty,
        getDifficultyName: getDifficultyName,
        getDifficultyDesc: getDifficultyDesc
    };

})();
