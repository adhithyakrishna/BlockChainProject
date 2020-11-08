var BettingLite = artifacts.require("BettingLite.sol");

//NumberOfVoters given is 2, but it can be changed to other value and it will still work.
module.exports = function(deployer){
	deployer.deploy(BettingLite, "0xfaa88b88830698a2f37dd0fa4acbc258e126bc785f1407ba9824f408a905d784")
};
