import http from 'k6/http';
import { check } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { testConfig } from './config.js';

// تعریف متریک‌های خطا و زمان پاسخ
const oldErrorRate = new Rate('old_errors');
const oldResponseTime = new Trend('old_response_time');

export const options = {
  vus: testConfig.vus,
  iterations: testConfig.iterations,
  systemTags: testConfig.systemTags,
};

export default function () {
  const url = testConfig.endpoints.old;
  const res = http.get(url);

  // بررسی وضعیت پاسخ
  const success = check(res, {
    'old - status was 200': (r) => r.status === 200,
    'old - response time < 10s': (r) => r.timings.duration < testConfig.checks.maxResponseTime,
    'old - response size > 0': (r) => r.body.length > testConfig.checks.minResponseSize,
  });
  
  oldErrorRate.add(!success);
  oldResponseTime.add(res.timings.duration);

  // لاگ اطلاعات
  console.log(`VU: ${__VU}, Iteration: ${__ITER}, Endpoint: old, Response time: ${res.timings.duration}ms, Status: ${res.status}`);
}
