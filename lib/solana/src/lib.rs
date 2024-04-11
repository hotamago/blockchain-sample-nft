use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
};
use std::cmp::Ordering;
use std::ops::{Index, IndexMut};

// Support struct
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct HotaVector<T> {
    length: u8,
    data: [T; 30],
}
pub struct HotaVectorIterator<'a, T> {
    vector: &'a HotaVector<T>,
    index: usize,
}
impl<'a, T> Iterator for HotaVectorIterator<'a, T> {
    type Item = &'a T;
    fn next(&mut self) -> Option<Self::Item> {
        if self.index < (self.vector.length as usize) {
            let result = Some(&self.vector.data[self.index]);
            self.index += 1;
            return result;
        }
        return None;
    }
}
impl<T> HotaVector<T> {
    pub fn push(&mut self, newData: T) {
        // Check length out of range
        if self.length as usize >= 256 {
            panic!("Length out of range");
        }
        self.data[self.length as usize] = newData;
        self.length += 1;
    }
    pub fn pop(&mut self) {
        // Check length out of range
        if self.length == 0 {
            panic!("Length out of range");
        }
        self.length -= 1;
    }
    pub fn swap(&mut self, i: usize, j: usize) {
        let (low, high) = match i.cmp(&j) {
            Ordering::Less => (i, j),
            Ordering::Greater => (j, i),
            Ordering::Equal => return,
        };

        let (a, b) = self.data.split_at_mut(high);
    }
    pub fn remove(&mut self, index: usize) {
        // Check index out of range
        if index >= self.length as usize {
            panic!("Index out of range");
        }
        for i in index..(self.length as usize) {
            // self.data[i] = self.data[i + 1];
            self.swap(i, i + 1);
        }
        self.length -= 1;
    }
    pub fn get(&self, index: usize) -> &T {
        return &self.data[index];
    }
    pub fn clear(&mut self) {
        self.length = 0;
    }
    pub fn len(&self) -> usize {
        return self.length as usize;
    }
    // iterator
    pub fn iter(&self) -> HotaVectorIterator<T> {
        return HotaVectorIterator {
            vector: self,
            index: 0,
        };
    }
}

impl<T> Index<usize> for HotaVector<T> {
    type Output = T;
    fn index(&self, index: usize) -> &T {
        // Check index out of range
        if index >= self.length as usize {
            panic!("Index out of range");
        }
        // Check index is negative
        if index < 0 {
            panic!("Index is negative");
        }
        return self.get(index);
    }
}

impl<T> IndexMut<usize> for HotaVector<T> {
    fn index_mut(&mut self, index: usize) -> &mut T {
        // Check index out of range
        if index >= self.length as usize {
            panic!("Index out of range");
        }
        // Check index is negative
        if index < 0 {
            panic!("Index is negative");
        }
        return &mut self.data[index];
    }
}

// Support function
pub fn hotaSerialize(dataMut: &mut &mut [u8], newData: &Vec<u8>) {
    for i in 0..newData.len() {
        dataMut[i] = newData[i];
    }
}
pub fn checkOwner(account: &[AccountInfo], program_id: &Pubkey) -> bool {
    msg!("check list acc len {}", account.len());
    for acc in account {
        if acc.owner != program_id {
            msg!("acc.ower {}, program_id {}", acc.owner, program_id);
            return false;
        }
    }
    return true;
}

// Define the type of state stored in accounts
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct FaceNFT {
    pub id: u32,
    pub hair: u8,
    pub eyes: u8,
    pub ears: u8,
    pub mouth: u8,
    pub nose: u8,
    pub seed: u32,
}

