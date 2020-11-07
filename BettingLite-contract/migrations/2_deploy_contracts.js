var BettingLite = artifacts.require("BettingLite.sol");

//NumberOfVoters given is 2, but it can be changed to other value and it will still work.
module.exports = function(deployer){
	deployer.deploy(BettingLite)
};
