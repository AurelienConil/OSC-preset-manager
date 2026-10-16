// Lifecycle contract of a Manager owning a resource to release before the app quits.

export interface StoppableManager {
  stop(): Promise<void> | void
}
