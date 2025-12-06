const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=".repeat(60));
  console.log("Generating Fresh Wallet for PowGuess Deployment");
  console.log("=".repeat(60));

  // Generate a new random wallet
  const wallet = ethers.Wallet.createRandom();

  console.log("\n🔑 NEW WALLET GENERATED");
  console.log("=".repeat(60));
  console.log("Address:     ", wallet.address);
  console.log("Private Key: ", wallet.privateKey);
  console.log("Mnemonic:    ", wallet.mnemonic.phrase);
  console.log("=".repeat(60));

  // Create .env file
  const envContent = `# PowGuess Deployment Wallet
# Generated: ${new Date().toISOString()}
# ⚠️  KEEP THIS FILE SECRET - DO NOT COMMIT TO GIT

# Wallet credentials
PRIVATE_KEY=${wallet.privateKey}
WALLET_ADDRESS=${wallet.address}

# Monad Testnet
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
CHAIN_ID=10143

# Fund this address with testnet ETH before deploying:
# ${wallet.address}
`;

  const envPath = path.join(__dirname, "..", ".env");
  fs.writeFileSync(envPath, envContent);
  console.log("\n✅ .env file created with wallet credentials");

  // Save wallet info to a separate file (for backup)
  const walletInfo = {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic.phrase,
    generated: new Date().toISOString(),
    network: "Monad Testnet",
    chainId: 10143,
  };

  const walletPath = path.join(__dirname, "..", "wallet-credentials.json");
  fs.writeFileSync(walletPath, JSON.stringify(walletInfo, null, 2));
  console.log("✅ Wallet credentials saved to wallet-credentials.json");

  console.log("\n⚠️  IMPORTANT SECURITY NOTES:");
  console.log("1. Keep your private key and mnemonic SECRET");
  console.log("2. Do NOT commit .env or wallet-credentials.json to git");
  console.log("3. Fund the wallet with testnet ETH before deploying");
  console.log("\n📝 Next steps:");
  console.log("1. Get Monad testnet ETH from a faucet");
  console.log("2. Run: npx hardhat run scripts/deploy.js --network monad_testnet");

  return wallet;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
