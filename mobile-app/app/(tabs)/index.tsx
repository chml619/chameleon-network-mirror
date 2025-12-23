/**
 * Home Screen - Main dashboard with balance and action grid
 * Week 7: Added MEV Protection toggle, Staking, Bridge links
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWallet } from '@/context/WalletContext';
import { useBalance } from '@/hooks/useBalance';
import { useApi } from '@/hooks/useApi';
import { NetworkBadge } from '@/components/NetworkBadge';
import { MEVProtectionToggle } from '@/components/MEVProtectionToggle';
import { THEME, GRADIENTS } from '@/constants/theme';

// Action items for the grid - Updated with Week 7 features
const ACTIONS = [
  { id: 'send', label: 'Send', icon: 'arrow-up-outline', route: '/send', color: '#FF6B6B' },
  { id: 'receive', label: 'Receive', icon: 'arrow-down-outline', route: '/receive', color: '#4ECDC4' },
  { id: 'trade', label: 'Trade', icon: 'swap-horizontal-outline', tab: 'trade', color: '#9B59B6' },
  { id: 'bridge', label: 'Bridge', icon: 'git-branch-outline', route: '/bridge', color: '#3498DB' },
  { id: 'stake', label: 'Stake', icon: 'layers-outline', route: '/staking', color: '#F39C12' },
  { id: 'shield', label: 'Shield', icon: 'shield-checkmark-outline', disabled: true },
  { id: 'papp', label: 'pApp', icon: 'apps-outline', disabled: true },
  { id: 'power', label: 'Power', icon: 'flash-outline', disabled: true },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { wallet, isLoading: walletLoading, importDevAccount } = useWallet();
  const { connectionState, connect } = useApi();
  const { formattedFreeBalance, isLoading: balanceLoading } = useBalance(wallet?.address);

  // Auto-connect to network on mount
  useEffect(() => {
    if (connectionState.status === 'disconnected') {
      connect();
    }
  }, [connectionState.status, connect]);

  // Handle dev account import
  const handleDevAccountImport = async (accountName: string) => {
    try {
      await importDevAccount(accountName.toLowerCase() as any);
      Alert.alert('Success', `${accountName} account imported!`);
    } catch (error) {
      Alert.alert('Error', 'Failed to import dev account');
    }
  };

  // If no wallet, redirect to wallet tab to create/import
  if (!wallet && !walletLoading) {
    return (
      <LinearGradient
        colors={GRADIENTS.background.colors}
        style={[styles.container, { paddingTop: insets.top }]}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.noWalletScrollContent}
        >
          <View style={styles.noWalletContainer}>
            <Image
              source={require('@/assets/images/Logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.noWalletTitle}>Welcome to Chameleon</Text>
            <Text style={styles.noWalletSubtitle}>
              Privacy-first blockchain wallet with MEV protection
            </Text>
            
            {/* Quick Setup Options */}
            <View style={styles.setupOptionsContainer}>
              <TouchableOpacity
                style={styles.getStartedButton}
                onPress={() => router.push('/create-wallet')}
              >
                <Ionicons name="add-circle-outline" size={20} color={THEME.colors.white} />
                <Text style={styles.getStartedButtonText}>Create New Wallet</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.importButton}
                onPress={() => router.push('/import-wallet')}
              >
                <Ionicons name="download-outline" size={20} color={THEME.colors.primary} />
                <Text style={styles.importButtonText}>Import Existing Wallet</Text>
              </TouchableOpacity>
            </View>

            {/* Dev Account Quick Access */}
            <View style={styles.devAccountSection}>
              <Text style={styles.devAccountTitle}>Quick Demo Access</Text>
              <Text style={styles.devAccountSubtitle}>Use a pre-funded test account</Text>
              <View style={styles.devAccountButtons}>
                {['Alice', 'Bob', 'Charlie'].map((name) => (
                  <TouchableOpacity
                    key={name}
                    style={styles.devAccountButton}
                    onPress={() => handleDevAccountImport(name)}
                  >
                    <Text style={styles.devAccountButtonText}>{name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Feature Preview */}
            <View style={styles.featurePreview}>
              <Text style={styles.featurePreviewTitle}>Features Available</Text>
              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <Ionicons name="shield-checkmark" size={18} color={THEME.colors.primary} />
                  <Text style={styles.featureText}>MEV Protection</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="swap-horizontal" size={18} color={THEME.colors.primary} />
                  <Text style={styles.featureText}>Privacy DEX (pDEX)</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="git-branch" size={18} color={THEME.colors.primary} />
                  <Text style={styles.featureText}>Cross-Chain Bridge</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="layers" size={18} color={THEME.colors.primary} />
                  <Text style={styles.featureText}>Staking Rewards</Text>
                </View>
              </View>
            </View>
          </View>
          
          {/* Bottom Spacing for tabs */}
          <View style={{ height: 120 }} />
        </ScrollView>
      </LinearGradient>
    );
  }

  const handleActionPress = (action: typeof ACTIONS[0]) => {
    if (action.disabled) {
      Alert.alert('Coming Soon', `${action.label} feature will be available in a future update.`);
      return;
    }
    if (action.route) {
      router.push(action.route as any);
    }
    if (action.tab) {
      // Navigate to tab
      router.push(`/(tabs)/${action.tab}` as any);
    }
  };

  // Extract balance number for display
  const balanceNumber = formattedFreeBalance ? formattedFreeBalance.split(' ')[0] : '0';

  return (
    <LinearGradient
      colors={GRADIENTS.background.colors}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarContainer}>
              <Image
                source={require('@/assets/images/Logo.png')}
                style={styles.avatar}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.walletName}>{wallet?.name || 'My Wallet'}</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => Alert.alert('Notifications', 'Coming soon!')}
          >
            <Ionicons name="notifications-outline" size={24} color={THEME.colors.text} />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
        </View>

        {/* Account Card */}
        <View style={styles.accountCard}>
          <View style={styles.accountHeader}>
            <Text style={styles.accountLabel}>My Account</Text>
            <TouchableOpacity style={styles.currencySelector}>
              <Text style={styles.currencyText}>USD</Text>
              <Ionicons name="chevron-down" size={16} color={THEME.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.balanceRow}>
            <View>
              {balanceLoading ? (
                <ActivityIndicator size="small" color={THEME.colors.primary} />
              ) : (
                <Text style={styles.balanceAmount}>{balanceNumber}</Text>
              )}
              <View style={styles.growthBadge}>
                <Text style={styles.growthText}>CHML</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.stakingButton}
              onPress={() => router.push('/staking')}
            >
              <Ionicons name="layers-outline" size={18} color={THEME.colors.white} />
              <Text style={styles.stakingButtonText}>Staking</Text>
            </TouchableOpacity>
          </View>

          {/* Network Badge */}
          <View style={styles.networkBadgeContainer}>
            <NetworkBadge size="small" showConnectionStatus={true} />
          </View>
        </View>

        {/* MEV Protection Toggle */}
        <View style={styles.mevContainer}>
          <MEVProtectionToggle />
        </View>

        {/* Action Grid */}
        <View style={styles.actionGrid}>
          {ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.actionButton}
              onPress={() => handleActionPress(action)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.actionIconContainer,
                  action.disabled && styles.actionIconDisabled,
                  action.color && { backgroundColor: `${action.color}20` },
                ]}
              >
                <Ionicons
                  name={action.icon as any}
                  size={24}
                  color={action.disabled ? THEME.colors.textMuted : (action.color || THEME.colors.primary)}
                />
              </View>
              <Text
                style={[
                  styles.actionLabel,
                  action.disabled && styles.actionLabelDisabled,
                ]}
              >
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Activity */}
        <View style={styles.activitySection}>
          <View style={styles.activityHeader}>
            <Text style={styles.activityTitle}>Recent Activity</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View all</Text>
            </TouchableOpacity>
          </View>

          {/* Empty State */}
          <View style={styles.emptyActivityCard}>
            <Ionicons name="time-outline" size={48} color={THEME.colors.textMuted} />
            <Text style={styles.emptyActivityText}>
              No transactions yet
            </Text>
            <Text style={styles.emptyActivitySubtext}>
              Your transaction history will appear here
            </Text>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // No Wallet State
  noWalletContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.xl,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: THEME.spacing.xl,
  },
  noWalletTitle: {
    fontSize: THEME.fontSize['2xl'],
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },
  noWalletSubtitle: {
    fontSize: THEME.fontSize.base,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginBottom: THEME.spacing.lg,
  },
  noWalletScrollContent: {
    flexGrow: 1,
  },
  setupOptionsContainer: {
    width: '100%',
    marginBottom: THEME.spacing.xl,
  },
  getStartedButton: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.large,
    paddingVertical: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: THEME.spacing.sm,
    marginBottom: THEME.spacing.md,
  },
  getStartedButtonText: {
    color: THEME.colors.white,
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
  },
  importButton: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.borderRadius.large,
    paddingVertical: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: THEME.spacing.sm,
    borderWidth: 1,
    borderColor: THEME.colors.primary,
  },
  importButtonText: {
    color: THEME.colors.primary,
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
  },
  devAccountSection: {
    width: '100%',
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.large,
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.xl,
  },
  devAccountTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    textAlign: 'center',
    marginBottom: THEME.spacing.xs,
  },
  devAccountSubtitle: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginBottom: THEME.spacing.md,
  },
  devAccountButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: THEME.spacing.sm,
  },
  devAccountButton: {
    backgroundColor: THEME.colors.primaryLight,
    borderRadius: THEME.borderRadius.medium,
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.lg,
  },
  devAccountButtonText: {
    color: THEME.colors.primary,
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.medium,
  },
  featurePreview: {
    width: '100%',
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.large,
    padding: THEME.spacing.lg,
  },
  featurePreviewTitle: {
    fontSize: THEME.fontSize.base,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },
  featureList: {
    gap: THEME.spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.sm,
  },
  featureText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: THEME.spacing.sm,
  },
  avatar: {
    width: 30,
    height: 30,
  },
  walletName: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
  },
  notificationButton: {
    position: 'relative',
    padding: THEME.spacing.xs,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.error,
  },
  // Account Card
  accountCard: {
    backgroundColor: THEME.colors.white,
    marginHorizontal: THEME.spacing.md,
    borderRadius: THEME.borderRadius.large,
    padding: THEME.spacing.lg,
    ...THEME.shadows.medium,
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  accountLabel: {
    fontSize: THEME.fontSize.base,
    color: THEME.colors.textSecondary,
  },
  currencySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.lightGrey,
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: THEME.spacing.xs,
    borderRadius: THEME.borderRadius.small,
  },
  currencyText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.text,
    marginRight: THEME.spacing.xs,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  balanceAmount: {
    fontSize: THEME.fontSize['4xl'],
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
  },
  growthBadge: {
    backgroundColor: THEME.colors.successBg,
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: THEME.spacing.xs,
    borderRadius: THEME.borderRadius.small,
    marginTop: THEME.spacing.xs,
    alignSelf: 'flex-start',
  },
  growthText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.success,
    fontWeight: THEME.fontWeight.medium,
  },
  stakingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.full,
  },
  stakingButtonText: {
    color: THEME.colors.white,
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.medium,
    marginLeft: THEME.spacing.xs,
  },
  networkBadgeContainer: {
    marginTop: THEME.spacing.md,
    alignItems: 'flex-start',
  },
  // MEV Protection
  mevContainer: {
    marginHorizontal: THEME.spacing.md,
    marginTop: THEME.spacing.md,
  },
  // Action Grid
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: THEME.colors.white,
    marginHorizontal: THEME.spacing.md,
    marginTop: THEME.spacing.md,
    borderRadius: THEME.borderRadius.large,
    padding: THEME.spacing.md,
    ...THEME.shadows.small,
  },
  actionButton: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: THEME.spacing.md,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: THEME.spacing.xs,
  },
  actionIconDisabled: {
    backgroundColor: THEME.colors.lightGrey,
  },
  actionLabel: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.text,
    textAlign: 'center',
  },
  actionLabelDisabled: {
    color: THEME.colors.textMuted,
  },
  // Activity Section
  activitySection: {
    marginHorizontal: THEME.spacing.md,
    marginTop: THEME.spacing.lg,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  activityTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
  },
  viewAllText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.secondary,
    fontWeight: THEME.fontWeight.medium,
  },
  emptyActivityCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.borderRadius.medium,
    padding: THEME.spacing.xl,
    alignItems: 'center',
    ...THEME.shadows.small,
  },
  emptyActivityText: {
    fontSize: THEME.fontSize.base,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.md,
  },
  emptyActivitySubtext: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textMuted,
    marginTop: THEME.spacing.xs,
  },
});
