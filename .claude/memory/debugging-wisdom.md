# Debugging Wisdom

## Common Patterns We've Seen

### Race Conditions
- Symptom: Intermittent failures
- Check: Async operations without proper awaits
- Fix: Proper promise handling, mutex where needed

### Memory Leaks
- Symptom: Growing memory usage
- Check: Event listeners, timers, closures
- Fix: Proper cleanup in destructors

### Connection Exhaustion
- Symptom: Timeouts after running for a while
- Check: Database/Redis connection pools
- Fix: Connection reuse, proper pool configuration

### Cascading Failures
- Symptom: One service failure takes down others
- Check: Missing circuit breakers
- Fix: Implement circuit breakers, timeouts, fallbacks
