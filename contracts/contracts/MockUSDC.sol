// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @dev A mock USDC token for testnet use
 */
contract MockUSDC is ERC20, Ownable {
    uint8 private _decimals = 6;

    constructor() ERC20("Mock USDC", "USDC") Ownable(msg.sender) {
        // Mint 1 million USDC to deployer for testing
        _mint(msg.sender, 1_000_000 * 10 ** _decimals);
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Mint tokens to any address (for testing)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Faucet function - anyone can get 1000 USDC for testing
     */
    function faucet() external {
        _mint(msg.sender, 1000 * 10 ** _decimals);
    }
}
