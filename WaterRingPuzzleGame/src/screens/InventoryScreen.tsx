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

import React, { useState, useCallback } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useCosmeticsStore } from '../store/slices/cosmeticsSlice';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Category = 'ring_skin' | 'water_color' | 'victory_animation' | 'button_skin';

interface CosmeticItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: Category;
  tier: 'common' | 'rare' | 'epic' | 'legendary';
}

// ---------------------------------------------------------------------------
// Catalog (items that exist in the game — ownership is checked against store)
// ---------------------------------------------------------------------------

const ALL_COSMETICS: CosmeticItem[] = [
  // Ring skins
  { id: 'ring_default',  name: 'Default',       icon: '⭕', description: 'The classic ring.', category: 'ring_skin', tier: 'common' },
  { id: 'ring_gold',     name: 'Golden',         icon: '💛', description: 'A shimmering gold finish.', category: 'ring_skin', tier: 'rare' },
  { id: 'ring_neon',     name: 'Neon',           icon: '💚', description: 'Glowing neon outline.', category: 'ring_skin', tier: 'epic' },
  { id: 'ring_crystal',  name: 'Crystal',        icon: '💎', description: 'Semi-transparent crystal.', category: 'ring_skin', tier: 'legendary' },
  { id: 'ring_rose',     name: 'Rose',           icon: '🌸', description: 'Soft rose gold.', category: 'ring_skin', tier: 'common' },
  // Water colours
  { id: 'water_default', name: 'Ocean Blue',     icon: '🔵', description: 'Clear ocean water.', category: 'water_color', tier: 'common' },
  { id: 'water_ocean',   name: 'Deep Sea',       icon: '🌊', description: 'Dark abyssal water.', category: 'water_color', tier: 'rare' },
  { id: 'water_lava',    name: 'Magma',          icon: '🔴', description: 'Molten lava flow.', category: 'water_color', tier: 'epic' },
  { id: 'water_arctic',  name: 'Arctic',         icon: '🧊', description: 'Icy arctic water.', category: 'water_color', tier: 'rare' },
  // Victory animations
  { id: 'victory_default', name: 'Confetti',     icon: '🎊', description: 'Classic confetti burst.', category: 'victory_animation', tier: 'common' },
  { id: 'victory_stars', name: 'Star Burst',     icon: '⭐', description: 'Stars explode outward.', category: 'victory_animation', tier: 'rare' },
  { id: 'victory_firework', name: 'Fireworks',   icon: '🎆', description: 'Brilliant fireworks display.', category: 'victory_animation', tier: 'epic' },
  // Button skins
  { id: 'button_default', name: 'Standard',      icon: '🔘', description: 'Clean minimal button.', category: 'button_skin', tier: 'common' },
  { id: 'button_glow',    name: 'Glow',          icon: '✨', description: 'Soft outer glow effect.', category: 'button_skin', tier: 'rare' },
];

const CATEGORY_TABS: { id: Category; label: string; icon: string }[] = [
  { id: 'ring_skin',          label: 'Rings',    icon: '⭕' },
  { id: 'water_color',        label: 'Water',    icon: '💧' },
  { id: 'victory_animation',  label: 'Victory',  icon: '🎊' },
  { id: 'button_skin',        label: 'Buttons',  icon: '🔘' },
];

const TIER_COLOURS: Record<string, string> = {
  common: '#90A4AE',
  rare: '#42A5F5',
  epic: '#AB47BC',
  legendary: '#FFD740',
};

// ---------------------------------------------------------------------------
// InventoryCard
// ---------------------------------------------------------------------------

interface InventoryCardProps {
  item: CosmeticItem;
  isEquipped: boolean;
  onToggle: () => void;
}

