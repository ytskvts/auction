const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("AuctionEngine", function () {
    let owner
    let buyer
    let auction

    beforeEach(async function () {
        [owner, seller, buyer] = await ethers.getSigners()

        const AuctionEngine = await ethers.getContractFactory("AuctionEngine", owner)
        auction = await AuctionEngine.deploy()
        await  auction.deployed()
    })

    it("sets owner", async function () {
        const currentOwner = await auction.engineOwner()
        console.log(currentOwner)
        expect(currentOwner).to.eq(owner.address)
    })

    async function getTimestamp(blockNumber) {
        return(
            await ethers.provider.getBlock(blockNumber)
        ).timestamp
    }

    describe("createAuction", function () {
        it("creates auction correctly", async function () {
            const duration = 60
            const tx = await auction.createAuction(
                ethers.utils.parseEther("0.0001"),
                3,
                "rare item",
                duration
            )
            console.log(tx)
            const currentAuction = await auction.auctions(0)
            console.log(currentAuction)
            expect(currentAuction.discountStep).to.eq(3)
            const timestamp = await getTimestamp(tx.blockNumber)
            expect(currentAuction.endsAt).to.eq(timestamp + duration)
        })
    })

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    describe("buy", function () {
        it("allows to buy", async function () {
            await auction.connect(seller).createAuction(
                ethers.utils.parseEther("0.0001"),
                3,
                "rare item",
                60
            )

            this.timeout(5000) // test can be 5 sec
            await delay(1000)

            const buyTx = await auction.connect(buyer).buy(0, {value: ethers.utils.parseEther("0.0001")})
            console.log(buyer.address)
            console.log("buyTx")
            console.log(buyTx)
            const currentAuction = await auction.auctions(0)
            console.log("currentAuction")
            console.log(currentAuction)
            const finalPrice = currentAuction.finalPrice
            console.log(finalPrice)
            await expect(() => buyTx).
                to.changeEtherBalance(
                    seller, finalPrice - Math.floor((finalPrice * 10) / 100)
                )

            await expect(buyTx)
                .to.emit(auction, 'AuctionEnded')
                .withArgs(0, finalPrice, buyer.address);

            await expect(
                auction.connect(buyer).buy(0, {value: ethers.utils.parseEther("0.0001")})
            ).to.be.revertedWith('auction stopped');
        })
    })
})