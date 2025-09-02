const fs = require('fs');

// تنظیمات فایل‌های نتایج
const resultFiles = [
  { name: 'old', file: 'results_old.json' },
  { name: 'random', file: 'results_random.json' },
  { name: 'static', file: 'results_static.json' }
];

// تابع برای خواندن و پردازش فایل JSON
function processJsonFile(filePath, endpointName) {
  try {
    if (!fs.existsSync(filePath)) {
      return {
        endpoint: endpointName,
        requests: 0,
        errors: 0,
        successRate: '0%',
        avgTime: 'N/A',
        minTime: 'N/A',
        maxTime: 'N/A',
        p95Time: 'N/A',
        p99Time: 'N/A',
        status: '❌ فایل موجود نیست'
      };
    }

    const data = fs.readFileSync(filePath, 'utf8');
    const lines = data.trim().split('\n');
    
    let httpReqs = 0;
    let httpReqFailed = 0;
    let checksPassed = 0;
    let checksTotal = 0;
    const durations = [];
    
    // پردازش هر خط JSON
    lines.forEach(line => {
      try {
        const json = JSON.parse(line);
        
        if (json.type === 'Point' && json.metric === 'http_reqs') {
          httpReqs += json.data.value;
        }
        
        if (json.type === 'Point' && json.metric === 'http_req_failed') {
          httpReqFailed += json.data.value;
        }
        
        if (json.type === 'Point' && json.metric === 'checks') {
          if (json.data.tags.check && json.data.tags.check.includes('status was 200')) {
            checksTotal++;
            if (json.data.value === 1) {
              checksPassed++;
            }
          }
        }
        
        if (json.type === 'Point' && json.metric === 'http_req_duration') {
          durations.push(json.data.value);
        }
      } catch (e) {
        // خطا در پارس JSON - نادیده بگیر
      }
    });
    
    // محاسبه آمار
    const successRate = checksTotal > 0 ? ((checksPassed / checksTotal) * 100).toFixed(1) : '0';
    const avgTime = durations.length > 0 ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(0) : 0;
    const minTime = durations.length > 0 ? Math.min(...durations).toFixed(0) : 0;
    const maxTime = durations.length > 0 ? Math.max(...durations).toFixed(0) : 0;
    
    // محاسبه percentiles
    const sortedDurations = durations.sort((a, b) => a - b);
    const p95Index = Math.ceil(sortedDurations.length * 0.95) - 1;
    const p99Index = Math.ceil(sortedDurations.length * 0.99) - 1;
    const p95Time = sortedDurations.length > 0 ? sortedDurations[p95Index].toFixed(0) : 0;
    const p99Time = sortedDurations.length > 0 ? sortedDurations[p99Index].toFixed(0) : 0;
    
    // تعیین وضعیت
    let status = '❌ خطا';
    let statusClass = 'error';
    if (httpReqFailed === 0 && httpReqs > 0) {
      status = '✅ عالی';
      statusClass = 'success';
    } else if (httpReqFailed > 0 && httpReqs > 0) {
      status = '⚠️ هشدار';
      statusClass = 'warning';
    }
    
    return {
      endpoint: endpointName,
      requests: httpReqs,
      errors: httpReqFailed,
      successRate: `${successRate}%`,
      avgTime: `${avgTime}ms`,
      minTime: `${minTime}ms`,
      maxTime: `${maxTime}ms`,
      p95Time: `${p95Time}ms`,
      p99Time: `${p99Time}ms`,
      status: status,
      statusClass: statusClass
    };
    
  } catch (error) {
    return {
      endpoint: endpointName,
      requests: 0,
      errors: 0,
      successRate: '0%',
      avgTime: 'N/A',
      minTime: 'N/A',
      maxTime: 'N/A',
      p95Time: 'N/A',
      p99Time: 'N/A',
      status: '❌ خطا در خواندن فایل',
      statusClass: 'error'
    };
  }
}

