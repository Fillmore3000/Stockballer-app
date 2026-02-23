import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ProSpectVault, MockUSDC } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * ProSpectVault Test Suite
 * 
 * Tests cover:
 * 1. Deployment & Initialization
 * 2. Athlete Creation
 * 3. Price Management
 * 4. Token Buying
 * 5. Token Selling
 * 6. Fee Management
 * 7. Access Control
 * 8. Edge Cases & Error Handling
 */
describe("ProSpectVault", function () {
  // Constants matching contract
  const TOKENS_PER_ATHLETE = 1000;
  const MIN_PRICE = ethers.parseUnits("1", 6);      // $1.00
  const INITIAL_PRICE = ethers.parseUnits("100", 6); // $100.00
  const TRADING_FEE_BPS = 100; // 1%
  const FAUCET_AMOUNT = ethers.parseUnits("10000", 6); // $10,000

  // Test athlete tokenIds (matching API-Football IDs)
  const ATHLETE_HAALAND = 1100;
  const ATHLETE_SALAH = 306;

  // Fixture to deploy contracts fresh for each test
  async function deployContractsFixture() {
    const [owner, user1, user2, oracle] = await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    // Deploy ProSpectVault
    const ProSpectVault = await ethers.getContractFactory("ProSpectVault");
    const vault = await ProSpectVault.deploy(await usdc.getAddress());
    await vault.waitForDeployment();

    // Fund users with USDC from faucet
    await usdc.connect(user1).faucet();
    await usdc.connect(user2).faucet();

    return { vault, usdc, owner, user1, user2, oracle };
  }

  // Fixture with athletes already created
  async function deployWithAthletesFixture() {
    const { vault, usdc, owner, user1, user2, oracle } = await loadFixture(deployContractsFixture);

    // Create two athletes
    await vault.createAthlete(ATHLETE_HAALAND, INITIAL_PRICE);
    await vault.createAthlete(ATHLETE_SALAH, INITIAL_PRICE);

    return { vault, usdc, owner, user1, user2, oracle };
  }

  // ============================================
  // DEPLOYMENT & INITIALIZATION TESTS
  // ============================================
  describe("Deployment", function () {
    it("Should set the correct USDC address", async function () {
      const { vault, usdc } = await loadFixture(deployContractsFixture);
      expect(await vault.usdc()).to.equal(await usdc.getAddress());
    });

    it("Should set the correct owner", async function () {
      const { vault, owner } = await loadFixture(deployContractsFixture);
      expect(await vault.owner()).to.equal(owner.address);
    });

    it("Should have correct trading fee", async function () {
      const { vault } = await loadFixture(deployContractsFixture);
      expect(await vault.tradingFeeBps()).to.equal(TRADING_FEE_BPS);
    });

    it("Should revert with zero USDC address", async function () {
      const ProSpectVault = await ethers.getContractFactory("ProSpectVault");
      await expect(
        ProSpectVault.deploy(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid USDC address");
    });
  });

  // ============================================
  // ATHLETE CREATION TESTS
  // ============================================
  describe("Athlete Creation", function () {
    it("Should create an athlete with correct initial price", async function () {
      const { vault } = await loadFixture(deployContractsFixture);
      
      await vault.createAthlete(ATHLETE_HAALAND, INITIAL_PRICE);
      
      expect(await vault.athleteActive(ATHLETE_HAALAND)).to.be.true;
      expect(await vault.tokenPrices(ATHLETE_HAALAND)).to.equal(INITIAL_PRICE);
    });

    it("Should emit AthleteCreated event", async function () {
      const { vault } = await loadFixture(deployContractsFixture);
      
      await expect(vault.createAthlete(ATHLETE_HAALAND, INITIAL_PRICE))
        .to.emit(vault, "AthleteCreated")
        .withArgs(ATHLETE_HAALAND, INITIAL_PRICE);
    });

    it("Should revert if athlete already exists", async function () {
      const { vault } = await loadFixture(deployWithAthletesFixture);
      
      await expect(
        vault.createAthlete(ATHLETE_HAALAND, INITIAL_PRICE)
      ).to.be.revertedWith("Athlete already exists");
    });

    it("Should revert if price is below minimum", async function () {
      const { vault } = await loadFixture(deployContractsFixture);
      
      const tooLowPrice = ethers.parseUnits("0.5", 6); // $0.50
      await expect(
        vault.createAthlete(ATHLETE_HAALAND, tooLowPrice)
      ).to.be.revertedWith("Price out of bounds");
    });

    it("Should only allow owner to create athletes", async function () {
      const { vault, user1 } = await loadFixture(deployContractsFixture);
      
      await expect(
        vault.connect(user1).createAthlete(ATHLETE_HAALAND, INITIAL_PRICE)
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });
  });

  // ============================================
  // PRICE MANAGEMENT TESTS
  // ============================================
  describe("Price Management", function () {
    it("Should update price correctly", async function () {
      const { vault } = await loadFixture(deployWithAthletesFixture);
      
      const newPrice = ethers.parseUnits("125", 6); // $125.00
      await vault.setPrice(ATHLETE_HAALAND, newPrice);
      
      expect(await vault.tokenPrices(ATHLETE_HAALAND)).to.equal(newPrice);
    });

    it("Should emit PriceUpdated event", async function () {
      const { vault } = await loadFixture(deployWithAthletesFixture);
      
      const newPrice = ethers.parseUnits("125", 6);
      await expect(vault.setPrice(ATHLETE_HAALAND, newPrice))
        .to.emit(vault, "PriceUpdated")
        .withArgs(ATHLETE_HAALAND, INITIAL_PRICE, newPrice);
    });

    it("Should revert for non-existent athlete", async function () {
      const { vault } = await loadFixture(deployContractsFixture);
      
      await expect(
        vault.setPrice(9999, INITIAL_PRICE)
      ).to.be.revertedWith("Athlete does not exist");
    });

    it("Should revert if price below minimum", async function () {
      const { vault } = await loadFixture(deployWithAthletesFixture);
      
      const tooLowPrice = ethers.parseUnits("0.5", 6);
      await expect(
        vault.setPrice(ATHLETE_HAALAND, tooLowPrice)
      ).to.be.revertedWith("Price out of bounds");
    });

    it("Should only allow owner to set price", async function () {
      const { vault, user1 } = await loadFixture(deployWithAthletesFixture);
      
      const newPrice = ethers.parseUnits("125", 6);
      await expect(
        vault.connect(user1).setPrice(ATHLETE_HAALAND, newPrice)
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });

    it("Should return correct price via getTokenPrice", async function () {
      const { vault } = await loadFixture(deployWithAthletesFixture);
      
      expect(await vault.getTokenPrice(ATHLETE_HAALAND)).to.equal(INITIAL_PRICE);
    });
  });

  // ============================================
  // TOKEN BUYING TESTS
  // ============================================
  describe("Buying Tokens", function () {
    it("Should buy tokens successfully", async function () {
      const { vault, usdc, user1 } = await loadFixture(deployWithAthletesFixture);
      
      const amount = 10;
      const quote = await vault.getBuyQuote(ATHLETE_HAALAND, amount);
      
      // Approve USDC
      await usdc.connect(user1).approve(await vault.getAddress(), quote.total);
      
      // Buy tokens
      await vault.connect(user1).buyTokens(ATHLETE_HAALAND, amount);
      
      // Check balance
      expect(await vault.balanceOf(user1.address, ATHLETE_HAALAND)).to.equal(amount);
    });

    it("Should emit TokensPurchased event", async function () {
      const { vault, usdc, user1 } = await loadFixture(deployWithAthletesFixture);
      
      const amount = 10;
      const quote = await vault.getBuyQuote(ATHLETE_HAALAND, amount);
      
      await usdc.connect(user1).approve(await vault.getAddress(), quote.total);
      
      await expect(vault.connect(user1).buyTokens(ATHLETE_HAALAND, amount))
        .to.emit(vault, "TokensPurchased")
        .withArgs(user1.address, ATHLETE_HAALAND, amount, quote.total);
    });

    it("Should deduct correct USDC amount including fee", async function () {
      const { vault, usdc, user1 } = await loadFixture(deployWithAthletesFixture);
      
      const amount = 10;
      const quote = await vault.getBuyQuote(ATHLETE_HAALAND, amount);
      const balanceBefore = await usdc.balanceOf(user1.address);
      
      await usdc.connect(user1).approve(await vault.getAddress(), quote.total);
      await vault.connect(user1).buyTokens(ATHLETE_HAALAND, amount);
      
      const balanceAfter = await usdc.balanceOf(user1.address);
      expect(balanceBefore - balanceAfter).to.equal(quote.total);
    });

    it("Should accumulate fees correctly", async function () {
      const { vault, usdc, user1 } = await loadFixture(deployWithAthletesFixture);
      
      const amount = 10;
      const quote = await vault.getBuyQuote(ATHLETE_HAALAND, amount);
      
      await usdc.connect(user1).approve(await vault.getAddress(), quote.total);
      await vault.connect(user1).buyTokens(ATHLETE_HAALAND, amount);
      
      expect(await vault.accumulatedFees()).to.equal(quote.fee);
    });

    it("Should update token supply", async function () {
      const { vault, usdc, user1 } = await loadFixture(deployWithAthletesFixture);
      
      const amount = 10;
      const quote = await vault.getBuyQuote(ATHLETE_HAALAND, amount);
      
      await usdc.connect(user1).approve(await vault.getAddress(), quote.total);
      await vault.connect(user1).buyTokens(ATHLETE_HAALAND, amount);
      
      expect(await vault.tokenSupply(ATHLETE_HAALAND)).to.equal(amount);
    });

    it("Should revert if exceeds max supply", async function () {
      const { vault, usdc, user1 } = await loadFixture(deployWithAthletesFixture);
      
      const tooMany = TOKENS_PER_ATHLETE + 1;
      const hugeApproval = ethers.parseUnits("1000000", 6);
      
      await usdc.connect(user1).approve(await vault.getAddress(), hugeApproval);
      
      await expect(
        vault.connect(user1).buyTokens(ATHLETE_HAALAND, tooMany)
      ).to.be.revertedWith("Exceeds max supply");
    });

    it("Should revert if amount is zero", async function () {
      const { vault, user1 } = await loadFixture(deployWithAthletesFixture);
      
      await expect(
        vault.connect(user1).buyTokens(ATHLETE_HAALAND, 0)
      ).to.be.revertedWith("Amount must be > 0");
    });

    it("Should revert for non-existent athlete", async function () {
      const { vault, user1 } = await loadFixture(deployWithAthletesFixture);
      
      await expect(
        vault.connect(user1).buyTokens(9999, 10)
      ).to.be.revertedWith("Athlete does not exist");
    });
  });

  // ============================================
  // TOKEN SELLING TESTS
  // ============================================
  describe("Selling Tokens", function () {
    async function buyTokensFirst() {
      const { vault, usdc, owner, user1, user2, oracle } = await loadFixture(deployWithAthletesFixture);
      
      // User1 buys 50 tokens
      const amount = 50;
      const quote = await vault.getBuyQuote(ATHLETE_HAALAND, amount);
      await usdc.connect(user1).approve(await vault.getAddress(), quote.total);
      await vault.connect(user1).buyTokens(ATHLETE_HAALAND, amount);
      
      return { vault, usdc, owner, user1, user2, oracle };
    }

    it("Should sell tokens successfully", async function () {
      const { vault, user1 } = await loadFixture(buyTokensFirst);
      
      const sellAmount = 10;
      await vault.connect(user1).sellTokens(ATHLETE_HAALAND, sellAmount);
      
      expect(await vault.balanceOf(user1.address, ATHLETE_HAALAND)).to.equal(40);
    });

    it("Should emit TokensSold event", async function () {
      const { vault, user1 } = await loadFixture(buyTokensFirst);
      
      const sellAmount = 10;
      const quote = await vault.getSellQuote(ATHLETE_HAALAND, sellAmount);
      
      await expect(vault.connect(user1).sellTokens(ATHLETE_HAALAND, sellAmount))
        .to.emit(vault, "TokensSold")
        .withArgs(user1.address, ATHLETE_HAALAND, sellAmount, quote.total);
    });

    it("Should receive correct USDC after fee", async function () {
      const { vault, usdc, user1 } = await loadFixture(buyTokensFirst);
      
      const sellAmount = 10;
      const quote = await vault.getSellQuote(ATHLETE_HAALAND, sellAmount);
      const balanceBefore = await usdc.balanceOf(user1.address);
      
      await vault.connect(user1).sellTokens(ATHLETE_HAALAND, sellAmount);
      
      const balanceAfter = await usdc.balanceOf(user1.address);
      expect(balanceAfter - balanceBefore).to.equal(quote.total);
    });

    it("Should decrease token supply", async function () {
      const { vault, user1 } = await loadFixture(buyTokensFirst);
      
      const supplyBefore = await vault.tokenSupply(ATHLETE_HAALAND);
      const sellAmount = 10;
      
      await vault.connect(user1).sellTokens(ATHLETE_HAALAND, sellAmount);
      
      expect(await vault.tokenSupply(ATHLETE_HAALAND)).to.equal(supplyBefore - BigInt(sellAmount));
    });

    it("Should revert if insufficient balance", async function () {
      const { vault, user1 } = await loadFixture(buyTokensFirst);
      
      await expect(
        vault.connect(user1).sellTokens(ATHLETE_HAALAND, 100) // Only has 50
      ).to.be.revertedWith("Insufficient balance");
    });

    it("Should revert if amount is zero", async function () {
      const { vault, user1 } = await loadFixture(buyTokensFirst);
      
      await expect(
        vault.connect(user1).sellTokens(ATHLETE_HAALAND, 0)
      ).to.be.revertedWith("Amount must be > 0");
    });
  });

  // ============================================
  // QUOTE TESTS
  // ============================================
  describe("Quotes", function () {
    it("Should calculate buy quote correctly", async function () {
      const { vault } = await loadFixture(deployWithAthletesFixture);
      
      const amount = 10;
      const quote = await vault.getBuyQuote(ATHLETE_HAALAND, amount);
      
      const expectedSubtotal = INITIAL_PRICE * BigInt(amount);
      const expectedFee = (expectedSubtotal * BigInt(TRADING_FEE_BPS)) / BigInt(10000);
      const expectedTotal = expectedSubtotal + expectedFee;
      
      expect(quote.subtotal).to.equal(expectedSubtotal);
      expect(quote.fee).to.equal(expectedFee);
      expect(quote.total).to.equal(expectedTotal);
    });

    it("Should calculate sell quote correctly", async function () {
      const { vault } = await loadFixture(deployWithAthletesFixture);
      
      const amount = 10;
      const quote = await vault.getSellQuote(ATHLETE_HAALAND, amount);
      
      const expectedSubtotal = INITIAL_PRICE * BigInt(amount);
      const expectedFee = (expectedSubtotal * BigInt(TRADING_FEE_BPS)) / BigInt(10000);
      const expectedTotal = expectedSubtotal - expectedFee;
      
      expect(quote.subtotal).to.equal(expectedSubtotal);
      expect(quote.fee).to.equal(expectedFee);
      expect(quote.total).to.equal(expectedTotal);
    });
  });

  // ============================================
  // FEE MANAGEMENT TESTS
  // ============================================
  describe("Fee Management", function () {
    it("Should allow owner to update trading fee", async function () {
      const { vault } = await loadFixture(deployContractsFixture);
      
      const newFee = 100; // 1%
      await vault.setTradingFee(newFee);
      
      expect(await vault.tradingFeeBps()).to.equal(newFee);
    });

    it("Should emit TradingFeeUpdated event", async function () {
      const { vault } = await loadFixture(deployContractsFixture);
      
      const newFee = 100;
      await expect(vault.setTradingFee(newFee))
        .to.emit(vault, "TradingFeeUpdated")
        .withArgs(TRADING_FEE_BPS, newFee);
    });

    it("Should revert if fee exceeds maximum", async function () {
      const { vault } = await loadFixture(deployContractsFixture);
      
      const tooHighFee = 600; // 6% > 5% max
      await expect(
        vault.setTradingFee(tooHighFee)
      ).to.be.revertedWith("Fee too high");
    });

    it("Should allow owner to withdraw fees", async function () {
      const { vault, usdc, user1, owner } = await loadFixture(deployWithAthletesFixture);
      
      // Generate fees by buying (use smaller amount to stay within faucet limit)
      const amount = 50; // 50 tokens * $100 = $5000 + $25 fee = $5025 (within $10k faucet)
      const quote = await vault.getBuyQuote(ATHLETE_HAALAND, amount);
      await usdc.connect(user1).approve(await vault.getAddress(), quote.total);
      await vault.connect(user1).buyTokens(ATHLETE_HAALAND, amount);
      
      const accumulatedFees = await vault.accumulatedFees();
      const ownerBalanceBefore = await usdc.balanceOf(owner.address);
      
      await vault.withdrawFees(owner.address);
      
      const ownerBalanceAfter = await usdc.balanceOf(owner.address);
      expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(accumulatedFees);
      expect(await vault.accumulatedFees()).to.equal(0);
    });

    it("Should emit FeesWithdrawn event", async function () {
      const { vault, usdc, user1, owner } = await loadFixture(deployWithAthletesFixture);
      
      const amount = 50; // Stay within $10k faucet limit
      const quote = await vault.getBuyQuote(ATHLETE_HAALAND, amount);
      await usdc.connect(user1).approve(await vault.getAddress(), quote.total);
      await vault.connect(user1).buyTokens(ATHLETE_HAALAND, amount);
      
      const fees = await vault.accumulatedFees();
      
      await expect(vault.withdrawFees(owner.address))
        .to.emit(vault, "FeesWithdrawn")
        .withArgs(owner.address, fees);
    });

    it("Should revert withdraw if no fees", async function () {
      const { vault, owner } = await loadFixture(deployContractsFixture);
      
      await expect(
        vault.withdrawFees(owner.address)
      ).to.be.revertedWith("No fees to withdraw");
    });
  });

  // ============================================
  // ATHLETE INFO TESTS
  // ============================================
  describe("Athlete Info", function () {
    it("Should return correct athlete info", async function () {
      const { vault, usdc, user1 } = await loadFixture(deployWithAthletesFixture);
      
      // Buy some tokens first (use smaller amount to stay within faucet limit)
      const buyAmount = 50; // 50 tokens * $100 = $5000 + $25 fee = $5025 (within $10k faucet)
      const quote = await vault.getBuyQuote(ATHLETE_HAALAND, buyAmount);
      await usdc.connect(user1).approve(await vault.getAddress(), quote.total);
      await vault.connect(user1).buyTokens(ATHLETE_HAALAND, buyAmount);
      
      const info = await vault.getAthleteInfo(ATHLETE_HAALAND);
      
      expect(info.active).to.be.true;
      expect(info.price).to.equal(INITIAL_PRICE);
      expect(info.supply).to.equal(buyAmount);
      expect(info.remaining).to.equal(TOKENS_PER_ATHLETE - buyAmount);
    });
  });
});
