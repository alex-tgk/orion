# Parallel Work Coordination Documentation

This directory contains all coordination documents for parallel development of the Orion microservices platform.

---

## 📚 Documentation Index

### 1. **PARALLEL_WORK_COORDINATION_PLAN.md** ⭐ START HERE
**The master coordination plan**

Defines:
- 10 workstreams with clear ownership
- Service boundaries and file ownership
- Integration points and protocols
- Communication channels and processes
- Testing and quality standards
- Critical path and risk management

**When to use**: Before starting any work, to understand your workstream scope and responsibilities.

---

### 2. **QUICK_START_GUIDE.md** 🚀 DEVELOPERS START HERE
**Get coding in 5 minutes**

Covers:
- Environment setup
- How to identify your workstream
- Creating feature branches
- Understanding your boundaries
- Common development tasks
- Troubleshooting guides

**When to use**: Your first day on the project, or when you need quick reference for common tasks.

---

### 3. **FILE_OWNERSHIP_MAP.md** 🗺️ REFERENCE
**Visual map of who owns what**

Provides:
- Complete directory tree with ownership annotations
- File-by-file ownership rules
- Quick reference: "Can I modify this?"
- Conflict prevention checklist
- Change request processes

**When to use**: Before modifying any file, to verify you have ownership rights.

---

### 4. **CONTRACT_MANAGEMENT_PROTOCOL.md** 📝 CONTRACTS
**How to request and manage API contract changes**

Explains:
- Contract ownership (Workstream 6 exclusive)
- Change request process
- Review and approval workflow
- Versioning strategy
- Contract standards and best practices
- Emergency change procedures

**When to use**: When you need to modify or add API contracts, event schemas, or shared types.

---

### 5. **DATABASE_COORDINATION_GUIDE.md** 🗄️ DATABASE
**Database schema coordination across services**

Details:
- Database-per-service architecture
- Schema change request process
- Database Lead (Workstream 8) review
- Naming conventions
- Migration strategies
- Cross-service data relationships
- Performance guidelines

**When to use**: When creating or modifying database schemas, creating migrations, or dealing with cross-service data needs.

---

## 🎯 Quick Navigation by Role

### I'm a Backend Developer (Workstreams 1-4)
1. Read: **QUICK_START_GUIDE.md** (setup)
2. Read: **PARALLEL_WORK_COORDINATION_PLAN.md** (your workstream section)
3. Reference: **FILE_OWNERSHIP_MAP.md** (boundaries)
4. Reference: **CONTRACT_MANAGEMENT_PROTOCOL.md** (when changing APIs)
5. Reference: **DATABASE_COORDINATION_GUIDE.md** (when working with DB)

### I'm a Frontend Developer (Workstream 5)
1. Read: **QUICK_START_GUIDE.md** (setup)
2. Read: **PARALLEL_WORK_COORDINATION_PLAN.md** (Workstream 5 section)
3. Reference: **FILE_OWNERSHIP_MAP.md** (your scope)
4. Reference: **CONTRACT_MANAGEMENT_PROTOCOL.md** (consuming APIs)

### I'm the Contract Owner (Workstream 6)
1. Read: **CONTRACT_MANAGEMENT_PROTOCOL.md** (your responsibilities)
2. Read: **PARALLEL_WORK_COORDINATION_PLAN.md** (Workstream 6 section)
3. Reference: **FILE_OWNERSHIP_MAP.md** (exclusive areas)

### I'm the Infrastructure Lead (Workstream 7)
1. Read: **PARALLEL_WORK_COORDINATION_PLAN.md** (Workstream 7 section)
2. Reference: **FILE_OWNERSHIP_MAP.md** (infrastructure packages)
3. Reference: **QUICK_START_GUIDE.md** (for team reference)

### I'm the Database Lead (Workstream 8)
1. Read: **DATABASE_COORDINATION_GUIDE.md** (your authority)
2. Read: **PARALLEL_WORK_COORDINATION_PLAN.md** (Workstream 8 section)
3. Reference: **FILE_OWNERSHIP_MAP.md** (schema locations)

### I'm the QA Lead (Workstream 9)
1. Read: **PARALLEL_WORK_COORDINATION_PLAN.md** (Workstream 9 section)
2. Read: **QUICK_START_GUIDE.md** (testing sections)
3. Reference: **FILE_OWNERSHIP_MAP.md** (test infrastructure)

### I'm the DevOps Lead (Workstream 10)
1. Read: **PARALLEL_WORK_COORDINATION_PLAN.md** (Workstream 10 section)
2. Reference: **FILE_OWNERSHIP_MAP.md** (CI/CD, Docker, K8s ownership)
3. Reference: **DATABASE_COORDINATION_GUIDE.md** (DB infrastructure)

---

## 🚨 Common Scenarios

### "I want to add a new API endpoint"
1. Check if contract exists in `/packages/shared/src/contracts/`
2. If not, follow **CONTRACT_MANAGEMENT_PROTOCOL.md** to request it
3. Implement in your service following **QUICK_START_GUIDE.md**
4. Check **FILE_OWNERSHIP_MAP.md** to ensure you're in your scope

### "I need to change the database schema"
1. Read **DATABASE_COORDINATION_GUIDE.md** schema change process
2. Create GitHub issue with `schema-change` label
3. Tag Database Lead (Workstream 8) for review
4. Implement once approved

### "I'm not sure if I can modify this file"
1. Check **FILE_OWNERSHIP_MAP.md**
2. Look for ownership symbols: ✅ (own), 🔒 (exclusive), ⚠️ (needs approval), 👁️ (read only)
3. If still unsure, ask in `#orion-dev-coordination`

