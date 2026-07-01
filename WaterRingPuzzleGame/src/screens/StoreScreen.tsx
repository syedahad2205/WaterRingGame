/**
 * StoreScreen.tsx
 *
 * Cosmetic item store. Displays all purchasable cosmetics in a filterable grid
 * of CosmeticCards. Purchase flow calls EconomyService.spendCoins.
 *
 * Categories: ring_skin, water_style, peg_skin, particle_trail, victory_animation, button_skin
 *
 * Requirements: 35.1
 * Task: 8.4.1
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useEconomyStore } from '../store/slices/economySlice';
import { useCosmeticsStore } from '../store/slices/cosmeticsSlice';
import { DS } from '../constants/designSystem';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassButton } from '../components/ui/GlassButton';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/icons/GameIcons';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { triggerHaptic } from '../constants/hapticPatterns';
import { audioEngine } from '../features/audio/AudioEngine';
import {
  COSMETIC_CATALOG,
  getStoreItems,
  getCosmeticsByCategory,
  type CosmeticDefinition,
  type CosmeticCategory as CatalogCategory,
  type CosmeticRarity,
} from '../constants/cosmeticCatalog';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StoreCategory = 'all' | CatalogCategory;

interface CosmeticItem {
  id: string;
  name: string;
  category: StoreCategory;
  tier: CosmeticRarity;
  price: number;
  description: string;
  previewColors: { primary: string; secondary: string };
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

/**
 * Cosmetic item catalog — sourced from comprehensive cosmeticCatalog.ts.
 * Maps CosmeticDefinition to the local CosmeticItem shape for rendering.
 */
const STORE_ITEMS: CosmeticItem[] = getStoreItems().map((def) => ({
  id: def.id,
  name: def.name,
  category: def.category as StoreCategory,
  tier: def.rarity,
  price: def.coinCost,
  description: def.description,
  previewColors: def.previewColors,
}));

const TIER_COLORS: Record<string, string> = {
  common: DS.colors.text.secondary,
  rare: DS.colors.primary,
  epic: DS.colors.secondary,
  legendary: DS.colors.accent,
  mythic: '#FF4500',
};

const CATEGORIES: { id: StoreCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'ring_skin', label: 'Rings' },
  { id: 'water_style', label: 'Water' },
  { id: 'peg_skin', label: 'Pegs' },
  { id: 'particle_trail', label: 'Trails' },
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

