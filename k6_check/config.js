// فایل تنظیمات مشترک برای تست‌های K6
export const testConfig = {
  // تنظیمات کاربران و درخواست‌ها
  vus: 150, // تعداد کاربران مجازی همزمان
  iterations: 600, // تعداد درخواست‌ها برای هر endpoint
  
  // تنظیمات سیستم
  systemTags: ['proto', 'subproto', 'status', 'method', 'url', 'name', 'group', 'check'],
  
  // آدرس‌های endpoint ها
  endpoints: {
    old: 'http://idea.local/site/old',
    random: 'http://idea.local/site/random',
    static: 'http://idea.local/site/static'
  },
  
  // تنظیمات چک‌ها
  checks: {
    maxResponseTime: 10000, // حداکثر زمان پاسخ (میلی‌ثانیه)
    minResponseSize: 0 // حداقل اندازه پاسخ
  }
};
