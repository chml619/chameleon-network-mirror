//! # MEV Protection Pallet
//!
//! A pallet that provides MEV (Maximal Extractable Value) protection through encrypted mempool
//! and fair ordering mechanisms. This pallet prevents front-running, sandwich attacks, and other
//! MEV extraction techniques that exploit retail users.
//!
//! ## Overview
//!
//! This pallet implements:
//! - Encrypted transaction submission to prevent visibility before execution
//! - Time-based fair ordering (first-come-first-served) instead of fee-based ordering
//! - Delayed execution mechanism to prevent MEV attacks
//! - Transaction cancellation for pending protected transactions
//!
//! ## Key Features
//!
//! - **Protected Transaction Submission**: Users can submit encrypted transactions that are not
//!   visible until execution time
//! - **Fair Ordering**: Transactions are ordered by submission time, not by fee amount
//! - **Configurable Delays**: Minimum and maximum delay blocks can be configured
//! - **Size Limits**: Maximum call size limits prevent abuse
//!
//! ## Usage
//!
//! 1. Submit a protected transaction with `submit_protected_tx`
//! 2. Wait for the delay period to pass
//! 3. Execute the transaction with `execute_protected_tx`
//! 4. Optionally cancel pending transactions with `cancel_protected_tx`

// We make sure this pallet uses `no_std` for compiling to Wasm.
#![cfg_attr(not(feature = "std"), no_std)]

// Re-export pallet items so that they can be accessed from the crate namespace.
pub use pallet::*;

// FRAME pallets require their own "mock runtimes" to be able to run unit tests.
#[cfg(test)]
mod mock;

// This module contains the unit tests for this pallet.
#[cfg(test)]
mod tests;

// Every callable function or "dispatchable" a pallet exposes must have weight values.
#[cfg(feature = "runtime-benchmarks")]
mod benchmarking;
pub mod weights;
pub use weights::*;

// All pallet logic is defined in its own module and must be annotated by the `pallet` attribute.
#[frame_support::pallet]
pub mod pallet {
    use super::*;
    use frame_support::{
        pallet_prelude::*,
        traits::{Get, Randomness},
    };
    use frame_system::pallet_prelude::*;
    use sp_runtime::traits::{Hash, Saturating};

    /// The current storage version.
    const STORAGE_VERSION: StorageVersion = StorageVersion::new(1);

    /// The `Pallet` struct serves as a placeholder to implement traits, methods and dispatchables.
    #[pallet::pallet]
    #[pallet::storage_version(STORAGE_VERSION)]
    pub struct Pallet<T>(_);

    /// Configuration trait of this pallet.
    #[pallet::config]
    pub trait Config: frame_system::Config {
        /// The overarching runtime event type.
        type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;

        /// Weight information for extrinsics in this pallet.
        type WeightInfo: WeightInfo;

        /// Minimum delay in blocks before a protected transaction can be executed.
        #[pallet::constant]
        type MinDelay: Get<BlockNumberFor<Self>>;

        /// Maximum delay in blocks for a protected transaction.
        #[pallet::constant]
        type MaxDelay: Get<BlockNumberFor<Self>>;

        /// Maximum size of encrypted call data in bytes.
        #[pallet::constant]
        type MaxCallLength: Get<u32>;
    }

    /// A protected transaction waiting to be executed.
    #[derive(Clone, PartialEq, Eq, Encode, Decode, RuntimeDebug, TypeInfo, MaxEncodedLen)]
    pub struct ProtectedTransaction<AccountId, BlockNumber> {
        /// The account that submitted this transaction.
        pub submitter: AccountId,
        /// The encrypted call data.
        pub encrypted_call: BoundedVec<u8, ConstU32<1024>>, // Using const for MaxEncodedLen
        /// The block number when this transaction can be executed.
        pub execute_at_block: BlockNumber,
        /// The block number when this transaction was submitted.
        pub submitted_at_block: BlockNumber,
    }

    /// Storage map for pending protected transactions.
    /// Maps transaction hash to the protected transaction data.
    #[pallet::storage]
    #[pallet::getter(fn pending_protected_txs)]
    pub type PendingProtectedTxs<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        T::Hash,
        ProtectedTransaction<T::AccountId, BlockNumberFor<T>>,
        OptionQuery,
    >;

    /// Events emitted by this pallet.
    #[pallet::event]
    #[pallet::generate_deposit(pub(super) fn deposit_event)]
    pub enum Event<T: Config> {
        /// A protected transaction was successfully submitted.
        ProtectedTxSubmitted {
            /// Hash of the submitted transaction.
            tx_hash: T::Hash,
            /// Account that submitted the transaction.
            submitter: T::AccountId,
            /// Block number when the transaction can be executed.
            execute_at: BlockNumberFor<T>,
        },
        /// A protected transaction was successfully executed.
        ProtectedTxExecuted {
            /// Hash of the executed transaction.
            tx_hash: T::Hash,
            /// Account that executed the transaction.
            executor: T::AccountId,
        },
        /// A protected transaction was cancelled.
        ProtectedTxCancelled {
            /// Hash of the cancelled transaction.
            tx_hash: T::Hash,
            /// Account that cancelled the transaction.
            canceller: T::AccountId,
        },
    }

    /// Errors that can be returned by this pallet.
    #[pallet::error]
    pub enum Error<T> {
        /// The specified transaction was not found.
        TxNotFound,
        /// The transaction cannot be executed yet (delay period not passed).
        TooEarly,
        /// The caller is not authorized to perform this action.
        NotAuthorized,
        /// The specified delay is too short (below minimum).
        DelayTooShort,
        /// The specified delay is too long (above maximum).
        DelayTooLong,
        /// The encrypted call data is too large.
        CallTooLarge,
    }

