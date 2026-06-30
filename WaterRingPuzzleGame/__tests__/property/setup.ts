import * as fc from 'fast-check';

/**
 * Global fast-check configuration for the property test suite.
 *
 * - numRuns: 500  — CI must run at least 500 examples per property (Requirement 46.1)
 * - verbose: true — Print counterexample details on failure for reproducibility (Requirement 46.3)
 */
fc.configureGlobal({
  numRuns: 500,
  verbose: true,
});
