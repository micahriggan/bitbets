import React from "react";
import Web3 from "web3";
import Paper from "@material-ui/core/Paper";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";
import Divider from "@material-ui/core/Divider";
import CircularProgress from "@material-ui/core/CircularProgress";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import { BetContractAddress } from "../config";
import { RouteComponentProps } from "react-router";
import { Link } from "react-router-dom";

const BitBetsAbi = require("../web3/build/contracts/BitBets.json").abi;
const ERC20ABI = require("../web3/build/contracts/IERC20.json").abi;

const ZERO_ADDR = "0x" + new Array(40).fill("0").join("");

const TOKENS = {
  ETH: { address: ZERO_ADDR, decimals: 18, name: "ETH" },
  GUSD: {
    address: "0x056fd409e1d7a124bd7017459dfea2f387b6d5cd",
    name: "GUSD",
    decimals: 2
  },
  USDC: {
    address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    decimals: 6,
    name: "USDC"
  },
  PAX: {
    address: "0x8e870d67f660d95d5be530380d0ec0bd388289e1",
    decimals: 18,
    name: "PAX"
  }
};

function getTokenForAddress(address: string) {
  return Object.values(TOKENS).find(
    t => t.address.toLowerCase() === address.toLowerCase()
  );
}

export interface ContractBet {
  terms: string;
  amount: number;
  options: string;
  oracle: string;
  outcome: number;
  totalPool: number;
  paymentToken: string;
  scrapped: boolean;
}

export interface Bet {
  terms: string;
  amount: number;
  options: string[];
  oracle: string;
  outcome: number;
  totalPool: number;
  paymentToken: string;
  index: number;
  userChoice: number;
  scrapped: boolean;
}

interface IState {
  room: string;
  network: keyof typeof BetContractAddress;
  bets: Array<Bet>;
  newBet: Partial<Bet>;
  betOption: string;
  user: string;
  canWithdraw: { [betIndex: string]: boolean };
}

interface IProps
  extends RouteComponentProps<{
    room: string;
    bet?: string;
  }> {}

const styles = {
  card: {
    maxWidth: "400px",
    padding: "15px",
    marginBottom: "15px"
  },
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
  },
  flexRow: {
    display: "flex" as "flex",
    flexDirection: "row" as "row"
  }
};
export class BitBetsContainer extends React.Component<IProps, IState> {
  web3: Web3 = new Web3();
  state: IState = {
    room: "main",
    network: "dev",
    bets: new Array<Bet>(),
    newBet: {
      paymentToken: TOKENS.ETH.address
    },
    betOption: "",
    user: "",
    canWithdraw: {}
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

    const networkId = await this.web3.eth.net.getId();
    const network = networkId === 1 ? "mainnet" : "dev";
    const room = this.props.match.params.room || "main";
    this.setState({ network, room });
    await this.populateUser();
    this.populateBetsState();
  }

  async populateUser() {
    const [user] = await this.web3.eth.getAccounts();
    this.setState({ user });
  }
  getBetsContractAddress() {
    return BetContractAddress[this.state.network];
  }

  getBetsContract() {
    const address = this.getBetsContractAddress();
    return new this.web3.eth.Contract(BitBetsAbi, address);
  }

  getErc20(address: string) {
    return new this.web3.eth.Contract(ERC20ABI, address);
  }

  async populateBetsState() {
    const contract = this.getBetsContract();
    const bets = [];
    const canWithdraw = {} as IState["canWithdraw"];
    let index = 0;
    try {
      let betItr = await contract.methods.bets(index).call();
      while (betItr) {
        if (betItr.outcome) {
          canWithdraw[index.toString()] = await this.canWithdraw(
            index,
            betItr.outcome,
            betItr.scrapped
          );
        }

        const choice = await contract.methods
          .userBets(index, this.state.user)
          .call();
        betItr.userChoice = choice;
        betItr.options = betItr.options.split(",");
        betItr.index = index;
        bets.push(betItr);
        index++;
        betItr = await contract.methods.bets(index).call();
      }
    } catch (e) {
      console.log(e);
    }

    this.setState({ bets, canWithdraw });
  }

  async canWithdraw(betIndex: number, outcome: number, isScrapped: boolean) {
    const user = this.state.user;
    const contract = this.getBetsContract();
    const isDone = outcome.toString() !== "0" || isScrapped;
    const choice = await contract.methods.userBets(betIndex, user).call();
    const choseCorrect = choice === outcome || isScrapped;
    const withdrawn = await contract.methods
      .userWithdrawn(betIndex, user)
      .call();
    return isDone && choseCorrect && !withdrawn;
  }

