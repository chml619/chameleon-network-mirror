/**
 * Transaction status component with animated states
 * Updated for light theme design
 */

import React from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import type { TransactionStatus as TxStatus, TransactionResult } from '../services/transaction';

interface TransactionStatusProps {
  result: TransactionResult;
  onClose?: () => void;
  showExplorerLink?: boolean;
}

export const TransactionStatus: React.FC<TransactionStatusProps> = ({
  result,
  onClose,
  showExplorerLink = true,
}) => {
  const getStatusConfig = (status: TxStatus) => {
    switch (status) {
      case 'pending':
        return {
          icon: <ActivityIndicator size="large" color={THEME.colors.warning} />,
          title: 'Transaction Pending',
          subtitle: 'Broadcasting to network...',
          color: THEME.colors.warning,
          bgColor: THEME.colors.warningBg,
        };
      case 'inBlock':
        return {
          icon: <Ionicons name="time-outline" size={48} color={THEME.colors.secondary} />,
          title: 'Transaction In Block',
          subtitle: 'Waiting for finalization...',
          color: THEME.colors.secondary,
          bgColor: '#E3F2FD',
        };
      case 'finalized':
        return {
          icon: <Ionicons name="checkmark-circle" size={48} color={THEME.colors.success} />,
          title: 'Transaction Successful',
          subtitle: 'Your transaction has been confirmed',
          color: THEME.colors.success,
          bgColor: THEME.colors.successBg,
        };
      case 'failed':
        return {
          icon: <Ionicons name="close-circle" size={48} color={THEME.colors.error} />,
          title: 'Transaction Failed',
          subtitle: result.error || 'Transaction was rejected',
          color: THEME.colors.error,
          bgColor: THEME.colors.errorBg,
        };
      default:
        return {
          icon: <Ionicons name="help-circle" size={48} color={THEME.colors.textMuted} />,
          title: 'Unknown Status',
          subtitle: 'Please check transaction manually',
          color: THEME.colors.textMuted,
          bgColor: THEME.colors.lightGrey,
        };
    }
  };

  const config = getStatusConfig(result.status);
  const truncatedHash = `${result.hash.slice(0, 8)}...${result.hash.slice(-8)}`;

  const handleExplorerLink = () => {
    console.log('Opening explorer for tx:', result.hash);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: config.bgColor }]}>
        {/* Status Icon */}
        <View style={styles.iconContainer}>
          {config.icon}
        </View>

        {/* Status Title */}
        <Text style={[styles.title, { color: config.color }]}>
          {config.title}
        </Text>

        {/* Status Subtitle */}
        <Text style={styles.subtitle}>
          {config.subtitle}
        </Text>

        {/* Transaction Hash */}
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Transaction Hash</Text>
          <Text style={styles.infoValue}>
            {truncatedHash}
          </Text>
        </View>

        {/* Block Information */}
        {result.blockNumber && (
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Block Number</Text>
            <Text style={styles.infoValue}>
              #{result.blockNumber.toLocaleString()}
            </Text>
          </View>
        )}

        {/* Block Hash */}
        {result.blockHash && (
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Block Hash</Text>
            <Text style={styles.infoValue}>
              {`${result.blockHash.slice(0, 8)}...${result.blockHash.slice(-8)}`}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {showExplorerLink && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleExplorerLink}
            >
              <Text style={styles.secondaryButtonText}>
                View in Explorer
              </Text>
            </TouchableOpacity>
          )}

          {onClose && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onClose}
            >
              <Text style={styles.primaryButtonText}>
                {result.status === 'finalized' ? 'Done' : 'Close'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.colors.background,
    padding: THEME.spacing.lg,
    borderTopLeftRadius: THEME.borderRadius.large,
    borderTopRightRadius: THEME.borderRadius.large,
  },
  card: {
    borderRadius: THEME.borderRadius.large,
    padding: THEME.spacing.lg,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: THEME.spacing.md,
  },
  title: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    marginBottom: THEME.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginBottom: THEME.spacing.lg,
    fontSize: THEME.fontSize.base,
  },
  infoBox: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.borderRadius.medium,
    padding: THEME.spacing.md,
    width: '100%',
    marginBottom: THEME.spacing.sm,
    ...THEME.shadows.small,
  },
  infoLabel: {
    color: THEME.colors.textSecondary,
    fontSize: THEME.fontSize.sm,
    marginBottom: THEME.spacing.xs,
  },
  infoValue: {
    color: THEME.colors.text,
    fontFamily: 'monospace',
    fontSize: THEME.fontSize.sm,
  },
  buttonContainer: {
    width: '100%',
    gap: THEME.spacing.md,
    marginTop: THEME.spacing.md,
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.full,
    paddingVertical: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.lg,
  },
  secondaryButtonText: {
    color: THEME.colors.primary,
    textAlign: 'center',
    fontWeight: THEME.fontWeight.semibold,
    fontSize: THEME.fontSize.base,
  },
  primaryButton: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.full,
    paddingVertical: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.lg,
  },
  primaryButtonText: {
    color: THEME.colors.white,
    textAlign: 'center',
    fontWeight: THEME.fontWeight.semibold,
    fontSize: THEME.fontSize.base,
  },
});

export default TransactionStatus;