### "I need to publish/consume an event"
1. Check if event exists in `/packages/shared/src/events/`
2. If not, request via **CONTRACT_MANAGEMENT_PROTOCOL.md**
3. Import and use in your service
4. Follow examples in **QUICK_START_GUIDE.md**

### "Another service needs data from my database"
1. Read **DATABASE_COORDINATION_GUIDE.md** cross-service data section
2. Use event-driven sync, NOT foreign keys
3. Publish events when data changes
4. Provide API endpoints for on-demand access

### "I'm blocked and need help"
1. Post in `#orion-dev-coordination` Slack channel
2. Tag relevant workstream owner
3. Create GitHub issue if needed
4. Follow escalation path in **PARALLEL_WORK_COORDINATION_PLAN.md**

---

## 📋 Daily Workflow

### Morning
1. Pull latest changes: `git pull origin main`
2. Install dependencies: `pnpm install`
3. Read Slack `#orion-dev-coordination` for updates
4. Post daily standup (see **PARALLEL_WORK_COORDINATION_PLAN.md** template)

### During Development
1. Work only in your assigned workstream scope
2. Reference **FILE_OWNERSHIP_MAP.md** before modifying files
3. Submit contract/schema change requests as needed
4. Run tests frequently: `pnpm test`

### Before Committing
1. Run quality checks:
   ```bash
   pnpm lint
   pnpm type-check
   pnpm test
   pnpm format
   ```
2. Follow commit conventions (see **QUICK_START_GUIDE.md**)
3. Create PR with proper tags and reviewers

### End of Day
1. Push your branch if work in progress
2. Update GitHub project board
3. Respond to any PR reviews
4. Document any blockers in Slack

---

## 🔑 Key Principles

### 1. **Ownership is Clear**
Every file has a designated owner. Check **FILE_OWNERSHIP_MAP.md** first.

### 2. **Communication is Required**
For shared resources, changes require approval. Use proper channels.

### 3. **Contracts are Sacred**
Only Contract Owner modifies `/packages/shared/src/contracts/` and `/packages/shared/src/events/`.

### 4. **Databases are Isolated**
Each service has its own database. No cross-database foreign keys.

### 5. **Quality is Non-Negotiable**
All code must pass linting, type-checking, and tests (>80% coverage).

### 6. **Integration is Planned**
Integration points are defined upfront. Don't surprise other teams.

---

## 📞 Contacts

### Workstream Leads
- **Workstream 1 (Auth)**: TBD
- **Workstream 2 (User)**: TBD
- **Workstream 3 (Notifications)**: TBD
- **Workstream 4 (Gateway)**: TBD
- **Workstream 5 (Admin UI)**: TBD
- **Workstream 6 (Contracts)**: TBD ⭐ Contract Owner
- **Workstream 7 (Infrastructure)**: TBD
- **Workstream 8 (Database)**: TBD ⭐ Database Lead
- **Workstream 9 (Testing)**: TBD
- **Workstream 10 (DevOps)**: TBD

### Communication Channels
- **Slack**: `#orion-dev-coordination`
- **GitHub Issues**: Use appropriate labels
  - `contract-change`
  - `schema-change`
  - `breaking-change`
  - `integration-point`
- **Weekly Sync**: [Meeting link TBD]

---

## 🛠️ Tools & Commands

### Verification Commands
```bash
# Check your setup
pnpm type-check
pnpm lint
pnpm test

# View dependency graph
nx graph

# See what's affected by your changes
nx affected:test
nx affected:build
```

### Common Operations
```bash
# Start your service
nx serve [your-service]

# Run tests for your service
nx test [your-service] --watch

# Build your service
nx build [your-service]

# Generate Prisma client (after schema changes)
cd packages/[your-service] && npx prisma generate

# Create database migration
cd packages/[your-service] && npx prisma migrate dev --name description
```

---

## 📈 Progress Tracking

### Project Board
GitHub Projects: `Orion Development`
- Columns: Backlog → In Progress → Review → Done
- Link all PRs to issues
- Update status daily

### Definition of Done
- [ ] Code implemented and reviewed
- [ ] Tests written (>80% coverage)
- [ ] Tests passing
- [ ] Linting passing
- [ ] Type checking passing
- [ ] Documentation updated
- [ ] Integration points tested
- [ ] PR approved by workstream owner
- [ ] No conflicts with main branch

---

## 🚀 Getting Help

### Before Asking
1. Check relevant documentation in this directory
2. Search existing GitHub issues
3. Review similar code in the codebase

### How to Ask
1. **Slack** (`#orion-dev-coordination`):
   - Quick questions
   - Blocking issues
   - Daily coordination

2. **GitHub Issues**:
   - Feature requests
   - Bug reports
   - Contract/schema change requests

3. **Pull Request Comments**:
   - Code review questions
   - Implementation discussions

### Escalation
If blocked >24 hours:
1. Post in Slack with `@channel`
2. Tag relevant workstream lead
3. Create high-priority GitHub issue
4. Request emergency sync meeting if critical

---

## 📝 Document Updates

These documents are living and will evolve:
- Propose changes via PR to `.swarm/` directory
- Tag Documentation Owner for review
- Requires 2 approvals for changes
- Notify all teams when protocols change

**Last Updated**: 2025-10-18
**Version**: 1.0.0

---

## 🎓 Additional Resources

### External Documentation
- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Nx Documentation](https://nx.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Internal Documentation
- `/docs/generated/` - Generated API docs
- `/packages/[service]/README.md` - Service-specific docs
- `/packages/shared/CHANGELOG.md` - Contract version history

---

**Remember**: Coordination is key to parallel success. When in doubt, communicate! 🤝
