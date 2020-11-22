//SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.4.22 <=0.6.12;

contract BettingLite 
{
    
	//structure composed of participants, has the information of the maount of betting and points he won
    struct participants
    { 
        bytes32 password;
        uint bettingAmount;
    } 
    
    enum Phase {INIT, BETTING, PAYUP, DONE}
    enum Score {ZERO, ONE, TWO, THREE, FOUR, FIVE, SIX, SEVEN, EIGHT}
    
    Phase public currentPhase = Phase.INIT;
    
	//All the participants are mapped to an address
    mapping ( address => participants) result; 
    
    Score score;
    uint minBet;
    address payable owner;
    address payable public reciever;
    address payable public beneficiary;
    bytes32 salt;
    
    event Balances(uint arbitarBalance, uint bettingValue, uint playerBalance);
    event BalancesWithMsg(uint arbitarBalance, uint bettingValue, uint playerBalance, string msg , uint256 value);
    event afterPrediction(string result, uint winValue);
    event BettingStarted(string msg);
    event BettingDone();

    //constructor initialises the betting values and points of the organizer by 100 for participation
    constructor(bytes32 _salt, address payable recipientAddress) public payable
    {
        owner = address(this);
        reciever = recipientAddress;
        beneficiary = msg.sender;
        score = Score.ZERO;
        currentPhase = Phase.INIT;
        minBet = 20;
        salt = _salt;
    }
    
	//modifier to be used only by the organiser
    modifier _ownerOnly() 
    {
        require(msg.sender == owner);
        _;
    }
    
	//modifier to be used only by the player
    modifier _playerOnly() 
    {
        require(msg.sender != owner);
        _;
    }

    modifier _ownerHasMoney() {
        require(owner.balance  > 0);
        _;    
    }
    
    receive () external payable {
    
    }

    function deposit() public payable {

    }
    

    function bettingValue(uint val) public {
        require(val >= 10, "Betting value should be atleast 10");
        require(currentPhase == Phase.BETTING, "Invalid phase");
        val = val * 1000000000000000000;
        result[msg.sender].bettingAmount += val;
        emit Balances(address(this).balance, result[msg.sender].bettingAmount, msg.sender.balance);
    }

    function settled() public {
        currentPhase = Phase.BETTING;
        emit BettingStarted("Betting");
    }

    function getCurrentPhase() public view returns(Phase) {
        return currentPhase; 
    }

    function getOwnerAddress() public view returns (address) {
        return owner;
    }
	
    function createPassword (string memory password) _playerOnly public returns (bool)
    {
        require(currentPhase == Phase.INIT, "Invalid phase");
        require((result[msg.sender].password == 0x0000000000000000000000000000000000000000000000000000000000000000), "password already initialised");
        currentPhase = Phase.BETTING;
        result[msg.sender].password = keccak256(abi.encodePacked(password, salt));
        emit BettingStarted("Betting");
    }
    
    function verifyPassword (string memory password) _playerOnly view public returns (bool)
    {
        require(currentPhase == Phase.BETTING, "Invalid phase");
        return result[msg.sender].password == keccak256(abi.encodePacked(password, salt));
    }

    function retry() _playerOnly public {
        require(currentPhase == Phase.DONE, "Invalid phase");
        currentPhase = Phase.BETTING;
    }
    
    function getBalances() public {
        emit Balances(address(this).balance, result[msg.sender].bettingAmount ,msg.sender.balance);
    }

	//the placebet function takes a nominal amount as wei for participation
    function placeBet(string memory password) public payable _playerOnly returns (uint) 
    {
        require(result[msg.sender].password == keccak256(abi.encodePacked(password, salt)), "Wrong password");
        require(currentPhase == Phase.BETTING, "Invalid phase");
        require(msg.value > minBet , "should send more that 100 weis");
        // buyTokens(msg.value);
        emit Balances(address(this).balance, result[msg.sender].bettingAmount, msg.sender.balance);
        return msg.sender.balance;
    }
    
	//Takes two parameters which decides if the predicted value of the user is correct, he is either rewared or penalized based on this
    function predictWinning(uint256 prediction, uint256 actualValue) _playerOnly _ownerHasMoney public 
    {
        require(currentPhase == Phase.BETTING, "Invalid phase");
        assert(msg.sender.balance > 0);
        assert(actualValue >= uint256(Score.ZERO) && actualValue <= uint256(Score.EIGHT));
        assert(prediction >= uint256(Score.ZERO) && prediction <= uint256(Score.EIGHT));
        
        uint256 point = uint256(Score.ZERO);
        uint256 value = uint256(Score.ONE);
        
        if(prediction == uint256(Score.SIX) || prediction == uint256(Score.FOUR)) 
        {
            point = uint256(Score.TWO);
        }
        else if(prediction == uint256(Score.SEVEN)) 
        {
            //to represent wicket
            point = uint256(Score.FOUR);
        }
        else 
        {
            point = uint256(Score.ONE);
        }
        
        if(prediction != actualValue) 
        {
            currentPhase = Phase.PAYUP;
            result[msg.sender].bettingAmount -= point * 1000000000000000000; 
            value = point;
            emit BalancesWithMsg(address(this).balance, result[msg.sender].bettingAmount, msg.sender.balance,"negative", value);
        }
        else {
            msg.sender.transfer( point * 1000000000000000000);
            value = point;
            emit BalancesWithMsg(address(this).balance, result[msg.sender].bettingAmount, msg.sender.balance, "positive", value);
        }
    }

    function getPlayerPoints() public view returns (uint)
    {
        return msg.sender.balance;
    }

    function getOwnerPoints() public view returns (uint)
    {
        return owner.balance;
    }
    
	//The final winning amount can be withdrawn by the player
    function withdraw() _playerOnly _ownerHasMoney public 
    {
        require(currentPhase == Phase.BETTING, "Invalid phase");
        require(result[msg.sender].bettingAmount > 0, "You dont have any winning");
        msg.sender.transfer(result[msg.sender].bettingAmount);
        result[msg.sender].bettingAmount = 0;
        currentPhase = Phase.DONE;
        emit Balances(address(this).balance, result[msg.sender].bettingAmount, msg.sender.balance);
    }

    function closeBetting() public _playerOnly {
        require(currentPhase == Phase.DONE, "Invalid phase");
        selfdestruct(msg.sender);
        emit BettingDone();
    }
}