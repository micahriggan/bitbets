import React from "react";
import logo from "./logo.svg";
import { BitBetsContainer } from "./containers/bets";
import "./App.css";
import { createBrowserHistory } from "history";
import { Router, Switch, Route } from "react-router";
import { BetContainer } from "./containers/bet";

const customHistory = createBrowserHistory();
const App: React.FC = () => {
  return (
    <div className="App">
      <Router history={customHistory}>
        <Switch>
          <Route exact path="/:bet" component={BetContainer} />
          <Route exact path="/" component={BitBetsContainer} />
        </Switch>
      </Router>
    </div>
  );
};

export default App;
