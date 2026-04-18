// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/Musa.sol";
import "../test/MockPAXG.sol";

contract DeployTestnet is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        // Deploy mock PAXG on testnet (use real PAXG address on mainnet)
        MockPAXG paxg = new MockPAXG();

        // Deploy Musa
        Musa musa = new Musa(address(paxg));

        // Mint some PAXG to deployer and seed the reserve
        paxg.mint(msg.sender, 100e18);
        paxg.approve(address(musa), 100e18);
        musa.deposit(100e18);

        vm.stopBroadcast();

        console.log("MockPAXG:", address(paxg));
        console.log("Musa:", address(musa));
    }
}
