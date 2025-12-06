// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract SnowMarket {
    uint256 public constant SHARE_PRICE = 500000; // $0.50 USDC (6 decimals)

    IERC20 public usdc;
    address public owner;
    uint256 public marketCount;

    enum MarketStatus { Active, Resolved }
    enum Outcome { Undecided, Yes, No }

    struct Market {
        uint256 id;
        string resortName;
        string description;
        uint256 targetSnowfall;
        uint256 resolutionTime;
        MarketStatus status;
        Outcome outcome;
        uint256 totalYesShares;
        uint256 totalNoShares;
        uint256 totalPool;
    }

    struct Position {
        uint256 yesShares;
        uint256 noShares;
    }

    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => Position)) public positions;

    event MarketCreated(uint256 indexed marketId, string resortName, uint256 targetSnowfall);
    event SharesPurchased(uint256 indexed marketId, address indexed buyer, bool isYes, uint256 amount);
    event MarketResolved(uint256 indexed marketId, Outcome outcome);
    event WinningsClaimed(uint256 indexed marketId, address indexed claimer, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _usdc) {
        usdc = IERC20(_usdc);
        owner = msg.sender;
    }

    function createMarket(
        string memory resortName,
        string memory description,
        uint256 targetSnowfall,
        uint256 resolutionTime
    ) external onlyOwner returns (uint256) {
        require(resolutionTime > block.timestamp, "Resolution time must be in future");

        uint256 marketId = marketCount++;
        markets[marketId] = Market({
            id: marketId,
            resortName: resortName,
            description: description,
            targetSnowfall: targetSnowfall,
            resolutionTime: resolutionTime,
            status: MarketStatus.Active,
            outcome: Outcome.Undecided,
            totalYesShares: 0,
            totalNoShares: 0,
            totalPool: 0
        });

        emit MarketCreated(marketId, resortName, targetSnowfall);
        return marketId;
    }

    function buyShares(uint256 marketId, bool isYes, uint256 shareAmount) external {
        Market storage market = markets[marketId];
        require(market.status == MarketStatus.Active, "Market not active");
        require(block.timestamp < market.resolutionTime, "Market expired");
        require(shareAmount > 0, "Must buy at least 1 share");

        uint256 cost = shareAmount * SHARE_PRICE;
        require(usdc.transferFrom(msg.sender, address(this), cost), "Transfer failed");

        Position storage pos = positions[marketId][msg.sender];
        if (isYes) {
            pos.yesShares += shareAmount;
            market.totalYesShares += shareAmount;
        } else {
            pos.noShares += shareAmount;
            market.totalNoShares += shareAmount;
        }
        market.totalPool += cost;

        emit SharesPurchased(marketId, msg.sender, isYes, shareAmount);
    }

    function resolveMarket(uint256 marketId, uint256 actualSnowfall) external onlyOwner {
        Market storage market = markets[marketId];
        require(market.status == MarketStatus.Active, "Already resolved");

        market.status = MarketStatus.Resolved;
        market.outcome = actualSnowfall >= market.targetSnowfall ? Outcome.Yes : Outcome.No;

        emit MarketResolved(marketId, market.outcome);
    }

    function claimWinnings(uint256 marketId) external {
        Market storage market = markets[marketId];
        require(market.status == MarketStatus.Resolved, "Not resolved");

        Position storage pos = positions[marketId][msg.sender];
        uint256 winningShares;
        uint256 totalWinningShares;

        if (market.outcome == Outcome.Yes) {
            winningShares = pos.yesShares;
            totalWinningShares = market.totalYesShares;
            pos.yesShares = 0;
        } else {
            winningShares = pos.noShares;
            totalWinningShares = market.totalNoShares;
            pos.noShares = 0;
        }

        require(winningShares > 0, "No winning shares");

        uint256 payout = (market.totalPool * winningShares) / totalWinningShares;
        require(usdc.transfer(msg.sender, payout), "Transfer failed");

        emit WinningsClaimed(marketId, msg.sender, payout);
    }

    function getMarket(uint256 marketId) external view returns (
        string memory resortName,
        string memory description,
        uint256 targetSnowfall,
        uint256 resolutionTime,
        MarketStatus status,
        Outcome outcome,
        uint256 totalYesShares,
        uint256 totalNoShares,
        uint256 totalPool
    ) {
        Market storage m = markets[marketId];
        return (m.resortName, m.description, m.targetSnowfall, m.resolutionTime, 
                m.status, m.outcome, m.totalYesShares, m.totalNoShares, m.totalPool);
    }

    function getPosition(uint256 marketId, address user) external view returns (uint256 yesShares, uint256 noShares) {
        Position storage pos = positions[marketId][user];
        return (pos.yesShares, pos.noShares);
    }

    function getOdds(uint256 marketId) external view returns (uint256 yesOdds, uint256 noOdds) {
        Market storage m = markets[marketId];
        uint256 total = m.totalYesShares + m.totalNoShares;
        if (total == 0) return (50, 50);
        return ((m.totalYesShares * 100) / total, (m.totalNoShares * 100) / total);
    }
}