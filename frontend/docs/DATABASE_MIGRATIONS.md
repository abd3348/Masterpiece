# AppDbContext وMigrations

المشروع يستخدم ASP.NET Core MVC وEF Core 10.0.14 وSQL Server. موديل البيانات في `backend/Models`، والـContext في `backend/Data/AppDbContext.cs`، وإعداد الأعمدة والقيود في `Data/Configurations`.

## القاعدة الحالية

قاعدة `MasterDB` على السيرفر المحلي اعتُمدت بتاريخ 6 نوفمبر 2026. تمت مطابقة الجداول الـ23 بأنواع الأعمدة وقابلية null وidentity وSQL defaults والمفاتيح والعلاقات والفهارس وقيود check. ثم أضيف سجل InitialCreate إلى `__EFMigrationsHistory`، دون إنشاء أو حذف جداول التطبيق أو تغيير بياناتها. جدول SQL Server الإضافي `sysdiagrams` لا يدخل في موديل التطبيق.

مجلد Migrations يحتوي على:

- `InitialCreate`: إنشاء كامل لقاعدة جديدة، وليس Migration فارغة؛ يطابق مخطط القاعدة الموجودة.
- `PreserveExplicitBooleanValues`: تحديث metadata الخاص بحفظ bool صراحة، بدون عمليات SQL على الجداول.
- `SharedRentalConsentAndModeration`: دعوات وموافقات الزملاء ومفضلتهم، وفصل مراجعة الإعلان عن رغبة المالك وتوثيق قرارات البلاغات والتعليق.
- `ConfirmedRentalAmendments`: حفظ طلبات تعديل الاتفاق المؤكد، مع موافقات المالك وكل المستأجرين المتأثرين. أصبح الموديل الحالي 25 جدولًا.
- `AppDbContextModelSnapshot`: يستخدمه EF لاكتشاف التغيير القادم.

طُبقت إضافات الفلو على MasterDB مع نسخة احتياطية ومقارنة البيانات القديمة؛ التفاصيل في [دليل الفلو](SHARED_RENTAL_WORKFLOW.md). أداة baseline تقارن نموذج InitialCreate الأصلي، ثم يطبق `database update` التغييرات اللاحقة.

المقارنة بين قاعدة فارغة أُنشئت بالـMigrations ومخطط الجداول الأصلي أعادت **صفر اختلاف** في الأعمدة والفهارس والعلاقات وقيود check. النتيجة في `tests/artifacts/mvc-refactor/schema-comparison.json`.

## أوامر Visual Studio

افتح `CampusMate.slnx` واختر CampusMate كمشروع بدء التشغيل وكمشروع افتراضي في Package Manager Console:

```powershell
Add-Migration DescribeYourChange -Context AppDbContext
Update-Database -Context AppDbContext
```

راجع كود Migration قبل تطبيقه، خصوصًا عند إعادة تسمية عمود أو تغيير قيد قديم. احتُفظ بأسماء قيود SQL السابقة حتى لا تعيد EF تسميتها أثناء اعتماد القاعدة. بعض قيود UNIQUE القديمة ممثلة بفهرس unique في الموديل؛ إذا غيّرت أحدها مستقبلًا، راجع SQL الناتج لاستخدام إسقاط/تعديل القيد المناسب بدل افتراض أنه فهرس مستقل.

## أوامر الطرفية

من جذر المشروع، استعد الأداة المحلية عند أول إعداد:

```powershell
dotnet tool restore
dotnet ef migrations add DescribeYourChange --project backend/CampusMate.csproj
dotnet ef database update --project backend/CampusMate.csproj
dotnet ef migrations has-pending-model-changes --project backend/CampusMate.csproj
```

الـContextFactory يقرأ appsettings وبيئة التشغيل ومتغيرات البيئة، دون تشغيل الموقع أو إدخال بيانات تطوير أثناء توليد Migration.

## قاعدة جديدة

اختر قاعدة جديدة في الاتصال ثم شغّل `database update`. Migrations تنشئ الجداول؛ لا تشغّل سكربت SQL القديم معها. مثال لمتغير بيئة يقتصر على الطرفية الحالية:

```powershell
$env:ConnectionStrings__CampusMate = 'Server=.;Database=CampusMateNew;Integrated Security=True;Encrypt=True;TrustServerCertificate=True'
dotnet ef database update --project backend/CampusMate.csproj
```

بيانات العرض ليست جزءًا من Migrations. تُضاف فقط عند تشغيل التطبيق في Development مع `Campus:SeedDevelopmentData=true` وعندما يكون Users فارغًا.

## اعتماد نسخة موجودة أخرى من القاعدة

لا تطبّق InitialCreate مباشرة على جداول موجودة. استخدم الأمر التالي أولًا؛ يرفض تسجيل baseline إذا اختلف المخطط المتوقع، ولا يحاول «إصلاح» الاختلاف بحذف أو تغيير الجداول:

```powershell
dotnet run --project backend/CampusMate.csproj --no-launch-profile -- --baseline-existing-database
dotnet ef database update --project backend/CampusMate.csproj
```

الأمر خاص بانتقال قاعدة المخطط الحالي إلى أول Migration. قاعدة أقدم أو مختلفة تحتاج خطة ترقية صريحة قبل اعتمادها؛ وجود جداول بنفس الأسماء وحده لا يكفي. لا حاجة لإعادة هذا الأمر على MasterDB الحالية.

التطبيق يفحص Migrations المعلّقة عند التشغيل ويطلب تطبيقها؛ لا يشغّل ALTER TABLE أو EnsureCreated تلقائيًا. إذا كان الموقع الجاري يحجز DLL، أوقف جلسة التشغيل قبل إعادة Build أو توليد Migration.

مراجع الطريقة: [Microsoft: Migrations](https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/)، [إدارة ومراجعة Migration](https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/managing)، [إنشاء DbContext لأدوات EF](https://learn.microsoft.com/en-us/ef/core/cli/dbcontext-creation).
