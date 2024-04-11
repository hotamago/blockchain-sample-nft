from solathon.core.instructions import transfer, create_account, Instruction, AccountMeta
from solathon import Client, Transaction, PublicKey, Keypair
import random
from hotaSolana.hotaSolanaDataBase import *
from hotaSolana.hotaSolanaMeathod import *
from nacl.public import PrivateKey as NaclPrivateKey
import base64
from nacl.signing import SigningKey


class FaceStruct(BaseStruct):
    def __init__(self):
        super().__init__(
            GenBaseEleList({
                "id": HotaUint32(0),
                "hair": HotaUint8(0),
                "eyes": HotaUint8(0),
                "ears": HotaUint8(0),
                "mouth": HotaUint8(0),
                "nose": HotaUint8(0),
                "seed": HotaUint32(0)
            })
        )

    def randomFace(self):
        self.set("id", HotaUint32(random.randint(0, 2**32 - 1)))
        self.set("hair", HotaUint8(random.randint(0, 255)))
        self.set("eyes", HotaUint8(random.randint(0, 255)))
        self.set("ears", HotaUint8(random.randint(0, 255)))
        self.set("mouth", HotaUint8(random.randint(0, 255)))
        self.set("nose", HotaUint8(random.randint(0, 255)))
        self.set("seed", HotaUint32(random.randint(0, 2**32 - 1)))


class AccountDataStruct(BaseStruct):
    def __init__(self):
        def genFace():
            return FaceStruct()
        super().__init__([
            BaseElement("ownFace", HotaVectorStruct(30, genFace))
        ])


class InstructionDataStruct(BaseStruct):
    def __init__(self, typeAct=HotaUint8(0), face=FaceStruct()):
        super().__init__([
            BaseElement("typeAct", typeAct),
            BaseElement("face", face),
        ])


class HotaSolanaClient:
    def __init__(self, program_id: str, localhost=False, namenet="devnet", seed="hotaNFT"):
        self.program_id = PublicKey(program_id)
        self.localhost = localhost
        self.namenet = namenet
        self.seed = seed
        self.urlNetSolana = ""

        if localhost:
            self.connection = Client(
                "http://localhost:8899")
            self.urlNetSolana = "http://localhost:8899"
            print("Connected to localhost")
        else:
            self.connection = Client(
                f"https://api.{namenet}.solana.com")
            self.urlNetSolana = f"https://api.{namenet}.solana.com"
            print(f"Connected to {namenet}")

    def make_key_pair(self, secret_key: str):
        self.keypair = Keypair.from_private_key(secret_key)
        print(f"Logged in with keypair {self.keypair.public_key}")
        # self.public_key_seed = PublicKey.create_with_seed(
        #     self.keypair.public_key,
        #     self.seed,
        #     self.program_id
        # )
        esPairKey = SigningKey(random_32bytes_with_seed(
            self.keypair.public_key,
            self.seed,
            self.program_id)
        )
        self.keypair_seed = Keypair.from_private_key(bs58.encode(
            esPairKey.__dict__["_signing_key"]))
        # self.keypair_seed = Keypair(
        #     NaclPrivateKey(bytes(bs58.decode(random_32bytes_with_seed(
        #         self.keypair.public_key,
        #         self.seed,
        #         self.program_id)
        #     )))
        # )
        print(
            f"Logged in with keypairseed {self.keypair_seed.public_key} {self.keypair_seed.private_key}")

        # Check if account is created
        try:
            self.connection.get_account_info(
                self.keypair_seed.public_key, commitment={
                    "encoding": "base64"
                })
        except Exception as e:
            print("Creating account")
            self.create_account()

    def create_account(self):
        span = AccountDataStruct().size()
        # lamports = self.connection.get_minimum_balance_for_rent_exmeption(span)
        lamports = get_minimum_balance_for_rent_exmeption(
            self.urlNetSolana, span)
        instruction = create_account(
            from_public_key=self.keypair.public_key,
            new_account_public_key=self.keypair_seed.public_key,
            lamports=lamports,
            space=span,
            program_id=self.program_id,
        )
        transaction = Transaction(
            instructions=[instruction], signers=[self.keypair, self.keypair_seed])
        signature = self.connection.send_transaction(transaction)
        print(f"Account created with signature {signature}")

    def drop_sol(self, amount):
        sig = self.connection.request_airdrop(
            self.keypair.public_key, amount
        )
        print(f"Dropped {amount} SOL with signature {sig}")
        return sig

    def get_balance(self):
        balance = self.connection.get_balance(self.keypair.public_key)
        return balance

    def get_account_info(self):
        account_info = self.connection.get_account_info(
            self.keypair_seed.public_key, commitment={
                "encoding": "base64"
            })
        return account_info

    def get_account_data(self):
        account_info = self.connection.get_account_info(
            self.keypair_seed.public_key, commitment={
                "encoding": "base64"
            })
        account_data = AccountDataStruct()
        account_data.deserialize(base64.b64decode(account_info.data[0]))
        return account_data.struct2object()

    def send_transaction(self, instruction_data, pubkeys=[], keypairs=[]):
        if not isinstance(instruction_data, InstructionDataStruct):
            print("Error: instructionData is not InstructionStruct")
            return

        is_signers = [False] * len(pubkeys)
        for keypair in keypairs:
            for i in range(len(pubkeys)):
                if keypair.public_key == pubkeys[i]:
                    is_signers[i] = True

        keys = [AccountMeta(public_key=pubkeys[i],
                            is_signer=is_signers[i], is_writable=True)
                for i in range(len(pubkeys))]

        instruction = Instruction(
            keys=keys,
            program_id=self.program_id,
            data=bytes(instruction_data.serialize()),
        )

        transaction = Transaction(instructions=[
            instruction
        ], signers=keypairs)

        signature = self.connection.send_transaction(transaction)
        print(f"Transaction sent with signature {signature}")
        return signature