const CosmeticCard = React.memo(function CosmeticCard({ item, isOwned, isEquipped, onPress }: CosmeticCardProps): React.JSX.Element {
  const tierColor = TIER_COLORS[item.tier] ?? DS.colors.text.secondary;
  const glowColor =
    item.tier === 'legendary' || item.tier === 'mythic'
      ? DS.colors.accent
      : item.tier === 'epic'
        ? DS.colors.secondary
        : undefined;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }: { pressed: boolean }) => [
        styles.cardPressable,
        pressed ? styles.cardPressed : undefined,
      ]}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}. ${item.description}. ${isOwned ? (isEquipped ? 'Equipped' : 'Owned') : `${item.price} coins`}`}
    >
      <GlassCard
        variant="medium"
        glow={glowColor}
        noAnimation
        style={[styles.card, isEquipped && styles.cardEquipped]}
      >
        {/* Tier badge */}
        <Badge
          value={item.tier.toUpperCase()}
          variant="status"
          color={tierColor}
          style={styles.tierBadge}
        />

        {/* Color swatch preview — shows the item's actual colors */}
        <View style={styles.cardIconWrap}>
          <View style={[
            styles.previewSwatch,
            {
              backgroundColor: item.previewColors.primary,
              borderColor: item.previewColors.secondary,
              shadowColor: item.previewColors.primary,
            },
          ]}>
            <View style={[
              styles.previewSwatchInner,
              { backgroundColor: item.previewColors.secondary },
            ]} />
          </View>
        </View>

        {/* Name */}
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardDescription} numberOfLines={2}>{item.description}</Text>

        {/* Equipped checkmark overlay */}
        {isEquipped && (
          <View style={styles.equippedCheck}>
            <Icon name="check" size={14} color="#FFFFFF" />
          </View>
        )}

        {/* Price / Owned badge */}
        {isOwned ? (
          isEquipped ? (
            <Badge variant="rank" value="Equipped" style={styles.statusBadge} />
          ) : (
            <Badge variant="premium" value="Owned" style={styles.statusBadge} />
          )
        ) : (
          <GlassButton
            variant="accent"
            size="sm"
            iconLeft="coin"
            label={`${item.price}`}
            onPress={onPress}
            style={styles.buyButton}
          />
        )}
      </GlassCard>
    </Pressable>
  );
});

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
  const navigation = useNavigation();
  const [selectedCategory, setSelectedCategory] = useState<StoreCategory>('all');
  const [confirmDialog, setConfirmDialog] = useState<{type: 'insufficient' | 'buy'; item: CosmeticItem} | null>(null);
  const coinBalance = useEconomyStore((state) => state.coinBalance);
  const ownedIds = useCosmeticsStore((state) => state.ownedCosmeticIds);
  const equippedIds = useCosmeticsStore((state) => state.equippedCosmeticIds);

  const filteredItems = selectedCategory === 'all'
    ? STORE_ITEMS
    : STORE_ITEMS.filter((item) => item.category === selectedCategory);

  const handleCardPress = useCallback((item: CosmeticItem): void => {
    const isOwned = ownedIds.includes(item.id);
    if (isOwned) {
      // Toggle equip
      const category = item.category;
      const currentEquipped = equippedIds[category];
      if (currentEquipped === item.id) {
        useCosmeticsStore.getState().unequipCosmetic(category);
        triggerHaptic('buttonPress');
      } else {
        useCosmeticsStore.getState().equipCosmetic(category, item.id);
        triggerHaptic('cosmeticEquipped');
        try {
          audioEngine.getSFXManager().play('navigation_tap');
        } catch {
          // SFX failure is non-fatal
        }
      }
      return;
    }

    // Purchase flow
    if (coinBalance < item.price) {
      triggerHaptic('actionBlocked');
      setConfirmDialog({ type: 'insufficient', item });
      return;
    }

    setConfirmDialog({ type: 'buy', item });
  }, [coinBalance, ownedIds, equippedIds]);

  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(20);

  useEffect(() => {
    contentOpacity.value = withTiming(1, { duration: 400 });
    contentTranslateY.value = withDelay(100, withTiming(0, { duration: 350, easing: Easing.out(Easing.ease) }));
  }, []);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

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
    <ScreenContainer accessibilityLabel="Store screen">
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="back" size={28} color={DS.colors.text.primary} />
        </Pressable>
        <Text style={styles.pageTitle} accessibilityRole="header">Store</Text>
        <View style={styles.coinBadge}>
          <Icon name="coin" size={DS.typography.size.callout} color={DS.colors.accent} />
          <Text style={styles.coinText}>{coinBalance}</Text>
        </View>
      </View>

      <Animated.View style={contentStyle}>
      {/* Category filter */}
      <View style={styles.categoryBar}>
        {CATEGORIES.map((cat) => (
          <GlassButton
            key={cat.id}
            label={cat.label}
            variant={selectedCategory === cat.id ? 'primary' : 'ghost'}
            size="sm"
            onPress={(): void => setSelectedCategory(cat.id)}
            style={styles.categoryChip}
          />
        ))}
      </View>

      {/* Grid */}
      {filteredItems.length === 0 ? (
        <View style={styles.emptyState}>
          <GlassCard variant="medium" noAnimation style={styles.emptyCard}>
            <Icon name="store" size={48} color={DS.colors.text.tertiary} />
            <Text style={styles.emptyText}>No items in this category</Text>
          </GlassCard>
        </View>
      ) : (
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item): string => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      />
      )}
      </Animated.View>

      <ConfirmDialog
        visible={confirmDialog?.type === 'insufficient'}
        title="Not Enough Coins"
        message={confirmDialog?.item ? `You need ${confirmDialog.item.price} coins to buy ${confirmDialog.item.name}.` : ''}
        confirmLabel="OK"
        cancelLabel="Close"
        confirmVariant="primary"
        onConfirm={() => setConfirmDialog(null)}
        onCancel={() => setConfirmDialog(null)}
      />

      <ConfirmDialog
        visible={confirmDialog?.type === 'buy'}
        title={confirmDialog?.item ? `Buy ${confirmDialog.item.name}?` : ''}
        message={confirmDialog?.item ? `This will cost ${confirmDialog.item.price} coins.\nBalance after: ${coinBalance - (confirmDialog.item?.price ?? 0)}` : ''}
        confirmLabel="Buy"
        cancelLabel="Cancel"
        confirmVariant="accent"
        onConfirm={() => {
          if (confirmDialog?.item) {
            const item = confirmDialog.item;
            // Re-check balance at purchase time to prevent stale-state double-spend
            const currentBalance = useEconomyStore.getState().coinBalance;
            if (currentBalance < item.price) {
              setConfirmDialog({ type: 'insufficient', item });
              return;
            }
            // Re-check ownership to prevent buying an already-owned item
            if (useCosmeticsStore.getState().ownedCosmeticIds.includes(item.id)) {
              setConfirmDialog(null);
              return;
            }
            try {
              useCosmeticsStore.getState().addCosmetic(item.id);
              useEconomyStore.getState().debitCoins(item.price, 'cosmetic_purchase');
            } catch {
              // If addCosmetic fails, coins are not debited (addCosmetic runs first).
              // If debitCoins fails after addCosmetic, the player gets a free item
              // which is the safer failure mode vs losing coins.
            }
            triggerHaptic('purchaseConfirm');
            try {
              audioEngine.getSFXManager().play('purchase_confirm');
            } catch {
              // SFX failure is non-fatal
            }
          }
          setConfirmDialog(null);
        }}
        onCancel={() => setConfirmDialog(null)}
      />
    </ScreenContainer>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DS.spacing.xl,
    paddingTop: DS.spacing.lg,
    paddingBottom: DS.spacing.sm,
    gap: DS.spacing.md,
  },
  pageTitle: {
    flex: 1,
    color: DS.colors.text.primary,
    fontSize: DS.typography.size.title1,
    fontWeight: DS.typography.weight.heavy,
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.xs,
    backgroundColor: DS.glass.subtle.backgroundColor,
    borderRadius: DS.radius.pill,
    paddingHorizontal: DS.spacing.md,
    paddingVertical: DS.spacing.xs,
    borderWidth: DS.glass.subtle.borderWidth,
    borderColor: DS.glass.subtle.borderColor,
  },
  coinText: {
    color: DS.colors.accent,
    fontSize: DS.typography.size.callout,
    fontWeight: DS.typography.weight.bold,
  },
  categoryBar: {
    flexDirection: 'row',
    paddingHorizontal: DS.spacing.lg,
    gap: DS.spacing.sm,
    paddingVertical: DS.spacing.md,
  },
  categoryChip: {
    // minor override if needed — GlassButton handles styling
  },
  grid: {
    paddingHorizontal: DS.spacing.md,
    paddingBottom: DS.spacing.xxl,
  },
  row: {
    gap: DS.spacing.md,
    marginBottom: DS.spacing.md,
  },
  cardPressable: {
    flex: 1,
  },
  card: {
    alignItems: 'center',
    gap: DS.spacing.xs,
    minHeight: 190,
    padding: DS.spacing.lg,
  },
  cardEquipped: {
    borderColor: DS.colors.primary,
    borderWidth: 1.5,
  },
  cardPressed: {
    opacity: 0.75,
  },
  tierBadge: {
    alignSelf: 'flex-start',
  },
  cardIconWrap: {
    marginVertical: DS.spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    width: DS.spacing.massive,
    height: DS.spacing.massive,
  },
  cardName: {
    color: DS.colors.text.primary,
    fontSize: DS.typography.size.subhead,
    fontWeight: DS.typography.weight.bold,
    textAlign: 'center',
  },
  cardDescription: {
    color: DS.colors.text.tertiary,
    fontSize: DS.typography.size.caption1,
    textAlign: 'center',
    lineHeight: DS.typography.size.caption1 * 1.35,
  },
  statusBadge: {
    marginTop: DS.spacing.xxs,
  },
  buyButton: {
    marginTop: DS.spacing.xxs,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: DS.spacing.xxxl,
  },
  emptyCard: {
    padding: DS.spacing.xxl,
    alignItems: 'center',
    gap: DS.spacing.md,
  },
  emptyText: {
    color: DS.colors.text.secondary,
    fontSize: DS.typography.size.subhead,
    textAlign: 'center',
  },
  previewSwatch: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  previewSwatchInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    opacity: 0.9,
  },
  equippedCheck: {
    position: 'absolute' as const,
    top: DS.spacing.sm,
    right: DS.spacing.sm,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: DS.colors.success,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
});
