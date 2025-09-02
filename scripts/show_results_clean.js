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
    if (httpReqFailed === 0 && httpReqs > 0) {
      status = '✅ عالی';
    } else if (httpReqFailed > 0 && httpReqs > 0) {
      status = '⚠️ هشدار';
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
      status: status
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
      status: '❌ خطا در خواندن فایل'
    };
  }
}

// تابع برای نمایش جدول ساده و خوانا
function displayResultsTable(results) {
  console.log('\n🎯 نتایج تست همزمانی سه endpoint');
  console.log('='.repeat(80));
  
  // هدر جدول
  console.log('\n| Endpoint | درخواست‌ها | خطاها | موفقیت | متوسط | سریع‌ترین | کندترین | P95   | P99   | وضعیت |');
  console.log('|----------|------------|-------|---------|--------|------------|----------|-------|-------|--------|');
  
  // نمایش نتایج
  results.forEach(result => {
    const endpoint = result.endpoint.padEnd(8);
    const requests = result.requests.toString().padEnd(10);
    const errors = result.errors.toString().padEnd(5);
    const successRate = result.successRate.padEnd(7);
    const avgTime = result.avgTime.padEnd(6);
    const minTime = result.minTime.padEnd(10);
    const maxTime = result.maxTime.padEnd(8);
    const p95Time = result.p95Time.padEnd(5);
    const p99Time = result.p99Time.padEnd(5);
    const status = result.status;
    
    console.log(`| ${endpoint} | ${requests} | ${errors} | ${successRate} | ${avgTime} | ${minTime} | ${maxTime} | ${p95Time} | ${p99Time} | ${status} |`);
  });
  
  console.log('|----------|------------|-------|---------|--------|------------|----------|-------|-------|--------|');
}

// تابع برای نمایش خلاصه آماری
function displaySummary(results) {
  console.log('\n📊 خلاصه آماری:');
  console.log('='.repeat(50));
  
  const totalRequests = results.reduce((sum, r) => sum + r.requests, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
  const avgResponseTime = results.reduce((sum, r) => {
    const time = parseFloat(r.avgTime.replace('ms', ''));
    return sum + (isNaN(time) ? 0 : time);
  }, 0) / results.length;
  
  console.log(`📈 کل درخواست‌ها: ${totalRequests}`);
  console.log(`❌ کل خطاها: ${totalErrors}`);
  console.log(`⏱️  میانگین زمان پاسخ: ${avgResponseTime.toFixed(0)}ms`);
  console.log(`🎯 نرخ موفقیت کلی: ${((totalRequests - totalErrors) / totalRequests * 100).toFixed(1)}%`);
  
  // بهترین و بدترین endpoint
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
  
  console.log(`\n🏆 بهترین عملکرد: ${bestEndpoint.endpoint} (${bestEndpoint.avgTime})`);
  console.log(`🐌 کندترین عملکرد: ${worstEndpoint.endpoint} (${worstEndpoint.avgTime})`);
  
  // تحلیل تفاوت‌ها
  const timeDiff = parseFloat(worstEndpoint.avgTime.replace('ms', '')) - parseFloat(bestEndpoint.avgTime.replace('ms', ''));
  const percentDiff = ((timeDiff / parseFloat(bestEndpoint.avgTime.replace('ms', ''))) * 100).toFixed(1);
  
  console.log(`\n📈 تفاوت عملکرد: ${timeDiff}ms (${percentDiff}% کندتر)`);
}

// تابع اصلی
function main() {
  console.log('🔍 در حال خواندن نتایج تست‌ها...');
  
  const results = resultFiles.map(test => {
    return processJsonFile(test.file, test.name);
  });
  
  // نمایش جدول
  displayResultsTable(results);
  
  // نمایش خلاصه
  displaySummary(results);
  
  console.log('\n🎉 تحلیل کامل شد!');
}

// اجرای برنامه
main();
