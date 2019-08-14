import React from "react";
import BitBetsLogo from "./images/bitbets.jpg";
import { BitBetsContainer } from "./containers/bets";
import "./App.css";

const App: React.FC = () => {
  return (
    <div className="App">
      <img src={BitBetsLogo} alt="logo" className="App-logo"/>
      <BitBetsContainer />
    </div>
  );
};

export default App;
