/**
 * Ambient declaration for react-native-gesture-handler.
 *
 * The installed version (2.20.2) does not ship its TypeScript definitions in
 * the expected lib/typescript/ directory. This shim provides the minimum
 * type surface used by this project so TypeScript does not report TS7016.
 *
 * Remove this file once the package publishes complete typings again.
 */
declare module 'react-native-gesture-handler' {
  import type { ComponentType } from 'react';
  import type { ViewProps } from 'react-native';

  export const GestureHandlerRootView: ComponentType<ViewProps>;

  // Gesture classes
  export class Gesture {
    static Tap(): TapGesture;
    static Pan(): PanGesture;
    static Pinch(): PinchGesture;
    static Race(...gestures: AnyGesture[]): ComposedGesture;
    static Simultaneous(...gestures: AnyGesture[]): ComposedGesture;
    static Exclusive(...gestures: AnyGesture[]): ComposedGesture;
  }

  export interface TapGesture {
    onStart(cb: (event: any) => void): this;
    onEnd(cb: (event: any, success: boolean) => void): this;
    maxDuration(ms: number): this;
    numberOfTaps(n: number): this;
    enabled(value: boolean): this;
  }

  export interface PanGesture {
    onStart(cb: (event: any) => void): this;
    onUpdate(cb: (event: any) => void): this;
    onEnd(cb: (event: any) => void): this;
    enabled(value: boolean): this;
    minDistance(d: number): this;
    activateAfterLongPress(ms: number): this;
  }

  export interface PinchGesture {
    onStart(cb: (event: any) => void): this;
    onUpdate(cb: (event: any) => void): this;
    onEnd(cb: (event: any) => void): this;
    enabled(value: boolean): this;
  }

  export type AnyGesture = TapGesture | PanGesture | PinchGesture | ComposedGesture;

  export interface ComposedGesture {}

  export const GestureDetector: ComponentType<{
    gesture: AnyGesture | ComposedGesture;
    children?: import('react').ReactNode;
  }>;

  // Scroll/swipe components
  export const ScrollView: ComponentType<any>;
  export const FlatList: ComponentType<any>;
  export const Switch: ComponentType<any>;
  export const TextInput: ComponentType<any>;
  export const DrawerLayout: ComponentType<any>;

  // State constants
  export enum State {
    UNDETERMINED = 0,
    FAILED = 1,
    BEGAN = 2,
    CANCELLED = 3,
    ACTIVE = 4,
    END = 5,
  }

  export enum Directions {
    RIGHT = 1,
    LEFT = 2,
    UP = 4,
    DOWN = 8,
  }
}
