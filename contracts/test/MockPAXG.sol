// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockPAXG is ERC20 {
    constructor() ERC20("Paxos Gold", "PAXG") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
