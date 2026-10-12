# ربط Campus Mate مع ASP.NET لاحقًا

الواجهة جاهزة لإرسال واستقبال JSON وفق عقد محدد. الباك إند نفسه غير موجود في هذا المشروع؛ المسارات التالية عقد مقترح تنفّذه في ASP.NET Core.

## الملفات

| الملف | الاستخدام |
| --- | --- |
| `data/campus-seed.json` | بيانات تجريبية، بأسماء حقول camelCase وأرقام فعلية وأسعار بالدينار |
| `data/api-examples.json` | أمثلة JSON للتسجيل والتفضيلات والطلبات والتقارير والأخطاء |
| `docs/openapi.json` | وصف OpenAPI 3.0.3 للمسارات والـ DTOs والصلاحيات |
| `js/config.js` | وضع التشغيل وعنوان API والمهلة واسم ترويسة CSRF |
| `js/http.js` | fetch، تحويل JSON، Cookies، CSRF، الأخطاء والمهلة |
| `js/remote.js` | ربط خدمات الصفحات بمسارات الباك إند |
| `js/api.js` | خدمات التجربة والحسابات التي تعمل بالفرونت إند |

JSON التجربة ليس قاعدة بيانات ولا يُكتب إليه من المتصفح. بيانات التجربة تبقى في الذاكرة. في وضع API، السيرفر هو المسؤول عن الحفظ، وتستعيد الواجهة البيانات من السيرفر بعد تحديث الصفحة.

## تفعيل الربط

أبقِ `mode: 'demo'` أثناء بناء الباك إند. بعد تنفيذ العقد، عدّل `js/config.js`:

```js
window.CampusConfig = Object.freeze({
    mode: 'api',
    apiBaseUrl: 'https://localhost:7001/api',
    seedUrl: 'data/campus-seed.json',
    credentials: 'include',
    timeoutMs: 15000,
    csrfHeader: 'X-CSRF-TOKEN'
});
```

شغّل الواجهة عبر HTTP/HTTPS. فتح الملفات مباشرة يدعم وضع التجربة فقط. يمكن استضافة `index.html` ومجلدات `html` و`css` و`js` و`data` داخل `wwwroot` في مشروع ASP.NET واستخدام `apiBaseUrl: '/api'`، وهو الخيار الأبسط عندما تكون الواجهة والـ API على نفس الأصل.

احتفظ بالمجلدات الفرعية كما هي: صفحات المستأجر تحت `html/tenant/` وصاحب الشقة تحت `html/landlord/` والإدارة تحت `html/admin/`. ملفات السلوك مقسمة داخل `js/` حسب الدور، وتعريف المسارات في `js/routes.js`. نقل الصفحات لا يغيّر مسارات API؛ راجع [دليل تنظيم المشروع](PROJECT_STRUCTURE.md).

واجهة API تعتمد Cookie authentication في هذا العقد. لا تستخدم LocalStorage أو SessionStorage أو تخزين JWT. لا يوجد تبديل دور داخل الواجهة، سواء في وضع التجربة أو API؛ يُحدد الدور من الحساب عند تسجيل الدخول. الحسابات الأساسية في JSON ثلاثة: tenant وlandlord وadmin. ملفات `roommates` بيانات للاختيار وليست حسابات دخول إضافية.

طلب الإيجار يتضمن `roommate` و`roommateId`. عند السكن وحده أرسل `roommate: false` و`roommateId: null`. عند المشاركة أرسل `roommate: true` ومعرف الشخص الذي اختاره المستأجر. تحقق في السيرفر من وجود الشخص وإتاحته، ثم أعد `roommateName` من بياناته ضمن الطلب والاتفاقية؛ لا تثق باسم يرسله العميل. أمثلة الحالتين في `data/api-examples.json`. الاختيار المبدئي في صفحة الزملاء مؤقت داخل الواجهة، أما الاختيار الذي أُرسل مع الطلب فيحفظه السيرفر مع الطلب.

## التحميل الأول وإعادة المزامنة

نفّذ `GET /api/bootstrap` مع السماح للزائر غير المسجل بالوصول إليه. يجب أن يعيد كائنًا بهذا الشكل، حتى عندما تكون بعض القوائم فارغة:

```json
{
  "schemaVersion": 1,
  "currentUser": null,
  "preferences": null,
  "csrfToken": "server-generated-request-token",
  "users": [],
  "properties": [],
  "roommates": [],
  "requests": [],
  "rentals": [],
  "contacts": [],
  "conversations": [],
  "reports": [],
  "activity": [],
  "saved": [],
  "notifications": []
}
```

