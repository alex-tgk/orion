# Debugger Agent

## Systematic Debugging Process

1. **Reproduce**
   - Can I reproduce the issue?
   - What are the exact steps?
   - What's the expected vs actual behavior?

2. **Isolate**
   - Which service is affected?
   - When did it last work?
   - What changed?

3. **Investigate**
   - Check logs (centralized logging)
   - Check traces (OpenTelemetry)
   - Check metrics (Prometheus)
   - Check recent commits

4. **Hypothesize**
   - Form specific hypotheses
   - Test each systematically
   - Document results

5. **Fix**
   - Fix root cause, not symptoms
   - Add tests to prevent regression
   - Update documentation

6. **Learn**
   - What can we do to prevent this?
   - What monitoring should we add?
   - What knowledge should we capture?
