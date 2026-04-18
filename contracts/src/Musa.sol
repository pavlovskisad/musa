// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title Musa — forward gold purchase contracts settled in PAXG
/// @notice v1: non-transferable positions, admin-created, lazy vesting, stepped exit penalties
contract Musa is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ── Settlement token ──────────────────────────────────────────────
    IERC20 public immutable paxg;

    // ── Constants ─────────────────────────────────────────────────────
    // SECURITY: these are immutable protocol parameters — changing them
    // requires redeployment, which is intentional for v1.
    uint256 public constant GRAMS_PER_TROY_OZ = 31_103500000000000000; // 31.1035e18
    uint256 public constant CONSTRUCTION_SECONDS = 60; // 1 minute

    // ── Tier config ───────────────────────────────────────────────────
    enum Tier { Spark, Flow, Vein }

    struct TierConfig {
        uint256 lockSeconds;
        bool cancellable;
    }

    mapping(Tier => TierConfig) public tiers;

    // ── Position state ────────────────────────────────────────────────
    struct Position {
        address owner;
        Tier tier;
        uint256 gramsTotal;     // 18 decimals — total gold committed
        uint256 pricePaidUSD;   // 18 decimals — fiat amount (reference only)
        uint256 createdAt;      // block.timestamp at creation
        uint256 exitedAt;       // 0 if active
        uint256 gramsClaimed;   // grams already transferred to user
        bool settled;           // true once all PAXG distributed
    }

    Position[] public positions;
    mapping(address => uint256[]) public userPositions;

    // ── Aggregate accounting (public solvency invariant) ──────────────
    uint256 public totalGramsCommitted;
    uint256 public totalGramsClaimed;

    // ── Events ────────────────────────────────────────────────────────
    event PositionCreated(uint256 indexed id, address indexed owner, Tier tier, uint256 gramsTotal);
    event GramsClaimed(uint256 indexed id, address indexed owner, uint256 grams, uint256 paxgAmount);
    event EarlyExit(uint256 indexed id, address indexed owner, uint256 gramsReceived, uint256 gramsForfeited);
    event PaxgDeposited(address indexed from, uint256 amount);

    // ── Constructor ───────────────────────────────────────────────────
    constructor(address _paxg) Ownable(msg.sender) {
        require(_paxg != address(0), "zero paxg address");
        paxg = IERC20(_paxg);

        tiers[Tier.Spark] = TierConfig({ lockSeconds: 180 days, cancellable: false });
        tiers[Tier.Flow]  = TierConfig({ lockSeconds: 360 days, cancellable: true });
        tiers[Tier.Vein]  = TierConfig({ lockSeconds: 720 days, cancellable: true });
    }

    // ══════════════════════════════════════════════════════════════════
    //  ADMIN
    // ══════════════════════════════════════════════════════════════════

    /// @notice Deposit PAXG into the reserve. Callable by anyone (admin, treasury, donors).
    function deposit(uint256 amount) external whenNotPaused {
        require(amount > 0, "zero amount");
        paxg.safeTransferFrom(msg.sender, address(this), amount);
        emit PaxgDeposited(msg.sender, amount);
    }

    /// @notice Create a position on behalf of a user after off-chain fiat payment.
    /// @dev SECURITY: only owner can call. No on-chain payment — admin is trusted
    ///      to create positions matching real fiat inflows. Solvency ratio is
    ///      publicly auditable to keep admin honest.
    function createPosition(
        address user,
        Tier tier,
        uint256 gramsTotal,
        uint256 pricePaidUSD
    ) external onlyOwner whenNotPaused {
        require(user != address(0), "zero address");
        require(gramsTotal > 0, "zero grams");

        uint256 id = positions.length;
        positions.push(Position({
            owner: user,
            tier: tier,
            gramsTotal: gramsTotal,
            pricePaidUSD: pricePaidUSD,
            createdAt: block.timestamp,
            exitedAt: 0,
            gramsClaimed: 0,
            settled: false
        }));

        userPositions[user].push(id);
        totalGramsCommitted += gramsTotal;

        emit PositionCreated(id, user, tier, gramsTotal);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ══════════════════════════════════════════════════════════════════
    //  USER ACTIONS
    // ══════════════════════════════════════════════════════════════════

    /// @notice Claim vested PAXG from a position.
    /// @dev SECURITY: nonReentrant even though PAXG is standard ERC20 (no callbacks).
    ///      Belt-and-suspenders — costs ~2400 gas, prevents future token upgrades
    ///      from introducing reentrancy.
    function claim(uint256 positionId) external nonReentrant whenNotPaused {
        Position storage pos = positions[positionId];
        require(msg.sender == pos.owner, "not owner");
        require(!pos.settled, "already settled");
        require(pos.exitedAt == 0, "already exited");

        uint256 vested = _vestedGrams(pos);
        uint256 claimable = vested - pos.gramsClaimed;
        require(claimable > 0, "nothing to claim");

        // checks-effects-interactions
        pos.gramsClaimed = vested;
        totalGramsClaimed += claimable;

        if (vested >= pos.gramsTotal) {
            pos.settled = true;
        }

        uint256 paxgAmount = _gramsToPaxg(claimable);
        require(paxg.balanceOf(address(this)) >= paxgAmount, "insufficient reserve");
        paxg.safeTransfer(pos.owner, paxgAmount);

        emit GramsClaimed(positionId, pos.owner, claimable, paxgAmount);
    }

    /// @notice Exit a cancellable position early. Penalty applied to undelivered gold.
    /// @dev SECURITY: penalty is stepped (not user-controlled), no oracle dependency,
    ///      no MEV concern — exit amount is deterministic based on block.timestamp.
    function exitEarly(uint256 positionId) external nonReentrant whenNotPaused {
        Position storage pos = positions[positionId];
        require(msg.sender == pos.owner, "not owner");
        require(!pos.settled, "already settled");
        require(pos.exitedAt == 0, "already exited");
        require(tiers[pos.tier].cancellable, "tier not cancellable");

        uint256 vested = _vestedGrams(pos);
        uint256 undelivered = pos.gramsTotal - vested;

        // Penalty on undelivered portion
        uint256 deliverySecs = _deliverySeconds(pos.tier);
        uint256 elapsed = _deliveryElapsedSeconds(pos);
        uint256 pctElapsed = deliverySecs > 0 ? (elapsed * 1e18) / deliverySecs : 0;
        uint256 penalty = _penaltyPct(pctElapsed);

        uint256 refundGrams = (undelivered * (1e18 - penalty)) / 1e18;
        uint256 totalReceived = vested + refundGrams;
        uint256 forfeited = pos.gramsTotal - totalReceived;

        // Subtract already-claimed grams to get transfer amount
        uint256 toTransfer = totalReceived - pos.gramsClaimed;

        // checks-effects-interactions
        pos.exitedAt = block.timestamp;
        pos.gramsClaimed = totalReceived;
        pos.settled = true;
        totalGramsClaimed += toTransfer;
        totalGramsCommitted -= forfeited;

        if (toTransfer > 0) {
            uint256 paxgAmount = _gramsToPaxg(toTransfer);
            require(paxg.balanceOf(address(this)) >= paxgAmount, "insufficient reserve");
            paxg.safeTransfer(pos.owner, paxgAmount);
        }

        emit EarlyExit(positionId, pos.owner, totalReceived, forfeited);
    }

    // ══════════════════════════════════════════════════════════════════
    //  VIEW FUNCTIONS — public solvency invariant
    // ══════════════════════════════════════════════════════════════════

    function vestedGrams(uint256 positionId) external view returns (uint256) {
        return _vestedGrams(positions[positionId]);
    }

    function claimableGrams(uint256 positionId) external view returns (uint256) {
        Position storage pos = positions[positionId];
        if (pos.settled || pos.exitedAt != 0) return 0;
        return _vestedGrams(pos) - pos.gramsClaimed;
    }

    function positionCount() external view returns (uint256) {
        return positions.length;
    }

    function getUserPositions(address user) external view returns (uint256[] memory) {
        return userPositions[user];
    }

    /// @notice PAXG held in this contract
    function reserveBalance() external view returns (uint256) {
        return paxg.balanceOf(address(this));
    }

    /// @notice Total grams still owed to users
    function totalOutstandingGrams() external view returns (uint256) {
        return totalGramsCommitted - totalGramsClaimed;
    }

    /// @notice Reserve coverage ratio (1e18 = 100% covered)
    /// @dev Core trust primitive — anyone can verify on-chain that reserve >= obligations
    function solvencyRatio() external view returns (uint256) {
        uint256 outstanding = totalGramsCommitted - totalGramsClaimed;
        if (outstanding == 0) return type(uint256).max;
        uint256 reserveGrams = _paxgToGrams(paxg.balanceOf(address(this)));
        return (reserveGrams * 1e18) / outstanding;
    }

    // ══════════════════════════════════════════════════════════════════
    //  INTERNALS
    // ══════════════════════════════════════════════════════════════════

    function _vestedGrams(Position storage pos) internal view returns (uint256) {
        if (pos.exitedAt != 0) return pos.gramsClaimed;

        uint256 elapsed = block.timestamp - pos.createdAt;
        if (elapsed < CONSTRUCTION_SECONDS) return 0;

        uint256 deliverySecs = _deliverySeconds(pos.tier);
        uint256 deliveryElapsed = elapsed - CONSTRUCTION_SECONDS;

        if (deliveryElapsed >= deliverySecs) return pos.gramsTotal;
        return (pos.gramsTotal * deliveryElapsed) / deliverySecs;
    }

    function _deliverySeconds(Tier tier) internal view returns (uint256) {
        return tiers[tier].lockSeconds - CONSTRUCTION_SECONDS;
    }

    function _deliveryElapsedSeconds(Position storage pos) internal view returns (uint256) {
        uint256 elapsed = block.timestamp - pos.createdAt;
        if (elapsed < CONSTRUCTION_SECONDS) return 0;
        uint256 deliverySecs = _deliverySeconds(pos.tier);
        uint256 deliveryElapsed = elapsed - CONSTRUCTION_SECONDS;
        return deliveryElapsed > deliverySecs ? deliverySecs : deliveryElapsed;
    }

    /// @dev Stepped penalty — decreases as more delivery time passes
    ///      SECURITY: no user input in penalty calc, purely time-based
    function _penaltyPct(uint256 pctElapsed18) internal pure returns (uint256) {
        if (pctElapsed18 < 0.25e18) return 0.50e18;
        if (pctElapsed18 < 0.50e18) return 0.35e18;
        if (pctElapsed18 < 0.75e18) return 0.20e18;
        return 0.10e18;
    }

    function _gramsToPaxg(uint256 grams) internal pure returns (uint256) {
        return (grams * 1e18) / GRAMS_PER_TROY_OZ;
    }

    function _paxgToGrams(uint256 paxgAmount) internal pure returns (uint256) {
        return (paxgAmount * GRAMS_PER_TROY_OZ) / 1e18;
    }
}
