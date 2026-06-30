/**
 * StoreScreen.tsx
 *
 * Cosmetic item store. Displays all purchasable cosmetics in a filterable grid
 * of CosmeticCards. Purchase flow calls EconomyService.spendCoins.
 *
 * Categories: ring_skin, water_color, victory_animation, button_skin
 *
 * Requirements: 35.1
 * Task: 8.4.1
 */

import React, { useState, useCallback } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Alert,
} from 'react-native';
import { useEconomyStore } from '../store/slices/economySlice';
import { useCosmeticsStore } from '../store/slices/cosmeticsSlice';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CosmeticCategory = 'all' | 'ring_skin' | 'water_color' | 'victory_animation' | 'button_skin';

interface CosmeticItem {
  id: string;
  name: string;
  category: CosmeticCategory;
  tier: 'common' | 'rare' | 'epic' | 'legendary';
  price: number;
  icon: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Mock catalog (replace with Firestore/Remote Config data in production)
// ---------------------------------------------------------------------------

const CATALOG: CosmeticItem[] = [
  { id: 'ring_gold', name: 'Golden Ring', category: 'ring_skin', tier: 'rare', price: 500, icon: '💛', description: 'Shimmering gold ring skin' },
  { id: 'ring_neon', name: 'Neon Ring', category: 'ring_skin', tier: 'epic', price: 1200, icon: '💚', description: 'Electric neon glow' },
  { id: 'ring_crystal', name: 'Crystal Ring', category: 'ring_skin', tier: 'legendary', price: 3000, icon: '💎', description: 'Ice-clear crystal finish' },
  { id: 'ring_rose', name: 'Rose Ring', category: 'ring_skin', tier: 'common', price: 150, icon: '🌸', description: 'Soft rose petal texture' },
  { id: 'water_ocean', name: 'Deep Ocean', category: 'water_color', tier: 'common', price: 200, icon: '🌊', description: 'Dark teal ocean water' },
  { id: 'water_lava', name: 'Magma', category: 'water_color', tier: 'epic', price: 1500, icon: '🔥', description: 'Glowing lava orange' },
  { id: 'water_arctic', name: 'Arctic', category: 'water_color', tier: 'rare', price: 600, icon: '🧊', description: 'Icy blue arctic water' },
  { id: 'victory_stars', name: 'Star Burst', category: 'victory_animation', tier: 'rare', price: 800, icon: '⭐', description: 'Stars explode on victory' },
  { id: 'victory_firework', name: 'Fireworks', category: 'victory_animation', tier: 'epic', price: 2000, icon: '🎆', description: 'Fireworks display on win' },
  { id: 'btn_ocean', name: 'Ocean Button', category: 'button_skin', tier: 'common', price: 100, icon: '🐚', description: 'Shell-themed button' },
  { id: 'btn_fire', name: 'Fire Button', category: 'button_skin', tier: 'rare', price: 700, icon: '🔥', description: 'Fiery button skin' },
];

const TIER_COLORS: Record<string, string> = {
  common: '#90A4AE',
  rare: '#42A5F5',
  epic: '#AB47BC',
  legendary: '#FFD740',
};

const CATEGORIES: { id: CosmeticCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'ring_skin', label: 'Rings' },
  { id: 'water_color', label: 'Water' },
  { id: 'victory_animation', label: 'Victory' },
  { id: 'button_skin', label: 'Buttons' },
];

// ---------------------------------------------------------------------------
// CosmeticCard component (Task 8.4.1)
// ---------------------------------------------------------------------------

interface CosmeticCardProps {
  item: CosmeticItem;
  isOwned: boolean;
  isEquipped: boolean;
  onPress: () => void;
}

