export class MarkdownFormatter {
  /**
   * Format a heading
   */
  public heading(text: string, level: number = 1): string {
    return `${'#'.repeat(level)} ${text}\n`;
  }

  /**
   * Format a code block
   */
  public codeBlock(code: string, language: string = ''): string {
    return `\`\`\`${language}\n${code}\n\`\`\`\n`;
  }

  /**
   * Format inline code
   */
  public inlineCode(text: string): string {
    return `\`${text}\``;
  }

  /**
   * Format a link
   */
  public link(text: string, url: string): string {
    return `[${text}](${url})`;
  }

  /**
   * Format a list
   */
  public list(items: string[], ordered: boolean = false): string {
    return items.map((item, index) => {
      const prefix = ordered ? `${index + 1}.` : '-';
      return `${prefix} ${item}`;
    }).join('\n') + '\n';
  }

  /**
   * Format a table
   */
  public table(headers: string[], rows: string[][]): string {
    const headerRow = `| ${headers.join(' | ')} |`;
    const separator = `| ${headers.map(() => '---').join(' | ')} |`;
    const dataRows = rows.map(row => `| ${row.join(' | ')} |`).join('\n');

    return `${headerRow}\n${separator}\n${dataRows}\n`;
  }

  /**
   * Format a blockquote
   */
  public blockquote(text: string): string {
    return text.split('\n').map(line => `> ${line}`).join('\n') + '\n';
  }

  /**
   * Format a badge
   */
  public badge(label: string, value: string, color: string = 'blue'): string {
    return `![${label}](https://img.shields.io/badge/${label}-${value}-${color}.svg)`;
  }

  /**
   * Format horizontal rule
   */
  public hr(): string {
    return '---\n';
  }

  /**
   * Format details/summary (collapsible section)
   */
  public details(summary: string, content: string): string {
    return `<details>\n<summary>${summary}</summary>\n\n${content}\n</details>\n`;
  }

  /**
   * Format a table of contents
   */
  public tableOfContents(sections: Array<{ title: string; anchor: string; level?: number }>): string {
    const lines = sections.map(section => {
      const indent = '  '.repeat((section.level || 1) - 1);
      return `${indent}- [${section.title}](#${section.anchor})`;
    });

    return this.heading('Table of Contents', 2) + lines.join('\n') + '\n';
  }

