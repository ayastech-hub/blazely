// scripts/deploy-launchpad.cjs
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const LaunchpadFactory = await ethers.getContractFactory("LaunchpadFactory");
  const factory = await LaunchpadFactory.deploy(deployer.address); // admin = deployer
  await factory.deployed();
  console.log("Factory deployed at:", factory.address);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
