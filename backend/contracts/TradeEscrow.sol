// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract TradeEscrow {
    enum ProtocolState { AWAITING_FUNDS, IN_TRANSIT, DELIVERED, DISPUTED, REFUNDED, SETTLED }

    address public buyer;
    address public seller;
    address public oracleAgent;

    uint256 public totalAmount;
    ProtocolState public state;

    uint256 public constant MILESTONE_DOCS = 20; // 20%
    uint256 public constant MILESTONE_DISPATCH = 50; // 50%
    uint256 public constant MILESTONE_DELIVERY = 30; // 30%

    mapping(bytes32 => bool) public executedTx;
    mapping(uint256 => bool) public milestonePaid;

    event FundsDeposited(address indexed buyer, uint256 amount);
    event MilestoneReleased(uint256 indexed milestoneId, uint256 amount);
    event TradeSettled();
    event FundsRefunded();

    modifier onlyBuyer() {
        require(msg.sender == buyer, "Unauthorized: Only Buyer");
        _;
    }

    modifier onlyOracleAgent() {
        require(msg.sender == oracleAgent, "Unauthorized: Only Oracle Escrow Agent");
        _;
    }

    modifier preventReplay(string memory txId) {
        bytes32 hash = keccak256(abi.encodePacked(txId));
        require(!executedTx[hash], "Replay Protection: Tx already executed");
        executedTx[hash] = true;
        _;
    }

    constructor(address _buyer, address _seller, address _oracleAgent) {
        buyer = _buyer;
        seller = _seller;
        oracleAgent = _oracleAgent;
        state = ProtocolState.AWAITING_FUNDS;
    }

    // Step 1: Lock buyer funds securely
    function depositFunds() external payable onlyBuyer {
        require(state == ProtocolState.AWAITING_FUNDS, "Contract already funded");
        require(msg.value > 0, "Amount must be greater than 0");

        totalAmount = msg.value;
        state = ProtocolState.IN_TRANSIT;
        emit FundsDeposited(buyer, msg.value);
    }

    // Step 2, 3, 4: Confirmed by the AI Escrow Agent
    // milestoneId: 1 = Document Verification, 2 = Shipment Dispatch, 3 = Delivery Confirmed
    function releaseMilestone(uint256 milestoneId, string memory txId) external onlyOracleAgent preventReplay(txId) {
        require(state == ProtocolState.IN_TRANSIT || state == ProtocolState.DELIVERED, "Invalid protocol state");
        require(!milestonePaid[milestoneId], "Milestone already paid");

        uint256 payoutPercent = 0;
        if (milestoneId == 1) {
            payoutPercent = MILESTONE_DOCS;
        } else if (milestoneId == 2) {
            payoutPercent = MILESTONE_DISPATCH;
        } else if (milestoneId == 3) {
            payoutPercent = MILESTONE_DELIVERY;
            state = ProtocolState.DELIVERED;
        } else {
            revert("Invalid Milestone ID");
        }

        uint256 payoutAmount = (totalAmount * payoutPercent) / 100;
        require(address(this).balance >= payoutAmount, "Insufficient escrow balance");

        milestonePaid[milestoneId] = true;
        
        // Non-reentrant pattern: Update states before external call
        if (milestoneId == 3) {
            state = ProtocolState.SETTLED;
        }

        // Native ETH Transfer
        (bool success, ) = seller.call{value: payoutAmount}("");
        require(success, "ETH Transfer failed");

        emit MilestoneReleased(milestoneId, payoutAmount);
        if (milestoneId == 3) {
            emit TradeSettled();
        }
    }

    // Fallback: Failure or Dispute
    function refundBuyer(string memory txId) external onlyOracleAgent preventReplay(txId) {
        require(state == ProtocolState.AWAITING_FUNDS || state == ProtocolState.IN_TRANSIT, "Trade cannot be refunded from current state");
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to refund");

        state = ProtocolState.REFUNDED;
        
        (bool success, ) = buyer.call{value: balance}("");
        require(success, "ETH Refund failed");

        emit FundsRefunded();
    }
    
    function getEscrowDetails() external view returns (address, address, uint256, ProtocolState, uint256) {
        return (buyer, seller, totalAmount, state, address(this).balance);
    }
}