  /**
   * Sanitize text for markdown
   */
  public sanitize(text: string): string {
    return text
      .replace(/[\\`*_{}[\]()#+\-.!]/g, '\\$&')
      .trim();
  }

  /**
   * Create anchor from text
   */
  public anchor(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Format API method documentation
   */
  public formatApiMethod(method: {
    name: string;
    httpMethod: string;
    path: string;
    description?: string;
    parameters?: Array<{ name: string; type: string; required: boolean; description?: string }>;
    returns?: { type: string; description?: string };
    example?: string;
  }): string {
    const sections: string[] = [];

    // Method signature
    sections.push(this.heading(`${method.httpMethod} ${method.path}`, 3));

    // Description
    if (method.description) {
      sections.push(method.description + '\n');
    }

    // Parameters
    if (method.parameters && method.parameters.length > 0) {
      sections.push(this.heading('Parameters', 4));

      const paramTable = this.table(
        ['Name', 'Type', 'Required', 'Description'],
        method.parameters.map(p => [
          this.inlineCode(p.name),
          this.inlineCode(p.type),
          p.required ? 'Yes' : 'No',
          p.description || '-',
        ])
      );

      sections.push(paramTable);
    }

    // Returns
    if (method.returns) {
      sections.push(this.heading('Returns', 4));
      sections.push(`${this.inlineCode(method.returns.type)} - ${method.returns.description || ''}\n`);
    }

    // Example
    if (method.example) {
      sections.push(this.heading('Example', 4));
      sections.push(this.codeBlock(method.example, 'typescript'));
    }

    return sections.join('\n');
  }

  /**
   * Format class documentation
   */
  public formatClass(cls: {
    name: string;
    description?: string;
    properties?: Array<{ name: string; type: string; description?: string }>;
    methods?: Array<{ name: string; signature: string; description?: string }>;
    example?: string;
  }): string {
    const sections: string[] = [];

    sections.push(this.heading(cls.name, 2));

    if (cls.description) {
      sections.push(cls.description + '\n');
    }

    // Properties
    if (cls.properties && cls.properties.length > 0) {
      sections.push(this.heading('Properties', 3));

      const propTable = this.table(
        ['Name', 'Type', 'Description'],
        cls.properties.map(p => [
          this.inlineCode(p.name),
          this.inlineCode(p.type),
          p.description || '-',
        ])
      );

      sections.push(propTable);
    }

    // Methods
    if (cls.methods && cls.methods.length > 0) {
      sections.push(this.heading('Methods', 3));

      for (const method of cls.methods) {
        sections.push(this.heading(method.name, 4));
        sections.push(this.codeBlock(method.signature, 'typescript'));
        if (method.description) {
          sections.push(method.description + '\n');
        }
      }
    }

    // Example
    if (cls.example) {
      sections.push(this.heading('Example', 3));
      sections.push(this.codeBlock(cls.example, 'typescript'));
    }

    return sections.join('\n');
  }

  /**
   * Format interface documentation
   */
  public formatInterface(iface: {
    name: string;
    description?: string;
    properties: Array<{ name: string; type: string; optional?: boolean; description?: string }>;
    example?: string;
  }): string {
    const sections: string[] = [];

    sections.push(this.heading(iface.name, 2));

    if (iface.description) {
      sections.push(iface.description + '\n');
    }

    // Properties table
    const propTable = this.table(
      ['Property', 'Type', 'Optional', 'Description'],
      iface.properties.map(p => [
        this.inlineCode(p.name),
        this.inlineCode(p.type),
        p.optional ? 'Yes' : 'No',
        p.description || '-',
      ])
    );

    sections.push(propTable);

    // Example
    if (iface.example) {
      sections.push(this.heading('Example', 3));
      sections.push(this.codeBlock(iface.example, 'typescript'));
    }

    return sections.join('\n');
  }

  /**
   * Format changelog entry
   */
  public formatChangelogEntry(entry: {
    version: string;
    date: string;
    changes: {
      added?: string[];
      changed?: string[];
      deprecated?: string[];
      removed?: string[];
      fixed?: string[];
      security?: string[];
    };
  }): string {
    const sections: string[] = [];

    sections.push(this.heading(`[${entry.version}] - ${entry.date}`, 2));

    const categories = [
      { key: 'added', title: 'Added' },
      { key: 'changed', title: 'Changed' },
      { key: 'deprecated', title: 'Deprecated' },
      { key: 'removed', title: 'Removed' },
      { key: 'fixed', title: 'Fixed' },
      { key: 'security', title: 'Security' },
    ];

    for (const category of categories) {
      const items = entry.changes[category.key as keyof typeof entry.changes];
      if (items && items.length > 0) {
        sections.push(this.heading(category.title, 3));
        sections.push(this.list(items));
      }
    }

    return sections.join('\n');
  }

  /**
   * Format migration guide
   */
  public formatMigrationGuide(guide: {
    fromVersion: string;
    toVersion: string;
    breaking?: string[];
    steps: Array<{ title: string; description: string; code?: string }>;
  }): string {
    const sections: string[] = [];

    sections.push(this.heading(`Migration Guide: ${guide.fromVersion} → ${guide.toVersion}`, 1));

    // Breaking changes
    if (guide.breaking && guide.breaking.length > 0) {
      sections.push(this.heading('Breaking Changes', 2));
      sections.push(this.list(guide.breaking));
    }

    // Migration steps
    sections.push(this.heading('Migration Steps', 2));

    guide.steps.forEach((step, index) => {
      sections.push(this.heading(`Step ${index + 1}: ${step.title}`, 3));
      sections.push(step.description + '\n');

      if (step.code) {
        sections.push(this.codeBlock(step.code, 'typescript'));
      }
    });

    return sections.join('\n');
  }
}
