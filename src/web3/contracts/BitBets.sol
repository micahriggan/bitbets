pragma solidity ^0.4.24;
import "./IERC20.sol";

contract BitBets {
  mapping(uint => mapping(uint => uint)) public choiceBets;
  mapping(uint => mapping(address => uint)) public userBets;
  mapping(uint => mapping(address => bool)) public userWithdrawn;
  mapping(uint => address[]) takers;
  struct Bet {
    string terms;
    uint amount;
    string options;
    address oracle;
    uint outcome;
    uint totalPool;
    address paymentToken;
    bool scrapped;
  }


  Bet[] public bets;
  address public owner;
  uint public scrappedBalance;


  constructor() public {
    owner = msg.sender;
  }

  function createBet(string memory terms, uint amount, string memory options, address paymentToken) public {
    bets.push(Bet({
      terms: terms,
      amount: amount,
      options: options,
      oracle: msg.sender,
      outcome: 0,
      totalPool: 0,
      paymentToken: paymentToken,
      scrapped: false
    }));
  }

  function placeBet(uint betIndex, uint option) isUnresolved(betIndex) public payable {
    Bet memory currentBet = bets[betIndex];
    if(currentBet.paymentToken == address(0)) {
      require(msg.value == currentBet.amount, "Must meet the bet requirement");
    } else {
      require(IERC20(currentBet.paymentToken).allowance(msg.sender, address(this)) >= currentBet.amount, "You must allow the contract to move the bet");
      require(IERC20(currentBet.paymentToken).transferFrom(msg.sender, address(this), currentBet.amount), "Transfer was not successful");
    }
    require(option > 0, "You must use 1 based indexes for choosing an option");
    userBets[betIndex][msg.sender] = option;
    choiceBets[betIndex][option]++;
    takers[betIndex].push(msg.sender);
    bets[betIndex].totalPool += currentBet.amount;
  }

  modifier isOracle(uint betIndex) {
    require(bets[betIndex].oracle == msg.sender, "You must be the oracle for this bet");
    _;
  }

  modifier isAdmin() {
    require(msg.sender == owner, "You must be the contract owner");
    _;
  }

  modifier isUnresolved(uint betIndex) {
    require(bets[betIndex].outcome == 0, "Bet is already resolved");
    require(bets[betIndex].scrapped == false, "Bet is scrapped");
    _;
  }

  modifier isResolved(uint betIndex) {
    require(bets[betIndex].scrapped || bets[betIndex].outcome != 0, "Bet is not resolved yet");
    _;
  }

  modifier didBet(uint betIndex) {
    require(userBets[betIndex][msg.sender] > 0, "You must have placed a bet");
    _;
  }

  modifier canWithdraw(uint betIndex) {
    require(userWithdrawn[betIndex][msg.sender] == false, "You've already withdrawn");
    _;
  }

  function resolveBet(uint betIndex, uint outcome) public isOracle(betIndex) isUnresolved(betIndex) {
    require(outcome > 0, "Use 1 based indexes for outcome");
    bets[betIndex].outcome = outcome;
  }

  function scrapBet(uint betIndex) public isOracle(betIndex) isUnresolved(betIndex) {
    bets[betIndex].scrapped = true;
    scrappedBalance += bets[betIndex].totalPool / 2;
  }

  function sweepScraps() public isAdmin {
    scrappedBalance = 0;
    msg.sender.transfer(scrappedBalance);
  }

  function withdraw(uint betIndex) public isResolved(betIndex) canWithdraw(betIndex) didBet(betIndex) {
    Bet memory currentBet = bets[betIndex];
    uint reward = 0;
    if(currentBet.scrapped == false) {
      require(userBets[betIndex][msg.sender] == currentBet.outcome, "You didn't select the correct answer");
      reward = currentBet.totalPool / choiceBets[betIndex][currentBet.outcome];
    } else {
      // You get half of a canceled bet
      reward = currentBet.amount / 2;
    }
    userWithdrawn[betIndex][msg.sender] = true;
    if(currentBet.paymentToken == address(0x0)) {
      address(msg.sender).transfer(reward);
    } else {
      IERC20(currentBet.paymentToken).transfer(msg.sender, reward);
    }
  }
}
