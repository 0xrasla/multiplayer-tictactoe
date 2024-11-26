export const styles = `
@import url('https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap');

  body {
    background-color: black;
    color: white;
    font-family: "PT Sans", sans-serif !important;
    margin: 0;
    padding: 20px;
  }

  .container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 90vh;
  }

  #box {
    width: 150px;
    height: 150px;
    display: flex;
    justify-content: center;
    align-items: center;
    border: 1px solid white;
    background-color: black;
    font-family: 'PT Sans';
    font-weight: 500;
    color: white;
    font-size: 90px;
    cursor: pointer;
  }

  #box:hover {
    background-color: rgb(46, 43, 43);
  }

  .gameboard {
    width: 456px;
    display: flex;
    flex-wrap: wrap;
    margin: 20px 0;
  }

  button {
    padding: 15px 30px;
    margin: 10px;
    color: white;
    font-family: 'PT Sans';
    background-color: black;
    border: 2px solid white;
    border-radius: 20px;
    cursor: pointer;
    font-size: 16px;
  }

  button:hover {
    background-color: white;
    color: black;
  }

  .init-screen {
    text-align: center;
  }

  .room-id {
    font-family: 'Anonymous Pro';
    padding: 10px;
    background: #1a1a1a;
    border: 1px solid white;
    color: white;
    margin: 10px;
    width: 200px;
    text-align: center;
  }

  .error-message {
    color: #ff4444;
    margin: 10px 0;
  }

  .hidden {
    display: none;
  }

  .status {
    margin: 10px 0;
    font-size: 1.2em;
  }
`;
