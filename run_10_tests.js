const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = util.promisify(exec);

// تابع برای اجرای اسکریپت تولید گزارش
async function runReportGenerator() {
  try {
    console.log('🚀 در حال اجرای اسکریپت تولید گزارش...');
    const { stdout, stderr } = await execAsync('node scripts/generate_10_tests_report.js');
    
    if (stderr) {
      console.log('⚠️ هشدار:', stderr);
    }
    
    console.log('✅ اسکریپت گزارش با موفقیت اجرا شد');
    return true;
    
  } catch (error) {
    console.error('❌ خطا در اجرای اسکریپت گزارش:', error.message);
    return false;
  }
}

// تابع برای باز کردن فایل HTML
async function openHTMLReport() {
  try {
    const htmlFile = 'test_report_10_runs.html';
    
    // بررسی وجود فایل
    if (!fs.existsSync(htmlFile)) {
      console.error('❌ فایل گزارش HTML یافت نشد:', htmlFile);
      return false;
    }
    
    console.log('🌐 در حال باز کردن گزارش HTML...');
    
    // باز کردن فایل در مرورگر پیش‌فرض
    const { stdout, stderr } = await execAsync(`start ${htmlFile}`);
    
    if (stderr) {
      console.log('⚠️ هشدار:', stderr);
    }
    
    console.log('✅ گزارش HTML در مرورگر باز شد');
    return true;
    
  } catch (error) {
    console.error('❌ خطا در باز کردن گزارش HTML:', error.message);
    return false;
  }
}

// تابع اصلی
async function main() {
  console.log('🎯 شروع فرآیند تست 10 بار و تولید گزارش HTML');
  console.log('='.repeat(60));
  
  try {
    // مرحله 1: اجرای اسکریپت تولید گزارش
    console.log('\n📋 مرحله 1: اجرای اسکریپت تولید گزارش');
    const reportSuccess = await runReportGenerator();
    
    if (!reportSuccess) {
      console.error('❌ تولید گزارش با خطا مواجه شد');
      return;
    }
    
    // صبر کوتاه برای اطمینان از تولید فایل
    console.log('⏳ صبر 2 ثانیه برای اطمینان از تولید فایل...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // مرحله 2: باز کردن گزارش HTML
    console.log('\n🌐 مرحله 2: باز کردن گزارش HTML');
    const openSuccess = await openHTMLReport();
    
    if (!openSuccess) {
      console.error('❌ باز کردن گزارش با خطا مواجه شد');
      return;
    }
    
    console.log('\n🎉 فرآیند کامل شد!');
    console.log('📄 گزارش HTML در مرورگر باز شد');
    console.log('📁 فایل گزارش: test_report_10_runs.html');
    
  } catch (error) {
    console.error('❌ خطا در فرآیند اصلی:', error.message);
  }
}

// اجرای برنامه
main().catch(error => {
  console.error('❌ خطا:', error);
});
