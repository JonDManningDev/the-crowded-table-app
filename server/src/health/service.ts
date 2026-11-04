interface HealthDependencies { checkReadiness: () => Promise<void> }

export function createHealthService({ checkReadiness }: HealthDependencies) {
  return {
    // Liveness
    readLiveness() { return { live: true } as const },

    // Readiness
    async readReadiness() {
      await checkReadiness()
      return { ready: true } as const
    },
  }
}
export type HealthService = ReturnType<typeof createHealthService>
