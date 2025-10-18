import { ApiDocumentation, ApiEndpoint } from '../analyzers/api-analyzer';
import { MarkdownFormatter } from './markdown-formatter';

export class OpenApiFormatter {
  private mdFormatter: MarkdownFormatter;

  constructor() {
    this.mdFormatter = new MarkdownFormatter();
  }

  /**
   * Format OpenAPI documentation as JSON
   */
  public formatAsJson(apiDoc: ApiDocumentation): string {
    return JSON.stringify(apiDoc, null, 2);
  }

  /**
   * Format OpenAPI documentation as YAML
   */
  public formatAsYaml(apiDoc: ApiDocumentation): string {
    // Simple YAML conversion (in production, use a proper YAML library)
    return this.jsonToYaml(apiDoc);
  }

  /**
   * Format OpenAPI documentation as Markdown
   */
  public formatAsMarkdown(apiDoc: ApiDocumentation): string {
    const sections: string[] = [];

    // Title
    sections.push(this.mdFormatter.heading(apiDoc.info.title, 1));

    if (apiDoc.info.description) {
      sections.push(apiDoc.info.description + '\n');
    }

    // Version and servers
    sections.push(this.mdFormatter.heading('API Information', 2));
    sections.push(`**Version:** ${apiDoc.info.version}\n`);

    if (apiDoc.servers && apiDoc.servers.length > 0) {
      sections.push(this.mdFormatter.heading('Servers', 3));
      for (const server of apiDoc.servers) {
        sections.push(`- ${server.url}${server.description ? ` - ${server.description}` : ''}`);
      }
      sections.push('');
    }

    // Table of contents
    const toc = this.buildTableOfContents(apiDoc);
    sections.push(toc);

    // Endpoints by tag
    const endpointsByTag = this.groupEndpointsByTag(apiDoc);

    for (const [tag, endpoints] of endpointsByTag) {
      sections.push(this.mdFormatter.heading(tag, 2));

      for (const endpoint of endpoints) {
        sections.push(this.formatEndpoint(endpoint));
      }
    }

    // Schemas
    if (apiDoc.components?.schemas && Object.keys(apiDoc.components.schemas).length > 0) {
      sections.push(this.mdFormatter.heading('Schemas', 2));

      for (const [name, schema] of Object.entries(apiDoc.components.schemas)) {
        sections.push(this.formatSchema(name, schema));
      }
    }

    // Authentication
    if (apiDoc.components?.securitySchemes) {
      sections.push(this.mdFormatter.heading('Authentication', 2));

      for (const [name, scheme] of Object.entries(apiDoc.components.securitySchemes)) {
        sections.push(this.formatSecurityScheme(name, scheme));
      }
    }

    return sections.join('\n');
  }

