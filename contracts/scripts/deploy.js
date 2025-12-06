const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=".repeat(60));
  console.log("PowGuess Contract Deployment");
  console.log("=".repeat(60));

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("\nDeployer address:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    console.log("\n⚠️  Warning: Deployer has no ETH balance!");
    console.log("Please fund this address with testnet ETH before deploying.");
  }

  // Deploy MockUSDC
  console.log("\n📄 Deploying MockUSDC...");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUsdc = await MockUSDC.deploy();
  await mockUsdc.waitForDeployment();
  const mockUsdcAddress = await mockUsdc.getAddress();
  console.log("✅ MockUSDC deployed to:", mockUsdcAddress);

  // Deploy SnowMarket
  console.log("\n📄 Deploying SnowMarket...");
  const SnowMarket = await ethers.getContractFactory("SnowMarket");
  const snowMarket = await SnowMarket.deploy(mockUsdcAddress);
  await snowMarket.waitForDeployment();
  const snowMarketAddress = await snowMarket.getAddress();
  console.log("✅ SnowMarket deployed to:", snowMarketAddress);

  // Create initial markets
  console.log("\n📊 Creating initial markets...");

  const resorts = [
    { name: "Mammoth Mountain", target: 1200 }, // 12 inches
    { name: "Palisades Tahoe", target: 800 },   // 8 inches
    { name: "Jackson Hole", target: 1500 },      // 15 inches
    { name: "Snowbird", target: 1000 },          // 10 inches
    { name: "Aspen", target: 600 },              // 6 inches
  ];

  // Set resolution time to 7 days from now
  const resolutionTime = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;

  for (const resort of resorts) {
    const tx = await snowMarket.createMarket(
      resort.name,
      `Will ${resort.name} receive >= ${resort.target / 100} inches of snow in the next 7 days?`,
      resort.target,
      resolutionTime
    );
    await tx.wait();
    console.log(`✅ Created market for ${resort.name}`);
  }

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      MockUSDC: mockUsdcAddress,
      SnowMarket: snowMarketAddress,
    },
    initialMarkets: resorts.map((r, i) => ({
      id: i,
      resort: r.name,
      targetSnowfall: r.target / 100 + " inches",
    })),
  };

  const deploymentPath = path.join(__dirname, "..", "deployment.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n📁 Deployment info saved to deployment.json");

  console.log("\n" + "=".repeat(60));
  console.log("Deployment Summary");
  console.log("=".repeat(60));
  console.log(`MockUSDC:    ${mockUsdcAddress}`);
  console.log(`SnowMarket:  ${snowMarketAddress}`);
  console.log(`Network:     ${hre.network.name}`);
  console.log("=".repeat(60));

  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
