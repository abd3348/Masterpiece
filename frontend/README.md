# Campus Mate — ASP.NET Core MVC

افتح `CampusMate.slnx` في Visual Studio وشغّل مشروع **CampusMate**. الموقع على http://localhost:5080، والبيانات في SQL Server المحلي بقاعدة `MasterDB`.

```powershell
dotnet run --project backend/CampusMate.csproj --launch-profile CampusMate
```

## تنظيم المشروع

```text
backend/
  Controllers/           مسارات الموقع وطلبات API
  Models/                كيانات قاعدة البيانات، ملف لكل كيان
  ViewModels/            بيانات عرض صفحات Razor
  Views/                 صفحات cshtml والتخطيط المشترك
  Services/              منطق الحسابات والعقارات والإيجار
  Data/
    AppDbContext.cs      ربط EF Core بالجداول
    Configurations/     الأعمدة والعلاقات والقيود
  Migrations/            تغييرات مخطط قاعدة البيانات وSnapshot
  wwwroot/               CSS وJavaScript والصور، نسخة مصدر واحدة
  App_Data/              الملفات المرفوعة ومفاتيح الجلسات الخاصة
```

- [تشغيل التطبيق والخدمات والحسابات](backend/README.md)
- [AppDbContext وMigrations وأوامر Visual Studio](docs/DATABASE_MIGRATIONS.md)
- [نتيجة إعادة الترتيب والاختبارات](docs/MVC_REFACTOR.md)
- [فلو الزملاء والإيجار ومراجعة الأدمن](docs/SHARED_RENTAL_WORKFLOW.md)
- [توثيق قاعدة البيانات الحالي والرسومات التفاعلية](docs/database/database.html) · [كويري الإنشاء للشرح](database/MasterDB-current-schema.sql)
- [التدقيق الوظيفي السابق والمشاكل المسجلة](docs/TEST_AUDIT_2026-11-06.md)

قاعدة MasterDB الموجودة اعتُمدت في سجل EF بعد مطابقة مخططها، دون إعادة إنشاء جداولها أو حذف بياناتها. لقاعدة جديدة استخدم Migrations؛ التفاصيل في الدليل أعلاه.

## مصدر التصميم والنسخة المستقلة

`html/` مصدر توليد صفحات Razor. عند تعديل تصميمه:

```powershell
node tools/build-pages.js
node tools/build-razor-views.cjs
```

`index.html` في الجذر نسخة عرض مستقلة تستخدم ملفات `backend/wwwroot` نفسها؛ فتحها مباشرة يستعمل بيانات تجريبية مؤقتة. الحفظ الفعلي بقاعدة SQL يتم عند استخدام تطبيق ASP.NET على localhost.

زر الشمس/القمر يبدّل بين المظهرين مع انتقال دائري من مكان الزر، ويحفظ الاختيار محليًا. التنفيذ المشترك في `backend/wwwroot/js/theme.js` و`backend/wwwroot/css/theme.css` ويشمل صفحات Razor والنسخة المستقلة. يراعي تفضيل تقليل الحركة، ولا يغيّر بيانات الحساب أو النماذج.

`data/campus-seed.json` مصدر بيانات العرض. بعد تعديله شغّل `node tools/build-seed.js`. ملفات `database/` و`docs/database/` توثّق مخطط SQL، وليست بديلًا عن Migrations عند إنشاء قاعدة جديدة.

## الفحص

```powershell
node --test tests/api.test.cjs tests/http.test.cjs tests/structure.test.cjs tests/rental-ui.test.cjs
node tests/backend-integration.cjs
node tests/backend-browser.cjs
```

اختبارات Backend تحتاج التطبيق شغّالًا وSQL متاحًا. تنشئ حسابات وسجلات اختبار مستقلة وتتركها للمراجعة؛ لا تصفّر القاعدة. الفيديو الخاص بالاختبارات داخل `tests/fixtures` ولا يُنشر مع الموقع.
