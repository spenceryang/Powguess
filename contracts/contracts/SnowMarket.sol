// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SnowMarket
 * @dev Prediction market for snowfall at ski resorts
 * Fixed-price shares: YES/NO at $0.50 each in USDC
 */
contract SnowMarket is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Share price: $0.50 USDC (with 6 decimals)
    uint256 public constant SHARE_PRICE = 500_000; // 0.5 USDC

    IERC20 public usdc;

    enum MarketStatus { Active, Resolved }
    enum Outcome { Undecided, Yes, No }

    struct Market {
        uint256 id;
        string resortName;
        string description;
        uint256 targetSnowfall;     // in inches (scaled by 100 for precision)
        uint256 resolutionTime;     // Unix timestamp
        MarketStatus status;
        Outcome outcome;
        uint256 totalYesShares;
        uint256 totalNoShares;
        uint256 totalPool;          // Total USDC in the market
    }

    struct Position {
        uint256 yesShares;
        uint256 noShares;
    }

    // Market storage
    uint256 public marketCount;
    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => Position)) public positions;

    // Events
    event MarketCreated(
        uint256 indexed marketId,
        string resortName,
        string description,
        uint256 targetSnowfall,
        uint256 resolutionTime
    );
    event SharesPurchased(
        uint256 indexed marketId,
        address indexed buyer,
        bool isYes,
        uint256 amount,
        uint256 cost
    );
    event MarketResolved(
        uint256 indexed marketId,
        Outcome outcome,
        uint256 actualSnowfall
    );
    event WinningsClaimed(
        uint256 indexed marketId,
        address indexed claimer,
        uint256 amount
    );

    constructor(address _usdc) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
    }

    /**
     * @dev Create a new prediction market
     * @param resortName Name of the ski resort
     * @param description Market description (e.g., "Will it snow > 12 inches?")
     * @param targetSnowfall Target snowfall in inches * 100 (e.g., 1200 = 12 inches)
     * @param resolutionTime Unix timestamp for market resolution
     */
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

        emit MarketCreated(marketId, resortName, description, targetSnowfall, resolutionTime);
        return marketId;
    }

    /**
     * @dev Buy YES or NO shares at fixed price of $0.50 USDC each
     * @param marketId The market to buy shares in
     * @param isYes True for YES shares, false for NO shares
     * @param shareAmount Number of shares to buy
     */
    function buyShares(
        uint256 marketId,
        bool isYes,
        uint256 shareAmount
    ) external nonReentrant {
        Market storage market = markets[marketId];
        require(market.status == MarketStatus.Active, "Market not active");
        require(block.timestamp < market.resolutionTime, "Market expired");
        require(shareAmount > 0, "Must buy at least 1 share");

        uint256 cost = shareAmount * SHARE_PRICE;

        // Transfer USDC from buyer
        usdc.safeTransferFrom(msg.sender, address(this), cost);

        // Update positions
        Position storage pos = positions[marketId][msg.sender];
        if (isYes) {
            pos.yesShares += shareAmount;
            market.totalYesShares += shareAmount;
        } else {
            pos.noShares += shareAmount;
            market.totalNoShares += shareAmount;
        }
        market.totalPool += cost;

        emit SharesPurchased(marketId, msg.sender, isYes, shareAmount, cost);
    }

    /**
     * @dev Resolve a market with actual snowfall data
     * @param marketId The market to resolve
     * @param actualSnowfall Actual snowfall in inches * 100
     */
    function resolveMarket(
        uint256 marketId,
        uint256 actualSnowfall
    ) external onlyOwner {
        Market storage market = markets[marketId];
        require(market.status == MarketStatus.Active, "Market already resolved");

        market.status = MarketStatus.Resolved;

        // If actual snowfall >= target, YES wins
        if (actualSnowfall >= market.targetSnowfall) {
            market.outcome = Outcome.Yes;
        } else {
            market.outcome = Outcome.No;
        }

        emit MarketResolved(marketId, market.outcome, actualSnowfall);
    }

    /**
     * @dev Claim winnings from a resolved market
     * @param marketId The market to claim winnings from
     */
    function claimWinnings(uint256 marketId) external nonReentrant {
        Market storage market = markets[marketId];
        require(market.status == MarketStatus.Resolved, "Market not resolved");
        require(market.outcome != Outcome.Undecided, "Outcome not set");

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

        // Calculate payout: winner gets proportional share of total pool
        uint256 payout = (market.totalPool * winningShares) / totalWinningShares;

        usdc.safeTransfer(msg.sender, payout);

        emit WinningsClaimed(marketId, msg.sender, payout);
    }

    /**
     * @dev Get market details
     */
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
        Market storage market = markets[marketId];
        return (
            market.resortName,
            market.description,
            market.targetSnowfall,
            market.resolutionTime,
            market.status,
            market.outcome,
            market.totalYesShares,
            market.totalNoShares,
            market.totalPool
        );
    }

    /**
     * @dev Get user's position in a market
     */
    function getPosition(uint256 marketId, address user) external view returns (
        uint256 yesShares,
        uint256 noShares
    ) {
        Position storage pos = positions[marketId][user];
        return (pos.yesShares, pos.noShares);
    }

    /**
     * @dev Get all active markets (returns array of market IDs)
     */
    function getActiveMarkets() external view returns (uint256[] memory) {
        uint256 activeCount = 0;

        // Count active markets
        for (uint256 i = 0; i < marketCount; i++) {
            if (markets[i].status == MarketStatus.Active) {
                activeCount++;
            }
        }

        // Build array of active market IDs
        uint256[] memory activeMarkets = new uint256[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < marketCount; i++) {
            if (markets[i].status == MarketStatus.Active) {
                activeMarkets[index++] = i;
            }
        }

        return activeMarkets;
    }

    /**
     * @dev Calculate implied odds based on share distribution
     */
    function getOdds(uint256 marketId) external view returns (
        uint256 yesOdds,
        uint256 noOdds
    ) {
        Market storage market = markets[marketId];
        uint256 totalShares = market.totalYesShares + market.totalNoShares;

        if (totalShares == 0) {
            return (50, 50); // 50-50 if no shares bought yet
        }

        // Return odds as percentages (0-100)
        yesOdds = (market.totalYesShares * 100) / totalShares;
        noOdds = (market.totalNoShares * 100) / totalShares;
    }
}