رد الزائر يتضمن العقارات المنشورة وبيانات زملاء السكن العامة، مع `currentUser: null` والقوائم الخاصة فارغة. بعد الدخول، يعود `currentUser` ببيانات الحساب، وتُملأ القوائم حسب الحساب وصلاحياته:

- المستأجر: طلباته وإيجاراته وتفضيلاته ومفضّلته ومحادثاته وطلبات التواصل المرسلة والواردة.
- المالك: عقاراته، طلبات المستأجرين المتعلقة بها، الإيجارات المرتبطة بها ومحادثاته.
- الإدارة: المستخدمون والعقارات والبلاغات والنشاط الذي يحق لها مشاهدته.

يُعاد طلب `bootstrap` بعد العمليات التي تغيّر البيانات وعند التنقل بين الصفحات. هذه واجهة HTTP؛ الرسائل الواردة تظهر عند إعادة فتح الصفحة أو تحديثها، ولا يوجد اتصال SignalR حاليًا.

لا تُرجع كلمات المرور أو password hashes في JSON. `users` في رد المستأجر أو المالك يمكن أن تكون فارغة. هويات المرسل والمالك والأسعار النهائية وحالة الطلب تأتي من السيرفر.

## المسارات الأساسية

العنوان في الإعداد ينتهي بـ `/api`، لذلك المسارات داخل العميل لا تكرر هذه البادئة.

| القسم | المسارات |
| --- | --- |
| الحساب | `POST /auth/register`، `POST /auth/login`، `POST /auth/logout`، `PUT /me/profile` |
| التفضيلات | `GET /me/preferences`، `PUT /me/preferences`، `DELETE /me/preferences` |
| المفضلة | `PUT /me/favorites/{id}`، `DELETE /me/favorites/{id}` |
| العقارات | `GET /properties`، `GET /properties/{id}`، `POST /properties`، `PUT /properties/{id}` |
| إدارة إعلان المالك | `PUT /properties/{id}/status` |
| التقييم والبلاغ | `POST /properties/{id}/reviews`، `POST /properties/{id}/reports` |
| الطلب | `GET /rental-requests`، `POST /rental-requests`، `GET /rental-requests/{id}` |
| مراجعة واتفاقية | `POST /rental-requests/{id}/review`، `POST /rental-requests/{id}/agreement` |
| فحص وتأكيد اتفاق مباشر | `POST /rental-requests/{id}/inspection`، `POST /rental-requests/{id}/confirm-arrangement` |
| رسوم إعلان المالك | `POST /properties/{id}/listing-fee/checkout` |
| الإيجارات | `GET /rentals`، `POST /rentals/{id}/move-in`، `POST /rentals/{id}/close` |
| تقارير الفيديو | `PUT /rentals/{id}/conditions/initial`، `PUT /rentals/{id}/conditions/final` |
| التواصل | `POST /roommate-contacts`، `POST /roommate-contacts/{id}/accept` |
| اللقاءات | `GET /meetings`، `POST /meetings`، `POST /meetings/{id}/response`، `POST /meetings/{id}/cancel`، `GET /meetings/{id}/room` |
| الإدارة | `PUT /admin/users/{id}/status`، `POST /admin/properties/{id}/review`، `POST /admin/reports/{id}/resolve` |
| الوسائط والمساعد | `POST /media`، `POST /assistant/messages` |

تفاصيل الحقول وأكواد HTTP موجودة في `openapi.json`. يمكن فتحه بأدوات OpenAPI أو Swagger Editor. ردود القوائم مثل `/properties` و`/rentals` هي مصفوفات JSON مباشرة، وليست `{ data: [...] }` أو استجابات paginated في هذا الإصدار.

## الحقول والقيم

- أسماء الحقول: `firstName` و`propertyId` و`startDate`، بحروف camelCase.
- `Property.id` و`propertyId` أرقام صحيحة يمكن تمثيلها بدقة في JavaScript. بقية الهويات نصوص، ويمكن استخدام GUIDs في ASP.NET.
- الأسعار JSON numbers، واستخدم `decimal` في حسابات ASP.NET. العملة في الواجهة JOD.
- التواريخ `YYYY-MM-DD`، والطوابع الزمنية ISO 8601 مثل `2026-10-09T12:00:00Z`.
- الأدوار `tenant`، `landlord`، `admin`.
- مراحل الطلب `submitted → approved → inspection → payment → active → closed`، أو `rejected` عند الرفض.
- مراحل الإعلان `published`، `pending`، `archived`، `deleted`.
- فترة الإيجار `Monthly` أو `Daily`. حافظ على قيم النصوص كما في العقد؛ سياسة camelCase تخص أسماء الخصائص، وليس تغيير قيم النصوص.
- `Request.property` يمثل بيانات العقار المتفق عليها وقت الطلب، حتى لا يغيّر تعديل سعر الإعلان لاحقًا شروط الإيجار القديم.
- `GET /me/preferences` يمكن أن يعيد `null`. استخدم DELETE لإعادة ضبط التفضيلات.
- طلب التواصل يتضمن `userId` للمرسل و`personId` لملف الشخص المستهدف. أضف `recipientId` و`senderName` للطلبات الواردة؛ تعرضها صفحة زملاء السكن للمستلم ليقبلها. قبول التواصل يُرجع `Conversation`، وإنشاء محادثة زميل سكن يتطلب قبول التواصل مسبقًا.

