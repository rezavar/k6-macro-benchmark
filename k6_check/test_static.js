import http from 'k6/http';
import { check } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { testConfig } from './config.js';

// تعریف متریک‌های خطا و زمان پاسخ
const staticErrorRate = new Rate('static_errors');
const staticResponseTime = new Trend('static_response_time');

export const options = {
  vus: testConfig.vus,
  iterations: testConfig.iterations,
  systemTags: testConfig.systemTags,
};

export default function () {
  const url = testConfig.endpoints.static;
  const res = http.get(url);

  // بررسی وضعیت پاسخ
  const success = check(res, {
    'static - status was 200': (r) => r.status === 200,
    'static - response time < 10s': (r) => r.timings.duration < testConfig.checks.maxResponseTime,
    'static - response size > 0': (r) => r.body.length > testConfig.checks.minResponseSize,
  });
  
  staticErrorRate.add(!success);
  staticResponseTime.add(res.timings.duration);

  // لاگ اطلاعات
  console.log(`VU: ${__VU}, Iteration: ${__ITER}, Endpoint: static, Response time: ${res.timings.duration}ms, Status: ${res.status}`);
}
