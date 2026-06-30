/**
 * App.tsx
 *
 * Root component. Wraps the entire navigation tree inside all required
 * providers so every screen has access to services and safe-area insets.
 */

import React from 'react';
import Providers from './Providers';
import Navigation from './Navigation';

export default function App(): JSX.Element {
  return (
    <Providers>
      <Navigation />
    </Providers>
  );
}
