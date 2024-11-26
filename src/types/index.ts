export type Player = "X" | "O";

export type GameState = {
  board: Array<string>;
  currentPlayer: Player;
  winner: Player | null;
  isGameOver: boolean;
  roomId: string;
  players: { X?: string; O?: string };
  lastActivity: number;
};

export type GameMessage = {
  type: "move" | "reset" | "join" | "create";
  position?: number;
  player?: Player;
  roomId?: string;
  playerId?: string;
};