  betsComponent(filter: boolean) {
    const bets = this.state.bets
      .reverse()
      .filter(b => {
        const isActiveBet = b.outcome.toString() === "0" && !b.scrapped;
        const canWithdraw = this.state.canWithdraw[b.index];
        return !filter || isActiveBet || canWithdraw;
      })
      .map(bet => {
        const token = getTokenForAddress(bet.paymentToken);
        const isOpen = bet.outcome.toString() === "0";
        return (
          <Paper style={styles.card}>
            <div>
              <h4>I bet that...</h4>
              <Link to={"/" + bet.index}>{bet.terms}</Link>
            </div>
            <div>
              <h4>Bet Amount: </h4>
              {bet.amount / Math.pow(10, token!.decimals)} {token!.name}
            </div>
            <div>
              <h4>Pool Balance: </h4>
              {bet.totalPool / Math.pow(10, token!.decimals)} {token!.name}
            </div>
            {isOpen ? (
              <div>
                <Divider />
                {bet.userChoice.toString() === "0" ? (
                  <div>
                    <h5>Place Your Bet</h5>
                    {bet.options.map((option, optionIndex) =>
                      option ? (
                        <Button
                          onClick={() =>
                            this.placeBet(bet.index, optionIndex + 1)
                          }
                        >
                          {option} 
                        </Button>
                      ) : null
                    )}
                  </div>
                ) : (
                  <div>
                    <h5>You Bet</h5>
                    {bet.options[bet.userChoice - 1]}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <h4>Bet Outcome</h4>
                {bet.options[bet.outcome - 1]}
              </div>
            )}
            {this.state.canWithdraw[bet.index.toString()] ? (
              <div>
                <h4> Congrats! </h4>
                <Button onClick={() => this.redeemBet(bet.index)}>
                  Widthdraw
                </Button>
              </div>
            ) : null}
            {isOpen && this.state.user === bet.oracle ? (
              <div>
                <Divider />
                <h5>Oracle</h5>
                {bet.options.map((option, optionIndex) => (
                  <Button
                    onClick={() => this.resolveBet(bet.index, optionIndex + 1)}
                  >
                    {option}
                  </Button>
                ))}
                <Button onClick={() => this.scrapBet(bet.index)}>Cancel</Button>
              </div>
            ) : null}
          </Paper>
        );
      });
    return (
      <div style={{ ...styles.card, ...styles.section }}>
        {bets.length > 0 ? bets : <CircularProgress className="inherit" />}
      </div>
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
    newBet.options = Array.from(new Set(newBet.options || []).add(option));
    this.setState({ newBet, betOption: "" });
  }

  async createBet() {
    const newBet = this.state.newBet;
    const [from] = await this.web3.eth.getAccounts();
    const selectedToken = Object.values(TOKENS).find(
      t => t.address === newBet.paymentToken
    );
    if (selectedToken) {
      const BN = this.web3.utils.toBN;
      const amountStr = newBet.amount!.toString();
      const decimalIndex = amountStr.indexOf(".");
      const shiftAmount =
        decimalIndex > -1 ? amountStr.length - (decimalIndex + 1) : 0;
      const afterDecimals = Number(amountStr.slice(decimalIndex + 1));
      const shift = Math.pow(10, shiftAmount);
      const power = BN(10).pow(BN(selectedToken.decimals - shiftAmount));
      const bigAmount = BN(afterDecimals).mul(power);
      await this.getBetsContract()
        .methods.createBet(
          newBet.terms,
          bigAmount.toString(),
          newBet.options ? newBet.options.join() : "",
          newBet.paymentToken || ZERO_ADDR
        )
        .send({ from });
      this.populateBetsState();
    }
  }

  async placeBet(betIndex: number, optionIndex: number) {
    const contractAddress = this.getBetsContractAddress();
    const [from] = await this.web3.eth.getAccounts();
    const bet = this.state.bets.find(b => b.index === betIndex)!;
    let value = bet.amount;
    if (bet.paymentToken !== ZERO_ADDR) {
      value = 0;
      await this.getErc20(bet.paymentToken)
        .methods.approve(contractAddress, bet.amount)
        .send({ from });
    }
    await this.getBetsContract()
      .methods.placeBet(betIndex, optionIndex)
      .send({ from, value });
    this.populateBetsState();
  }

  async resolveBet(betIndex: number, optionIndex: number) {
    const [from] = await this.web3.eth.getAccounts();
    const bet = this.state.bets.find(b => b.index === betIndex)!;
    const value = bet.amount;
    await this.getBetsContract()
      .methods.resolveBet(betIndex, optionIndex)
      .send({ from });
    this.populateBetsState();
  }

  async scrapBet(betIndex: number) {
    const [from] = await this.web3.eth.getAccounts();
    const bet = this.state.bets.find(b => b.index === betIndex)!;
    const value = bet.amount;
    await this.getBetsContract()
      .methods.scrapBet(betIndex)
      .send({ from });
    this.populateBetsState();
  }

  async redeemBet(betIndex: number) {
    console.log(betIndex);
    const [from] = await this.web3.eth.getAccounts();
    await this.getBetsContract()
      .methods.withdraw(betIndex)
      .send({ from });
    this.populateBetsState();
  }

  createBetsComponent() {
    return (
      <div style={styles.create}>
        <TextField
          onChange={e => this.setBetTerms(e.target.value)}
          label="I Bet that..."
        />
        <TextField
          onChange={e => this.setBetAmount(Number(e.target.value))}
          label="Bet Amount"
        />
        <Select
          value={this.state.newBet.paymentToken}
          onChange={e => this.setBetPaymentToken(e.target.value as string)}
          inputProps={{
            name: "token",
            id: "token-simple"
          }}
        >
          <MenuItem value={TOKENS.ETH.address}>ETH</MenuItem>
          <MenuItem value={TOKENS.GUSD.address}>GUSD</MenuItem>
          <MenuItem value={TOKENS.PAX.address}>PAX</MenuItem>
          <MenuItem value={TOKENS.USDC.address}>USDC</MenuItem>
        </Select>
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
        <div style={styles.section}>{this.betsComponent(true)}</div>
      </div>
    );
  }
}
