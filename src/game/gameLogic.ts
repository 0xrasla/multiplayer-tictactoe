import { WSContext } from "hono/ws";
import { GameState, Player } from "../types";

export const rooms = new Map<string, GameState>();
export const players = new Map<string, WSContext<unknown>>();
export const playerRooms = new Map<string, string>();

// Cleanup interval (5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
// Room timeout (30 minutes)
const ROOM_TIMEOUT = 30 * 60 * 1000;

export const createRoom = (roomId: string): GameState => {
  const newGameState: GameState = {
    board: Array(9).fill(""),
    currentPlayer: "X",
    winner: null,
    isGameOver: false,
    roomId,
    players: {},
    lastActivity: Date.now(),
  };
  rooms.set(roomId, newGameState);
  return newGameState;
};

export const joinRoom = (
  roomId: string,
  playerId: string
): GameState | null => {
  const gameState = rooms.get(roomId);
  if (!gameState) return null;

  const currentRoom = playerRooms.get(playerId);
  if (currentRoom && currentRoom !== roomId) {
    leaveRoom(playerId);
  }

  if (!gameState.players.X) {
    gameState.players.X = playerId;
  } else if (!gameState.players.O) {
    gameState.players.O = playerId;
  } else {
    return null;
  }

  gameState.lastActivity = Date.now();
  playerRooms.set(playerId, roomId);
  return gameState;
};

export const leaveRoom = (playerId: string) => {
  const roomId = playerRooms.get(playerId);
  if (!roomId) return;

  const gameState = rooms.get(roomId);
  if (!gameState) return;

  if (gameState.players.X === playerId) {
    gameState.players.X = undefined;
  } else if (gameState.players.O === playerId) {
    gameState.players.O = undefined;
  }

  playerRooms.delete(playerId);

  if (!gameState.players.X && !gameState.players.O) {
    rooms.delete(roomId);
  } else {
    broadcastGameState(roomId);
  }
};

export const removePlayer = (playerId: string) => {
  leaveRoom(playerId);
  players.delete(playerId);
};

export const checkWinner = (board: string[]): Player | null => {
  const winPatterns = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const pattern of winPatterns) {
    const [a, b, c] = pattern;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a] as Player;
    }
  }
  return null;
};

export const handleMove = (position: number, playerId: string): boolean => {
  const roomId = playerRooms.get(playerId);
  if (!roomId) return false;

  const gameState = rooms.get(roomId);
  if (!gameState) return false;

  const playerSymbol = gameState.players.X === playerId ? "X" : "O";
  if (playerSymbol !== gameState.currentPlayer) return false;

  if (
    gameState.isGameOver ||
    position < 0 ||
    position > 8 ||
    gameState.board[position] !== ""
  ) {
    return false;
  }

  gameState.board[position] = gameState.currentPlayer;
  gameState.lastActivity = Date.now();
  const winner = checkWinner(gameState.board);

  if (winner) {
    gameState.winner = winner;
    gameState.isGameOver = true;
  } else if (!gameState.board.includes("")) {
    gameState.isGameOver = true;
  } else {
    gameState.currentPlayer = gameState.currentPlayer === "X" ? "O" : "X";
  }

  return true;
};

export const resetGame = (roomId: string) => {
  const gameState = rooms.get(roomId);
  if (!gameState) return;

  gameState.board = Array(9).fill("");
  gameState.currentPlayer = "X";
  gameState.winner = null;
  gameState.isGameOver = false;
  gameState.lastActivity = Date.now();
};

export const broadcastGameState = (roomId: string) => {
  const gameState = rooms.get(roomId);
  if (!gameState) return;

  const message = JSON.stringify({
    type: "gameState",
    ...gameState,
  });

  Object.values(gameState.players).forEach((playerId) => {
    if (playerId) {
      const socket = players.get(playerId);
      if (socket) {
        socket.send(message);
      }
    }
  });
};

// Cleanup inactive rooms and disconnected players
export const cleanup = () => {
  const now = Date.now();

  // Clean up inactive rooms
  for (const [roomId, gameState] of rooms.entries()) {
    if (now - gameState.lastActivity > ROOM_TIMEOUT) {
      // Notify players before removing room
      Object.values(gameState.players).forEach((playerId) => {
        if (playerId) {
          const socket = players.get(playerId);
          if (socket) {
            socket.send(
              JSON.stringify({
                type: "error",
                message: "Room closed due to inactivity",
              })
            );
          }
          playerRooms.delete(playerId);
        }
      });
      rooms.delete(roomId);
    }
  }

  // Clean up disconnected players
  for (const [playerId, socket] of players.entries()) {
    if (!socket || socket.readyState === 3) {
      removePlayer(playerId);
    }
  }
};

// Start cleanup interval
setInterval(cleanup, CLEANUP_INTERVAL);
