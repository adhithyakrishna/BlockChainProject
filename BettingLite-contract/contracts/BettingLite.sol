//SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.4.22 <=0.6.6;

contract BettingLite 
{
    
	//structure composed of participants, has the information of the maount of betting and points he won
    struct participants
    { 
        uint256 bettingVal; 
        uint256 points;
        bytes32 password;
    } 
    
    enum Phase {INIT, BETTING, REVEAL, DONE}
    enum Score {ZERO,ONE,TWO,THREE,FOUR,FIVE,SIX,SEVEN,EIGHT}
    
    Phase public currentPhase = Phase.INIT;
    
	//All the participants are mapped to an address
    mapping ( address => participants) result; 
    
    Score score;
    uint256 minBet;
    address owner;
    bytes32 salt;
    
    event AuctionEnded(uint winningValue);
    event BettingStarted();
    event RevealStarted();
    event BettingInit();
    
    //constructor initialises the betting values and points of the organizer by 100 for participation
    constructor(bytes32 _salt) public 
    {
        owner = msg.sender;
        result[owner].bettingVal = 100;
        result[owner].points = 100;
        score = Score.ZERO;
        currentPhase = Phase.INIT;
        minBet = 100;
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

    function incrementPhase() public _playerOnly 
    {
        if (currentPhase == Phase.DONE) 
        {
            currentPhase = Phase.INIT;
        } 
        else 
        {
            uint nextPhase = uint(currentPhase) + 1;
            currentPhase = Phase(nextPhase);
        }

        if (currentPhase == Phase.REVEAL) 
        {
            emit RevealStarted();
        }
        if (currentPhase == Phase.BETTING) 
        {
            emit BettingStarted();
        }
        if (currentPhase == Phase.INIT) 
        {
            emit BettingInit();
        }
    }
	
    function createPassword (string memory password) _playerOnly public returns (bool)
    {
        require((result[msg.sender].password == 0x0000000000000000000000000000000000000000000000000000000000000000), "password already initialised");
        result[msg.sender].password = keccak256(abi.encodePacked(password, salt));
    }
    
	//the placebet function takes a nominal amount as wei for participation
    function placeBet(string memory password) public payable _playerOnly returns (uint256) 
    {
        require(result[msg.sender].password != 0x0000000000000000000000000000000000000000000000000000000000000000, "Initialise password first");
        require(result[msg.sender].password == keccak256(abi.encodePacked(password, salt)), "Wrong password");
        require(currentPhase == Phase.BETTING, "Invalid phase");
        require(msg.value > minBet , "should send more that 100 weis");
        buyTokens(msg.value);
        return result[msg.sender].bettingVal;
    }
    
	//tokens are provided to the players based on the amount he has spent
    function buyTokens(uint256 amount) private 
    {
        result[msg.sender].bettingVal += amount;
        result[msg.sender].points += amount;
    }

	// At any time both the players and the arbitar can check arbitar's points
    function getArbitarBalance() view public returns (uint256) 
    {
        return result[owner].points;
    }
    
	//At any time both the player and arbitar can check the player's points
    function getPlayerBalance() view public returns (uint256) 
    {
        return result[msg.sender].points;
    }
    
	//Takes two parameters which decides if the predicted value of the user is correct, he is either rewared or penalized based on this
    function predictWinning(uint256 prediction, uint256 actualValue) _playerOnly public 
    {
        require(currentPhase == Phase.BETTING, "Invalid phase");
        assert(result[msg.sender].points > 0);
        assert(actualValue >= uint256(Score.ZERO) && actualValue <= uint256(Score.EIGHT));
        assert(prediction >= uint256(Score.ZERO) && prediction <= uint256(Score.EIGHT));
        
        uint256 point = uint256(Score.ZERO);
        
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
            result[owner].points += point * 10;
            result[msg.sender].points -= point * 10;
        }
        else 
        {
            result[owner].points -= point * 10;
            result[msg.sender].points += point * 10;
        }
    }
    
	// Winner is declared if the particpant's points are greater than what he has initially invested
    function declareWinner() public view returns (bool) 
    {
        require(currentPhase == Phase.REVEAL, "Invalid phase");
        if(result[msg.sender].points - result[msg.sender].bettingVal > 0) 
        {
            return true;
        }
        return false;
    }
    
	//The final winning amount can be withdrawn by the player
    function withdraw(string memory password) _playerOnly public 
    {
        require(currentPhase == Phase.DONE, "Invalid phase");
        require(result[msg.sender].password == keccak256(abi.encodePacked(password, salt)), "Wrong password");
        require(result[msg.sender].points > 0,'You dont have any points to withdraw');
        uint256 profit = result[msg.sender].points - result[msg.sender].bettingVal; 
        result[msg.sender].points = 0;
        result[msg.sender].bettingVal = 0;
        payable(msg.sender).transfer(profit);
    }
}