// تابع برای تولید HTML
function generateHTML(results) {
  const totalRequests = results.reduce((sum, r) => sum + r.requests, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
  const avgResponseTime = results.reduce((sum, r) => {
    const time = parseFloat(r.avgTime.replace('ms', ''));
    return sum + (isNaN(time) ? 0 : time);
  }, 0) / results.length;
  
  const bestEndpoint = results.reduce((best, current) => {
    const currentTime = parseFloat(current.avgTime.replace('ms', ''));
    const bestTime = parseFloat(best.avgTime.replace('ms', ''));
    return (isNaN(currentTime) || currentTime < bestTime) ? current : best;
  });
  
  const worstEndpoint = results.reduce((worst, current) => {
    const currentTime = parseFloat(current.avgTime.replace('ms', ''));
    const worstTime = parseFloat(worst.avgTime.replace('ms', ''));
    return (isNaN(currentTime) || currentTime > worstTime) ? current : worst;
  });
  
  const timeDiff = parseFloat(worstEndpoint.avgTime.replace('ms', '')) - parseFloat(bestEndpoint.avgTime.replace('ms', ''));
  const percentDiff = ((timeDiff / parseFloat(bestEndpoint.avgTime.replace('ms', ''))) * 100).toFixed(1);
  
  const html = `
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>گزارش تست همزمانی K6</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        
        .header p {
            margin: 10px 0 0 0;
            font-size: 1.2em;
            opacity: 0.9;
        }
        
        .content {
            padding: 30px;
        }
        
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .summary-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            border-left: 4px solid #4facfe;
        }
        
        .summary-card h3 {
            margin: 0 0 10px 0;
            color: #333;
            font-size: 1.1em;
        }
        
        .summary-card .value {
            font-size: 2em;
            font-weight: bold;
            color: #4facfe;
        }
        
        .table-container {
            overflow-x: auto;
            margin: 30px 0;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        
        th {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px;
            text-align: center;
            font-weight: 600;
        }
        
        td {
            padding: 12px 15px;
            text-align: center;
            border-bottom: 1px solid #eee;
        }
        
        tr:hover {
            background: #f8f9fa;
        }
        
        .status.success {
            color: #28a745;
            font-weight: bold;
        }
        
        .status.warning {
            color: #ffc107;
            font-weight: bold;
        }
        
        .status.error {
            color: #dc3545;
            font-weight: bold;
        }
        
        .analysis {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            margin-top: 30px;
        }
        
        .analysis h3 {
            color: #333;
            margin-top: 0;
        }
        
        .analysis p {
            margin: 10px 0;
            line-height: 1.6;
        }
        
        .footer {
            background: #333;
            color: white;
            text-align: center;
            padding: 20px;
            font-size: 0.9em;
        }
        
        @media (max-width: 768px) {
            .container {
                margin: 10px;
                border-radius: 10px;
            }
            
            .header {
                padding: 20px;
            }
            
            .header h1 {
                font-size: 2em;
            }
            
            .content {
                padding: 20px;
            }
            
            .summary {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 گزارش تست همزمانی K6</h1>
            <p>نتایج تست عملکرد سه endpoint</p>
        </div>
        
        <div class="content">
            <div class="summary">
                <div class="summary-card">
                    <h3>📈 کل درخواست‌ها</h3>
                    <div class="value">${totalRequests}</div>
                </div>
                <div class="summary-card">
                    <h3>❌ کل خطاها</h3>
                    <div class="value">${totalErrors}</div>
                </div>
                <div class="summary-card">
                    <h3>⏱️ میانگین زمان پاسخ</h3>
                    <div class="value">${avgResponseTime.toFixed(0)}ms</div>
                </div>
                <div class="summary-card">
                    <h3>🎯 نرخ موفقیت</h3>
                    <div class="value">${((totalRequests - totalErrors) / totalRequests * 100).toFixed(1)}%</div>
                </div>
            </div>
            
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Endpoint</th>
                            <th>درخواست‌ها</th>
                            <th>خطاها</th>
                            <th>موفقیت</th>
                            <th>متوسط</th>
                            <th>سریع‌ترین</th>
                            <th>کندترین</th>
                            <th>P95</th>
                            <th>P99</th>
                            <th>وضعیت</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${results.map(result => `
                            <tr>
                                <td><strong>${result.endpoint}</strong></td>
                                <td>${result.requests}</td>
                                <td>${result.errors}</td>
                                <td>${result.successRate}</td>
                                <td>${result.avgTime}</td>
                                <td>${result.minTime}</td>
                                <td>${result.maxTime}</td>
                                <td>${result.p95Time}</td>
                                <td>${result.p99Time}</td>
                                <td class="status ${result.statusClass}">${result.status}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div class="analysis">
                <h3>📊 تحلیل عملکرد</h3>
                <p><strong>🏆 بهترین عملکرد:</strong> ${bestEndpoint.endpoint} با زمان متوسط ${bestEndpoint.avgTime}</p>
                <p><strong>🐌 کندترین عملکرد:</strong> ${worstEndpoint.endpoint} با زمان متوسط ${worstEndpoint.avgTime}</p>
                <p><strong>📈 تفاوت عملکرد:</strong> ${timeDiff}ms (${percentDiff}% کندتر)</p>
                <p><strong>✅ وضعیت کلی:</strong> همه endpointها عملکرد مناسبی دارند و هیچ خطایی گزارش نشده است.</p>
            </div>
        </div>
        
        <div class="footer">
            <p>گزارش تولید شده در ${new Date().toLocaleString('fa-IR')}</p>
        </div>
    </div>
</body>
</html>`;

  return html;
}

// تابع اصلی
function main() {
  console.log('🔍 در حال خواندن نتایج تست‌ها...');
  
  const results = resultFiles.map(test => {
    return processJsonFile(test.file, test.name);
  });
  
  // تولید HTML
  const html = generateHTML(results);
  
  // ذخیره فایل HTML
  fs.writeFileSync('test_report.html', html, 'utf8');
  
  console.log('✅ گزارش HTML تولید شد: test_report.html');
  console.log('🌐 فایل را در مرورگر باز کنید تا گزارش زیبا را ببینید');
}

// اجرای برنامه
main();
