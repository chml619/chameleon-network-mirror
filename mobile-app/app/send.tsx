/**
 * Send CHML screen
 * Updated with clean light theme design
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { BN } from '@polkadot/util';
import { useWallet } from '@/context/WalletContext';
import { useBalance } from '@/hooks/useBalance';
import { transactionService } from '@/services/transaction';
import { chainService } from '@/services/chain';
import { walletService } from '@/services/wallet';
import { TransactionStatus } from '@/components/TransactionStatus';
import { truncateAddress } from '@/utils/address';
import { THEME, GRADIENTS } from '@/constants/theme';

export default function SendScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { wallet } = useWallet();
  const { formattedFreeBalance, balance } = useBalance(wallet?.address);
  
  // Form state
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isValidAddress, setIsValidAddress] = useState(false);
  const [feeEstimate, setFeeEstimate] = useState<any>(null);
  const [isEstimatingFee, setIsEstimatingFee] = useState(false);
  
  // Transaction state
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [transactionResult, setTransactionResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);

  // Validate recipient address
  useEffect(() => {
    if (recipient.length > 0) {
      const valid = transactionService.validateAddress(recipient);
      setIsValidAddress(valid);
    } else {
      setIsValidAddress(false);
    }
  }, [recipient]);

  // Estimate fee when amount and recipient change
  useEffect(() => {
    if (isValidAddress && amount && wallet?.address && parseFloat(amount) > 0) {
      estimateFee();
    } else {
      setFeeEstimate(null);
    }
  }, [recipient, amount, isValidAddress, wallet?.address]);

  const estimateFee = async () => {
    if (!wallet?.address || !isValidAddress || !amount) return;
    
    setIsEstimatingFee(true);
    try {
      const amountBN = transactionService.parseAmount(amount);
      const estimate = await transactionService.estimateFee(wallet.address, recipient, amountBN);
      setFeeEstimate(estimate);
    } catch (error) {
      console.error('Error estimating fee:', error);
      setFeeEstimate(null);
    } finally {
      setIsEstimatingFee(false);
    }
  };

  const handlePasteAddress = async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();
      if (clipboardContent) {
        setRecipient(clipboardContent.trim());
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to paste from clipboard');
    }
  };

  const handleMaxAmount = () => {
    if (!balance || !feeEstimate) return;
    
    const balanceBN = new BN(balance.free);
    const feeBN = new BN(feeEstimate.partialFee);
    const maxAmount = balanceBN.sub(feeBN);
    
    if (maxAmount.gt(new BN(0))) {
      const formatted = chainService.formatBalance(maxAmount.toString()).split(' ')[0];
      setAmount(formatted.replace(/,/g, ''));
    }
  };

  const validateTransaction = () => {
    if (!wallet?.address) return 'No wallet connected';
    if (!recipient) return 'Please enter recipient address';
    if (!isValidAddress) return 'Invalid recipient address';
    if (!amount || parseFloat(amount) <= 0) return 'Please enter a valid amount';
    if (!balance) return 'Unable to check balance';
    if (!feeEstimate) return 'Unable to estimate fee';
    
    const amountBN = transactionService.parseAmount(amount);
    const feeBN = new BN(feeEstimate.partialFee);
    const totalBN = amountBN.add(feeBN);
    const balanceBN = new BN(balance.free);
    
    if (totalBN.gt(balanceBN)) {
      return 'Insufficient balance (including fees)';
    }
    
    return null;
  };

  const handleReview = () => {
    const error = validateTransaction();
    if (error) {
      Alert.alert('Transaction Error', error);
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirmSend = async () => {
    if (!wallet?.address || !feeEstimate) return;
    
    setShowConfirmation(false);
    setIsSending(true);
    
    try {
      const keyPair = walletService.getKeyPair();
      if (!keyPair) {
        throw new Error('Wallet not unlocked');
      }
      
      const amountBN = transactionService.parseAmount(amount);
      
      await transactionService.sendTransactionWithMonitoring(
        keyPair,
        recipient,
        amountBN,
        (result) => {
          setTransactionResult(result);
          if (result.status === 'finalized' || result.status === 'failed') {
            setIsSending(false);
            setShowResult(true);
          }
        }
      );
    } catch (error) {
      console.error('Error sending transaction:', error);
      setIsSending(false);
      Alert.alert(
        'Transaction Failed',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  };

  const handleCloseResult = () => {
    setShowResult(false);
    setTransactionResult(null);
    
    if (transactionResult?.status === 'finalized') {
      setRecipient('');
      setAmount('');
      setFeeEstimate(null);
    }
  };

  if (isSending) {
    return (
      <LinearGradient
        colors={GRADIENTS.background.colors}
        style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}
      >
        <ActivityIndicator size="large" color={THEME.colors.primary} />
        <Text style={styles.loadingTitle}>Sending Transaction...</Text>
        <Text style={styles.loadingSubtitle}>
          Please wait while your transaction is processed
        </Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={GRADIENTS.background.colors}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={THEME.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send CHML</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Recipient Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>To</Text>
          <View style={styles.inputRow}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: THEME.spacing.sm }]}>
              <TextInput
                style={styles.textInput}
                placeholder="Enter recipient address"
                placeholderTextColor={THEME.colors.textMuted}
                value={recipient}
                onChangeText={setRecipient}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <TouchableOpacity style={styles.iconButton} onPress={handlePasteAddress}>
              <Ionicons name="clipboard-outline" size={20} color={THEME.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {recipient.length > 0 && !isValidAddress && (
            <Text style={styles.errorText}>Invalid address format</Text>
          )}
        </View>

        {/* Amount Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Amount</Text>
          <View style={styles.inputRow}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: THEME.spacing.sm }]}>
              <TextInput
                style={[styles.textInput, { fontSize: THEME.fontSize.xl }]}
                placeholder="0.00"
                placeholderTextColor={THEME.colors.textMuted}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
            </View>
            <TouchableOpacity
              style={[
                styles.maxButton,
                (!balance || !feeEstimate) && styles.maxButtonDisabled,
              ]}
              onPress={handleMaxAmount}
              disabled={!balance || !feeEstimate}
            >
              <Text style={styles.maxButtonText}>MAX</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.availableText}>
            Available: {formattedFreeBalance}
          </Text>
        </View>

        {/* Fee Estimate */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Network Fee</Text>
          <View style={styles.feeContainer}>
            {isEstimatingFee ? (
              <View style={styles.feeEstimating}>
                <ActivityIndicator size="small" color={THEME.colors.primary} />
                <Text style={styles.feeEstimatingText}>Estimating fee...</Text>
              </View>
            ) : feeEstimate ? (
              <Text style={styles.feeAmount}>~{feeEstimate.formatted}</Text>
            ) : (
              <Text style={styles.feePlaceholder}>Enter amount to estimate fee</Text>
            )}
          </View>
        </View>

        {/* Review Button */}
        <TouchableOpacity
          style={[
            styles.reviewButton,
            validateTransaction() && styles.buttonDisabled,
          ]}
          onPress={handleReview}
          disabled={!!validateTransaction()}
        >
          <Text style={styles.reviewButtonText}>Review Send</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmation}
        transparent
        animationType="slide"
        onRequestClose={() => setShowConfirmation(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Transaction</Text>
            
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Sending</Text>
              <Text style={styles.modalAmountLarge}>{amount} CHML</Text>
            </View>
            
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>To</Text>
              <Text style={styles.modalAddress}>{truncateAddress(recipient)}</Text>
            </View>
            
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Network Fee</Text>
              <Text style={styles.modalAmount}>{feeEstimate?.formatted}</Text>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmSend}>
                <Text style={styles.confirmButtonText}>Confirm & Send</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowConfirmation(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Transaction Result Modal */}
      <Modal
        visible={showResult}
        transparent
        animationType="slide"
        onRequestClose={handleCloseResult}
      >
        <View style={styles.modalOverlay}>
          <TransactionStatus result={transactionResult} onClose={handleCloseResult} />
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.md,
  },
  backButton: {
    padding: THEME.spacing.xs,
  },
  headerTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: THEME.spacing.lg,
  },
  inputSection: {
    marginBottom: THEME.spacing.lg,
  },
  inputLabel: {
    fontSize: THEME.fontSize.base,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputContainer: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.borderRadius.medium,
    ...THEME.shadows.small,
  },
  textInput: {
    fontSize: THEME.fontSize.base,
    color: THEME.colors.text,
    padding: THEME.spacing.md,
  },
  iconButton: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.borderRadius.medium,
    padding: THEME.spacing.md,
    ...THEME.shadows.small,
  },
  maxButton: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.medium,
    paddingVertical: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.lg,
  },
  maxButtonDisabled: {
    backgroundColor: THEME.colors.lightGrey,
  },
  maxButtonText: {
    color: THEME.colors.white,
    fontWeight: THEME.fontWeight.semibold,
    fontSize: THEME.fontSize.sm,
  },
  errorText: {
    color: THEME.colors.error,
    fontSize: THEME.fontSize.sm,
    marginTop: THEME.spacing.xs,
  },
  availableText: {
    color: THEME.colors.textSecondary,
    fontSize: THEME.fontSize.sm,
    marginTop: THEME.spacing.xs,
  },
  feeContainer: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.borderRadius.medium,
    padding: THEME.spacing.md,
    ...THEME.shadows.small,
  },
  feeEstimating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feeEstimatingText: {
    color: THEME.colors.textSecondary,
    marginLeft: THEME.spacing.sm,
    fontSize: THEME.fontSize.sm,
  },
  feeAmount: {
    color: THEME.colors.text,
    fontSize: THEME.fontSize.base,
    fontWeight: THEME.fontWeight.medium,
  },
  feePlaceholder: {
    color: THEME.colors.textMuted,
    fontSize: THEME.fontSize.base,
  },
  reviewButton: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.full,
    paddingVertical: THEME.spacing.md,
    marginTop: THEME.spacing.lg,
  },
  reviewButtonText: {
    color: THEME.colors.white,
    textAlign: 'center',
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
  },
  buttonDisabled: {
    backgroundColor: THEME.colors.lightGrey,
  },
  // Loading
  loadingTitle: {
    color: THEME.colors.text,
    fontSize: THEME.fontSize.lg,
    marginTop: THEME.spacing.md,
  },
  loadingSubtitle: {
    color: THEME.colors.textSecondary,
    fontSize: THEME.fontSize.sm,
    marginTop: THEME.spacing.sm,
    textAlign: 'center',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: THEME.colors.background,
    borderTopLeftRadius: THEME.borderRadius.large,
    borderTopRightRadius: THEME.borderRadius.large,
    padding: THEME.spacing.lg,
  },
  modalTitle: {
    color: THEME.colors.text,
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    textAlign: 'center',
    marginBottom: THEME.spacing.lg,
  },
  modalSection: {
    marginBottom: THEME.spacing.lg,
  },
  modalLabel: {
    color: THEME.colors.textSecondary,
    fontSize: THEME.fontSize.sm,
    marginBottom: THEME.spacing.xs,
  },
  modalAmount: {
    color: THEME.colors.text,
    fontSize: THEME.fontSize.base,
  },
  modalAmountLarge: {
    color: THEME.colors.text,
    fontSize: THEME.fontSize['3xl'],
    fontWeight: THEME.fontWeight.bold,
  },
  modalAddress: {
    color: THEME.colors.text,
    fontFamily: 'monospace',
    fontSize: THEME.fontSize.base,
  },
  modalButtons: {
    gap: THEME.spacing.md,
  },
  confirmButton: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.full,
    paddingVertical: THEME.spacing.md,
  },
  confirmButtonText: {
    color: THEME.colors.white,
    textAlign: 'center',
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
  },
  cancelButton: {
    paddingVertical: THEME.spacing.md,
  },
  cancelButtonText: {
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    fontSize: THEME.fontSize.lg,
  },
});
