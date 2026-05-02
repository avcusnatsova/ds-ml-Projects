const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    const Factory = await ethers.getContractFactory("ColdChainProvenance");
    const contract = await Factory.deploy();
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    console.log("CONTRACT_ADDRESS=" + address);
    const envLine = `\nCONTRACT_ADDRESS=${address}\nBLOCKCHAIN_RPC=http://127.0.0.1:8545\nCHAIN_ID=31337\n`;
    const envPath = path.join(__dirname, "../../backend/.env");
    if (fs.existsSync(envPath)) { fs.appendFileSync(envPath, envLine); console.log(".env updated"); }
    else { fs.writeFileSync(envPath, envLine); console.log(".env created"); }
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
