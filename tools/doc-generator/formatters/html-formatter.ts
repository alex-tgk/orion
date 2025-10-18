export class HtmlFormatter {
  /**
   * Convert markdown to HTML
   */
  public markdownToHtml(markdown: string): string {
    // Simple markdown to HTML conversion
    // In production, use a library like marked or markdown-it
    let html = markdown;

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');

    // Code
    html = html.replace(/`(.*?)`/gim, '<code>$1</code>');

    // Links
    html = html.replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2">$1</a>');

    // Line breaks
    html = html.replace(/\n/gim, '<br>');

    return html;
  }

  /**
   * Generate full HTML page
   */
  public generateHtmlPage(content: string, title: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    h1, h2, h3 { color: #2c3e50; }
    h1 { border-bottom: 2px solid #3498db; padding-bottom: 10px; }
    h2 { border-bottom: 1px solid #ecf0f1; padding-bottom: 5px; margin-top: 30px; }
    code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
    pre {
      background: #2c3e50;
      color: #ecf0f1;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
    }
    pre code {
      background: none;
      color: inherit;
      padding: 0;
    }
    a { color: #3498db; text-decoration: none; }
    a:hover { text-decoration: underline; }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }
    th {
      background: #3498db;
      color: white;
    }
    tr:nth-child(even) { background: #f9f9f9; }
    .method-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 3px;
      font-weight: bold;
      font-size: 12px;
      margin-right: 8px;
    }
    .method-get { background: #27ae60; color: white; }
    .method-post { background: #f39c12; color: white; }
    .method-put { background: #3498db; color: white; }
    .method-delete { background: #e74c3c; color: white; }
    .method-patch { background: #9b59b6; color: white; }
    .deprecated {
      background: #e74c3c;
      color: white;
      padding: 10px;
      border-radius: 5px;
      margin: 10px 0;
    }
  </style>
</head>
<body>
  ${content}
</body>
</html>`;
  }

  /**
   * Format API documentation as HTML
   */
  public formatApiDocumentation(apiDoc: any): string {
    const sections: string[] = [];

    sections.push(`<h1>${apiDoc.info.title}</h1>`);

    if (apiDoc.info.description) {
      sections.push(`<p>${apiDoc.info.description}</p>`);
    }

    sections.push(`<p><strong>Version:</strong> ${apiDoc.info.version}</p>`);

    // Endpoints
    sections.push('<h2>Endpoints</h2>');

    for (const [path, methods] of Object.entries(apiDoc.paths)) {
      for (const [method, endpoint] of Object.entries(methods as any)) {
        sections.push(this.formatEndpoint(path, method, endpoint));
      }
    }

    return this.generateHtmlPage(sections.join('\n'), apiDoc.info.title);
  }

  /**
   * Format single endpoint
   */
  private formatEndpoint(path: string, method: string, endpoint: any): string {
    const sections: string[] = [];

    const methodClass = `method-${method.toLowerCase()}`;
    sections.push(`<div class="endpoint">`);
    sections.push(`<h3><span class="method-badge ${methodClass}">${method.toUpperCase()}</span>${path}</h3>`);

    if (endpoint.summary) {
      sections.push(`<p><strong>${endpoint.summary}</strong></p>`);
    }

    if (endpoint.description) {
      sections.push(`<p>${endpoint.description}</p>`);
    }

    if (endpoint.deprecated) {
      sections.push(`<div class="deprecated">⚠ This endpoint is deprecated</div>`);
    }

    // Parameters
    if (endpoint.parameters && endpoint.parameters.length > 0) {
      sections.push('<h4>Parameters</h4>');
      sections.push('<table>');
      sections.push('<tr><th>Name</th><th>Type</th><th>Required</th><th>Description</th></tr>');

      for (const param of endpoint.parameters) {
        sections.push(`<tr>
          <td><code>${param.name}</code></td>
          <td>${param.in}</td>
          <td>${param.required ? 'Yes' : 'No'}</td>
          <td>${param.description || '-'}</td>
        </tr>`);
      }

      sections.push('</table>');
    }

    // Responses
    if (endpoint.responses) {
      sections.push('<h4>Responses</h4>');

      for (const [status, response] of Object.entries(endpoint.responses as any)) {
        sections.push(`<h5>${status} - ${response.description}</h5>`);

        if (response.content) {
          sections.push('<pre><code>' + JSON.stringify(response.content, null, 2) + '</code></pre>');
        }
      }
    }

    sections.push('</div>');

    return sections.join('\n');
  }
}
