import React from 'react';
import logo from './logo.svg';
import { BitBetsContainer } from "./containers/bets";
import './App.css';

const App: React.FC = () => {
  return (
    <div className="App">
    <BitBetsContainer/>
    </div>
  );
}

export default App;
