# ADR-0001: State Management Layer Decision

## Decision
Use **Jotai** as the primary state management solution.

## Rationale

### Why Jotai
- **Atomic state and fine-grained subscriptions**: Components subscribe only to the atoms they read. This avoids store-wide updates and reduces cascading renders under high-frequency data.
- **Simple mental model**: No actions/reducers/selectors ceremony. Atoms + derived atoms (selectors) express dependencies naturally in code.
- **Strong derivation story**: Derived atoms are memoized and composable, which makes complex computations (e.g., position aggregation, visible row ranges) explicit and performant.
- **React-native ergonomics**: Excellent TypeScript inference; works well with Concurrent React and Suspense patterns.
- **Easy persistence**: `atomWithStorage` provides plug-and-play persistence without extra wiring.
- **Incremental design**: Atoms scale by feature and do not force a single massive store; aligns with our adapter/worker architecture.

### Why not Redux Toolkit
- **Boilerplate and ceremony**: Too much structure for our use case; increases iteration cost.
- **Fine-grained updates are harder**: Requires careful selector discipline; easy to regress into broad re-renders under market-rate update frequency.

### Why not Recoil
- **Maintenance risk**: Ecosystem and maintenance cadence are not ideal for production reliance in this domain.

### Why not Zustand 
- **Selector discipline vs. atom graph**: Zustand centers around a store with selectors; complex cross-feature derivations tend to push logic into custom selectors or store methods. Jotai expresses the dependency graph directly with derived atoms, keeping ownership clearer and updates minimal.
- **High-frequency, multi-source updates**: With WS, REST polling, and Worker messages, Jotai’s atom-level updates make it straightforward to limit re-renders to exactly the components reading those atoms. Zustand can achieve this but typically demands more selector rigor and testing to avoid accidental over-subscription.