  /**
   * Format a single API endpoint
   */
  private formatEndpoint(endpoint: {
    path: string;
    method: string;
    endpoint: ApiEndpoint;
  }): string {
    const sections: string[] = [];

    // Endpoint header
    const methodBadge = this.getMethodBadge(endpoint.method.toUpperCase());
    sections.push(this.mdFormatter.heading(`${methodBadge} ${endpoint.path}`, 3));

    // Summary and description
    if (endpoint.endpoint.summary) {
      sections.push(`**${endpoint.endpoint.summary}**\n`);
    }

    if (endpoint.endpoint.description) {
      sections.push(endpoint.endpoint.description + '\n');
    }

    // Deprecated warning
    if (endpoint.endpoint.deprecated) {
      sections.push('> **Warning:** This endpoint is deprecated and may be removed in future versions.\n');
    }

    // Parameters
    if (endpoint.endpoint.parameters && endpoint.endpoint.parameters.length > 0) {
      sections.push(this.mdFormatter.heading('Parameters', 4));

      const paramRows = endpoint.endpoint.parameters.map(p => [
        this.mdFormatter.inlineCode(p.name),
        p.in,
        this.mdFormatter.inlineCode(p.schema.type),
        p.required ? 'Yes' : 'No',
        p.description || '-',
      ]);

      sections.push(this.mdFormatter.table(
        ['Name', 'Location', 'Type', 'Required', 'Description'],
        paramRows
      ));
    }

    // Request body
    if (endpoint.endpoint.requestBody) {
      sections.push(this.mdFormatter.heading('Request Body', 4));

      if (endpoint.endpoint.requestBody.description) {
        sections.push(endpoint.endpoint.requestBody.description + '\n');
      }

      for (const [contentType, content] of Object.entries(endpoint.endpoint.requestBody.content)) {
        sections.push(`**Content-Type:** ${this.mdFormatter.inlineCode(contentType)}\n`);

        if (content.schema) {
          sections.push(this.mdFormatter.codeBlock(
            JSON.stringify(content.schema, null, 2),
            'json'
          ));
        }

        if (content.example) {
          sections.push(this.mdFormatter.heading('Example', 5));
          sections.push(this.mdFormatter.codeBlock(
            JSON.stringify(content.example, null, 2),
            'json'
          ));
        }
      }
    }

    // Responses
    if (endpoint.endpoint.responses) {
      sections.push(this.mdFormatter.heading('Responses', 4));

      for (const [status, response] of Object.entries(endpoint.endpoint.responses)) {
        sections.push(this.mdFormatter.heading(`${status} - ${response.description}`, 5));

        if (response.content) {
          for (const [contentType, content] of Object.entries(response.content)) {
            sections.push(`**Content-Type:** ${this.mdFormatter.inlineCode(contentType)}\n`);

            if (content.schema) {
              sections.push(this.mdFormatter.codeBlock(
                JSON.stringify(content.schema, null, 2),
                'json'
              ));
            }

            if (content.example) {
              sections.push(this.mdFormatter.heading('Example', 6));
              sections.push(this.mdFormatter.codeBlock(
                JSON.stringify(content.example, null, 2),
                'json'
              ));
            }
          }
        }
      }
    }

    // Security
    if (endpoint.endpoint.security && endpoint.endpoint.security.length > 0) {
      sections.push(this.mdFormatter.heading('Security', 4));
      sections.push(this.mdFormatter.list(
        endpoint.endpoint.security.map(s => `${s.type}: ${s.name}`)
      ));
    }

    sections.push(this.mdFormatter.hr());

    return sections.join('\n');
  }

  /**
   * Format a schema definition
   */
  private formatSchema(name: string, schema: any): string {
    const sections: string[] = [];

    sections.push(this.mdFormatter.heading(name, 3));

    if (schema.description) {
      sections.push(schema.description + '\n');
    }

    if (schema.type === 'object' && schema.properties) {
      const propRows = Object.entries(schema.properties).map(([propName, propSchema]: [string, any]) => [
        this.mdFormatter.inlineCode(propName),
        this.mdFormatter.inlineCode(propSchema.type || 'any'),
        schema.required?.includes(propName) ? 'Yes' : 'No',
        propSchema.description || '-',
      ]);

      sections.push(this.mdFormatter.table(
        ['Property', 'Type', 'Required', 'Description'],
        propRows
      ));
    } else {
      sections.push(this.mdFormatter.codeBlock(
        JSON.stringify(schema, null, 2),
        'json'
      ));
    }

    return sections.join('\n');
  }

  /**
   * Format security scheme
   */
  private formatSecurityScheme(name: string, scheme: any): string {
    const sections: string[] = [];

    sections.push(this.mdFormatter.heading(name, 3));

    sections.push(`**Type:** ${scheme.type}\n`);

    if (scheme.scheme) {
      sections.push(`**Scheme:** ${scheme.scheme}\n`);
    }

    if (scheme.bearerFormat) {
      sections.push(`**Bearer Format:** ${scheme.bearerFormat}\n`);
    }

    if (scheme.description) {
      sections.push(scheme.description + '\n');
    }

    return sections.join('\n');
  }

