// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract LaunchpadToken {
    string public name;
    string public symbol;
    uint8 public decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply,
        address _creator
    ) {
        name = _name;
        symbol = _symbol;
        _mint(_creator, _initialSupply);
    }

    function _mint(address account, uint256 amount) internal {
        totalSupply += amount;
        balanceOf[account] += amount;
        emit Transfer(address(0), account, amount);
    }

    function transfer(address recipient, uint256 amount) public returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal {
        require(sender != address(0), "Transfer from zero address");
        require(recipient != address(0), "Transfer to zero address");
        require(balanceOf[sender] >= amount, "Insufficient balance");

        balanceOf[sender] -= amount;
        balanceOf[recipient] += amount;
        emit Transfer(sender, recipient, amount);
    }

    function approve(address spender, uint256 amount) public returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public returns (bool) {
        require(balanceOf[sender] >= amount, "Insufficient balance");
        require(allowance[sender][msg.sender] >= amount, "Insufficient allowance");

        balanceOf[sender] -= amount;
        balanceOf[recipient] += amount;
        allowance[sender][msg.sender] -= amount;
        emit Transfer(sender, recipient, amount);
        return true;
    }
}

contract Launchpad {
    event TokenCreated(
        address indexed tokenAddress,
        address indexed creator,
        string name,
        string symbol,
        uint256 initialSupply,
        address indexed deployer
    );

    // Anyone can deploy a token
    function createToken(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address creator
    ) public returns (address) {
        LaunchpadToken newToken = new LaunchpadToken(name, symbol, initialSupply, creator);
        emit TokenCreated(
            address(newToken),
            creator,
            name,
            symbol,
            initialSupply,
            msg.sender  // Track who deployed it
        );
        return address(newToken);
    }

    // Get all deployed tokens (requires off-chain indexing in practice)
    function getDeployedTokens() public view returns (address[] memory) {
        // Note: Solidity cannot track dynamic arrays of deployed contracts natively.
        // In a real app, use events + off-chain indexing (e.g., The Graph) or a mapping.
        return new address[](0);
    }
}