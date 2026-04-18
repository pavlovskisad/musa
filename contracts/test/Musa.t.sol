// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/Musa.sol";
import "./MockPAXG.sol";

contract MusaTest is Test {
    Musa public musa;
    MockPAXG public paxg;

    address admin = address(this);
    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    // 10 grams in 18-decimal format
    uint256 constant TEN_GRAMS = 10e18;
    // ~0.3215 PAXG (10 grams / 31.1035 grams per oz)
    uint256 constant TEN_GRAMS_PAXG = (TEN_GRAMS * 1e18) / 31_103500000000000000;

    function setUp() public {
        paxg = new MockPAXG();
        musa = new Musa(address(paxg));

        // Fund the contract with 100 PAXG (~3110 grams)
        paxg.mint(admin, 100e18);
        paxg.approve(address(musa), 100e18);
        musa.deposit(100e18);
    }

    // ── Position creation ─────────────────────────────────────────────

    function test_createPosition() public {
        musa.createPosition(alice, Musa.Tier.Spark, TEN_GRAMS, 1500e18);

        assertEq(musa.positionCount(), 1);
        assertEq(musa.totalGramsCommitted(), TEN_GRAMS);

        uint256[] memory ids = musa.getUserPositions(alice);
        assertEq(ids.length, 1);
        assertEq(ids[0], 0);
    }

    function test_createPosition_rejectsZeroAddress() public {
        vm.expectRevert("zero address");
        musa.createPosition(address(0), Musa.Tier.Spark, TEN_GRAMS, 1500e18);
    }

    function test_createPosition_rejectsZeroGrams() public {
        vm.expectRevert("zero grams");
        musa.createPosition(alice, Musa.Tier.Spark, 0, 1500e18);
    }

    function test_createPosition_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        musa.createPosition(alice, Musa.Tier.Spark, TEN_GRAMS, 1500e18);
    }

    // ── Vesting ───────────────────────────────────────────────────────

    function test_constructionPhase_zeroVested() public {
        musa.createPosition(alice, Musa.Tier.Flow, TEN_GRAMS, 1500e18);

        // 30 seconds in — still constructing
        vm.warp(block.timestamp + 30);
        assertEq(musa.vestedGrams(0), 0);
        assertEq(musa.claimableGrams(0), 0);
    }

    function test_vestingBeginsAfterConstruction() public {
        musa.createPosition(alice, Musa.Tier.Flow, TEN_GRAMS, 1500e18);

        // Skip past construction (60s) + 1 day of delivery
        vm.warp(block.timestamp + 60 + 1 days);

        uint256 vested = musa.vestedGrams(0);
        assertGt(vested, 0);
        assertLt(vested, TEN_GRAMS);
    }

    function test_fullVestingAtLockEnd() public {
        musa.createPosition(alice, Musa.Tier.Spark, TEN_GRAMS, 1500e18);

        // Skip past full lock (180 days)
        vm.warp(block.timestamp + 180 days);

        uint256 vested = musa.vestedGrams(0);
        assertEq(vested, TEN_GRAMS);
    }

    function test_vestingLinearOverDelivery() public {
        musa.createPosition(alice, Musa.Tier.Flow, TEN_GRAMS, 1500e18);

        // Delivery period = 360 days - 60 seconds ≈ 360 days
        // At halfway through delivery, should have ~50% vested
        uint256 deliverySecs = 360 days - 60;
        vm.warp(block.timestamp + 60 + deliverySecs / 2);

        uint256 vested = musa.vestedGrams(0);
        // Allow 0.01% tolerance for rounding
        assertApproxEqRel(vested, TEN_GRAMS / 2, 0.0001e18);
    }

    // ── Claiming ──────────────────────────────────────────────────────

    function test_claimVestedGrams() public {
        musa.createPosition(alice, Musa.Tier.Flow, TEN_GRAMS, 1500e18);

        // Advance 90 days (past construction + ~90 days of delivery)
        vm.warp(block.timestamp + 90 days);

        uint256 claimable = musa.claimableGrams(0);
        assertGt(claimable, 0);

        uint256 aliceBalBefore = paxg.balanceOf(alice);

        vm.prank(alice);
        musa.claim(0);

        uint256 aliceBalAfter = paxg.balanceOf(alice);
        assertGt(aliceBalAfter, aliceBalBefore);
        assertEq(musa.claimableGrams(0), 0);
    }

    function test_claimFullAfterCompletion() public {
        musa.createPosition(alice, Musa.Tier.Spark, TEN_GRAMS, 1500e18);

        vm.warp(block.timestamp + 180 days);

        vm.prank(alice);
        musa.claim(0);

        assertEq(paxg.balanceOf(alice), TEN_GRAMS_PAXG);
        assertEq(musa.claimableGrams(0), 0);
    }

    function test_claimTwice_incrementalDelivery() public {
        musa.createPosition(alice, Musa.Tier.Flow, TEN_GRAMS, 1500e18);

        // First claim at 90 days
        vm.warp(block.timestamp + 90 days);
        vm.prank(alice);
        musa.claim(0);
        uint256 firstClaim = paxg.balanceOf(alice);

        // Second claim at 180 days
        vm.warp(block.timestamp + 90 days);
        vm.prank(alice);
        musa.claim(0);
        uint256 secondClaim = paxg.balanceOf(alice) - firstClaim;

        // Both claims should be roughly equal (linear vesting)
        assertApproxEqRel(firstClaim, secondClaim, 0.01e18);
    }

    function test_claim_rejectsNonOwner() public {
        musa.createPosition(alice, Musa.Tier.Flow, TEN_GRAMS, 1500e18);
        vm.warp(block.timestamp + 90 days);

        vm.prank(bob);
        vm.expectRevert("not owner");
        musa.claim(0);
    }

    function test_claim_rejectsNothingToClaimDuringConstruction() public {
        musa.createPosition(alice, Musa.Tier.Flow, TEN_GRAMS, 1500e18);

        vm.prank(alice);
        vm.expectRevert("nothing to claim");
        musa.claim(0);
    }

    // ── Early exit ────────────────────────────────────────────────────

    function test_exitEarly_50pctPenalty() public {
        musa.createPosition(alice, Musa.Tier.Flow, TEN_GRAMS, 1500e18);

        // Exit during first 25% of delivery → 50% penalty on undelivered
        // Delivery = ~360 days. 10% in = ~36 days
        vm.warp(block.timestamp + 60 + 36 days);

        uint256 vestedBefore = musa.vestedGrams(0);

        vm.prank(alice);
        musa.exitEarly(0);

        uint256 received = paxg.balanceOf(alice);
        assertGt(received, 0);

        // User gets: vested + 50% of undelivered (in PAXG)
        uint256 undelivered = TEN_GRAMS - vestedBefore;
        uint256 expectedGrams = vestedBefore + (undelivered * 50) / 100;
        uint256 expectedPaxg = (expectedGrams * 1e18) / 31_103500000000000000;
        assertApproxEqRel(received, expectedPaxg, 0.001e18);
    }

    function test_exitEarly_10pctPenalty() public {
        musa.createPosition(alice, Musa.Tier.Flow, TEN_GRAMS, 1500e18);

        // Exit at 80% of delivery → 10% penalty
        uint256 deliverySecs = 360 days - 60;
        vm.warp(block.timestamp + 60 + (deliverySecs * 80) / 100);

        vm.prank(alice);
        musa.exitEarly(0);

        // Should have most of the gold
        uint256 received = paxg.balanceOf(alice);
        uint256 fullPaxg = (TEN_GRAMS * 1e18) / 31_103500000000000000;
        // At 80% delivery with 10% penalty on remaining 20%: gets 80% + 90% of 20% = 98%
        assertGt(received, (fullPaxg * 95) / 100);
    }

    function test_exitEarly_sparkNotCancellable() public {
        musa.createPosition(alice, Musa.Tier.Spark, TEN_GRAMS, 1500e18);
        vm.warp(block.timestamp + 90 days);

        vm.prank(alice);
        vm.expectRevert("tier not cancellable");
        musa.exitEarly(0);
    }

    function test_exitEarly_afterPartialClaim() public {
        musa.createPosition(alice, Musa.Tier.Flow, TEN_GRAMS, 1500e18);

        // Claim at 90 days
        vm.warp(block.timestamp + 90 days);
        vm.prank(alice);
        musa.claim(0);
        uint256 claimed = paxg.balanceOf(alice);

        // Exit at 180 days
        vm.warp(block.timestamp + 90 days);
        vm.prank(alice);
        musa.exitEarly(0);

        // Should have more than first claim
        uint256 total = paxg.balanceOf(alice);
        assertGt(total, claimed);
    }

    function test_exitEarly_cannotExitTwice() public {
        musa.createPosition(alice, Musa.Tier.Flow, TEN_GRAMS, 1500e18);
        vm.warp(block.timestamp + 90 days);

        vm.prank(alice);
        musa.exitEarly(0);

        vm.prank(alice);
        vm.expectRevert("already settled");
        musa.exitEarly(0);
    }

    function test_exitEarly_updatesGlobalAccounting() public {
        musa.createPosition(alice, Musa.Tier.Flow, TEN_GRAMS, 1500e18);
        vm.warp(block.timestamp + 90 days);

        uint256 committedBefore = musa.totalGramsCommitted();

        vm.prank(alice);
        musa.exitEarly(0);

        // Forfeited grams reduce totalGramsCommitted
        assertLt(musa.totalGramsCommitted(), committedBefore);
    }

    // ── Solvency ──────────────────────────────────────────────────────

    function test_solvencyRatio_fullyBacked() public {
        // 100 PAXG deposited, 10 grams committed = well over 100% backed
        musa.createPosition(alice, Musa.Tier.Spark, TEN_GRAMS, 1500e18);

        uint256 ratio = musa.solvencyRatio();
        assertGt(ratio, 1e18); // > 100%
    }

    function test_solvencyRatio_noObligations() public {
        uint256 ratio = musa.solvencyRatio();
        assertEq(ratio, type(uint256).max);
    }

    function test_reserveBalance() public {
        assertEq(musa.reserveBalance(), 100e18);
    }

    // ── Pause ─────────────────────────────────────────────────────────

    function test_pauseBlocksOperations() public {
        musa.createPosition(alice, Musa.Tier.Flow, TEN_GRAMS, 1500e18);
        vm.warp(block.timestamp + 90 days);

        musa.pause();

        vm.prank(alice);
        vm.expectRevert();
        musa.claim(0);

        vm.prank(alice);
        vm.expectRevert();
        musa.exitEarly(0);
    }

    function test_unpauseRestoresOperations() public {
        musa.createPosition(alice, Musa.Tier.Flow, TEN_GRAMS, 1500e18);
        vm.warp(block.timestamp + 90 days);

        musa.pause();
        musa.unpause();

        vm.prank(alice);
        musa.claim(0);
        assertGt(paxg.balanceOf(alice), 0);
    }

    // ── Deposit ───────────────────────────────────────────────────────

    function test_depositFromAnyone() public {
        paxg.mint(bob, 10e18);

        vm.startPrank(bob);
        paxg.approve(address(musa), 10e18);
        musa.deposit(10e18);
        vm.stopPrank();

        assertEq(musa.reserveBalance(), 110e18);
    }

    function test_depositZeroReverts() public {
        vm.expectRevert("zero amount");
        musa.deposit(0);
    }

    // ── Claim all ──────────────────────────────────────────────────────

    function test_claimAll_multiplePositions() public {
        musa.createPosition(alice, Musa.Tier.Spark, TEN_GRAMS, 1500e18);
        musa.createPosition(alice, Musa.Tier.Flow, TEN_GRAMS, 1500e18);

        vm.warp(block.timestamp + 90 days);

        uint256[] memory ids = new uint256[](2);
        ids[0] = 0;
        ids[1] = 1;

        vm.prank(alice);
        musa.claimAll(ids);

        assertGt(paxg.balanceOf(alice), 0);
        assertEq(musa.claimableGrams(0), 0);
        assertEq(musa.claimableGrams(1), 0);
    }

    function test_claimAll_skipsSettled() public {
        musa.createPosition(alice, Musa.Tier.Spark, TEN_GRAMS, 1500e18);
        musa.createPosition(alice, Musa.Tier.Flow, TEN_GRAMS, 1500e18);

        // Fully vest and claim position 0
        vm.warp(block.timestamp + 180 days);
        vm.prank(alice);
        musa.claim(0);
        uint256 afterFirst = paxg.balanceOf(alice);

        // claimAll with both — should only claim from position 1
        uint256[] memory ids = new uint256[](2);
        ids[0] = 0;
        ids[1] = 1;

        vm.prank(alice);
        musa.claimAll(ids);

        assertGt(paxg.balanceOf(alice), afterFirst);
    }

    function test_claimAll_rejectsNonOwner() public {
        musa.createPosition(alice, Musa.Tier.Flow, TEN_GRAMS, 1500e18);
        vm.warp(block.timestamp + 90 days);

        uint256[] memory ids = new uint256[](1);
        ids[0] = 0;

        vm.prank(bob);
        vm.expectRevert("not owner");
        musa.claimAll(ids);
    }

    function test_claimAll_singleTransfer() public {
        musa.createPosition(alice, Musa.Tier.Spark, TEN_GRAMS, 1500e18);
        musa.createPosition(alice, Musa.Tier.Flow, TEN_GRAMS, 1500e18);
        musa.createPosition(alice, Musa.Tier.Vein, TEN_GRAMS, 1500e18);

        vm.warp(block.timestamp + 90 days);

        uint256 claimable0 = musa.claimableGrams(0);
        uint256 claimable1 = musa.claimableGrams(1);
        uint256 claimable2 = musa.claimableGrams(2);
        uint256 totalClaimable = claimable0 + claimable1 + claimable2;
        assertGt(totalClaimable, 0);

        uint256[] memory ids = new uint256[](3);
        ids[0] = 0;
        ids[1] = 1;
        ids[2] = 2;

        vm.prank(alice);
        musa.claimAll(ids);

        // All claimed in one shot
        assertEq(musa.claimableGrams(0), 0);
        assertEq(musa.claimableGrams(1), 0);
        assertEq(musa.claimableGrams(2), 0);
    }

    // ── Vein tier (24-month lock) ─────────────────────────────────────

    function test_veinFullDelivery() public {
        musa.createPosition(alice, Musa.Tier.Vein, TEN_GRAMS, 1500e18);

        vm.warp(block.timestamp + 720 days);
        assertEq(musa.vestedGrams(0), TEN_GRAMS);

        vm.prank(alice);
        musa.claim(0);
        assertEq(paxg.balanceOf(alice), TEN_GRAMS_PAXG);
    }
}
