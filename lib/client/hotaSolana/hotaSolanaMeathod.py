import requests
import json
from hotaSolana.bs58 import bs58
import hashlib


def send_rpc_api(url, jsonData):
    headers = {
        'Content-Type': 'application/json',
    }
    response = requests.post(url, headers=headers, data=jsonData)
    return response.json()


# def random_32bytes_with_seed(pubkey, seed, programid):
#     data = f"{pubkey}|{seed}|{programid}"
#     hashRandom = hashlib.sha256(data.encode('utf-8'))
#     return bs58.encode(hashRandom.digest())
def textEncodeASCII(text):
    arr = []
    for i in range(len(text)):
        arr.append(ord(text[i]))
    return bytes(arr)


def random_32bytes_with_seed(pubkey, seed, programid):
    '''
    const buffer = Buffer.concat([
      fromPublicKey.toBuffer(),
      Buffer.from(seed),
      programId.toBuffer(),
    ]);
    const publicKeyBytes = sha256(buffer);
    return new PublicKey(publicKeyBytes);
    '''
    databytes = bytearray()
    databytes.extend(pubkey.byte_value)
    databytes.extend(textEncodeASCII(seed))
    databytes.extend(programid.byte_value)
    hashRandom = hashlib.sha256(bytes(databytes))
    return bytes(hashRandom.digest())


def random_64bytes_with_seed(pubkey, seed, programid):
    databytes = bytearray()
    databytes.extend(pubkey.byte_value)
    databytes.extend(seed.encode('utf-8'))
    databytes.extend(programid.byte_value)
    hashRandom32_0 = hashlib.sha256(bytes(databytes))
    hashRandom32_1 = hashlib.sha256(hashRandom32_0.digest())
    # Combine 2 hash
    hashRandom64 = bytearray()
    hashRandom64.extend(hashRandom32_0.digest())
    hashRandom64.extend(hashRandom32_1.digest())
    return bytes(hashRandom64)


def get_minimum_balance_for_rent_exmeption(url, span):
    jsonData = json.dumps({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getMinimumBalanceForRentExemption",
        "params": [span]
    })
    response = send_rpc_api(url, jsonData)
    return response['result']


def getAccountInfo(url, pubkey):
    jsonData = json.dumps({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getAccountInfo",
        "params": [pubkey, {"encoding": "base64"}]
    })
    response = send_rpc_api(url, jsonData)
    return response['result']
