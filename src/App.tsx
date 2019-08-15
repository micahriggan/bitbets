import React from "react";
import BitBetsLogo from "./images/bitbets.jpg";
import { BitBetsContainer } from "./containers/bets";
import "./App.css";
import { createBrowserHistory } from "history";
import { Router, Switch, Route } from "react-router";
import { BetContainer } from "./containers/bet";

const customHistory = createBrowserHistory();
const App: React.FC = () => {
  return (
    <div className="App">
      <img src={BitBetsLogo} alt="logo" className="App-logo"/>
      <Router history={customHistory}>
        <Switch>
          <Route exact path="/:room/:bet" component={BetContainer} />
          <Route exact path="/:room" component={BitBetsContainer} />
        </Switch>
      </Router>
    </div>
  );
};

export default App;
