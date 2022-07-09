// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract AuctionEngine {
    address public engineOwner;
    uint constant defaultDuration = 2 days;
    uint constant public fee = 10; //10% fee for engineOwner

    struct Auction {
        address payable seller;
        uint startingPrice;
        uint finalPrice;
        uint startAt;
        uint endsAt;
        uint discountStep;
        string item;
        bool stopped;
    }

    Auction[] public auctions;

    event AuctionCreated(uint index, string itemName, uint startingPrice, uint duration);
    event AuctionEnded(uint index, uint finalPrice, address winner);

    constructor() {
        engineOwner = msg.sender;
    }

    function createAuction(uint _startingPrice, uint _discountStep, string calldata _item, uint _duration) external {
        uint duration = _duration == 0 ? defaultDuration : _duration;

        require(_startingPrice >= _discountStep * duration, "incorrect starting price");

        Auction memory newAuction = Auction({
            seller: payable(msg.sender),
            startingPrice: _startingPrice,
            finalPrice: _startingPrice,
            startAt: block.timestamp,
            endsAt: block.timestamp + duration,
            discountStep: _discountStep,
            item: _item,
            stopped: false
        });

        auctions.push(newAuction);

        emit AuctionCreated(auctions.length - 1, _item, _startingPrice, duration);
    }

    function getPriceFor(uint index) public view returns(uint) {
        Auction memory currentAuction = auctions[index];
        require(!currentAuction.stopped, "auction stopped");
        uint elapsed = block.timestamp - currentAuction.startAt;
        uint discount = currentAuction.discountStep * elapsed;
        return currentAuction.startingPrice - discount;
    }

    function buy(uint index) external payable {
        Auction storage currentAuction = auctions[index];
        require(!currentAuction.stopped, "auction stopped");
        require(block.timestamp < currentAuction.endsAt, "auction ended");
        uint currentPrice = getPriceFor(index);
        require(msg.value >= currentPrice, "not enough money");
        currentAuction.stopped = true;
        currentAuction.finalPrice = currentPrice;
        uint refund = msg.value - currentPrice;
        if(refund > 0) {
            payable(msg.sender).transfer(refund);
        }
        currentAuction.seller.transfer(
            currentPrice - ((currentPrice * fee) / 100)
        );
        emit AuctionEnded(index, currentPrice, msg.sender);
    }



}