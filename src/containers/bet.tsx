import React from "react";
import { BitBetsContainer, Bet } from "./bets";
import { BetContractAddress } from "../config";

interface IState {
  network: keyof typeof BetContractAddress;
  bets: Array<Bet>;
  newBet: Partial<Bet>;
  betOption: string;
  user: string;
  canWithdraw: { [betIndex: string]: boolean };
}

export class BetContainer extends BitBetsContainer {
  async populateBetsState() {
    const contract = this.getBetsContract();
    const bets = [];
    const canWithdraw = {} as IState["canWithdraw"];
    let index = Number(this.props.match.params.bet || "0");
    try {
      let bet = await contract.methods.bets(index).call();
      if (bet.outcome) {
        canWithdraw[index.toString()] = await this.canWithdraw(
          index,
          bet.outcome
        );
      }
      const choice = await contract.methods
        .userBets(index, this.state.user)
        .call();
      bet.options = bet.options.split(",");
      bet.choiceCounts = [];
      for (let c = 0; c < bet.options.length; c++) {
        const betCount = await contract.methods
          .choiceBets(index, c + 1)
          .call();
        bet.choiceCounts.push(betCount);
      }

      bet.userChoice = choice;
      bet.index = index;
      bets.push(bet);
    } catch (e) {
      console.log(e);
    }

    this.setState({ bets, canWithdraw });
  }

  render() {
    return <div>{this.betsComponent(false)} </div>;
  }
}
