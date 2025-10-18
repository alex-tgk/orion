#!/usr/bin/env node

/**
 * Performance Test Report Generator
 * Generates HTML reports from k6 JSON output
 */

const fs = require('fs');
const path = require('path');

const REPORTS_DIR = path.join(__dirname, '..', 'reports');

/**
 * Generate HTML report from JSON data
 */
function generateHTMLReport(jsonData, testName) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${testName} Performance Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #2c3e50; margin-bottom: 30px; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
    h2 { color: #34495e; margin: 30px 0 15px; border-left: 4px solid #3498db; padding-left: 15px; }
    .metric { background: #ecf0f1; padding: 15px; margin: 10px 0; border-radius: 5px; }
    .metric-name { font-weight: bold; color: #2c3e50; }
    .metric-value { color: #27ae60; font-size: 1.2em; margin-top: 5px; }
    .threshold-passed { color: #27ae60; }
    .threshold-failed { color: #e74c3c; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
    .summary-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; }
    .summary-card h3 { font-size: 0.9em; opacity: 0.9; margin-bottom: 10px; }
    .summary-card .value { font-size: 2em; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #3498db; color: white; }
    tr:hover { background: #f5f5f5; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #7f8c8d; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 ${testName} Performance Report</h1>

    <div class="summary-grid">
      ${generateSummaryCards(jsonData)}
    </div>

    <h2>Metrics</h2>
    ${generateMetricsTable(jsonData)}

    <h2>Thresholds</h2>
    ${generateThresholdsTable(jsonData)}

    <h2>Checks</h2>
    ${generateChecksTable(jsonData)}

    <div class="footer">
      <p>Generated on ${new Date().toLocaleString()}</p>
      <p>ORION Performance Testing Suite</p>
    </div>
  </div>
</body>
</html>
  `;

  return html;
}

function generateSummaryCards(data) {
  const cards = [];

  if (data.metrics && data.metrics.http_reqs) {
    cards.push(`
      <div class="summary-card">
        <h3>Total Requests</h3>
        <div class="value">${data.metrics.http_reqs.values.count || 0}</div>
      </div>
    `);
  }

  if (data.metrics && data.metrics.http_req_duration) {
    const avgDuration = data.metrics.http_req_duration.values.avg || 0;
    cards.push(`
      <div class="summary-card">
        <h3>Avg Response Time</h3>
        <div class="value">${avgDuration.toFixed(2)}ms</div>
      </div>
    `);
  }

  if (data.metrics && data.metrics.http_req_failed) {
    const errorRate = (data.metrics.http_req_failed.values.rate || 0) * 100;
    cards.push(`
      <div class="summary-card">
        <h3>Error Rate</h3>
        <div class="value">${errorRate.toFixed(2)}%</div>
      </div>
    `);
  }

  return cards.join('');
}

function generateMetricsTable(data) {
  if (!data.metrics) return '<p>No metrics available</p>';

  const rows = Object.keys(data.metrics)
    .map((key) => {
      const metric = data.metrics[key];
      if (metric.type === 'trend' && metric.values) {
        return `
          <tr>
            <td>${key}</td>
            <td>${metric.values.avg?.toFixed(2) || 'N/A'}</td>
            <td>${metric.values.min?.toFixed(2) || 'N/A'}</td>
            <td>${metric.values.max?.toFixed(2) || 'N/A'}</td>
            <td>${metric.values['p(95)']?.toFixed(2) || 'N/A'}</td>
            <td>${metric.values['p(99)']?.toFixed(2) || 'N/A'}</td>
          </tr>
        `;
      }
      return '';
    })
    .join('');

  return `
    <table>
      <thead>
        <tr>
          <th>Metric</th>
          <th>Avg</th>
          <th>Min</th>
          <th>Max</th>
          <th>P95</th>
          <th>P99</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function generateThresholdsTable(data) {
  if (!data.thresholds) return '<p>No thresholds defined</p>';

  const rows = Object.keys(data.thresholds)
    .map((key) => {
      const threshold = data.thresholds[key];
      const status = threshold.ok
        ? '<span class="threshold-passed">✓ PASSED</span>'
        : '<span class="threshold-failed">✗ FAILED</span>';

      return `
        <tr>
          <td>${key}</td>
          <td>${status}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <table>
      <thead>
        <tr>
          <th>Threshold</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function generateChecksTable(data) {
  if (!data.root_group || !data.root_group.checks) {
    return '<p>No checks available</p>';
  }

  const rows = data.root_group.checks
    .map((check) => {
      const successRate = ((check.passes / (check.passes + check.fails)) * 100).toFixed(2);
      const status =
        check.passes === check.passes + check.fails
          ? '<span class="threshold-passed">✓ PASSED</span>'
          : '<span class="threshold-failed">✗ FAILED</span>';

      return `
        <tr>
          <td>${check.name}</td>
          <td>${check.passes}</td>
          <td>${check.fails}</td>
          <td>${successRate}%</td>
          <td>${status}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <table>
      <thead>
        <tr>
          <th>Check</th>
          <th>Passes</th>
          <th>Fails</th>
          <th>Success Rate</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

/**
 * Main execution
 */
function main() {
  console.log('Generating performance reports...');

  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }

  const jsonFiles = fs
    .readdirSync(REPORTS_DIR)
    .filter((file) => file.endsWith('.json'));

  if (jsonFiles.length === 0) {
    console.log('No JSON reports found. Run performance tests first.');
    return;
  }

  jsonFiles.forEach((jsonFile) => {
    const jsonPath = path.join(REPORTS_DIR, jsonFile);
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

    const testName = jsonFile.replace('-summary.json', '');
    const htmlContent = generateHTMLReport(jsonData, testName);

    const htmlPath = path.join(REPORTS_DIR, `${testName}-report.html`);
    fs.writeFileSync(htmlPath, htmlContent);

    console.log(`✓ Generated report: ${htmlPath}`);
  });

  console.log('\nAll reports generated successfully!');
}

main();
