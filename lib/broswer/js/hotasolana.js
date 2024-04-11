// solanaWeb3 is provided in the global namespace by the bundle script
console.log(solanaWeb3);
console.log(bs58);
// Use this if it in node js
// const solanaWeb3 = require("@solana/web3.js");
// const bs58 = require("bs58");

function getRndInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/*
pub struct FaceNFT {
    pub id: u32,
    pub hair: u8,
    pub eyes: u8,
    pub ears: u8,
    pub mouth: u8,
    pub nose: u8,
    pub seed: u32,
}
*/
class FaceStruct extends BaseStruct {
  constructor() {
    super([
      new BaseElement("id", new HotaUint32(0)),
      new BaseElement("hair", new HotaUint8(0)),
      new BaseElement("eyes", new HotaUint8(0)),
      new BaseElement("ears", new HotaUint8(0)),
      new BaseElement("mouth", new HotaUint8(0)),
      new BaseElement("nose", new HotaUint8(0)),
      new BaseElement("seed", new HotaUint32(0)),
    ]);

    // Set prototype
    Object.setPrototypeOf(this, FaceStruct.prototype);
  }

  // Generate random face
  randomFace() {
    this.set("id", new HotaUint32(getRndInteger(0, 2 ** 32 - 1)));
    this.set("hair", new HotaUint8(getRndInteger(0, 255)));
    this.set("eyes", new HotaUint8(getRndInteger(0, 255)));
    this.set("ears", new HotaUint8(getRndInteger(0, 255)));
    this.set("mouth", new HotaUint8(getRndInteger(0, 255)));
    this.set("nose", new HotaUint8(getRndInteger(0, 255)));
    this.set("seed", new HotaUint32(getRndInteger(0, 2 ** 32 - 1)));
  }
}

class AccountDataStruct extends BaseStruct {
  constructor() {
    super([
      new BaseElement(
        "ownFace",
        new HotaVectorStruct(30, () => new FaceStruct())
      ),
    ]);

    // Set prototype
    Object.setPrototypeOf(this, AccountDataStruct.prototype);
  }
}

/*
pub struct InstructionData {
    pub typeAct: u8,
    pub face: FaceNFT,
}
*/
class InstructionDataStruct extends BaseStruct {
  constructor() {
    super([
      new BaseElement("typeAct", new HotaUint8(0)),
      new BaseElement("face", new FaceStruct()),
    ]);

    // Set prototype
    Object.setPrototypeOf(this, InstructionDataStruct.prototype);
  }
}

class HotaSolanaClient {
  constructor(
    programId,
    localhost = false,
    namenet = "devnet",
    seed = "hotaNFT"
  ) {
    this.programId = new solanaWeb3.PublicKey(programId);
    this.localhost = localhost;
    this.namenet = namenet;
    this.seed = seed;

    if (localhost) {
      this.connection = new solanaWeb3.Connection("http://localhost:8899");
      console.log("Connected to localhost");
    } else {
      this.connection = new solanaWeb3.Connection(
        solanaWeb3.clusterApiUrl(namenet)
      );
      console.log("Connected to " + namenet);
    }
  }
  // Must input by array of Uint8Array
  async makeKeyPair(secretKey) {
    this.keypair = await solanaWeb3.Keypair.fromSecretKey(secretKey);
    console.log("Logged in with keypair " + this.keypair.publicKey.toString());
    // this.publicKeySeed = await solanaWeb3.PublicKey.createWithSeed(
    //   this.keypair.publicKey,
    //   this.seed,
    //   this.programId
    // );
    this.keypair_seed = solanaWeb3.Keypair.fromSeed(
      await random32BytesWithSeed(
        this.keypair.publicKey,
        this.seed,
        this.programId
      )
    );
    console.log(
      "Logged in with publicKeySeed " + this.keypair_seed.publicKey.toString()
    );

    // Check if account is created
    let accountInfo = await this.connection.getAccountInfo(
      this.keypair_seed.publicKey
    );
    if (accountInfo === null) {
      console.log("Creating account");
      await this.createAccount();
    }
  }
  // Create keypair by secret key base58
  async makeKeyPairBase58(secretKeyBase58) {
    let secretKey = bs58.decode(secretKeyBase58);
    await this.makeKeyPair(secretKey);
  }
  // Create account
  async createAccount() {
    let span = new AccountDataStruct().size();
    let lamports = await this.connection.getMinimumBalanceForRentExemption(
      span
    );
    let transaction = new solanaWeb3.Transaction().add(
      // solanaWeb3.SystemProgram.createAccountWithSeed({
      //   fromPubkey: this.keypair.publicKey,
      //   basePubkey: this.keypair.publicKey,
      //   seed: this.seed,
      //   newAccountPubkey: this.publicKeySeed,
      //   lamports: lamports,
      //   space: span,
      //   programId: this.programId,
      // })
      solanaWeb3.SystemProgram.createAccount({
        fromPubkey: this.keypair.publicKey,
        newAccountPubkey: this.keypair_seed.publicKey,
        lamports: lamports,
        space: span,
        programId: this.programId,
      })
    );
    let signature = await solanaWeb3.sendAndConfirmTransaction(
      this.connection,
      transaction,
      [this.keypair, this.keypair_seed]
    );
    console.log("Account created with signature " + signature);
  }
  // Convert secret key from string to Uint8Array
  secretKeyFromString(secretKey) {
    return new Uint8Array(secretKey.split(",").map(Number));
  }
  // Drop SOL
  async dropSol(amount) {
    const sig = await this.connection.requestAirdrop(
      this.keypair.publicKey,
      fees - this.getBalance()
    );
    let signature = await this.connection.confirmTransaction(sig);
    console.log("Dropped " + amount + " SOL with signature " + signature);
  }
  // Get balance
  async getBalance() {
    let balance = await this.connection.getBalance(this.keypair.publicKey);
    return balance;
  }
  // Get account info
  async getAccountInfo() {
    let accountInfo = await this.connection.getAccountInfo(
      this.keypair_seed.publicKey
    );
    return accountInfo;
  }
  // Get account data
  async getAccountData() {
    let accountInfo = await this.connection.getAccountInfo(
      this.keypair_seed.publicKey
    );
    if (accountInfo === null) {
      console.log("Error: cannot find the account");
      return null;
    }
    let accountData = new AccountDataStruct();
    accountData.desirialize(accountInfo.data);
    return accountData.struct2object();
  }
  // Send transaction with instruction
  async sendTransaction(instructionData, pubkeys = [], keypairs = []) {
    // Instruction data must be InstructionStruct
    if (!(instructionData instanceof InstructionDataStruct)) {
      console.error("Error: instructionData is not InstructionStruct");
      return;
    }

    let keys = [];
    for (let i = 0; i < pubkeys.length; i++) {
      let isSigner = false;
      // Check if keypair is in the list
      for (let j = 0; j < keypairs.length; j++) {
        if (keypairs[j].publicKey.equals(pubkeys[i])) {
          isSigner = true;
          break;
        }
      }
      keys.push({ pubkey: pubkeys[i], isSigner: isSigner, isWritable: true });
    }

    const instruction = new solanaWeb3.TransactionInstruction({
      keys: keys,
      programId: this.programId,
      data: Uint8Array.from(instructionData.serialize()),
    });
    let signature = await solanaWeb3.sendAndConfirmTransaction(
      this.connection,
      new solanaWeb3.Transaction().add(instruction),
      keypairs
    );
    console.log("Transaction sent with signature " + signature);
  }
}