  /**
   * Build table of contents
   */
  private buildTableOfContents(apiDoc: ApiDocumentation): string {
    const sections: Array<{ title: string; anchor: string; level?: number }> = [];

    // Add tags
    const endpointsByTag = this.groupEndpointsByTag(apiDoc);
    for (const tag of endpointsByTag.keys()) {
      sections.push({
        title: tag,
        anchor: this.mdFormatter.anchor(tag),
        level: 1,
      });
    }

    // Add schemas
    if (apiDoc.components?.schemas && Object.keys(apiDoc.components.schemas).length > 0) {
      sections.push({
        title: 'Schemas',
        anchor: 'schemas',
        level: 1,
      });
    }

    // Add authentication
    if (apiDoc.components?.securitySchemes) {
      sections.push({
        title: 'Authentication',
        anchor: 'authentication',
        level: 1,
      });
    }

    return this.mdFormatter.tableOfContents(sections);
  }

  /**
   * Group endpoints by tag
   */
  private groupEndpointsByTag(apiDoc: ApiDocumentation): Map<string, Array<{
    path: string;
    method: string;
    endpoint: ApiEndpoint;
  }>> {
    const grouped = new Map<string, Array<{
      path: string;
      method: string;
      endpoint: ApiEndpoint;
    }>>();

    for (const [path, methods] of Object.entries(apiDoc.paths)) {
      for (const [method, endpoint] of Object.entries(methods)) {
        const tags = endpoint.tags || ['Default'];

        for (const tag of tags) {
          if (!grouped.has(tag)) {
            grouped.set(tag, []);
          }

          grouped.get(tag)!.push({
            path,
            method,
            endpoint,
          });
        }
      }
    }

    return grouped;
  }

  /**
   * Get method badge/color
   */
  private getMethodBadge(method: string): string {
    const badges: Record<string, string> = {
      'GET': '🟢 GET',
      'POST': '🟡 POST',
      'PUT': '🔵 PUT',
      'DELETE': '🔴 DELETE',
      'PATCH': '🟣 PATCH',
    };

    return badges[method] || method;
  }

  /**
   * Simple JSON to YAML converter
   */
  private jsonToYaml(obj: any, indent: number = 0): string {
    const spaces = '  '.repeat(indent);
    const lines: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        lines.push(`${spaces}${key}: null`);
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        lines.push(`${spaces}${key}:`);
        lines.push(this.jsonToYaml(value, indent + 1));
      } else if (Array.isArray(value)) {
        lines.push(`${spaces}${key}:`);
        value.forEach(item => {
          if (typeof item === 'object') {
            lines.push(`${spaces}- `);
            lines.push(this.jsonToYaml(item, indent + 1).replace(new RegExp(`^${spaces}`, 'gm'), `${spaces}  `));
          } else {
            lines.push(`${spaces}- ${item}`);
          }
        });
      } else if (typeof value === 'string') {
        lines.push(`${spaces}${key}: "${value}"`);
      } else {
        lines.push(`${spaces}${key}: ${value}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate Postman collection
   */
  public generatePostmanCollection(apiDoc: ApiDocumentation): any {
    const collection = {
      info: {
        name: apiDoc.info.title,
        description: apiDoc.info.description,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      item: [] as any[],
    };

    const endpointsByTag = this.groupEndpointsByTag(apiDoc);

    for (const [tag, endpoints] of endpointsByTag) {
      const folder = {
        name: tag,
        item: endpoints.map(e => this.endpointToPostmanRequest(e, apiDoc)),
      };

      collection.item.push(folder);
    }

    return collection;
  }

  /**
   * Convert endpoint to Postman request
   */
  private endpointToPostmanRequest(endpoint: {
    path: string;
    method: string;
    endpoint: ApiEndpoint;
  }, apiDoc: ApiDocumentation): any {
    const baseUrl = apiDoc.servers?.[0]?.url || 'http://localhost:3000';

    return {
      name: endpoint.endpoint.summary || endpoint.endpoint.operationId || endpoint.path,
      request: {
        method: endpoint.method.toUpperCase(),
        header: [],
        url: {
          raw: `${baseUrl}${endpoint.path}`,
          host: [baseUrl],
          path: endpoint.path.split('/').filter(Boolean),
        },
        description: endpoint.endpoint.description,
      },
    };
  }
}