## التسجيل والصلاحيات والدفع

يرجع التسجيل والدخول `User` مباشرة، ويُنشئ السيرفر جلسة Cookie. لا تُرسل `role: admin` من تسجيل المستخدم العادي. يتحقق السيرفر من الدور والملكية والمشاركة في المحادثة ومن حالة الطلب قبل تعديلها.

الواجهة ترسل معلومات طلب الإيجار فقط. احسب السعر والتأمين والإجمالي ونهاية الإيجار وتوفر العقار في السيرفر. تحقق من التواريخ المتعارضة داخل قاعدة البيانات؛ فحص التوفر بالواجهة يعتمد على البيانات المعروضة وليس حجزًا نهائيًا.

`POST /properties/{id}/listing-fee/checkout` ينشئ جلسة رسوم نشر إعلان بقيمة **20 JOD** للمالك فقط، ويعيد:

```json
{ "checkoutUrl": "https://payment-provider.example/checkout/session-id" }
```

تنتقل الواجهة إلى هذا الرابط لتحصيل رسوم الإعلان فقط. ينشئ `POST /properties` إعلانًا بحالة `awaiting-fee` وسجل `listingFee` غير مدفوع. تحقق من ملكية الإعلان، واحسب مبلغ 20 دينارًا في السيرفر، وامنع إعادة التحصيل لنفس الإعلان المدفوع. أكد الدفع عبر مزود الدفع في الباك إند، ثم انشر الإعلان أو أرسله لمراجعة الإدارة. لا يكفي رجوع المتصفح لإثبات الدفع. تعديل الإعلان وإعادة تفعيله لا يفرضان رسوم نشر جديدة.

لا يوجد checkout لإيجار المستأجر. يسجل `POST /rental-requests/{id}/confirm-arrangement` الاتفاق المباشر بعد موافقة المالك والاتفاقية والفحص، ويعيد `{ "rentalId": "..." }`. لا يتواصل هذا المسار مع مزود دفع، ولا يسجل دفعات أو إيصالات إيجار. تبقى `Rental.payments` فارغة و`paymentMethod` يساوي `direct-to-landlord`. الحالة الداخلية القديمة `payment` تمثل انتظار تأكيد الاتفاق المباشر للتوافق مع مسارات الواجهة الحالية، وليست مرحلة تحصيل مال. السعر والتأمين المعروضان تقدير للشروط المباشرة بين الطرفين.

التوافق وتقارير الصور وترند السوق الحالي تبقى حسابات وعروض فرونت إند توضيحية. المساعد في وضع API يرسل السؤال إلى `/assistant/messages` وينتظر `{ "text": "..." }`. تحليل AI حقيقي ومقارنة محتوى الفيديو يحتاجان تنفيذًا منفصلًا في الباك إند.

## دعوات اللقاءات

يتضمن `Bootstrap.meetings` لقاءات المستخدم الحالي فقط. يرسل `MeetingInput` نوع اللقاء (`property` أو `roommate`) ومعرّف العقار أو الملف، وعنوان اللقاء و`startsAt` كوقت ISO مع منطقة زمنية، والمدة 15 أو 30 أو 60 دقيقة. تنسيق العرض والإدخال بتوقيت `Asia/Amman`. يدعو المستأجر صاحب العقار من بيانات العقار، ويدعو المالك مستأجرًا محددًا عبر `peerId` بشرط وجود طلب إيجار لعقاره من هذا المستأجر. لا تثق بمعرّفات المرسل أو المشاركين الواردة من العميل.

في لقاء زملاء السكن، اربط الملف بحساب مستأجر فعلي عبر `Roommate.userId`، واشتق المستلم من هذا الربط في السيرفر. امنع دعوة النفس والموعد الماضي والمدد غير المدعومة. الرد للمستلم فقط على دعوة معلقة، مع فحص تعارض اللقاءات المقبولة للطرفين داخل معاملة واحدة. الإلغاء للمشاركين فقط. صفحة الانضمام تحصل على الغرفة من `/meetings/{id}/room` بعد التحقق من المشاركة والقبول والوقت (قبل البداية بعشر دقائق حتى نهاية المدة). لا ترجع معرّف الغرفة ضمن قوائم الدعوات العامة ولا تسجّل المكالمة تلقائيًا.

