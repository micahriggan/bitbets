import React from "react";
import Web3 from "web3";
import Paper from "@material-ui/core/Paper";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";
import Divider from "@material-ui/core/Divider";

const address =
  process.env.REACT_APP_CONTRACT ||
  "0x4d872048A728f4c733A06d361B226B0D4F3290D9";
const BitBetsAbi = require("../web3/build/contracts/BitBets.json").abi;
console.log(BitBetsAbi);

interface Bet {
  terms: string;
  amount: number;
  options: string[];
  oracle: string;
  outcome: number;
  totalPool: number;
  paymentToken: string;
}
interface IState {
  bets: Array<Bet>;
  newBet: Partial<Bet>;
  betOption: string;
}

const styles = {
  section: {
    margin: "0 auto",
    padding: "15px"
  },
  create: {
    margin: "0 auto",
    maxWidth: "600px",
    padding: "15px",
    display: "flex" as "flex",
    flexDirection: "column" as "column"
  }
};
export class BitBetsContainer extends React.Component<{}, IState> {
  web3: Web3 = new Web3();
  state: IState = {
    bets: new Array<Bet>(),
    newBet: {},
    betOption: ""
  };

  async componentDidMount() {
    const windowWeb3 = (window as any).web3;
    this.web3 = new Web3(
      windowWeb3.currentProvider ||
        new Web3.providers.HttpProvider("http://localhost:8545")
    );
    if ((window as any).ethereum) {
      await (window as any).ethereum.enable();
    }
    this.populateBetsState();
  }

  getBetsContract() {
    return new this.web3.eth.Contract(BitBetsAbi, address);
  }

  async populateBetsState() {
    const contract = this.getBetsContract();
    const bets = [];
    let index = 0;
    try {
      let betItr = await contract.methods.bets(index).call();
      console.log(betItr);
      while (betItr) {
        console.log(betItr);
        bets.push(betItr);
        index++;
        betItr = await contract.methods.bets(index).call();
      }
    } catch (e) {
      console.log(e);
    }

    this.setState({ bets });
  }

  betsComponent() {
    const bets = this.state.bets.map(bet => (
      <div>
        <div>{bet.terms}</div>
        <div>{bet.amount}</div>
        <div>{bet.paymentToken}</div>
        <div>{bet.totalPool} Pool</div>
        <div>{bet.oracle} Oracle</div>
        <div>
          <h4>Options</h4>
          {bet.options}
        </div>
      </div>
    ));
    return (
      <Paper style={styles.section}>
        {bets.length > 0 ? bets : "No bets have been created"}
      </Paper>
    );
  }

  setBetTerms(terms: string) {
    const newBet = this.state.newBet;
    newBet.terms = terms;
    this.setState({ newBet });
  }

  setBetAmount(amount: number) {
    const newBet = this.state.newBet;
    newBet.amount = Number(amount);
    this.setState({ newBet });
  }

  setBetPaymentToken(address: string) {
    const newBet = this.state.newBet;
    newBet.paymentToken = address;
    this.setState({ newBet });
  }

  setBetOutcome(outcome: number) {
    const newBet = this.state.newBet;
    newBet.outcome = Number(outcome);
    this.setState({ newBet });
  }

  setBetOption(option: string) {
    this.setState({ betOption: option });
  }

  addBetOptions(option: string) {
    const newBet = this.state.newBet;
    newBet.options = newBet.options || [];
    newBet.options.push(option);
    this.setState({ betOption: "" });
    this.setState({ newBet });
  }

  async createBet() {
    const newBet = this.state.newBet;
    const [from] = await this.web3.eth.getAccounts();
    await this.getBetsContract()
      .methods.createBet(
        newBet.terms,
        newBet.amount,
        newBet.options ? newBet.options.join() : "",
        newBet.paymentToken || "0x" + new Array(40).fill(0).join("")
      )
      .send({ from });
    this.populateBetsState();
  }

  createBetsComponent() {
    return (
      <div style={styles.create}>
        <TextField
          onChange={e => this.setBetTerms(e.target.value)}
          label="Bet Terms"
        />
        <TextField
          onChange={e => this.setBetAmount(Number(e.target.value))}
          label="Bet Amount"
        />
        <TextField
          onChange={e => this.setBetPaymentToken(e.target.value)}
          label="Payment Token"
        />
        <h3>Bet Options</h3>
        {(this.state.newBet.options || []).map(o => (
          <div>{o}</div>
        ))}
        <TextField
          onChange={e => this.setBetOption(e.target.value)}
          label="Bet Option"
        />
        <Button onClick={() => this.addBetOptions(this.state.betOption)}>
          +
        </Button>

        <div style={styles.section} />
        <Button
          onClick={() => this.createBet()}
          disabled={
            !this.state.newBet.options || this.state.newBet.options.length <= 1
          }
          color="primary"
          variant="contained"
        >
          Create Bet
        </Button>
      </div>
    );
  }
  render() {
    return (
      <div>
        <div style={styles.section}>{this.createBetsComponent()}</div>
        <div style={styles.section}>{this.betsComponent()}</div>
      </div>
    );
  }
}
