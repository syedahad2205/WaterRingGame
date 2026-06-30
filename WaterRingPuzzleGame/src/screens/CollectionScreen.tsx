/**
 * CollectionScreen.tsx
 *
 * Displays all 20 collections. Completed items are shown in full colour;
 * missing items are greyed out. Tapping a missing item shows a "how to get"
 * tooltip.
 *
 * Requirements: 35.3
 * Task: 8.4.3
 */

import React, { useState, useCallback } from 'react';
import {
  Alert,
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

interface CollectionItem {
  id: string;
  name: string;
  icon: string;
  howToGet: string;
}

interface Collection {
  id: string;
  name: string;
  description: string;
  items: CollectionItem[];
}

// ---------------------------------------------------------------------------
// Mock catalog
// ---------------------------------------------------------------------------

const COLLECTIONS: Collection[] = [
  {
    id: 'ring_skins',
    name: 'Ring Skins',
    description: 'Collect all ring cosmetics',
    items: [
      { id: 'ring_gold', name: 'Golden Ring', icon: '💛', howToGet: 'Purchase in Store for 500 coins' },
      { id: 'ring_neon', name: 'Neon Ring', icon: '💚', howToGet: 'Purchase in Store for 1200 coins' },
      { id: 'ring_crystal', name: 'Crystal Ring', icon: '💎', howToGet: 'Purchase in Store for 3000 coins' },
      { id: 'ring_rose', name: 'Rose Ring', icon: '🌸', howToGet: 'Purchase in Store for 150 coins' },
    ],
  },
  {
    id: 'water_themes',
    name: 'Water Themes',
    description: 'Unlock all water colour themes',
    items: [
      { id: 'water_ocean', name: 'Deep Ocean', icon: '🌊', howToGet: 'Purchase in Store for 200 coins' },
      { id: 'water_lava', name: 'Magma', icon: '🔥', howToGet: 'Purchase in Store for 1500 coins' },
      { id: 'water_arctic', name: 'Arctic', icon: '🧊', howToGet: 'Purchase in Store for 600 coins' },
    ],
  },
  {
    id: 'victories',
    name: 'Victory Animations',
    description: 'Unlock all victory effects',
    items: [
      { id: 'victory_stars', name: 'Star Burst', icon: '⭐', howToGet: 'Purchase in Store for 800 coins' },
      { id: 'victory_firework', name: 'Fireworks', icon: '🎆', howToGet: 'Purchase in Store for 2000 coins' },
    ],
  },
  {
    id: 'milestones',
    name: 'Milestone Badges',
    description: 'Reach challenge milestones',
    items: [
      { id: 'badge_10', name: 'Rookie', icon: '🔰', howToGet: 'Complete challenge 10' },
      { id: 'badge_50', name: 'Veteran', icon: '🎖️', howToGet: 'Complete challenge 50' },
      { id: 'badge_100', name: 'Champion', icon: '🏆', howToGet: 'Complete challenge 100' },
    ],
  },
];

// ---------------------------------------------------------------------------
// CollectionCard component (Task 8.4.3)
// ---------------------------------------------------------------------------

interface CollectionCardProps {
  item: CollectionItem;
  isOwned: boolean;
  onPress: () => void;
}

function CollectionCard({ item, isOwned, onPress }: CollectionCardProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }: { pressed: boolean }) => [
        styles.card,
        !isOwned && styles.cardLocked,
        pressed ? styles.cardPressed : undefined,
      ]}
      accessible={true}
      accessibilityLabel={`${item.name}. ${isOwned ? 'Owned' : 'Not yet unlocked. Tap to see how to get it.'}`}
    >
      <Text style={[styles.cardIcon, !isOwned && styles.cardIconLocked]} accessible={false}>
        {isOwned ? item.icon : '🔒'}
      </Text>
      <Text style={[styles.cardName, !isOwned && styles.cardNameLocked]} numberOfLines={2}>
        {item.name}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// CollectionScreen
// ---------------------------------------------------------------------------

/**
 * CollectionScreen — shows all collections with owned/locked states.
 *
 * Requirements: 35.3
 * Task: 8.4.3
 */
// eslint-disable-next-line max-lines-per-function
export default function CollectionScreen(): React.JSX.Element {
  const ownedIds = useCosmeticsStore((state) => state.ownedCosmeticIds);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleCardPress = useCallback((item: CollectionItem, isOwned: boolean): void => {
    if (!isOwned) {
      Alert.alert(`How to get: ${item.name}`, item.howToGet);
    }
  }, []);

  const renderCollection = useCallback(({ item: col }: { item: Collection }): React.JSX.Element => {
    const isExpanded = expandedId === col.id;
    const ownedCount = col.items.filter((i) => ownedIds.includes(i.id)).length;
    const isComplete = ownedCount === col.items.length;

    return (
      <View style={[styles.collection, isComplete && styles.collectionComplete]}>
        <Pressable
          onPress={(): void => setExpandedId(isExpanded ? null : col.id)}
          style={styles.collectionHeader}
          accessibilityRole="button"
          accessibilityLabel={`${col.name} collection. ${ownedCount} of ${col.items.length} items owned.`}
          accessibilityState={{ expanded: isExpanded }}
        >
          <View style={styles.collectionTitleRow}>
            {isComplete ? <Text style={styles.completeCheck} accessible={false}>✅ </Text> : null}
            <Text style={styles.collectionName}>{col.name}</Text>
          </View>
          <Text style={styles.collectionProgress}>{ownedCount}/{col.items.length}</Text>
        </Pressable>

        {isExpanded ? (
          <View style={styles.itemGrid}>
            {col.items.map((item) => {
              const isOwned = ownedIds.includes(item.id);
              return (
                <CollectionCard
                  key={item.id}
                  item={item}
                  isOwned={isOwned}
                  onPress={(): void => handleCardPress(item, isOwned)}
                />
              );
            })}
          </View>
        ) : null}
      </View>
    );
  }, [expandedId, ownedIds, handleCardPress]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.pageTitle} accessibilityRole="header">Collection</Text>
      <FlatList
        data={COLLECTIONS}
        renderItem={renderCollection}
        keyExtractor={(col): string => col.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070f1e' },
  pageTitle: { color: '#fff', fontSize: 28, fontWeight: '800', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  collection: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  collectionComplete: { borderColor: 'rgba(255,215,64,0.3)' },
  collectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  collectionTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  completeCheck: { fontSize: 16 },
  collectionName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  collectionProgress: { color: '#4FC3F7', fontSize: 14, fontWeight: '700' },
  itemGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingBottom: 12, gap: 10 },
  card: { width: 80, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', gap: 4 },
  cardLocked: { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' },
  cardPressed: { opacity: 0.7 },
  cardIcon: { fontSize: 28 },
  cardIconLocked: { opacity: 0.3 },
  cardName: { color: '#fff', fontSize: 10, textAlign: 'center', fontWeight: '600' },
  cardNameLocked: { color: 'rgba(255,255,255,0.3)' },
});