الواجهة تستخدم Jitsi عبر `meet.jit.si`. صلاحيات Campus Mate وحدها لا تمنع الدخول إلى غرفة Jitsi العامة لمن يعرف رابطها؛ في الإنتاج، استخدم مزودًا يدعم مصادقة المشاركين ورموز دخول صادرة من السيرفر أو نشر Jitsi الخاص بمصادقة مناسبة. لا توجد محاكاة لقبول دعوة في وضع API. مسارات المحادثات السابقة باقية للتوافق، لكن واجهة المستخدم تعتمد اللقاءات.

## رفع الصور والفيديو

يرفع العميل الملف أولًا إلى `POST /api/media` باستخدام `multipart/form-data` وحقل اسمه `file`. اربطه في ASP.NET بـ `IFormFile file`. يدير المتصفح ترويسة Content-Type وحدود multipart تلقائيًا. [مرجع Microsoft لرفع الملفات](https://learn.microsoft.com/en-us/aspnet/core/mvc/models/file-uploads).

رد الرفع:

```json
{
  "id": "media-id-from-server",
  "name": "walkthrough.mp4",
  "url": "https://localhost:7001/uploads/walkthrough.mp4"
}
```

تُرسل بيانات الوسيط بعد ذلك ضمن JSON العقار أو تقرير الحالة. لا تُرسل `blob:` أو الملف نفسه كـ JSON. يحمل المالك أو المستأجر الملف الفعلي، ثم تستخدم عمليات التعديل `id` للوسائط الموجودة. يحل السيرفر الهوية إلى ملفه المحفوظ ويُنشئ الرابط، بدل الوثوق برابط يوفره العميل.

الواجهة تقبل صورة حتى 10 MB وفيديو حتى 100 MB. اضبط حدود الطلبات ورفع الملفات في مشروع ASP.NET والاستضافة بما يناسب هذه الأحجام وحدود multipart.

## أخطاء التحقق

أعد HTTP 400 مع `ValidationProblemDetails`، مثل:

```json
{
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": {
    "email": ["Enter a valid email address."],
    "phone": ["Enter a valid Jordanian mobile number."]
  }
}
```

العميل يعرض رسائل الحقول. يتعامل أيضًا مع 401 و403 و404 و409 و204، ومهلة الاتصال والرد غير الصالح. لا يعود إلى نجاح تجريبي عندما يفشل السيرفر. استخدم 409 لتعارض الحجز أو مرحلة الطلب. راجع [Web APIs في ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/web-api).

## إعدادات ASP.NET ذات الصلة

أسماء JSON camelCase تتوافق مع التنسيق المستخدم في واجهات ASP.NET Core. إذا عدّلت إعدادات المشروع، حافظ على `JsonNamingPolicy.CamelCase`. [مرجع تنسيق JSON الرسمي](https://learn.microsoft.com/en-us/aspnet/core/web-api/advanced/formatting).

في هذا العقد، `bootstrap.csrfToken` هو RequestToken يولّده السيرفر مع Cookie الخاصة بـ antiforgery. اضبط `HeaderName` على `X-CSRF-TOKEN` وتحقق منه للعمليات التي تغيّر البيانات، بما فيها الدخول والتسجيل. يرسل العميل الترويسة من الذاكرة. [مرجع antiforgery الرسمي](https://learn.microsoft.com/en-us/aspnet/core/security/anti-request-forgery).

عند استضافة الواجهة والـ API على أصلين مختلفين، أضف سياسة CORS للأصل الفعلي للواجهة مع الطرق والترويسات المطلوبة و`AllowCredentials()`، وأضف middleware في ترتيبه المناسب. عند اختلاف المواقع، اضبط سياسة Cookies بما يناسب الوصول عبر HTTPS. [مرجع Microsoft لإعداد CORS وcredentials](https://learn.microsoft.com/en-us/aspnet/core/security/cors).

## إعادة توليد الملفات والفحص

```text
node tools/build-seed.js
node tools/build-contract.js
node tools/build-pages.js
node --test tests/api.test.cjs tests/http.test.cjs tests/structure.test.cjs
node tests/browser-flow.cjs
node tests/browser-flow.cjs --file
node tests/browser-flow.cjs --api
```

`--api` يستخدم سيرفر HTTP تجريبيًا داخل الاختبار لقياس إرسال JSON والأخطاء والجلسة وتحديث الواجهات. هذا الاختبار ليس مشروع ASP.NET ولا دليلًا على أن الباك إند المستقبلي قد نُفّذ.
