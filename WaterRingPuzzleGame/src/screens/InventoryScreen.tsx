/**
 * InventoryScreen.tsx
 *
 * Equip / unequip owned cosmetics. Organised into category tabs:
 *   Ring Skins · Water Colours · Victory Animations · Button Skins
 *
 * Shows all owned items for the selected category; tapping equips or
 * unequips. Unowned items are NOT shown here (see StoreScreen).
 *
 * Requirements: 17.5, 18.4
 * Task: 8.5.3
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
import { useCosmeticsStore } from '../store/slices/cosmeticsSlice';
import { DS } from '../constants/designSystem';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassButton } from '../components/ui/GlassButton';
import { Badge } from '../components/ui/Badge';
import { Icon, type IconName } from '../components/icons/GameIcons';
import {
  COSMETIC_CATALOG,
  getCosmeticsByCategory,
  type CosmeticDefinition,
  type CosmeticCategory as CatalogCategory,
  type CosmeticRarity,
} from '../constants/cosmeticCatalog';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type InventoryCategory = CatalogCategory;

interface InventoryItem {
  id: string;
  name: string;
  description: string;
  category: InventoryCategory;
  rarity: CosmeticRarity;
  previewColors: { primary: string; secondary: string };
}

// ---------------------------------------------------------------------------
// Build inventory items from real cosmetic catalog
// ---------------------------------------------------------------------------

function buildCategoryItems(category: InventoryCategory): InventoryItem[] {
  return getCosmeticsByCategory(category).map((def) => ({
    id: def.id,
    name: def.name,
    description: def.description,
    category: def.category,
    rarity: def.rarity,
    previewColors: def.previewColors,
  }));
}

const CATEGORY_TABS: { id: InventoryCategory; label: string; icon: IconName }[] = [
  { id: 'ring_skin',          label: 'Rings',    icon: 'ring' },
  { id: 'water_style',        label: 'Water',    icon: 'water-drop' },
  { id: 'peg_skin',           label: 'Pegs',     icon: 'target' },
  { id: 'particle_trail',     label: 'Trails',   icon: 'sparkle' },
  { id: 'victory_animation',  label: 'Victory',  icon: 'star' },
  { id: 'button_skin',        label: 'Buttons',  icon: 'gem' },
];

const RARITY_COLOURS: Record<CosmeticRarity, string> = {
  common: DS.colors.text.secondary,
  rare: DS.colors.primary,
  epic: DS.colors.secondary,
  legendary: DS.colors.accent,
  mythic: '#FF00FF',
};

// ---------------------------------------------------------------------------
// InventoryCard
// ---------------------------------------------------------------------------

interface InventoryCardProps {
  item: InventoryItem;
  isEquipped: boolean;
  onToggle: () => void;
}

const InventoryCard = React.memo(function InventoryCard({ item, isEquipped, onToggle }: InventoryCardProps): React.JSX.Element {
  const rarityColor = RARITY_COLOURS[item.rarity];
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }: { pressed: boolean }) => [
        styles.cardPressable,
        pressed ? styles.cardPressed : undefined,
      ]}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}. ${isEquipped ? 'Equipped. Tap to unequip.' : 'Tap to equip.'}`}
      accessibilityState={{ selected: isEquipped }}
    >
      <GlassCard
        variant="medium"
        glow={isEquipped ? DS.colors.primary : undefined}
        noAnimation
        style={styles.card}
      >
        <View style={[styles.previewSwatch, {
          backgroundColor: item.previewColors.primary,
          borderColor: isEquipped ? DS.colors.primary : item.previewColors.secondary,
          shadowColor: item.previewColors.primary,
        }]}>
          <View style={[styles.previewSwatchInner, { backgroundColor: item.previewColors.secondary }]} />
          {isEquipped && (
            <View style={styles.equippedCheck}>
              <Icon name="check" size={12} color="#FFFFFF" />
            </View>
          )}
        </View>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <Badge variant="status" value={item.rarity.toUpperCase()} color={rarityColor} />
      </GlassCard>
    </Pressable>
  );
});

// ---------------------------------------------------------------------------
// InventoryScreen
// ---------------------------------------------------------------------------

// eslint-disable-next-line max-lines-per-function
export default function InventoryScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const [activeCategory, setActiveCategory] = useState<InventoryCategory>('ring_skin');

  const ownedIds = useCosmeticsStore((s) => s.ownedCosmeticIds);
  const equippedIds = useCosmeticsStore((s) => s.equippedCosmeticIds);
  const equipCosmetic = useCosmeticsStore((s) => s.equipCosmetic);
  const unequipCosmetic = useCosmeticsStore((s) => s.unequipCosmetic);

  const allCategoryItems = buildCategoryItems(activeCategory);
  const visibleItems = allCategoryItems.filter((c) => ownedIds.includes(c.id));

  const currentlyEquipped = equippedIds[activeCategory];

  const handleToggle = useCallback((item: InventoryItem): void => {
    if (currentlyEquipped === item.id) {
      unequipCosmetic(item.category);
    } else {
      equipCosmetic(item.category, item.id);
    }
  }, [currentlyEquipped, equipCosmetic, unequipCosmetic]);

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

  const renderItem = useCallback(({ item }: { item: InventoryItem }): React.JSX.Element => (
    <InventoryCard
      item={item}
      isEquipped={currentlyEquipped === item.id}
      onToggle={(): void => handleToggle(item)}
    />
  ), [currentlyEquipped, handleToggle]);

  return (
    <ScreenContainer accessibilityLabel="Inventory screen">
      {/* Header with back button */}
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="back" size={28} color={DS.colors.text.primary} />
        </Pressable>
        <Text style={styles.pageTitle}>Inventory</Text>
      </View>

      <Animated.View style={contentStyle}>
      {/* Category tabs */}
      <View style={styles.tabRow}>
        {CATEGORY_TABS.map((tab) => (
          <GlassButton
            key={tab.id}
            label={tab.label}
            variant={activeCategory === tab.id ? 'primary' : 'ghost'}
            size="sm"
            iconLeft={tab.icon}
            onPress={(): void => setActiveCategory(tab.id)}
            style={styles.tabButton}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeCategory === tab.id }}
            accessibilityLabel={`${tab.label} category`}
          />
        ))}
      </View>

      {/* Equipped status */}
      <GlassCard variant="subtle" noAnimation style={styles.equippedStatus}>
        <View style={styles.equippedStatusRow}>
          <Icon
            name="check"
            size={DS.typography.size.body}
            color={currentlyEquipped ? DS.colors.success : DS.colors.text.tertiary}
          />
          <Text style={styles.equippedStatusText}>
            {currentlyEquipped
              ? `Equipped: ${allCategoryItems.find((c) => c.id === currentlyEquipped)?.name ?? currentlyEquipped}`
              : 'Nothing equipped'}
          </Text>
        </View>
      </GlassCard>

      {visibleItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="grid" size={48} color={DS.colors.text.tertiary} />
          <Text style={styles.emptyText}>No items owned in this category.</Text>
          <Text style={styles.emptyHint}>Visit the Store to unlock cosmetics.</Text>
        </View>
      ) : (
        <FlatList
          data={visibleItems}
          renderItem={renderItem}
          keyExtractor={(i): string => i.id}
          numColumns={3}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
      </Animated.View>
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
    gap: DS.spacing.md,
    paddingHorizontal: DS.spacing.xl,
    paddingTop: DS.spacing.lg,
    paddingBottom: DS.spacing.md,
  },
  pageTitle: {
    color: DS.colors.text.primary,
    fontSize: DS.typography.size.title1,
    fontWeight: DS.typography.weight.heavy,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: DS.spacing.md,
    gap: DS.spacing.sm,
    marginBottom: DS.spacing.xs,
  },
  tabButton: {
    flex: 1,
  },
  equippedStatus: {
    marginHorizontal: DS.spacing.xl,
    marginVertical: DS.spacing.sm,
    paddingHorizontal: DS.spacing.lg,
    paddingVertical: DS.spacing.md,
  },
  equippedStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.sm,
  },
  equippedStatusText: {
    color: DS.colors.text.secondary,
    fontSize: DS.typography.size.callout,
    fontWeight: DS.typography.weight.medium,
  },
  listContent: {
    paddingHorizontal: DS.spacing.md,
    paddingBottom: DS.spacing.xxxl,
  },
  columnWrapper: {
    gap: DS.spacing.sm,
    marginBottom: DS.spacing.sm,
  },
  cardPressable: {
    flex: 1,
  },
  card: {
    alignItems: 'center',
    paddingVertical: DS.spacing.lg,
    paddingHorizontal: DS.spacing.sm,
    gap: DS.spacing.xs,
  },
  cardPressed: {
    opacity: 0.75,
  },
  previewSwatch: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  previewSwatchInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  equippedCheck: {
    position: 'absolute' as const,
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: DS.colors.success,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  cardName: {
    color: DS.colors.text.primary,
    fontSize: DS.typography.size.caption1,
    fontWeight: DS.typography.weight.semibold,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: DS.spacing.sm,
  },
  emptyText: {
    color: DS.colors.text.secondary,
    fontSize: DS.typography.size.body,
    fontWeight: DS.typography.weight.semibold,
  },
  emptyHint: {
    color: DS.colors.text.tertiary,
    fontSize: DS.typography.size.callout,
    fontWeight: DS.typography.weight.regular,
  },
});
