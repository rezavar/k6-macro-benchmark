import http from 'k6/http';
import { check } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { testConfig } from './config.js';

// تعریف متریک‌های خطا و زمان پاسخ
const randomErrorRate = new Rate('random_errors');
const randomResponseTime = new Trend('random_response_time');

export const options = {
  vus: testConfig.vus,
  iterations: testConfig.iterations,
  systemTags: testConfig.systemTags,
};

export default function () {
  const url = testConfig.endpoints.random;
  const res = http.get(url);

  // بررسی وضعیت پاسخ
  const success = check(res, {
    'random - status was 200': (r) => r.status === 200,
    'random - response time < 10s': (r) => r.timings.duration < testConfig.checks.maxResponseTime,
    'random - response size > 0': (r) => r.body.length > testConfig.checks.minResponseSize,
  });
  
  randomErrorRate.add(!success);
  randomResponseTime.add(res.timings.duration);

  // لاگ اطلاعات
  console.log(`VU: ${__VU}, Iteration: ${__ITER}, Endpoint: random, Response time: ${res.timings.duration}ms, Status: ${res.status}`);
}
