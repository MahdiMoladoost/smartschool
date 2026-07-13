# آکادمی کالاف

یک اپ اندروید فارسی و RTL برای آموزش مهارت‌های **Call of Duty: Mobile**؛ ساخته‌شده با Kotlin و Jetpack Compose.

> این پروژه یک راهنمای آموزشی مستقل و غیررسمی است و هیچ وابستگی یا تأیید رسمی از Activision یا Call of Duty ندارد. هیچ تصویر، لوگو یا فایل رسمی بازی داخل پروژه استفاده نشده است.

## امکانات نسخه ۱

- ۶ مسیر مهارتی و ۱۸ درس آفلاین فارسی
- آموزش نشانه‌گیری، حرکت، گیم‌سنس، لوداوت، رنک و بتل رویال
- جست‌وجو و فیلتر دوره‌ها
- ذخیره دوره‌های محبوب
- ثبت پیشرفت و تکمیل درس‌ها روی دستگاه
- صفحه ادامه یادگیری و پروفایل تمرینی
- طراحی تیره، واکنش‌گرا و راست‌به‌چپ
- خروجی Release به‌صورت APK و AAB در GitHub Actions

## فناوری

- Kotlin 2.0.21
- Jetpack Compose + Material 3
- معماری تک‌اکتیویتی با ViewModel و StateFlow
- SharedPreferences برای پیشرفت آفلاین
- Android 7.0+ (minSdk 24)

## اجرای پروژه

پروژه را با Android Studio باز و Sync کنید، سپس کانفیگ `app` را اجرا کنید.

از خط فرمان، در محیطی که Android SDK و Gradle 8.9 نصب است:

~~~bash
gradle testDebugUnitTest lintDebug assembleDebug
~~~

## ساخت Release

نسخه قابل نصب و فایل Play Store:

~~~bash
gradle testDebugUnitTest lintDebug assembleRelease bundleRelease
~~~

اگر keystore تولیدی تنظیم نشده باشد، Release برای تست با کلید debug امضا می‌شود. برای انتشار واقعی این متغیرها را تنظیم کنید:

~~~text
ANDROID_KEYSTORE_PATH
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
~~~

در GitHub همین مقادیر با Secrets زیر دریافت می‌شوند:

~~~text
RELEASE_KEYSTORE_BASE64
RELEASE_KEYSTORE_PASSWORD
RELEASE_KEY_ALIAS
RELEASE_KEY_PASSWORD
~~~

Workflow روی هر Pull Request تست و lint را اجرا می‌کند. Push روی `main` یا تگ `v*` نیز APK و AAB را در artifact با نام `codm-academy-release` قرار می‌دهد.

## ساختار اصلی

~~~text
app/src/main/java/ir/mahdimoladoost/codmacademy/
├── data/       محتوای آموزشی و ذخیره پیشرفت
├── model/      مدل دوره و درس
├── ui/         صفحات Compose و ViewModel
└── MainActivity.kt
~~~

## بررسی سریع ساختار

~~~bash
./scripts/verify-structure.sh
~~~

## مجوز

کد پروژه تحت مجوز Apache 2.0 منتشر شده است. نام‌ها و علائم تجاری متعلق به صاحبان آن‌ها هستند.
