//SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.4.22 <=0.6.12;

contract BettingLite 
{
    
	//structure composed of participants, has the information of the maount of betting and points he won
    struct participants
    { 
        bytes32 password;
        uint bettingAmount;
        uint pendingAmount;
    } 
    
    enum Phase {INIT, INVEST, BETTING, PAYUP, DONE}
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
    
    event Balances(uint arbitarBalance, uint bettingValue, uint playerBalance, uint phase);
    event BalancesWithMsg(uint arbitarBalance, uint bettingValue, uint playerBalance, string msg , uint256 value, uint phase);
    event Message(string val, string message);
    event InvestingStarted(uint phase);
    event BettingStarted(uint phase);
    event BettingDone(uint phase);
    event CurrentPhase(uint phase);
    event OwnerInfo(address ownerAccount, address ownerAddress);
    event Pending(uint amount);

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
    
    //Fallback functions
    receive () external payable {
    
    }

    function deposit() public payable {

    }

	//modifier functions
    modifier _ownerOnly() 
    {
        require(msg.sender == owner);
        _;
    }
    
    modifier _playerOnly() 
    {
        require(msg.sender != owner);
        _;
    }

    modifier _ownerHasMoney() {
        require(owner.balance  > 0);
        _;    
    }
    
    //Step 1 create password, returns phase as betting
    function createPassword (string memory password) _playerOnly public returns (bool)
    {
        require(currentPhase == Phase.INIT, "Invalid phase");
        require((result[msg.sender].password == 0x0000000000000000000000000000000000000000000000000000000000000000), "password already initialised");
        currentPhase = Phase.INVEST;
        result[msg.sender].password = keccak256(abi.encodePacked(password, salt));
        emit InvestingStarted(uint(currentPhase));
    }

    //Step 2 Enter the betting value, returns balances of both players along with the betting value
    /*function bettingValue(uint val) public {
        require(val >= 10, "Betting value should be atleast 10");
        require(val < address(this).balance, "Betting value should be less than the betting value");
        require(currentPhase == Phase.INVEST, "Invalid phase");
        val = val * 1000000000000000000;
        result[msg.sender].bettingAmount += val;
        currentPhase = Phase.BETTING;
        emit Balances(address(this).balance, result[msg.sender].bettingAmount, msg.sender.balance, uint(currentPhase));
    }*/

    //Step 2 Enter the betting value, returns balances of both players along with the betting value
    function betting() public payable {
        require(msg.value >= 10, "Betting value should be atleast 10");
        require(msg.value < address(this).balance, "Betting value should be less than the betting value");
        require(currentPhase == Phase.INVEST, "Invalid phase");
        uint val = msg.value;
        beneficiary.transfer(msg.value);
        result[msg.sender].bettingAmount += val;
        currentPhase = Phase.BETTING;
        emit Balances(address(this).balance, result[msg.sender].bettingAmount, msg.sender.balance, uint(currentPhase));
    }

    //Step 3 two parameters which decides if the predicted value of the user is correct, he is either rewared or penalized based on this
    function predictWinning(uint256 prediction, uint256 actualValue) _playerOnly _ownerHasMoney public 
    {
        require(currentPhase == Phase.BETTING, "Invalid phase");
        require(address(this).balance > 0, "Owner has no money");
        assert(result[msg.sender].bettingAmount > 0);
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
            if(result[msg.sender].bettingAmount <= 0) {
                currentPhase = Phase.INVEST;
            }
            value = point;
            result[msg.sender].pendingAmount = value;
            emit BalancesWithMsg(address(this).balance, result[msg.sender].bettingAmount, msg.sender.balance,"negative", value, uint(currentPhase));
        }
        else {
            msg.sender.transfer( point * 1000000000000000000);
            value = point;
            emit BalancesWithMsg(address(this).balance, result[msg.sender].bettingAmount, msg.sender.balance, "positive", value, uint(currentPhase));
        }
    }

    //Step 4 after paying it, we move on to betting phase again
    function settleUp() public payable {
        currentPhase = Phase.BETTING;
        result[msg.sender].pendingAmount = 0;
        emit Balances(address(this).balance, result[msg.sender].bettingAmount, msg.sender.balance, uint(currentPhase));
    }

    //Step 5 final winning amount can be withdrawn by the player
    function withdraw(string memory password) _playerOnly _ownerHasMoney public 
    {
        require(result[msg.sender].password == keccak256(abi.encodePacked(password, salt)),"invalid password");
        require(currentPhase == Phase.BETTING, "Invalid phase");
        require(result[msg.sender].bettingAmount > 0, "You dont have any winning");
        uint amount = 0;
        if(result[msg.sender].bettingAmount > address(this).balance) {
            amount = address(this).balance;
        }
        else {
            amount = result[msg.sender].bettingAmount;
        }
        msg.sender.transfer(result[msg.sender].bettingAmount);
        result[msg.sender].bettingAmount = 0;
        currentPhase = Phase.DONE;
        emit Balances(address(this).balance, result[msg.sender].bettingAmount, msg.sender.balance, uint(currentPhase));
    }
	
    //Step 6 retry the betting
    function retry() _playerOnly public {
        require(currentPhase == Phase.DONE, "Invalid phase");
        currentPhase = Phase.INVEST;
        emit BettingStarted(uint(currentPhase));
    }

    //Step 7 when the betting is finished
    function closeBetting() public _playerOnly {
        selfdestruct(msg.sender);
    }

    //Anscillary functions
    function getBalances() public {
        emit Balances(address(this).balance, result[msg.sender].bettingAmount ,msg.sender.balance, uint(currentPhase));
    }

    function getPending() public {
        emit Pending(result[msg.sender].pendingAmount);
    }

    function getOwnerAddress() public returns (address) {
        emit OwnerInfo(owner, beneficiary);
    }
}