// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ColdChainProvenance {
    struct ChainEvent {
        string  shipmentId;
        string  eventType;
        bytes32 dataHash;
        uint256 timestamp;
        address sender;
    }

    mapping(string => ChainEvent[]) private _events;
    mapping(string => mapping(bytes32 => bool)) private _hashExists;
    uint256 public totalEvents;

    event EventAnchored(string indexed shipmentId, string eventType, bytes32 dataHash, uint256 timestamp, address indexed sender);

    error EmptyShipmentId();
    error EmptyEventType();
    error ZeroHash();

    function anchorEvent(string calldata shipmentId, string calldata eventType, bytes32 dataHash) external {
        if (bytes(shipmentId).length == 0) revert EmptyShipmentId();
        if (bytes(eventType).length == 0) revert EmptyEventType();
        if (dataHash == bytes32(0)) revert ZeroHash();
        ChainEvent memory e = ChainEvent({shipmentId: shipmentId, eventType: eventType, dataHash: dataHash, timestamp: block.timestamp, sender: msg.sender});
        _events[shipmentId].push(e);
        _hashExists[shipmentId][dataHash] = true;
        totalEvents++;
        emit EventAnchored(shipmentId, eventType, dataHash, block.timestamp, msg.sender);
    }

    function getEvents(string calldata shipmentId) external view returns (ChainEvent[] memory) {
        return _events[shipmentId];
    }

    function verifyHash(string calldata shipmentId, bytes32 dataHash) external view returns (bool) {
        return _hashExists[shipmentId][dataHash];
    }

    function getEventCount(string calldata shipmentId) external view returns (uint256) {
        return _events[shipmentId].length;
    }
}
