/**
 * WalletButton Component - Molecule
 * Button to connect/display Web3 wallet status
 */
import React, { useState } from 'react';
import { View, Pressable, Modal, Alert, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, Button } from '../atoms';
import { useWalletStore } from '../../stores/walletStore';
import { shortenAddress, getExplorerAddressUrl, CONTRACT_ADDRESSES } from '../../config/blockchain';
import { requestUSDCFromFaucet } from '../../services/web3Service';
import * as WebBrowser from 'expo-web-browser';

// Web-compatible alert helper
const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export const WalletButton: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [isRequestingFaucet, setIsRequestingFaucet] = useState(false);
  const {
    isConnected,
    isConnecting,
    address,
    ethBalance,
    usdcBalance,
    connect,
    disconnect,
    refreshBalances,
    isWalletAvailable: hasWallet,
    error,
    setError,
  } = useWalletStore();

  const handleConnect = async () => {
    try {
      await connect();
      setModalVisible(false);
    } catch (err: any) {
      showAlert('Connection Failed', err.message || 'Failed to connect wallet');
    }
  };

  const handleDisconnect = () => {
    // On web, use window.confirm for better compatibility
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to disconnect your wallet?');
      if (confirmed) {
        disconnect();
        setModalVisible(false);
      }
    } else {
      Alert.alert(
        'Disconnect Wallet',
        'Are you sure you want to disconnect your wallet?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disconnect',
            style: 'destructive',
            onPress: () => {
              disconnect();
              setModalVisible(false);
            },
          },
        ]
      );
    }
  };

  const handleViewOnExplorer = async () => {
    if (address) {
      const url = getExplorerAddressUrl(address);
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        await WebBrowser.openBrowserAsync(url);
      }
    }
  };

  const handleRefresh = async () => {
    await refreshBalances();
  };

  const handleRequestFaucet = async () => {
    console.log('[WalletButton] Faucet button pressed');
    if (!CONTRACT_ADDRESSES.MOCK_USDC) {
      console.error('[WalletButton] MOCK_USDC address not set:', CONTRACT_ADDRESSES.MOCK_USDC);
      showAlert('Not Available', 'MockUSDC contract not deployed yet. Please deploy contracts first.');
      return;
    }

    setIsRequestingFaucet(true);
    try {
      console.log('[WalletButton] Calling requestUSDCFromFaucet...');
      const txHash = await requestUSDCFromFaucet();
      console.log('[WalletButton] Faucet success, tx:', txHash);
      await refreshBalances();
      console.log('[WalletButton] Balances refreshed');
      showAlert('Success!', 'You received $10,000 mUSDC from the faucet!');
    } catch (err: any) {
      console.error('[WalletButton] Faucet error:', err);
      if (err.message?.includes('cooldown')) {
        showAlert('Cooldown Active', 'You can request from the faucet once per hour.');
      } else if (err.message?.includes('user rejected')) {
        // User cancelled - don't show error alert
        console.log('[WalletButton] User rejected transaction');
      } else {
        showAlert('Faucet Error', err.message || 'Failed to request from faucet');
      }
    } finally {
      setIsRequestingFaucet(false);
    }
  };

  // Connected state - show enhanced wallet pill with balance
  if (isConnected && address) {
    const displayBalance = parseFloat(usdcBalance).toLocaleString(undefined, { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    });
    
    return (
      <>
        <Pressable
          onPress={() => setModalVisible(true)}
          className="flex-row items-center rounded-xl overflow-hidden"
          style={{
            backgroundColor: 'rgba(30, 41, 59, 0.9)',
            borderWidth: 1,
            borderColor: 'rgba(59, 130, 246, 0.3)',
            shadowColor: '#0528F3',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          {/* Balance Section */}
          <View className="flex-row items-center px-3 py-2 border-r border-slate-700">
            <Text variant="caption" className="text-emerald-400 font-bold">
              ${displayBalance}
            </Text>
          </View>
          
          {/* Address Section */}
          <View className="flex-row items-center px-3 py-2">
            <View className="w-2 h-2 rounded-full bg-emerald-400 mr-2" style={{
              shadowColor: '#10B981',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 4,
            }} />
            <Text variant="caption" className="text-slate-300 font-medium">
              {shortenAddress(address)}
            </Text>
            <Ionicons name="chevron-down" size={12} color="#64748B" style={{ marginLeft: 4 }} />
          </View>
        </Pressable>

        {/* Wallet Details Modal */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <Pressable
            className="flex-1 bg-black/50 justify-center items-center p-4"
            onPress={() => setModalVisible(false)}
          >
            <Pressable
              className="bg-surface-primary rounded-2xl p-6 w-full max-w-sm"
              onPress={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <View className="flex-row justify-between items-center mb-6">
                <Text variant="h4">Wallet</Text>
                <Pressable onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#94A3B8" />
                </Pressable>
              </View>

              {/* Address */}
              <View className="bg-background-primary rounded-xl p-4 mb-4">
                <Text variant="caption" className="text-text-secondary mb-1">
                  Connected Address
                </Text>
                <Text variant="body" className="text-text-primary font-mono">
                  {shortenAddress(address)}
                </Text>
              </View>

              {/* Balances */}
              <View className="bg-background-primary rounded-xl p-4 mb-6">
                <View className="flex-row justify-between items-center mb-3">
                  <View className="flex-row items-center">
                    <View className="w-8 h-8 rounded-full bg-blue-500 items-center justify-center mr-3">
                      <Text variant="caption" className="text-white font-bold">$</Text>
                    </View>
                    <View>
                      <Text variant="body" className="text-text-primary">mUSDC</Text>
                      <Text variant="caption" className="text-text-secondary">Mock USDC</Text>
                    </View>
                  </View>
                  <Text variant="body" className="text-text-primary">
                    ${parseFloat(usdcBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>

                <View className="flex-row justify-between items-center">
                  <View className="flex-row items-center">
                    <View className="w-8 h-8 rounded-full bg-gray-500 items-center justify-center mr-3">
                      <Ionicons name="diamond-outline" size={16} color="white" />
                    </View>
                    <View>
                      <Text variant="body" className="text-text-primary">ETH</Text>
                      <Text variant="caption" className="text-text-secondary">Base Sepolia</Text>
                    </View>
                  </View>
                  <Text variant="body" className="text-text-primary">
                    {parseFloat(ethBalance).toFixed(4)}
                  </Text>
                </View>
              </View>

              {/* Actions */}
              <View className="space-y-3">
                {/* Faucet Button - Get test USDC */}
                <Button
                  variant="primary"
                  label={isRequestingFaucet ? 'Requesting...' : 'Get Test USDC (Faucet)'}
                  leftIcon={isRequestingFaucet ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="water" size={18} color="#FFFFFF" />}
                  onPress={handleRequestFaucet}
                  disabled={isRequestingFaucet}
                  loading={isRequestingFaucet}
                />

                <Button
                  variant="outline"
                  label="Refresh Balances"
                  leftIcon={<Ionicons name="refresh" size={18} color="#0528F3" />}
                  onPress={handleRefresh}
                />

                <Button
                  variant="outline"
                  label="View on Explorer"
                  leftIcon={<Ionicons name="open-outline" size={18} color="#0528F3" />}
                  onPress={handleViewOnExplorer}
                />

                <Button
                  variant="danger"
                  label="Disconnect"
                  leftIcon={<Ionicons name="log-out-outline" size={18} color="#FFFFFF" />}
                  onPress={handleDisconnect}
                />
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </>
    );
  }

  // Disconnected state - show enhanced connect button
  return (
    <>
      <Pressable
        onPress={() => setModalVisible(true)}
        className="flex-row items-center rounded-xl px-4 py-2.5"
        disabled={isConnecting}
        style={{
          backgroundColor: '#F5CB3F',
          shadowColor: '#F5CB3F',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 6,
        }}
      >
        {isConnecting ? (
          <ActivityIndicator size="small" color="#0D2758" />
        ) : (
          <>
            <View style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              backgroundColor: 'rgba(13, 39, 88, 0.2)',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 8,
            }}>
              <Ionicons name="wallet" size={16} color="#0D2758" />
            </View>
            <Text variant="body" className="font-bold" style={{ color: '#0D2758' }}>
              Connect
            </Text>
          </>
        )}
      </Pressable>

      {/* Connect Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center p-4"
          onPress={() => setModalVisible(false)}
        >
          <Pressable
            className="bg-surface-primary rounded-2xl p-6 w-full max-w-sm"
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View className="flex-row justify-between items-center mb-6">
              <Text variant="h4">Connect Wallet</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </Pressable>
            </View>

            {/* Info */}
            <View className="bg-background-primary rounded-xl p-4 mb-6">
              <View className="flex-row items-start">
                <Ionicons name="information-circle" size={20} color="#0528F3" />
                <Text variant="caption" className="text-text-secondary ml-2 flex-1">
                  Connect your wallet to trade athlete tokens on Base Sepolia testnet.
                </Text>
              </View>
            </View>

            {/* Error */}
            {error && (
              <View className="bg-red-500/10 rounded-xl p-4 mb-4">
                <Text variant="caption" className="text-red-400">
                  {error}
                </Text>
              </View>
            )}

            {/* Connect Options */}
            {Platform.OS === 'web' && hasWallet ? (
              <Button
                variant="primary"
                label={isConnecting ? 'Connecting...' : 'Connect MetaMask'}
                leftIcon={isConnecting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="wallet" size={20} color="#FFFFFF" />}
                onPress={handleConnect}
                disabled={isConnecting}
                loading={isConnecting}
              />
            ) : Platform.OS === 'web' ? (
              <View className="items-center">
                <Text variant="body" className="text-text-secondary text-center mb-4">
                  No wallet detected
                </Text>
                <Button
                  variant="outline"
                  label="Install MetaMask"
                  leftIcon={<Ionicons name="download-outline" size={18} color="#0528F3" />}
                  onPress={() => window.open('https://metamask.io/download/', '_blank')}
                />
              </View>
            ) : (
              <View className="items-center">
                <Text variant="body" className="text-text-secondary text-center">
                  Wallet connection available on web version
                </Text>
              </View>
            )}

            {/* Network Info */}
            <View className="flex-row items-center justify-center mt-6 opacity-60">
              <View className="w-3 h-3 rounded-full bg-blue-500 mr-2" />
              <Text variant="caption" className="text-text-secondary">
                Base Sepolia Testnet
              </Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};