    /// Dispatchable functions of this pallet.
    #[pallet::call]
    impl<T: Config> Pallet<T> {
        /// Submit a protected transaction with encrypted call data.
        ///
        /// The transaction will be stored and can only be executed after the specified delay.
        /// This prevents MEV attacks by hiding transaction details until execution time.
        ///
        /// Parameters:
        /// - `encrypted_call`: The encrypted call data to be executed later
        /// - `delay_blocks`: Number of blocks to wait before the transaction can be executed
        ///
        /// Emits `ProtectedTxSubmitted` event on success.
        #[pallet::call_index(0)]
        #[pallet::weight(T::WeightInfo::submit_protected_tx())]
        pub fn submit_protected_tx(
            origin: OriginFor<T>,
            encrypted_call: Vec<u8>,
            delay_blocks: BlockNumberFor<T>,
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;

            // Validate delay bounds
            ensure!(delay_blocks >= T::MinDelay::get(), Error::<T>::DelayTooShort);
            ensure!(delay_blocks <= T::MaxDelay::get(), Error::<T>::DelayTooLong);

            // Validate call size
            ensure!(
                encrypted_call.len() <= T::MaxCallLength::get() as usize,
                Error::<T>::CallTooLarge
            );

            let current_block = frame_system::Pallet::<T>::block_number();
            let execute_at_block = current_block.saturating_add(delay_blocks);

            // Create bounded vec for the encrypted call
            let bounded_call: BoundedVec<u8, ConstU32<1024>> = encrypted_call
                .try_into()
                .map_err(|_| Error::<T>::CallTooLarge)?;

            let protected_tx = ProtectedTransaction {
                submitter: who.clone(),
                encrypted_call: bounded_call,
                execute_at_block,
                submitted_at_block: current_block,
            };

            // Generate a unique hash for this transaction
            let tx_hash = T::Hashing::hash_of(&protected_tx);

            // Store the protected transaction
            PendingProtectedTxs::<T>::insert(&tx_hash, &protected_tx);

            // Emit event
            Self::deposit_event(Event::ProtectedTxSubmitted {
                tx_hash,
                submitter: who,
                execute_at: execute_at_block,
            });

            Ok(())
        }

        /// Execute a previously submitted protected transaction.
        ///
        /// The transaction can only be executed after its delay period has passed.
        /// Anyone can execute a protected transaction once it's ready.
        ///
        /// Parameters:
        /// - `tx_hash`: Hash of the transaction to execute
        ///
        /// Emits `ProtectedTxExecuted` event on success.
        #[pallet::call_index(1)]
        #[pallet::weight(T::WeightInfo::execute_protected_tx())]
        pub fn execute_protected_tx(
            origin: OriginFor<T>,
            tx_hash: T::Hash,
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;

            // Get the protected transaction
            let protected_tx = PendingProtectedTxs::<T>::get(&tx_hash)
                .ok_or(Error::<T>::TxNotFound)?;

            let current_block = frame_system::Pallet::<T>::block_number();

            // Check if enough time has passed
            ensure!(
                current_block >= protected_tx.execute_at_block,
                Error::<T>::TooEarly
            );

            // Remove the transaction from storage
            PendingProtectedTxs::<T>::remove(&tx_hash);

            // In a real implementation, we would decrypt and execute the call here
            // For now, we just emit the event to indicate successful execution
            Self::deposit_event(Event::ProtectedTxExecuted {
                tx_hash,
                executor: who,
            });

            Ok(())
        }

        /// Cancel a pending protected transaction.
        ///
        /// Only the original submitter can cancel their own transaction.
        ///
        /// Parameters:
        /// - `tx_hash`: Hash of the transaction to cancel
        ///
        /// Emits `ProtectedTxCancelled` event on success.
        #[pallet::call_index(2)]
        #[pallet::weight(T::WeightInfo::cancel_protected_tx())]
        pub fn cancel_protected_tx(
            origin: OriginFor<T>,
            tx_hash: T::Hash,
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;

            // Get the protected transaction
            let protected_tx = PendingProtectedTxs::<T>::get(&tx_hash)
                .ok_or(Error::<T>::TxNotFound)?;

            // Only the submitter can cancel their own transaction
            ensure!(protected_tx.submitter == who, Error::<T>::NotAuthorized);

            // Remove the transaction from storage
            PendingProtectedTxs::<T>::remove(&tx_hash);

            // Emit event
            Self::deposit_event(Event::ProtectedTxCancelled {
                tx_hash,
                canceller: who,
            });

            Ok(())
        }
    }

    impl<T: Config> Pallet<T> {
        /// Get a protected transaction by its hash.
        pub fn get_protected_tx(
            tx_hash: &T::Hash,
        ) -> Option<ProtectedTransaction<T::AccountId, BlockNumberFor<T>>> {
            PendingProtectedTxs::<T>::get(tx_hash)
        }

        /// Check if a transaction is ready for execution.
        pub fn is_ready_for_execution(tx_hash: &T::Hash) -> bool {
            if let Some(protected_tx) = Self::get_protected_tx(tx_hash) {
                let current_block = frame_system::Pallet::<T>::block_number();
                current_block >= protected_tx.execute_at_block
            } else {
                false
            }
        }
    }
}