function CosmeticCard({ item, isOwned, isEquipped, onPress }: CosmeticCardProps): React.JSX.Element {
  const tierColor = TIER_COLORS[item.tier];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }: { pressed: boolean }) => [
        styles.card,
        isEquipped && styles.cardEquipped,
        pressed ? styles.cardPressed : undefined,
      ]}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}. ${item.description}. ${isOwned ? (isEquipped ? 'Equipped' : 'Owned') : `${item.price} coins`}`}
    >
      {/* Tier badge */}
      <View style={[styles.tierBadge, { backgroundColor: `${tierColor}22`, borderColor: tierColor }]}>
        <Text style={[styles.tierText, { color: tierColor }]}>{item.tier.toUpperCase()}</Text>
      </View>

      {/* Icon */}
      <Text style={styles.cardIcon} accessible={false}>{item.icon}</Text>

      {/* Name */}
      <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.cardDescription} numberOfLines={2}>{item.description}</Text>

      {/* Price / Owned badge */}
      {isOwned ? (
        <View style={[styles.ownedBadge, isEquipped && styles.equippedBadge]}>
          <Text style={[styles.ownedText, isEquipped && styles.equippedText]}>
            {isEquipped ? '✓ Equipped' : 'Owned'}
          </Text>
        </View>
      ) : (
        <View style={styles.priceBadge}>
          <Text style={styles.priceText}>💰 {item.price}</Text>
        </View>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// StoreScreen
// ---------------------------------------------------------------------------

/**
 * StoreScreen — cosmetic item shop with filterable grid.
 *
 * Requirements: 35.1
 * Task: 8.4.1
 */
// eslint-disable-next-line max-lines-per-function
export default function StoreScreen(): React.JSX.Element {
  const [selectedCategory, setSelectedCategory] = useState<CosmeticCategory>('all');
  const coinBalance = useEconomyStore((state) => state.coinBalance);
  const ownedIds = useCosmeticsStore((state) => state.ownedCosmeticIds);
  const equippedIds = useCosmeticsStore((state) => state.equippedCosmeticIds);

  const filteredItems = selectedCategory === 'all'
    ? CATALOG
    : CATALOG.filter((item) => item.category === selectedCategory);

  const handleCardPress = useCallback((item: CosmeticItem): void => {
    const isOwned = ownedIds.includes(item.id);
    if (isOwned) {
      // Toggle equip
      const category = item.category;
      const currentEquipped = equippedIds[category];
      if (currentEquipped === item.id) {
        useCosmeticsStore.getState().unequipCosmetic(category);
      } else {
        useCosmeticsStore.getState().equipCosmetic(category, item.id);
      }
      return;
    }

    // Purchase flow
    if (coinBalance < item.price) {
      Alert.alert('Not Enough Coins', `You need ${item.price} coins to buy ${item.name}.`);
      return;
    }

    Alert.alert(
      `Buy ${item.name}?`,
      `This will cost ${item.price} coins.\nBalance after: ${coinBalance - item.price}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy',
          onPress: (): void => {
            useEconomyStore.getState().debitCoins(item.price, 'cosmetic_purchase');
            useCosmeticsStore.getState().addCosmetic(item.id);
          },
        },
      ],
    );
  }, [coinBalance, ownedIds, equippedIds]);

  const renderItem = useCallback(({ item }: { item: CosmeticItem }): React.JSX.Element => {
    const isOwned = ownedIds.includes(item.id);
    const isEquipped = equippedIds[item.category] === item.id;
    return (
      <CosmeticCard
        item={item}
        isOwned={isOwned}
        isEquipped={isEquipped}
        onPress={(): void => handleCardPress(item)}
      />
    );
  }, [ownedIds, equippedIds, handleCardPress]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle} accessibilityRole="header">Store</Text>
        <View style={styles.coinBadge}>
          <Text style={styles.coinText}>💰 {coinBalance}</Text>
        </View>
      </View>

      {/* Category filter */}
      <View style={styles.categoryBar}>
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat.id}
            onPress={(): void => setSelectedCategory(cat.id)}
            style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryChipActive]}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`${cat.label} category`}
            accessibilityState={{ selected: selectedCategory === cat.id }}
          >
            <Text style={[styles.categoryText, selectedCategory === cat.id && styles.categoryTextActive]}>
              {cat.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Grid */}
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item): string => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070f1e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  coinBadge: {
    backgroundColor: 'rgba(255,215,64,0.15)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,215,64,0.35)',
  },
  coinText: {
    color: '#FFD740',
    fontSize: 15,
    fontWeight: '700',
  },
  categoryBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    paddingVertical: 12,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  categoryChipActive: {
    backgroundColor: 'rgba(79,195,247,0.2)',
    borderColor: '#4FC3F7',
  },
  categoryText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: '#4FC3F7',
  },
  grid: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  row: {
    gap: 12,
    marginBottom: 12,
  },
  card: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 6,
    alignItems: 'center',
    minHeight: 180,
  },
  cardEquipped: {
    borderColor: '#4FC3F7',
    backgroundColor: 'rgba(79,195,247,0.1)',
  },
  cardPressed: {
    opacity: 0.75,
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  tierText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardIcon: {
    fontSize: 36,
    marginVertical: 4,
  },
  cardName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  cardDescription: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
  ownedBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  equippedBadge: {
    backgroundColor: 'rgba(79,195,247,0.2)',
  },
  ownedText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '600',
  },
  equippedText: {
    color: '#4FC3F7',
  },
  priceBadge: {
    backgroundColor: 'rgba(255,215,64,0.12)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,215,64,0.25)',
  },
  priceText: {
    color: '#FFD740',
    fontSize: 12,
    fontWeight: '700',
  },
});