function InventoryCard({ item, isEquipped, onToggle }: InventoryCardProps): React.JSX.Element {
  const tierColor = TIER_COLOURS[item.tier];
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }: { pressed: boolean }) => [
        styles.card,
        isEquipped && styles.cardEquipped,
        { borderColor: isEquipped ? tierColor : 'rgba(255,255,255,0.09)' },
        pressed ? styles.cardPressed : undefined,
      ]}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}. ${isEquipped ? 'Equipped. Tap to unequip.' : 'Tap to equip.'}`}
      accessibilityState={{ selected: isEquipped }}
    >
      <Text style={styles.cardIcon} accessible={false}>{item.icon}</Text>
      <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
      <View style={[styles.tierDot, { backgroundColor: tierColor }]} />
      {isEquipped ? (
        <View style={styles.equippedBadge}>
          <Text style={styles.equippedBadgeText}>ON</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// InventoryScreen
// ---------------------------------------------------------------------------

// eslint-disable-next-line max-lines-per-function
export default function InventoryScreen(): React.JSX.Element {
  const [activeCategory, setActiveCategory] = useState<Category>('ring_skin');

  const ownedIds = useCosmeticsStore((s) => s.ownedCosmeticIds);
  const equippedIds = useCosmeticsStore((s) => s.equippedCosmeticIds);
  const equipCosmetic = useCosmeticsStore((s) => s.equipCosmetic);
  const unequipCosmetic = useCosmeticsStore((s) => s.unequipCosmetic);

  // Default items are always "owned" — include ring_default, water_default, etc.
  const DEFAULT_IDS = ['ring_default', 'water_default', 'victory_default', 'button_default'];

  const visibleItems = ALL_COSMETICS.filter(
    (c) => c.category === activeCategory && (ownedIds.includes(c.id) || DEFAULT_IDS.includes(c.id)),
  );

  const currentlyEquipped = equippedIds[activeCategory];

  const handleToggle = useCallback((item: CosmeticItem): void => {
    if (currentlyEquipped === item.id) {
      unequipCosmetic(item.category);
    } else {
      equipCosmetic(item.category, item.id);
    }
  }, [currentlyEquipped, equipCosmetic, unequipCosmetic]);

  const renderItem = useCallback(({ item }: { item: CosmeticItem }): React.JSX.Element => (
    <InventoryCard
      item={item}
      isEquipped={currentlyEquipped === item.id}
      onToggle={(): void => handleToggle(item)}
    />
  ), [currentlyEquipped, handleToggle]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">Inventory</Text>

      {/* Category tabs */}
      <View style={styles.tabRow}>
        {CATEGORY_TABS.map((tab) => (
          <Pressable
            key={tab.id}
            onPress={(): void => setActiveCategory(tab.id)}
            style={[styles.tab, activeCategory === tab.id && styles.tabActive]}
            accessible={true}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeCategory === tab.id }}
            accessibilityLabel={`${tab.label} category`}
          >
            <Text style={styles.tabIcon} accessible={false}>{tab.icon}</Text>
            <Text style={[styles.tabLabel, activeCategory === tab.id && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Equipped status */}
      <View style={styles.equippedStatus}>
        <Text style={styles.equippedStatusText}>
          {currentlyEquipped
            ? `Equipped: ${ALL_COSMETICS.find((c) => c.id === currentlyEquipped)?.name ?? currentlyEquipped}`
            : 'Nothing equipped'}
        </Text>
      </View>

      {visibleItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon} accessible={false}>🎒</Text>
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
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070f1e' },
  title: { color: '#fff', fontSize: 28, fontWeight: '800', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 3 },
  tabActive: { backgroundColor: 'rgba(79,195,247,0.15)', borderColor: '#4FC3F7' },
  tabIcon: { fontSize: 18 },
  tabLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  tabLabelActive: { color: '#4FC3F7' },
  equippedStatus: { paddingHorizontal: 20, paddingVertical: 8 },
  equippedStatusText: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  listContent: { paddingHorizontal: 12, paddingBottom: 32 },
  columnWrapper: { gap: 10, marginBottom: 10 },
  card: {
    flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16, paddingVertical: 16, paddingHorizontal: 8,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.09)', gap: 6,
  },
  cardEquipped: { backgroundColor: 'rgba(79,195,247,0.1)' },
  cardPressed: { opacity: 0.75 },
  cardIcon: { fontSize: 30 },
  cardName: { color: '#fff', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  tierDot: { width: 8, height: 8, borderRadius: 4 },
  equippedBadge: { backgroundColor: '#4FC3F7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  equippedBadgeText: { color: '#070f1e', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: 'rgba(255,255,255,0.55)', fontSize: 16, fontWeight: '600' },
  emptyHint: { color: 'rgba(255,255,255,0.3)', fontSize: 13 },
});