// Function check 2 face is same
pub fn isSameFace(face1: &FaceNFT, face2: &FaceNFT) -> bool {
    if face1.hair != face2.hair {
        return false;
    }
    if face1.eyes != face2.eyes {
        return false;
    }
    if face1.ears != face2.ears {
        return false;
    }
    if face1.mouth != face2.mouth {
        return false;
    }
    if face1.nose != face2.nose {
        return false;
    }
    if face1.seed != face2.seed {
        return false;
    }
    return true;
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct InstructionData {
    pub typeAct: u8,
    pub face: FaceNFT,
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct AccountStore {
    pub ownFace: HotaVector<FaceNFT>,
}

// Declare and export the program's entrypoint
entrypoint!(process_instruction);

// Program entrypoint's implementation
pub fn process_instruction(
    program_id: &Pubkey,      // Public key of the account
    accounts: &[AccountInfo], // List account
    instruction_data: &[u8],  // Instruction data
) -> ProgramResult {
    msg!("Start instruction processing");

    // Decode instruction data
    let instruction_data = InstructionData::try_from_slice(instruction_data)?;

    // Iterating accounts is safer than indexing
    let accounts_iter = &mut accounts.iter();

    msg!("Checking owner");
    // The account must be owned by the program in order to modify its data
    if !checkOwner(accounts, program_id) {
        msg!("Account does not have the correct program id");
        return Err(ProgramError::IncorrectProgramId);
    }
    msg!("Done check owner");

    match instruction_data.typeAct {
        0 => {
            msg!("Start create face");
            // Check must 1 account
            if accounts.len() != 1 {
                msg!("This program requires 1 account to be passed");
                return Err(ProgramError::NotEnoughAccountKeys);
            }

            // Get the account
            msg!("Get data account");
            let account = next_account_info(accounts_iter)?;

            // Check signer
            if account.is_signer == false {
                msg!("Account is not signer");
                return Err(ProgramError::InvalidArgument);
            }

            // Get the account data
            msg!("Decode datastore");
            let mut accountData = AccountStore::try_from_slice(&account.data.borrow())?;

            // Add new face to account
            msg!("Add face");
            accountData.ownFace.push(instruction_data.face);

            // Save the account data
            msg!("Save data");
            hotaSerialize(
                &mut &mut account.data.borrow_mut()[..],
                &accountData.try_to_vec().unwrap(),
            );
        }
        1 => {
            msg!("Start transfer face");
            // Check must 2 account
            if accounts.len() != 2 {
                msg!("This program requires 2 accounts to be passed");
                return Err(ProgramError::NotEnoughAccountKeys);
            }

            // Get the account
            let formAccount = next_account_info(accounts_iter)?;
            let toAccount = next_account_info(accounts_iter)?;

            // Check form account is signer
            if formAccount.is_signer == false {
                msg!("Form account is not signer");
                return Err(ProgramError::InvalidArgument);
            }

            // Get the account data
            let mut formAccountData = AccountStore::try_from_slice(&formAccount.data.borrow())?;
            let mut toAccountData = AccountStore::try_from_slice(&toAccount.data.borrow())?;

            // Check face in instruction data not empty
            if instruction_data.face.id != 0 {
                msg!("Face in instruction data is empty");
                return Err(ProgramError::InvalidArgument);
            }

            // check if from account has face in list of face to transfer
            {
                let mut found = false;
                for ownFace in formAccountData.ownFace.iter() {
                    if instruction_data.face.id == ownFace.id {
                        if isSameFace(&instruction_data.face, &ownFace) {
                            found = true;
                            break;
                        } else {
                            msg!("Face in instruction data is not same face in from account");
                            return Err(ProgramError::InvalidArgument);
                        }
                    }
                }
                if !found {
                    msg!(
                        "Face with id {} not found in from account",
                        instruction_data.face.id
                    );
                    return Err(ProgramError::InvalidArgument);
                }
            }

            // Remove face from from account
            let mut indexFace = 0;
            for i in 0..formAccountData.ownFace.len() {
                if formAccountData.ownFace[i].id == instruction_data.face.id {
                    indexFace = i;
                    break;
                }
            }
            formAccountData.ownFace.remove(indexFace);

            // Add face to to account
            toAccountData.ownFace.push(instruction_data.face);

            // Save the account data
            hotaSerialize(
                &mut &mut formAccount.data.borrow_mut()[..],
                &formAccountData.try_to_vec().unwrap(),
            );
            hotaSerialize(
                &mut &mut toAccount.data.borrow_mut()[..],
                &toAccountData.try_to_vec().unwrap(),
            );
        }
        _ => {
            msg!("Type action not found");
            return Err(ProgramError::InvalidArgument);
        }
    }

    Ok(())
}

// Sanity tests
// #[cfg(test)]
// mod test {
//     use super::*;
//     use solana_program::clock::Epoch;
//     use std::mem;

//     #[test]
//     fn test_sanity() {
//         let program_id = Pubkey::default();
//         let key = Pubkey::default();
//         let mut lamports = 0;
//         let mut data = vec![0; mem::size_of::<u32>()];
//         let owner = Pubkey::default();
//         let account = AccountInfo::new(
//             &key,
//             false,
//             true,
//             &mut lamports,
//             &mut data,
//             &owner,
//             false,
//             Epoch::default(),
//         );
//         let instruction_data: Vec<u8> = Vec::new();

//         let accounts = vec![account];

//         assert_eq!(
//             GreetingAccount::try_from_slice(&accounts[0].data.borrow())
//                 .unwrap()
//                 .counter,
//             0
//         );
//         process_instruction(&program_id, &accounts, &instruction_data).unwrap();
//         assert_eq!(
//             GreetingAccount::try_from_slice(&accounts[0].data.borrow())
//                 .unwrap()
//                 .counter,
//             1
//         );
//         process_instruction(&program_id, &accounts, &instruction_data).unwrap();
//         assert_eq!(
//             GreetingAccount::try_from_slice(&accounts[0].data.borrow())
//                 .unwrap()
//                 .counter,
//             2
//         );
//     }
// }
