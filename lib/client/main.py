import uvicorn

from fastapi import FastAPI, Body, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from config import *
from pydantic import BaseModel

# import data
from hotaSolana.hotaSolanaData import *

app = FastAPI(title="XPath API Management",
              description="API for XPath API Management",
              version="v2.0",
              contact={
                  "name": "Hotamago Master",
                  "url": "https://www.linkedin.com/in/hotamago/",
              },
              license_info={
                  "name": "Apache 2.0",
                  "identifier": "MIT",
              })

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Solana Client
client = HotaSolanaClient(
    "RSfLGJjiczv73AUSP6EeiLzE9XZR8nUjdL6uXvNmcwg", False, "devnet", "hotaNFT4")

# Router


@app.post("/login")
async def login(secretKey: str):
    client.make_key_pair(secretKey)
    return {"public_key_with_seed": client.keypair_seed.public_key.__str__()}


@app.get("/getAccountInfo")
async def getAccountInfo():
    return client.get_account_info()


@app.get("/getAccountData")
async def getAccountInfo():
    return client.get_account_data()


@app.get("/getBalance")
async def getBalance():
    return client.get_balance()


@app.post("/airdrop")
async def airdrop(amount: int = 1):
    return client.drop_sol(amount)


@app.post("/sendTransactionGachaFace")
async def sendTransactionGachaFace():
    # Add random face
    newFaceNFT = FaceStruct()
    newFaceNFT.randomFace()
    instructionData = InstructionDataStruct(
        typeAct=HotaUint8(0),
        face=newFaceNFT,
    )
    return client.send_transaction(instructionData, [client.keypair_seed.public_key], [client.keypair, client.keypair_seed])

'''
{
    "id": HotaUint32(0),
    "hair": HotaUint8(0),
    "eyes": HotaUint8(0),
    "ears": HotaUint8(0),
    "mouth": HotaUint8(0),
    "nose": HotaUint8(0),
    "seed": HotaUint32(0)
}
'''


class FaceForm(BaseModel):
    id: int
    hair: int
    eyes: int
    ears: int
    mouth: int
    nose: int
    seed: int


@app.post("/sendTransactionTradeFace")
async def sendTransactionTradeFace(faceRaw: FaceForm, publicKey: str):
    # Convert face
    face = FaceStruct()
    face.object2struct(faceRaw.dict())

    # Trade face
    instructionData = InstructionDataStruct(
        typeAct=HotaUint8(1),
        face=face,
    )
    return client.send_transaction(instructionData, [client.keypair_seed.public_key, PublicKey(publicKey)], [client.keypair, client.keypair_seed])

# Run
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=openPortAPI)
