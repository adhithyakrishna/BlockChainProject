var BettingLite = artifacts.require("BettingLite");

module.exports = function (deployer, networks, accounts) {
	var receiver = accounts[1];
	var balance = 80000000000000000000;
	deployer.deploy(BettingLite, "0xfaa88b88830698a2f37dd0fa4acbc258e126bc785f1407ba9824f408a905d784", receiver, { value: balance });
};