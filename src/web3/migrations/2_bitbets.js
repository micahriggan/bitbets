// eslint-disable-next-line
const BitBets = artifacts.require("BitBets");
module.exports = function(deployer) {
  deployer.deploy(BitBets);
};
