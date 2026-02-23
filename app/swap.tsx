/**
 * Swap Screen - Real Token Trading
 * Executes actual buy/sell transactions ON-CHAIN via smart contracts
 * Web3 Only Mode - Uses MetaMask wallet on Base Sepolia
 */
import React, { useState, useEffect, useMemo } from 'react';
import { View, Pressable, Image, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Card } from '../src/components';
import { useAthletesStore, useWalletStore } from '../src/stores';
import { tradingApi } from '../src/services/tradingApiService';
import {
  approveUSDC,
  getUSDCAllowance,
  buyAthleteTokens,
  sellAthleteTokens,
  getAthleteTokenBalance,
} from '../src/services/web3Service';

// Web-compatible alert helper
const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

// Fee structure (matches smart contract - 1%)
const TRADING_FEE_PERCENT = 1.0;

// Quote interface for local calculation
interface LocalQuote {
  playerId: string;
  playerName: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  pricePerToken: number;
  subtotal: number;
  fee: number;
  total: number;
}

export default function SwapScreen() {
  const { playerId, side } = useLocalSearchParams<{ playerId: string; side: 'buy' | 'sell' }>();
  const router = useRouter();
  const isBuying = side !== 'sell';

  const { selectedAthlete, fetchAthleteById, isLoading } = useAthletesStore();
  
  // Web3 wallet state - this is the ONLY mode
  const { isConnected, address, usdcBalance, refreshBalances, checkConnection } = useWalletStore();

  const [inputAmount, setInputAmount] = useState('100');
  const [sellQuantity, setSellQuantity] = useState('1');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<'idle' | 'approving' | 'buying' | 'selling' | 'syncing'>('idle');
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [currentHolding, setCurrentHolding] = useState<{ quantity: number; averagePrice: number } | null>(null);
  const [onChainBalance, setOnChainBalance] = useState<number>(0);

  // Check wallet connection on mount
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Get tokenId from athlete data (backend returns this)
  const tokenId = useMemo(() => {
    if (!selectedAthlete) return null;
    // The backend returns tokenId in the player data
    const extendedAthlete = selectedAthlete as any;
    console.log('[Swap] Selected athlete data:', { 
      id: extendedAthlete.id,
      name: extendedAthlete.name,
      tokenId: extendedAthlete.tokenId,
      onChainTokenId: extendedAthlete.onChainTokenId 
    });
    const resolvedTokenId = extendedAthlete.tokenId || extendedAthlete.onChainTokenId || null;
    console.log('[Swap] Resolved tokenId:', resolvedTokenId);
    return resolvedTokenId;
  }, [selectedAthlete]);

  useEffect(() => {
    if (playerId) {
      fetchAthleteById(playerId);
    }
  }, [playerId, fetchAthleteById]);

  // Fetch on-chain token balance when we have tokenId and address
  useEffect(() => {
    const fetchOnChainBalance = async () => {
      if (address && tokenId) {
        try {
          const balance = await getAthleteTokenBalance(address, tokenId);
          setOnChainBalance(parseFloat(balance));
          console.log(`[Swap] On-chain balance for token ${tokenId}: ${balance}`);
        } catch (error) {
          console.error('[Swap] Error fetching on-chain balance:', error);
        }
      }
    };
    fetchOnChainBalance();
  }, [address, tokenId]);

  // Also fetch from backend for comparison (will phase out)
  useEffect(() => {
    if (address && playerId) {
      tradingApi.getHolding(address, playerId).then(res => {
        if (res.holding) {
          setCurrentHolding({ quantity: res.holding.quantity, averagePrice: res.holding.averagePrice });
        }
      }).catch(() => {});
    }
  }, [playerId, address]);

  // Calculate swap quote locally (matches backend logic)
  const quote: LocalQuote | null = useMemo(() => {
    if (!selectedAthlete) return null;

    const pricePerToken = selectedAthlete.currentPrice;

    if (isBuying) {
      // Calculate how many tokens user can buy with their USDC
      const amount = parseFloat(inputAmount) || 0;
      const quantity = amount / pricePerToken;
      const subtotal = pricePerToken * quantity;
      const fee = subtotal * (TRADING_FEE_PERCENT / 100);
      const total = subtotal + fee;

      return {
        playerId: selectedAthlete.id,
        playerName: selectedAthlete.name,
        side: 'BUY' as const,
        quantity,
        pricePerToken,
        subtotal,
        fee,
        total,
      };
    } else {
      // Sell mode
      const qty = parseFloat(sellQuantity) || 0;
      const subtotal = qty * pricePerToken;
      const fee = subtotal * (TRADING_FEE_PERCENT / 100);
      const total = subtotal - fee; // Net proceeds

      return {
        playerId: selectedAthlete.id,
        playerName: selectedAthlete.name,
        side: 'SELL' as const,
        quantity: qty,
        pricePerToken,
        subtotal,
        fee,
        total,
      };
    }
  }, [inputAmount, sellQuantity, selectedAthlete, isBuying]);

  const handleSwap = async () => {
    if (!selectedAthlete || !isConnected || !address) {
      showAlert('Error', 'Please connect your wallet first');
      return;
    }

    if (!tokenId) {
      showAlert('Error', 'This player is not available for on-chain trading yet. Token ID not found.');
      return;
    }

    const walletBalance = parseFloat(usdcBalance || '0');

    setIsProcessing(true);
    setProcessingStep('idle');

    try {
      if (isBuying) {
        const amount = parseFloat(inputAmount) || 0;
        // For on-chain, we buy in whole token amounts
        const quantity = Math.floor(quote?.quantity || 0);

        if (amount <= 0 || quantity <= 0) {
          showAlert('Invalid Amount', 'Please enter a valid amount (minimum 1 token)');
          setIsProcessing(false);
          return;
        }

        const totalCost = quote?.total || 0;
        if (totalCost > walletBalance) {
          showAlert('Insufficient Balance', `You need $${totalCost.toFixed(2)} but only have $${walletBalance.toFixed(2)} mUSDC`);
          setIsProcessing(false);
          return;
        }

        // Step 1: Check and request USDC approval (one-time large approval)
        setProcessingStep('approving');
        console.log(`[Swap] Checking USDC allowance for ${address}...`);
        
        const currentAllowance = await getUSDCAllowance(address);
        console.log(`[Swap] Current allowance: $${currentAllowance}`);
        
        if (parseFloat(currentAllowance) < totalCost) {
          // Approve a large amount to avoid repeated approval popups
          // This is standard practice in DeFi apps for better UX
          const LARGE_APPROVAL = '1000000'; // $1M approval
          console.log(`[Swap] Requesting one-time approval for $${LARGE_APPROVAL}...`);
          await approveUSDC(LARGE_APPROVAL);
          console.log('[Swap] USDC approved');
        }

        // Step 2: Execute on-chain buy
        setProcessingStep('buying');
        console.log(`[Swap] Buying ${quantity} tokens of tokenId ${tokenId}...`);
        
        const result = await buyAthleteTokens(tokenId, quantity);
        console.log(`[Swap] Buy successful! TxHash: ${result.txHash}`);

        // Step 3: Sync with backend (optional, for transaction history)
        setProcessingStep('syncing');
        try {
          await tradingApi.buy(address, selectedAthlete.id, quantity, result.txHash);
        } catch (syncError) {
          console.warn('[Swap] Backend sync failed (non-critical):', syncError);
          // Don't fail the transaction if sync fails - on-chain is source of truth
        }

        // Refresh balances
        await refreshBalances();
        
        // Update local holding state
        const newBalance = await getAthleteTokenBalance(address, tokenId);
        setOnChainBalance(parseFloat(newBalance));

        setIsProcessing(false);
        setProcessingStep('idle');
        setIsSuccess(true);
        setSuccessMessage(`+${quantity} tokens`);

        // Show success state then navigate back
        // Use longer delay to allow MetaMask message channel to close properly
        setTimeout(() => {
          requestAnimationFrame(() => {
            router.back();
          });
        }, 2500);

      } else {
        // SELL
        const qty = Math.floor(parseFloat(sellQuantity) || 0);

        if (qty <= 0) {
          showAlert('Invalid Quantity', 'Please enter a valid quantity (minimum 1 token)');
          setIsProcessing(false);
          return;
        }

        // Check on-chain balance (source of truth)
        if (qty > onChainBalance) {
          showAlert('Insufficient Tokens', `You only have ${onChainBalance} tokens on-chain`);
          setIsProcessing(false);
          return;
        }

        // Execute on-chain sell
        setProcessingStep('selling');
        console.log(`[Swap] Selling ${qty} tokens of tokenId ${tokenId}...`);
        
        const result = await sellAthleteTokens(tokenId, qty);
        console.log(`[Swap] Sell successful! TxHash: ${result.txHash}, Received: $${result.totalReceived}`);

        // Sync with backend (optional)
        setProcessingStep('syncing');
        try {
          await tradingApi.sell(address, selectedAthlete.id, qty, result.txHash);
        } catch (syncError) {
          console.warn('[Swap] Backend sync failed (non-critical):', syncError);
        }

        // Refresh balances
        await refreshBalances();
        
        // Update local holding state
        const newBalance = await getAthleteTokenBalance(address, tokenId);
        setOnChainBalance(parseFloat(newBalance));

        setIsProcessing(false);
        setProcessingStep('idle');
        setIsSuccess(true);
        setSuccessMessage(`+$${result.totalReceived} mUSDC`);

        // Show success state then navigate back
        // Use longer delay to allow MetaMask message channel to close properly
        setTimeout(() => {
          requestAnimationFrame(() => {
            router.back();
          });
        }, 2500);
      }
    } catch (error: any) {
      console.error('[Swap] Transaction error:', error);
      
      // Parse error message
      let errorMessage = 'Transaction failed';
      if (error?.reason) {
        errorMessage = error.reason;
      } else if (error?.error?.data?.message) {
        errorMessage = error.error.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      // Don't show alert for user-rejected transactions
      if (!errorMessage.includes('rejected') && !errorMessage.includes('denied') && !errorMessage.includes('user rejected')) {
        showAlert('Transaction Failed', errorMessage);
      }
      setIsProcessing(false);
      setProcessingStep('idle');
    }
  };

  const handleAmountChange = (text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    setInputAmount(cleaned);
  };

  const handleQuantityChange = (text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    setSellQuantity(cleaned);
  };

  if (isLoading || !selectedAthlete) {
    return (
      <SafeAreaView className="flex-1 bg-background-primary items-center justify-center">
        <ActivityIndicator size="large" color="#0528F3" />
        <Text variant="body" color="secondary" className="mt-4">Loading...</Text>
      </SafeAreaView>
    );
  }

  const player = selectedAthlete;
  const presetAmounts = isBuying ? [50, 100, 250, 500] : [0.25, 0.5, 1, 'MAX'];

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="px-4 py-3 flex-row items-center justify-between border-b border-border-light">
          <View className="flex-row items-center">
            <Pressable onPress={() => router.back()} className="mr-3">
              <Ionicons name="close" size={24} color="#F8FAFC" />
            </Pressable>
            <Text variant="h4">{isBuying ? 'Buy Tokens' : 'Sell Tokens'}</Text>
          </View>
          {/* Wallet Balance */}
          <View className="flex-row items-center bg-surface-200 px-3 py-1.5 rounded-lg">
            <Ionicons name="wallet-outline" size={16} color="#0528F3" />
            <Text variant="caption" className="ml-1 font-semibold">
              ${parseFloat(usdcBalance || '0').toFixed(2)}
            </Text>
            {isConnected && (
              <View className="bg-green-500/20 px-1.5 py-0.5 rounded ml-1">
                <Text variant="caption" className="text-green-500 text-xs">mUSDC</Text>
              </View>
            )}
          </View>
        </View>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Player Card */}
          <Card variant="flat" padding="md" className="mb-4">
            <View className="flex-row items-center">
              <Image
                source={{ uri: player.imageUrl }}
                className="w-12 h-12 rounded-full bg-surface-200"
              />
              <View className="ml-3 flex-1">
                <Text variant="h4">{player.name}</Text>
                <Text variant="caption" color="secondary">{player.team}</Text>
              </View>
              <View className="items-end">
                <Text variant="body" className="font-semibold">${player.currentPrice.toFixed(2)}</Text>
                {currentHolding && (
                  <Text variant="caption" color="secondary">
                    Owned: {currentHolding.quantity.toFixed(2)}
                  </Text>
                )}
              </View>
            </View>
          </Card>

          {/* Input Section */}
          <View className="mb-4">
            <Text variant="caption" color="secondary" className="mb-2">
              {isBuying ? 'You Pay' : 'Tokens to Sell'}
            </Text>
            <Card variant="elevated" padding="md">
              <View className="flex-row items-center">
                <View className="flex-1">
                  <TextInput
                    value={isBuying ? inputAmount : sellQuantity}
                    onChangeText={isBuying ? handleAmountChange : handleQuantityChange}
                    keyboardType="decimal-pad"
                    className="text-3xl font-bold text-text-primary"
                    placeholderTextColor="#64748B"
                    placeholder="0"
                  />
                </View>
                <View className="flex-row items-center bg-surface-200 px-3 py-2 rounded-lg">
                  {isBuying ? (
                    <>
                      <View className="w-6 h-6 bg-blue-500 rounded-full items-center justify-center mr-2">
                        <Text variant="caption" className="text-white font-bold">$</Text>
                      </View>
                      <Text variant="body" className="font-semibold">USDC</Text>
                    </>
                  ) : (
                    <>
                      <Image
                        source={{ uri: player.imageUrl }}
                        className="w-6 h-6 rounded-full mr-2"
                      />
                      <Text variant="body" className="font-semibold">Tokens</Text>
                    </>
                  )}
                </View>
              </View>

              {/* Preset Amounts */}
              <View className="flex-row gap-2 mt-3 pt-3 border-t border-border-light">
                {presetAmounts.map((amount) => (
                  <Pressable
                    key={String(amount)}
                    onPress={() => {
                      if (isBuying) {
                        setInputAmount(String(amount));
                      } else {
                        if (amount === 'MAX') {
                          setSellQuantity(currentHolding?.quantity.toString() || '0');
                        } else {
                          setSellQuantity(String(amount));
                        }
                      }
                    }}
                    className={`flex-1 py-2 rounded-lg items-center ${(isBuying ? inputAmount : sellQuantity) === String(amount) ? 'bg-primary-500' : 'bg-surface-200'
                      }`}
                  >
                    <Text
                      variant="caption"
                      className={(isBuying ? inputAmount : sellQuantity) === String(amount) ? 'text-white font-semibold' : 'text-text-secondary'}
                    >
                      {isBuying ? `$${amount}` : amount}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Card>
          </View>

          {/* Arrow */}
          <View className="items-center my-2">
            <View className="w-10 h-10 bg-surface-200 rounded-full items-center justify-center">
              <Ionicons name="arrow-down" size={20} color="#0528F3" />
            </View>
          </View>

          {/* You Receive Section */}
          <View className="mb-4">
            <Text variant="caption" color="secondary" className="mb-2">
              {isBuying ? 'You Receive' : 'You Get'}
            </Text>
            <Card variant="elevated" padding="md">
              <View className="flex-row items-center">
                <View className="flex-1">
                  <Text variant="h2">
                    {isBuying
                      ? (quote?.quantity.toFixed(4) || '0.0000')
                      : `$${(quote?.total.toFixed(2) || '0.00')}`
                    }
                  </Text>
                  <Text variant="caption" color="secondary">
                    @ ${quote?.pricePerToken.toFixed(2) || '0.00'} per token
                  </Text>
                </View>
                <View className="flex-row items-center bg-surface-200 px-3 py-2 rounded-lg">
                  {isBuying ? (
                    <>
                      <Image
                        source={{ uri: player.imageUrl }}
                        className="w-6 h-6 rounded-full mr-2"
                      />
                      <Text variant="body" className="font-semibold" numberOfLines={1}>
                        {player.name.split(' ')[1] || player.name}
                      </Text>
                    </>
                  ) : (
                    <>
                      <View className="w-6 h-6 bg-blue-500 rounded-full items-center justify-center mr-2">
                        <Text variant="caption" className="text-white font-bold">$</Text>
                      </View>
                      <Text variant="body" className="font-semibold">USDC</Text>
                    </>
                  )}
                </View>
              </View>
            </Card>
          </View>

          {/* Fee Breakdown - Crucial for Trust */}
          <Card variant="outlined" padding="md" className="mb-4">
            <Text variant="body" className="font-semibold mb-3">Fee Breakdown</Text>

            {isBuying ? (
              <>
                <FeeRow
                  label="Subtotal"
                  value={quote?.subtotal || 0}
                  percent={99}
                  description="Token value"
                  color="#0528F3"
                />
                <FeeRow
                  label="Trading Fee"
                  value={quote?.fee || 0}
                  percent={1}
                  description="Platform fee (1%)"
                  color="#64748B"
                />
                <FeeRow
                  label="Total Cost"
                  value={quote?.total || 0}
                  percent={100}
                  description="You pay"
                  color="#10B981"
                  isLast
                />
              </>
            ) : (
              <>
                <FeeRow
                  label="Gross Proceeds"
                  value={quote?.subtotal || 0}
                  percent={100}
                  description="Token value at market price"
                  color="#0528F3"
                />
                <FeeRow
                  label="Trading Fee"
                  value={quote?.fee || 0}
                  percent={1}
                  description="Deducted from proceeds (1%)"
                  color="#64748B"
                />
                <FeeRow
                  label="Net Proceeds"
                  value={quote?.total || 0}
                  percent={99}
                  description="You receive"
                  color="#10B981"
                  isLast
                />
              </>
            )}
          </Card>

          {/* Swap Button */}
          <Pressable
            onPress={handleSwap}
            disabled={isProcessing || isSuccess || !quote || quote.quantity <= 0}
            className={`py-4 rounded-xl items-center ${isSuccess
                ? 'bg-trading-bullish'
                : isProcessing || !quote || quote.quantity <= 0
                  ? 'bg-surface-300'
                  : isBuying
                    ? 'bg-trading-bullish'
                    : 'bg-trading-bearish'
              }`}
          >
            {isSuccess ? (
              <View className="flex-row items-center">
                <View className="w-6 h-6 bg-white rounded-full items-center justify-center mr-2">
                  <Ionicons name="checkmark" size={18} color="#10B981" />
                </View>
                <Text variant="h4" className="text-white">Success! {successMessage}</Text>
              </View>
            ) : isProcessing ? (
              <View className="flex-row items-center">
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text variant="h4" className="text-white ml-2">
                  {processingStep === 'approving' ? 'Approving USDC...' :
                   processingStep === 'buying' ? 'Buying Tokens...' :
                   processingStep === 'selling' ? 'Selling Tokens...' :
                   processingStep === 'syncing' ? 'Syncing...' :
                   'Processing...'}
                </Text>
              </View>
            ) : (
              <Text variant="h4" className="text-white">
                {isBuying
                  ? `Buy ${quote?.quantity.toFixed(4) || '0'} Tokens`
                  : `Sell for $${quote?.total.toFixed(2) || '0.00'}`
                }
              </Text>
            )}
          </Pressable>

          <Text variant="caption" color="tertiary" className="text-center mt-3">
            Quote expires in 30 seconds
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Fee Row Component
interface FeeRowProps {
  label: string;
  value: number;
  percent: number;
  description: string;
  color: string;
  isLast?: boolean;
}

const FeeRow: React.FC<FeeRowProps> = ({ label, value, percent, description, color, isLast }) => (
  <View className={`flex-row items-center py-2 ${!isLast ? 'border-b border-border-light' : ''}`}>
    <View className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: color }} />
    <View className="flex-1">
      <Text variant="body">{label}</Text>
      {description && (
        <Text variant="caption" color="tertiary">{description}</Text>
      )}
    </View>
    <View className="items-end">
      <Text variant="body" className="font-semibold">${value.toFixed(2)}</Text>
      <Text variant="caption" color="secondary">{percent}%</Text>
    </View>
  </View>
);
