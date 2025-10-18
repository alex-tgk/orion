#!/usr/bin/env node
/**
 * Spec Validator Tool
 * Validates that specifications follow the GitHub Spec Kit methodology
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class SpecValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  validateSpecFile(filePath) {
    console.log(chalk.blue(`\nValidating spec: ${filePath}`));

    if (!fs.existsSync(filePath)) {
      this.errors.push(`Spec file not found: ${filePath}`);
      return false;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // Check for required sections
    const requiredSections = [
      '## Metadata',
      '## Problem Statement',
      '## Proposed Solution',
      '## Implementation Plan',
      '## Success Criteria',
      '## Testing Strategy'
    ];

    requiredSections.forEach(section => {
      if (!content.includes(section)) {
        this.errors.push(`Missing required section: ${section}`);
      }
    });

    // Check for spec ID
    const specIdPattern = /SPEC-\d{4}-\d{2}-\d{2}-\d{3}/;
    if (!specIdPattern.test(content)) {
      this.errors.push('Missing or invalid Spec ID (format: SPEC-YYYY-MM-DD-###)');
    }

    // Check for status
    const validStatuses = ['Draft', 'In Review', 'Approved', 'Implementing', 'Complete'];
    const statusLine = lines.find(l => l.includes('**Status**:'));
    if (!statusLine) {
      this.errors.push('Missing Status field');
    } else {
      const hasValidStatus = validStatuses.some(status => statusLine.includes(status));
      if (!hasValidStatus) {
        this.errors.push(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }
    }

    // Check for author
    if (!content.includes('**Author**:')) {
      this.errors.push('Missing Author field');
    }

    // Check for issue link
    if (!content.includes('**Issue**:')) {
      this.warnings.push('No linked issue found');
    }

    // Check for acceptance criteria
    const acceptanceCriteria = (content.match(/- \[ \]/g) || []).length;
    if (acceptanceCriteria < 3) {
      this.warnings.push('Spec should have at least 3 acceptance criteria');
    }

    // Check for test strategy details
    if (content.includes('### Unit Tests') && !content.includes('coverage requirement')) {
      this.warnings.push('Unit test section lacks coverage requirements');
    }

    return this.errors.length === 0;
  }

  validateAllSpecs() {
    const specsDir = path.join(process.cwd(), '.specs');
    const featuresDir = path.join(specsDir, 'features');

    if (!fs.existsSync(featuresDir)) {
      fs.mkdirSync(featuresDir, { recursive: true });
      console.log(chalk.yellow('Created .specs/features directory'));
    }

    const specFiles = this.findSpecFiles(specsDir);

    if (specFiles.length === 0) {
      console.log(chalk.yellow('No spec files found'));
      return true;
    }

    let allValid = true;
    specFiles.forEach(file => {
      if (!this.validateSpecFile(file)) {
        allValid = false;
      }
    });

    return allValid;
  }

  findSpecFiles(dir, files = []) {
    if (!fs.existsSync(dir)) return files;

    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && item !== 'templates') {
        this.findSpecFiles(fullPath, files);
      } else if (stat.isFile() && item.endsWith('.md') && item !== 'METHODOLOGY.md') {
        files.push(fullPath);
      }
    });

    return files;
  }

  printResults() {
    console.log('\n' + chalk.bold('Validation Results:'));

    if (this.errors.length > 0) {
      console.log(chalk.red(`\n❌ Errors (${this.errors.length}):`));
      this.errors.forEach(error => {
        console.log(chalk.red(`  • ${error}`));
      });
    }

    if (this.warnings.length > 0) {
      console.log(chalk.yellow(`\n⚠️  Warnings (${this.warnings.length}):`));
      this.warnings.forEach(warning => {
        console.log(chalk.yellow(`  • ${warning}`));
      });
    }

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log(chalk.green('✅ All specs are valid!'));
    }

    return this.errors.length === 0;
  }

  createNewSpec(name) {
    const templatePath = path.join(process.cwd(), '.specs/templates/feature-spec.template.md');
    const specsDir = path.join(process.cwd(), '.specs/features');

    if (!fs.existsSync(templatePath)) {
      console.error(chalk.red('Template file not found'));
      return false;
    }

    if (!fs.existsSync(specsDir)) {
      fs.mkdirSync(specsDir, { recursive: true });
    }

    const date = new Date();
    const dateStr = date.toISOString().split('T')[0];
    const specNumber = this.getNextSpecNumber(dateStr);
    const specId = `SPEC-${dateStr}-${specNumber}`;

    const fileName = `${name.toLowerCase().replace(/\s+/g, '-')}.md`;
    const filePath = path.join(specsDir, fileName);

    if (fs.existsSync(filePath)) {
      console.error(chalk.red(`Spec already exists: ${fileName}`));
      return false;
    }

    let content = fs.readFileSync(templatePath, 'utf8');
    content = content
      .replace(/\[FEATURE_NAME\]/g, name)
      .replace(/\[YYYY-MM-DD\]/g, dateStr)
      .replace(/\[NUMBER\]/g, specNumber)
      .replace(/\[Date\]/g, date.toLocaleDateString())
      .replace(/\[Your Name\]/g, process.env.USER || 'Unknown');

    fs.writeFileSync(filePath, content);
    console.log(chalk.green(`✅ Created new spec: ${filePath}`));
    console.log(chalk.blue(`   Spec ID: ${specId}`));

    return true;
  }

  getNextSpecNumber(dateStr) {
    const specsDir = path.join(process.cwd(), '.specs');
    const files = this.findSpecFiles(specsDir);

    let maxNumber = 0;
    const pattern = new RegExp(`SPEC-${dateStr}-(\\d{3})`);

    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const match = content.match(pattern);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    });

    return String(maxNumber + 1).padStart(3, '0');
  }
}

// CLI Interface
const args = process.argv.slice(2);
const validator = new SpecValidator();

if (args.length === 0 || args[0] === 'validate') {
  const isValid = validator.validateAllSpecs();
  validator.printResults();
  process.exit(isValid ? 0 : 1);
} else if (args[0] === 'new' && args[1]) {
  const name = args.slice(1).join(' ');
  const success = validator.createNewSpec(name);
  process.exit(success ? 0 : 1);
} else if (args[0] === 'check' && args[1]) {
  const isValid = validator.validateSpecFile(args[1]);
  validator.printResults();
  process.exit(isValid ? 0 : 1);
} else {
  console.log(chalk.cyan('Spec Validator Usage:'));
  console.log('  node spec-validator.js validate     - Validate all specs');
  console.log('  node spec-validator.js new <name>   - Create new spec from template');
  console.log('  node spec-validator.js check <file> - Validate specific spec file');
  process.exit(0);
}