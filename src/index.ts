import { Hono } from "hono";
import { createBunWebSocket } from "hono/bun";
import {
  broadcastGameState,
  createRoom,
  handleMove,
  joinRoom,
  players,
  removePlayer,
  resetGame,
} from "./game/gameLogic";
import { styles } from "./styles/styles";

const app = new Hono();
const { upgradeWebSocket, websocket } = createBunWebSocket();

app.get("/", (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Multiplayer Tic-tac-toe</title>
    <style>${styles}</style>
</head>
<body>
   <div class="container">
       <h1>Multiplayer Tic Tac Toe</h1>
       
       <div class="init-screen">
         <div>
           <button id="createRoom">Create New Room</button>
         </div>
         <div>
           <input type="text" class="room-id" id="roomInput" placeholder="Enter Room ID">
           <button id="joinRoom">Join Room</button>
         </div>
         <div class="error-message"></div>
       </div>

       <div class="game-screen hidden">
         <div class="status"></div>
         <div class="room-status">Room ID: <span class="current-room"></span></div>
         <div class="player-status"></div>
         
         <div class="gameboard">
           <div id="box" class="1"></div>
           <div id="box" class="2"></div>
           <div id="box" class="3"></div>
           <div id="box" class="4"></div>
           <div id="box" class="5"></div>
           <div id="box" class="6"></div>
           <div id="box" class="7"></div>
           <div id="box" class="8"></div>
           <div id="box" class="9"></div>
         </div>

         <button id="resetBtn">Reset Board</button>
       </div>
   </div>

    <script>
      const ws = new WebSocket(\`ws://\${window.location.host}/ws\`);
      const boxes = document.querySelectorAll('#box');
      const resetBtn = document.getElementById('resetBtn');
      const createRoomBtn = document.getElementById('createRoom');
      const joinRoomBtn = document.getElementById('joinRoom');
      const roomInput = document.getElementById('roomInput');
      const initScreen = document.querySelector('.init-screen');
      const gameScreen = document.querySelector('.game-screen');
      const errorMessage = document.querySelector('.error-message');
      const status = document.querySelector('.status');
      const playerStatus = document.querySelector('.player-status');
      const currentRoom = document.querySelector('.current-room');
      
      let myPlayerId = null;
      let currentRoomId = null;
      
      createRoomBtn.addEventListener('click', () => {
        const roomId = Math.random().toString(36).substring(2, 8);
        ws.send(JSON.stringify({
          type: 'create',
          roomId
        }));
      });
      
      joinRoomBtn.addEventListener('click', () => {
        const roomId = roomInput.value.trim();
        if (!roomId) {
          errorMessage.textContent = 'Please enter a room ID';
          return;
        }
        ws.send(JSON.stringify({
          type: 'join',
          roomId
        }));
      });
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'init') {
          myPlayerId = data.playerId;
        } else if (data.type === 'error') {
          errorMessage.textContent = data.message;
        } else if (data.type === 'gameState') {
          errorMessage.textContent = '';
          initScreen.classList.add('hidden');
          gameScreen.classList.remove('hidden');
          currentRoom.textContent = data.roomId;
          currentRoomId = data.roomId;
          
          // Update board
          data.board.forEach((value, index) => {
            boxes[index].textContent = value;
          });
          
          // Update player status
          const playerSymbol = data.players.X === myPlayerId ? 'X' : 'O';
          playerStatus.textContent = \`You are playing as: \${playerSymbol}\`;
          
          // Update game status
          if (data.isGameOver) {
            if (data.winner) {
              status.textContent = \`Player \${data.winner} wins!\`;
            } else {
              status.textContent = "It's a draw!";
            }
          } else {
            status.textContent = \`Current Player: \${data.currentPlayer}\`;
          }
        }
      };
      
      boxes.forEach((box, index) => {
        box.addEventListener('click', () => {
          ws.send(JSON.stringify({
            type: 'move',
            position: index,
            roomId: currentRoomId
          }));
        });
      });
      
      resetBtn.addEventListener('click', () => {
        ws.send(JSON.stringify({ 
          type: 'reset',
          roomId: currentRoomId
        }));
      });
    </script>
</body>
</html>
    `);
});

app.get(
  "/ws",
  upgradeWebSocket((c) => {
    const playerId = Math.random().toString(36).substring(7);

    return {
      onOpen(_event, ws) {
        players.set(playerId, ws);
        ws.send(
          JSON.stringify({
            type: "init",
            playerId,
          })
        );
      },

      onMessage(event, ws) {
        try {
          const data = JSON.parse(event.data as string);

          switch (data.type) {
            case "create":
              if (data.roomId) {
                const gameState = createRoom(data.roomId);
                const joined = joinRoom(data.roomId, playerId);
                if (joined) {
                  broadcastGameState(data.roomId);
                }
              }
              break;

            case "join":
              if (data.roomId) {
                const joined = joinRoom(data.roomId, playerId);
                if (joined) {
                  broadcastGameState(data.roomId);
                } else {
                  ws.send(
                    JSON.stringify({
                      type: "error",
                      message:
                        "Unable to join room. Room might be full or doesn't exist.",
                    })
                  );
                }
              }
              break;

            case "move":
              if (typeof data.position === "number" && data.roomId) {
                if (handleMove(data.position, playerId)) {
                  broadcastGameState(data.roomId);
                } else {
                  ws.send(
                    JSON.stringify({
                      type: "error",
                      message: "Invalid move or not your turn.",
                    })
                  );
                }
              }
              break;

            case "reset":
              if (data.roomId) {
                resetGame(data.roomId);
                broadcastGameState(data.roomId);
              }
              break;
          }
        } catch (error) {
          console.error("Error processing message:", error);
          ws.send(
            JSON.stringify({
              type: "error",
              message: "An error occurred while processing your request.",
            })
          );
        }
      },

      onClose() {
        removePlayer(playerId);
      },

      onError() {
        removePlayer(playerId);
      },
    };
  })
);

export default {
  port: 3000,
  fetch: app.fetch,
  websocket,
};
