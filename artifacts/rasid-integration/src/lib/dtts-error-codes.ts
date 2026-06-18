/** Official DTTS / SFDA رصد error code → bilingual description mapping */

export interface DttsErrorEntry {
  ar: string;
  en: string;
}

export const DTTS_ERROR_CODES: Record<string, DttsErrorEntry> = {
  "00000": { ar: "العملية التي تم تنفيذها على المنتج ناجحة", en: "The operation performed on the product is successful." },
  // ── Auth ──────────────────────────────────────────────────────────────────
  "80000": { ar: "اسم المستخدم أو كلمة المرور غير صحيحة", en: "Invalid Username or Password." },
  "80001": { ar: "اسم المستخدم فارغ", en: "Username is empty." },
  "80002": { ar: "كلمة المرور فارغة", en: "Password is empty." },
  "80003": { ar: "كلمة المرور منتهية الصلاحية", en: "Password has expired." },
  "80004": { ar: "تم حظرك مؤقتاً، الرجاء المحاولة في وقت لاحق", en: "Your user has been temporarily blocked. Please try again later." },
  "80005": { ar: "تم إلغاء تنشيط المستخدم", en: "Your user has been deactivated." },
  "80100": { ar: "خطأ في قاعدة البيانات", en: "Database error." },
  "80199": { ar: "لم يتم العثور على اسم المستخدم لصاحب المصلحة", en: "Stakeholder user with the specified username not found!" },
  "80200": { ar: "لم يتم العثور على صاحب المصلحة", en: "Stakeholder not found." },
  "80201": { ar: "نوع صاحب المصلحة غير صالح", en: "Invalid stakeholder type." },
  "80202": { ar: "صيغة GLN غير صالحة", en: "Invalid GLN format." },
  "80203": { ar: "لا يمكن ترك خانة الاسم فارغة", en: "Name cannot be null." },
  "80204": { ar: "لا يمكن ترك خانة اللقب فارغة", en: "Surname cannot be null." },
  "80205": { ar: "لا يمكن ترك خانة البريد الإلكتروني فارغة", en: "Email cannot be null." },
  "80206": { ar: "لا يمكن ترك خانة اسم المستخدم فارغة", en: "Username cannot be null." },
  "80208": { ar: "قم بتزويد رقم الموقع العالمي لإضافة مستخدم لصاحب المصلحة", en: "To add stakeholder user, provide stakeholder GLN." },
  "80209": { ar: "خطأ غير محدد", en: "Undefined error." },
  "80210": { ar: "الحالة غير صحيحة", en: "Invalid status." },
  "80302": { ar: "لا يمكن ترك خانة الحي فارغة", en: "District ID cannot be null." },
  "80303": { ar: "لا يمكن ترك خانة المنطقة فارغة", en: "Region can not be null." },
  "80304": { ar: "لا يمكن ترك خانة أصحاب المصلحة فارغة", en: "Stakeholder type cannot be null." },
  "80305": { ar: "صاحب المصلحة الرئيسي غير موجود", en: "Parent stakeholder doesnt exist." },
  "80401": { ar: "لا يمكن ترك خانة البلد فارغة", en: "Country ID cannot be null." },
  "80402": { ar: "صيغة معرّف البلد غير صحيح", en: "Invalid country ID format." },
  "80403": { ar: "لا يمكن ترك خانة معرّف المزوّد فارغة", en: "Supplier stakeholder ID cannot be null." },
  "80404": { ar: "صيغة معرّف المزود غير صحيح", en: "Invalid supplier stakeholder ID format." },
  "80405": { ar: "القيمة المصدرة غير صحيحة", en: "Invalid isExported value." },
  "80406": { ar: "القيمة القابلة للتصدير غير صحيحة", en: "Invalid isExportable value." },
  "80500": { ar: "لا يمكن استلام قائمة المزامنة", en: "Sync list cannot be received." },
  "80502": { ar: "لا يمكن ترك خانة المدينة فارغة", en: "City cannot be null." },
  "80503": { ar: "لا يمكن ترك خانة خطوط الطول والعرض خالية", en: "Lat/Lon Fields can not be null." },
  "80504": { ar: "فشل التحقق", en: "Check Failed." },
  "80506": { ar: "المنتج غير موجود", en: "Product Not Found." },
  "80507": { ar: "معرّف المدينة غير صحيح", en: "Invalid city ID." },
  // ── Product / GTIN ────────────────────────────────────────────────────────
  "10007": { ar: "هذا الرقم التسلسلي قد تم تسجيله سابقاً", en: "This Serial Number is already registered." },
  "10008": { ar: "خطأ غير محدد", en: "Undefined Error." },
  "10201": { ar: "منتج غير معرّف", en: "Undefined product." },
  "10202": { ar: "منتج منتهي الصلاحية (لا يمكن تنفيذ هذه العملية)", en: "Expired product (this operation cannot be performed)." },
  "10203": { ar: "معلومات المنتج متناقضة", en: "Product information are inconsistent." },
  "10204": { ar: "المنتج المحدد قد تم بيعه سابقاً", en: "The specified product has already been sold." },
  "10205": { ar: "هذه العملية ممنوعة على هذا المنتج", en: "This operation on this product is forbidden." },
  "10206": { ar: "خطأ في قاعدة البيانات", en: "Database error." },
  "10207": { ar: "هذا المنتج قد تم تصديره سابقاً", en: "The product has already been exported." },
  "10209": { ar: "المنتج مسجل في مخزون صيدلية أخرى", en: "The product is registered in another pharmacy's stock." },
  "10210": { ar: "المنتج مسجل في مخزونك", en: "The product is registered in your stock." },
  "10211": { ar: "المنتج غير مسجل في مخزونك", en: "The product is not registered in your stock." },
  "10214": { ar: "خطأ في تفاصيل مبيعات الصيدلية", en: "Pharmacy Sales Details Error." },
  "10215": { ar: "تم تعليق هذا المنتج لا تستطيع القيام بهذه العملية", en: "The product is blocked, this operation is forbidden." },
  "10216": { ar: "تم سحب هذا المنتج لا تستطيع القيام بهذه العملية", en: "The product is recalled, this operation is forbidden." },
  "10219": { ar: "العملية التي تريد إلغائها لا تخصك", en: "The operation you want to cancel does not belong to you." },
  "10220": { ar: "تم بيع المنتج إلى مؤسسة السداد. يجب إلغاء عملية البيع بناء على وصفة طبية", en: "The product was sold to the reimbursement institution. The sale should be canceled based on prescription." },
  "10221": { ar: "لا يمكن إلغاء بيع المنتج", en: "The sale of the product cannot be canceled." },
  "10222": { ar: "المنتج غير مسجل في مخزونك", en: "The product is not registered in your inventory." },
  "10223": { ar: "المنتج قد تم تسجيله في مخزونك سابقاً", en: "The product is already registered in your inventory." },
  "10224": { ar: "تم بيع المنتج من قبل الصيدلية سابقاً", en: "The product has already been sold by pharmacy." },
  "10225": { ar: "المنتج مسجل في مخزون صاحب مصلحة آخر في الوقت الحالي", en: "The product is registered in another stakeholder's stock at the moment." },
  "10227": { ar: "رقم الموقع العالمي الذي أدخلته ليس خاصاً بصيدلية", en: "The entered GLN is not a pharmacy GLN." },
  "10230": { ar: "تم استهلاك المنتج سابقاً", en: "The product has already been consumed." },
  "10231": { ar: "تم استهلاك المنتج", en: "The product is consumed." },
  "10232": { ar: "المنتج تم استهلاكه من قبل صاحب مصلحة آخر", en: "The product is consumed by another stakeholder." },
  "10233": { ar: "انتهت فترة إلغاء الاستهلاك للمنتج", en: "Your consumption cancellation period for the product has been expired." },
  "10234": { ar: "المنتج لم يتم استهلاكه", en: "The product is not consumed." },
  "10301": { ar: "رقم الموقع العالمي للبائع غير صالح", en: "Invalid Seller Stakeholder number (GLN)." },
  "10302": { ar: "رقم الموقع العالمي للمشتري غير صالح", en: "Invalid Buyer Stakeholder number." },
  "10303": { ar: "المنتج قد تم تسجيله في مخزونك سابقاً", en: "The product is already registered in your inventory." },
  "10304": { ar: "المنتج غير مسجل في مخزونك", en: "The product is not registered in your stock." },
  "10305": { ar: "المنتج مسجل في مخزون صاحب مصلحة آخر", en: "The product is registered in another stakeholder's stock." },
  "10306": { ar: "المنتج المحدد مسجل لشركة مصنّعة أخرى", en: "Indicated product is registered on another manufacturer company." },
  "10307": { ar: "المنتج مسجل لمستودع آخر", en: "The product is registered for another warehouse." },
  "10308": { ar: "المنتج المحدد مسجل لصيدلية أخرى سابقاً", en: "The product is already registered in another pharmacy." },
  "10309": { ar: "المنتج المحدد مسجل لمستشفى آخر سابقاً", en: "The product is already registered in another hospital." },
  // ── Notification / Input Validation ──────────────────────────────────────
  "11001": { ar: "صاحب المصلحة المرسل غير نشط، لا يمكن إرسال أي إشعار", en: "Sender stakeholder is passive, no notification can be sent." },
  "11002": { ar: "خطأ في قاعدة البيانات", en: "Database error." },
  "11003": { ar: "رقم الموقع العالمي لصاحب المصلحة غير محدد", en: "Undefined Stakeholder number (GLN)." },
  "11004": { ar: "الأدوية غير محددة (رقم بند التجارة العالمية غير موجود)", en: "Undefined Drug (GTIN does not exist)." },
  "11005": { ar: "صاحب المصلحة غير مصرح له لتزويد هذا الدواء", en: "The stakeholder is not authorized to supply for this drug." },
  "11006": { ar: "حالة هذا الدواء غير نشطة، لا يمكن قبول أي إشعار", en: "Status of this drug is passive, no notification is accepted." },
  "11009": { ar: "معلومات المستهلك غير محددة", en: "Undefined consumer information." },
  "11011": { ar: "حقل نوع المنتج مفقود أو غير صحيح — يتم قبول الدواء فقط", en: "(PT) Product type area is missing or invalid. Only drug (PP) is accepted." },
  "11012": { ar: "حقل رقم الدفعة غير موجود أو غير صالح", en: "(BN) Batch number field does not exist or is invalid." },
  "11013": { ar: "معلومات رمز الباركود مفقودة أو غير صالحة", en: "Product barcode information is missing or invalid." },
  "11014": { ar: "معلومات رقم الموقع العالمي للمصنّع مفقودة أو غير صالحة", en: "(MI) Manufacturer GLN information is missing or invalid." },
  "11015": { ar: "معلومات تاريخ الإنتاج مفقودة أو غير صحيحة", en: "Production date information is missing or incorrect." },
  "11016": { ar: "معلومات تاريخ انتهاء الصلاحية مفقودة أو غير صحيحة", en: "(XD) Expiry date information is missing or incorrect." },
  "11017": { ar: "لم يتم إدخال معلومات الرقم التسلسلي للمنتجات", en: "In (PRODUCTS) products' serial numbers (SN) information is not entered." },
  "11018": { ar: "معلومات رقم الموقع العالمي للمرسل مفقودة أو غير صالحة", en: "Sender GLN information is missing or invalid." },
  "11019": { ar: "معلومات المستلم مفقودة أو غير صالحة", en: "Receiver information is missing or invalid." },
  "11020": { ar: "لم يتم إدخال معلومات المنتج", en: "In (PRODUCTS) (PRODUCT) information is not entered." },
  "11021": { ar: "نوع الإشعار غير صالح", en: "Invalid notification type." },
  "11023": { ar: "ليس لديك صلاحية لاستخدام هذه الخدمة", en: "You are not authorized to use this service." },
  "11024": { ar: "معلومات البلد فارغة أو غير صالحة", en: "Country information is empty or invalid." },
  "11026": { ar: "يجب تحديد رقم الوصفة الطبية", en: "Prescription Number must be defined." },
  "11027": { ar: "تم تسجيل رقم الوصفة الطبية المدخل سابقاً", en: "This prescription number is already registered." },
  "11028": { ar: "معلومات (EID) مفقودة أو غير صالحة", en: "(EID) information is missing or invalid!" },
  "11029": { ar: "معلومات (PID) مفقودة أو غير صالحة", en: "(PID) information is missing or invalid!" },
  "11030": { ar: "لم يتم إجراء أي عملية بيع لرقم الوصفة الطبية المحددة", en: "No sale operation has been performed for the indicated prescription number." },
  "11031": { ar: "بنية بيانات XML المرسلة غير متوافقة مع النظام في وثيقة WSDL", en: "Sent XML data structure is not compatible with the scheme in WSDL document." },
  "11032": { ar: "صيغة الرقم التسلسلي غير صالحة", en: "Format of the serial number is invalid." },
  "11033": { ar: "إذا كانت معلومات المستلم هي مؤسسة السداد يجب أن يكون حقل المنتجات فارغاً", en: "If receiver information is reimbursement institution, (PRODUCTS) area must be empty." },
  "11035": { ar: "صيغة تاريخ انتهاء الصلاحية للمنتج غير صالحة", en: "The format of the expiry date of the product (XD) is incompatible." },
  "11036": { ar: "صيغة رقم الدفعة للمنتج غير صالحة", en: "The format of the batch number of the product is incompatible." },
  "11037": { ar: "صيغة رقم بند التجارة العالمي لمعلومات المنتج غير صالحة", en: "The format of the product information (GTIN) is incompatible." },
  "11038": { ar: "لا يمكن أن يتجاوز تاريخ انتهاء الصلاحية تاريخ الإنتاج بأكثر من 7 سنوات", en: "Expiry Date cannot exceed Production Date more than 7 years." },
  "11039": { ar: "يجب أن يكون أول 13 حرفاً من اسم المستخدم هو نفس رقم GLN", en: "First 13 characters of user name must be the same with GLN." },
  "11040": { ar: "لم يتم إدخال معلومات المنتج في قائمة المنتجات", en: "(PRODUCT) information has not been entered in (PRODUCTS)." },
  "11042": { ar: "لديك كمية فعالة أقل من الكمية المرسلة، يرجى التحقق من كمية الدواء الفعالة", en: "You have less active quantity than the quantity dispatched, please check drug count active amount." },
  "11045": { ar: "تم سحب رقم الدفعة المحدد", en: "Indicated batch number has been recalled." },
  "11208": { ar: "معلومات المكان المقصود غير صالحة", en: "Invalid destination information." },
  "11213": { ar: "تم تسجيل رقم الوصفة الطبية سابقاً", en: "The prescription number has already been registered." },
  "11215": { ar: "معلومات البائع غير صالحة", en: "Invalid seller information." },
  "11216": { ar: "رقم الوصفة الطبية غير مسجّل", en: "The prescription number is not registered." },
  "11217": { ar: "هذه الوصفة الطبية تم الاستعلام عنها من قبل شركة التأمين سابقاً ولا يمكن إلغاؤها", en: "This prescription has already been queried by the reimbursement institution. It cannot be canceled." },
  "11218": { ar: "إلغاء عملية البيع — خطأ في حذف قاعدة البيانات", en: "Sales Cancellation Database Deleting Error." },
  "11801": { ar: "مستوى المنتج غير محدد", en: "Undefined Product Level." },
  "11802": { ar: "الرقم التسلسلي غير صالح", en: "Serial number is empty or invalid." },
  "11803": { ar: "مستوى عملية الاستدعاء غير صالح", en: "Invalid recall level." },
  "11804": { ar: "مستوى عملية الحظر غير صالح", en: "Invalid block level." },
  "11805": { ar: "لم يتم اتخاذ أي إجراء على المنتج", en: "No action has been taken on the product." },
  "11806": { ar: "يجب ألا يكون رقم الوصفة الطبية فارغاً للأدوية التي تتطلب وصفة", en: "Prescription number must not be empty for prescription drugs." },
  "11807": { ar: "لا يمكن لصاحب المصلحة المقصود استلام هذا الدواء", en: "This destination stakeholder can not receive this drug." },
  "11808": { ar: "لا يمكن تنفيذ عملية إلغاء التزويد للمنتجات المستوردة", en: "Supply Cancel operation can not be performed for imported product." },
  "11809": { ar: "لا يمكن تنفيذ عملية إلغاء الاستيراد للمنتجات التي تم إنتاجها", en: "Import Cancel operation can not be performed for produced product." },
  "11810": { ar: "صاحب المصلحة غير مصرح له للأدوية البشرية", en: "This stakeholder is not authorized for human drugs." },
  "11811": { ar: "صاحب المصلحة غير مصرح له للأدوية البيطرية", en: "This stakeholder is not authorized for veterinary drugs." },
  "11812": { ar: "تم سحب رقم الدفعة + GTIN، لا يمكنك إنتاج هذه المنتجات", en: "This GTIN + BN has been recalled, you can not produce these products." },
  "11813": { ar: "يمنع التصدير للبلد الذي تم اختياره", en: "Export to current country is forbidden." },
  "11814": { ar: "المستخدم المرسل غير نشط، لا يمكن إجراء هذه العملية", en: "Sender user is passive, cannot perform this operation." },
  "11815": { ar: "يجب أن يكون صاحب المصلحة المقصود مختلفاً عن صاحب المصلحة المرسل", en: "Destination stakeholder must be different from sender stakeholder." },
  "11816": { ar: "صاحب المصلحة المستلم غير نشط", en: "Receiver stakeholder is passive." },
  "11817": { ar: "لا يمكن أن يكون حقل التوضيح فارغاً", en: "Explanation field cannot be empty." },
  "11818": { ar: "استخدم إشعار إلغاء التنشيط للوحدات المنتهية الصلاحية", en: "Use deactivation notification for expired units." },
  "11819": { ar: "لم يتم العثور على إشعار الإرسال لمعرّف الإشعار المحدد", en: "No dispatch notification found for the specified notification ID." },
  "11901": { ar: "المستخدم غير مصرح له بهذه الخدمة. يرجى التواصل مع المسؤول", en: "User is not authorized for this service. Apply to your firm." },
  "11902": { ar: "المستلم المحدد غير مسجّل في النظام", en: "The receiver is not registered in the system." },
  "11903": { ar: "صاحب المصلحة بائع غير محدد", en: "Undefined Seller Stakeholder." },
  "11904": { ar: "المستلم المحدد غير نشط", en: "The receiver is deactivated." },
  "11905": { ar: "البائع المحدد غير نشط", en: "Indicated seller is deactivated." },
  "11906": { ar: "نوع صاحب المصلحة للمشتري غير مناسب لهذه العملية", en: "Stakeholder type of buyer is not suitable for this operation." },
  "11907": { ar: "نوع صاحب المصلحة للبائع غير مناسب لهذه العملية", en: "Stakeholder type of seller is not suitable for this operation." },
  // ── Diagnosis ─────────────────────────────────────────────────────────────
  "12001": { ar: "معرّف التشخيص غير صحيح أو فارغ", en: "Empty or invalid diagnosis ID." },
  "12002": { ar: "رمز التشخيص المحدد غير مسجّل في النظام", en: "The specified diagnosis code is not registered in our system." },
  // ── Return / Transfer ─────────────────────────────────────────────────────
  "15000": { ar: "معلومات المكان المقصود غير صالحة لإشعار الإرجاع", en: "Invalid destination information for Return Notification." },
  "15001": { ar: "لا يمكنك تبادل المنتجات مع أصحاب المصلحة في مدينة مختلفة", en: "You can not transfer products to a stakeholder in a different city." },
  "15010": { ar: "تم استخدام رقم الدفعة مع تاريخ انتهاء صلاحية أو تاريخ إنتاج مختلف سابقاً", en: "This batch number was used before with a different expire date or production date." },
  "15021": { ar: "المنتج تم بيعه من قبل المستشفى", en: "The product was sold by the hospital." },
  "15022": { ar: "المنتج متوفر في مخزون مستشفى آخر", en: "The product is in another hospital's stock." },
  "15023": { ar: "خطأ في تفاصيل مبيعات المستشفى", en: "Hospital Sales Details Error." },
  "15024": { ar: "لم يتم إلغاء تنشيط المنتج", en: "The product is not deactivated." },
  "15025": { ar: "لم يتم إلغاء تنشيط المنتج من قبلك", en: "The product is not deactivated by you." },
  "15026": { ar: "بسبب عفو المخزون، لم يتم إلغاء التنشيط", en: "Due to stock amnesty, deactivation is not done." },
  // ── Package Transfer ──────────────────────────────────────────────────────
  "20001": { ar: "معلومات رقم الموقع العالمي للمصدر مفقودة", en: "Source GLN information is missing." },
  "20002": { ar: "معلومات رقم الموقع العالمي للمستهدف مفقودة", en: "Target GLN information is missing." },
  "20003": { ar: "لا يمكن للمستخدم إرسال طرد لهذه الشركة", en: "User cannot send package for this company." },
  "20004": { ar: "لا يمكن للمستخدم استلام طرد لهذه الشركة", en: "User cannot receive package for this company." },
  "20005": { ar: "الملف غير موجود في مرفق الخدمة", en: "File not found in service attachment." },
  "20006": { ar: "لا يمكنك إرسال أكثر من ملف واحد", en: "Only one file can be sent." },
  "20007": { ar: "صيغة الملف غير مدعومة", en: "File format is not supported." },
  "20008": { ar: "لا يمكن العثور على معرّف النقل في النظام", en: "Entered transfer ID cannot be found in the system." },
  "20009": { ar: "الحد الأقصى المسموح به للملف 10 ميغابايت", en: "File size can be maximum 10MB." },
  "20010": { ar: "حجم الصورة المرسلة يتجاوز الحد المسموح به", en: "Size of sent image is over the limit." },
  "20100": { ar: "لا يمكن للمستخدم استلام معلومات الطرد لهذه الشركة", en: "The user cannot receive package information about this company." },
  "20101": { ar: "يمكنك اختيار خيار معلومات النقل غير المستلمة للحزم المرسلة إليك", en: "You can choose 'Provide not received transfer information' option for packages sent to you." },
  "20201": { ar: "نوع صاحب المصلحة غير صالح", en: "Invalid stakeholder type." },
  // ── Dispatch / Batch ──────────────────────────────────────────────────────
  "21000": { ar: "تاريخ الوصفة الطبية غير صالح", en: "Invalid Prescription Date." },
  "21001": { ar: "صيغة معرّف النقل غير صحيحة — يجب أن يحتوي على أرقام فقط", en: "Transfer ID format is not right! Transfer ID can only include numbers." },
  "21002": { ar: "صيغة GLN المستلم غير مناسبة — يجب أن يتكون من 13 رقماً", en: "Receiver GLN format is incorrect. GLN must consist of a 13 digit numeric value." },
  "21003": { ar: "صيغة الحزمة غير معتمدة — تأكد من أن الحزمة بصيغة ZIP", en: "Unsupported package format. Make sure package is in ZIP format." },
  "21004": { ar: "الحد الأقصى لحجم الحزمة المُرسلة 10 ميغابايت", en: "Maximum package size that can be sent is 10MB." },
  "21005": { ar: "يمكنك إرسال حزمة واحدة فقط في كل مرة", en: "Only one package can be sent at a time." },
  "21006": { ar: "رقم تعريف النقل غير موجود في النظام", en: "Transfer ID does not exist in the system." },
  "21008": { ar: "لا يمكن العثور على صاحب المصلحة الذي تحاول إرسال الحزمة إليه في النظام", en: "Stakeholder, whom you try to send the package, cannot be found in the system!" },
  "21009": { ar: "صاحب المصلحة الذي تحاول إرسال الحزمة إليه قد تم إلغاء تنشيطه", en: "Stakeholder, whom you try to send the package, is deactivated!" },
  "21010": { ar: "لا يمكن العثور على الحزمة التي تريد استلامها في النظام", en: "Package you want to receive cannot be found in system!" },
  "21011": { ar: "لا يمكن إرسال الحزمة إلى المالك الأصلي", en: "Package cannot be sent to its original owner." },
  "21012": { ar: "لا يمكن استلام حزمة واحدة أكثر من 1000 مرة", en: "One package can be received at most 1000 times." },
  "21013": { ar: "صيغة GLN المرسل غير مناسبة — يجب أن يتكون من 13 رقماً", en: "Sender GLN format is not appropriate! GLN must consist of 13 digits." },
  "21014": { ar: "لا يمكنك الحصول على معلومات عن الحزم إن كنت لست مستلمها أو مرسلها", en: "You cannot get information on packages for which you are not receiver or sender." },
  "21015": { ar: "لا يمكن أن يكون تاريخ البدء بعد تاريخ الانتهاء في خدمة تفاصيل الحزمة", en: "Start date cannot be later than end date in package details service." },
  "21016": { ar: "يجب أن يكون الحد الأقصى لفترة الاستعلام في خدمة تفاصيل الحزمة شهر واحد (31 يومًا)", en: "Maximum inquiry period in package detail service should be 1 month (31 days)." },
  "21017": { ar: "صاحب المصلحة غير مصرح بهذه العملية", en: "Stakeholder is unauthorized for this operation." },
  "21018": { ar: "حالة الباركود غير معرّفة، تواصل مع مسؤول النظام", en: "Status matrix definition is missing, contact system admin." },
  "21019": { ar: "سبب غير محدد", en: "Undefined reason." },
  "21020": { ar: "سبب إلغاء التنشيط غير صالح", en: "Invalid deactivation reason." },
  "21021": { ar: "GLN المستهدف غير صالح", en: "Invalid destination GLN." },
  "21022": { ar: "يمكن بيع هذا الدواء فقط للمستشفيات", en: "This drug can be sold only to hospitals." },
  "21023": { ar: "لا يمكن إلغاء عملية متعلقة بصاحب مصلحة آخر", en: "Operation that belongs to another stakeholder can't be cancelled." },
  "21024": { ar: "لا يمكن تموين هذا الدواء إلا عن طريق الاستيراد", en: "This drug can be supplied only by importing." },
  "21025": { ar: "يمكن تموين هذا الدواء عن طريق التصنيع فقط، وليس عن طريق الاستيراد", en: "This drug can be supplied by manufacturing only, not by importing." },
  "21026": { ar: "المستخدم غير صحيح", en: "Invalid user." },
  "21027": { ar: "يجب إدخال قيمة واحدة على الأقل من رقم الموقع العالمي (FromGln أو ToGln)", en: "One of the fields (fromGLN or toGLN) must be entered." },
  "21030": { ar: "يرجى التحقق من حالة اشتراك نقاط صحة والتأكد من أنه فعّال", en: "Please verify the Seha Points subscription status and ensure that it is active." },
  "22001": { ar: "لم يتم العثور على الملف", en: "File not found." },
  // ── Quota ─────────────────────────────────────────────────────────────────
  "30001": { ar: "تم تجاوز القيمة النسبية", en: "The value of quota exceeded." },
  // ── Product Status (40xxx) ────────────────────────────────────────────────
  "40001": { ar: "المنتج غير مسجل بمخزونك", en: "Product is not registered for you." },
  "40002": { ar: "المنتج غير مسجل بمخزونك", en: "Product is not registered for you." },
  "40003": { ar: "المنتج غير مسجل بمخزونك", en: "Product is not registered for you." },
  "40004": { ar: "لقد قمت ببيع هذا المنتج سابقاً", en: "The product has been already sold by you." },
  "40005": { ar: "تم سحب هذا المنتج", en: "The Product has been recalled." },
  "40006": { ar: "هذا المنتج منتهي الصلاحية", en: "Product has expired." },
  "40007": { ar: "تم سحب منتج مسجل بمخزونك", en: "Product registered on you has been recalled." },
  "40008": { ar: "تم سحب هذا المنتج من قبل صاحب مصلحة آخر", en: "Product has been recalled at another stakeholder level." },
  "40009": { ar: "تم سحب منتج مسجل بمخزونك من قبل صاحب مصلحة آخر", en: "Product registered on you has been recalled at another stakeholder level." },
  // ── System (50xxx) ────────────────────────────────────────────────────────
  "50000": { ar: "حدث خطأ في النظام. تواصل مع مسؤول النظام", en: "A system error occurred, for solution contact the system administrator." },
  "50001": { ar: "معلومات المستوى غير صالحة", en: "Invalid level information." },
  "50002": { ar: "المنتج تم تصديره من قبل صاحب مصلحة آخر", en: "The product was exported by another stakeholder." },
  "50003": { ar: "لا يمكن إجراء عملية إلغاء التصدير على المنتج", en: "Export cancellation operation cannot be performed on the product." },
  "50004": { ar: "لا يمكن استلام رقم الإشعار", en: "Notification ID can not be received." },
  "50005": { ar: "لم تقم بتسجيل دخول الـ IP", en: "IP not logged." },
  // ── Product Query (60xxx) ─────────────────────────────────────────────────
  "60000": { ar: "تم إلغاء تنشيط المنتج سابقاً", en: "The product has already been deactivated." },
  "60001": { ar: "المنتج في حالة غير نشط", en: "The product is in deactivated status." },
  "60005": { ar: "تم تصدير المنتج", en: "Product has been exported." },
  "60006": { ar: "تم استهلاك المنتج", en: "Product has been consumed." },
  "60007": { ar: "تم سحب المنتج", en: "Product has been recalled." },
  "60008": { ar: "المنتج في مركز الاستهلاك", en: "The product is in the consumption center." },
  "60010": { ar: "هذا المنتج بينك وبين رقم الموقع العالمي الثاني، يمكنك قبول المنتج", en: "The product is between GLN2 and you. You can accept products." },
  "60011": { ar: "هذا المنتج بين رقم الموقع العالمي الأول ورقم الموقع العالمي الثاني", en: "The product is between GLN1 and GLN2." },
  "60012": { ar: "هذا المنتج مسجل لأصحاب المصلحة مع رقم الموقع العالمي الأول", en: "The product is registered for stakeholder with GLN1 number." },
  "60013": { ar: "لا يمكنك تنفيذ أي عملية على هذا المنتج", en: "You cannot perform any operation on this product." },
  "60014": { ar: "المنتج مُسجل في مخزونك", en: "The product is registered for you." },
  "60015": { ar: "هذا المنتج مسجل لصاحب المصلحة رقم الموقع العالمي الأول", en: "The product is registered for stakeholder with GLN1 number." },
  "60016": { ar: "المنتج غير نشط", en: "The product is inactive." },
  "60017": { ar: "المنتج في المرحلة الأولى من الإنتاج. يمكنك إجراء عمليتك", en: "The product is a Phase1 product. You can do your operation." },
  "60018": { ar: "هذا المنتج تم بيعه من قبل الصيدلية مع رقم الموقع العالمي الأول", en: "The product is sold by the pharmacy with code GLN1." },
  "60019": { ar: "هذا المنتج تم تصديره من قبل صاحب المصلحة مع رقم الموقع العالمي الأول", en: "The product is exported by the stakeholder with code GLN1." },
  "60020": { ar: "هذا المنتج تم استهلاكه من قبل المستشفى مع رقم الموقع العالمي الأول", en: "The product is consumed by the hospital with code GLN1." },
  "60021": { ar: "المنتج تم سحبه", en: "The product is recalled." },
  "60022": { ar: "المنتج تم إيقافه", en: "The product is blocked." },
  "60050": { ar: "هذا الدواء لا يمكن تصديره", en: "This drug cannot be exported." },
  // ── Validation (70xxx) ────────────────────────────────────────────────────
  "70000": { ar: "الحقل مطلوب", en: "Required field." },
  "70001": { ar: "فشل المجموع التدقيقي", en: "Hash Check Failed." },
  "70002": { ar: "يجب أن يكون اسم الدواء 3 أحرف على الأقل", en: "Drug name must be at least 3 characters long." },
  "70003": { ar: "الرقم التسلسلي غير صحيح", en: "Invalid SN." },
  "70004": { ar: "تجاوزت الحد الأقصى لطول الحقل", en: "Field exceeds maximum length." },
  "70005": { ar: "يجب أن تكون صيغة الجنس واحدة مما يلي: ذكر أو أنثى", en: "Gender value must be one of the following: M or F." },
  "70100": { ar: "خطأ غير محدد في قاعدة البيانات", en: "Undefined database error." },
  "70101": { ar: "لا يمكن إجراء استعلام المستخدم، اتصل بالشخص المسؤول", en: "User enquiry cannot be performed, apply your admin." },
  "70102": { ar: "خطأ في قاعدة البيانات، عملية الاستفسار غير ناجحة", en: "An error occurred! Enquiry is unsuccessful (database)." },
  "70103": { ar: "خطأ في الصفحة، عملية الاستفسار غير ناجحة", en: "An error occurred! Enquiry is unsuccessful (web)." },
  "70104": { ar: "السجل غير موجود، تواصل مع الطبيب", en: "Record doesn't exist, inform the doctor." },
  "70105": { ar: "السجل موجود سابقاً", en: "Record already exists." },
  "70106": { ar: "المستخدم غير موجود", en: "User doesn't exist." },
  "70107": { ar: "رقم السجل مُدخل سابقاً، تواصل مع الطبيب", en: "Repeated record exists, inform the doctor." },
  "70110": { ar: "لا يمكن بيع المنتجات لشخص متوفى", en: "Any product cannot be sold to the person registered as dead." },
  "70112": { ar: "رقم هوية الطبيب غير موجود أو غير صحيح", en: "(DR) Doctor ID Number doesn't exist or invalid." },
  "70113": { ar: "رقم هوية المريض غير موجود أو غير صحيح", en: "(CP) Patient ID Number doesn't exist or invalid." },
  // ── Block operations (99xxx) ──────────────────────────────────────────────
  "99000": { ar: "لا توجد عملية إيقاف مرتبطة بمعرّف الإشعار هذا", en: "No block operation related with this notification ID." },
  "99001": { ar: "عملية إلغاء الحظر غير ناجحة", en: "Block cancel operation is unsuccessful." },
  "99002": { ar: "تم إلغاء عملية الحظر سابقاً", en: "Block operation has already been cancelled." },
  "99003": { ar: "تم استدعاء عملية الحظر، لا يمكن إلغاؤها", en: "Block operation has been recalled, cannot be cancelled." },
  "99101": { ar: "استدعاء عملية الحظر غير ناجح", en: "Block operation to be recalled is unsuccessful." },
  "99103": { ar: "تم استدعاء عملية الحظر سابقاً", en: "Block operation has already been recalled." },
  "99111": { ar: "تمت عملية الإيقاف على GTIN/BN — نفّذ عملية الاستدعاء في شاشة الحظر أولاً", en: "This GTIN/BN has been blocked. First perform recall operation in Block Screen." },
};

/**
 * Get DTTS error description in the requested language.
 * Returns null if code not found.
 */
export function getDttsErrorMessage(
  code: string | null | undefined,
  lang: "ar" | "en" = "ar",
): string | null {
  if (!code) return null;
  const entry = DTTS_ERROR_CODES[code.trim()];
  return entry ? entry[lang] : null;
}

/**
 * Get DTTS error description with a fallback for unknown codes.
 * Never returns null — always provides a human-readable message.
 */
export function getDttsErrorMessageWithFallback(
  code: string | null | undefined,
  lang: "ar" | "en" = "ar",
): string | null {
  if (!code) return null;
  const entry = DTTS_ERROR_CODES[code.trim()];
  if (entry) return entry[lang];
  return lang === "ar"
    ? `خطأ من رصد — كود: ${code}`
    : `DTTS Error — Code: ${code}`;
}

export interface DttsParseResult {
  responseCode: string | null;
  unsuccessfulUnitCount: number | null;
  totalProductCount: number;
  failedProducts: Array<{ rc: string; gtin?: string; sn?: string }>;
}

export function parseDttsResponse(xml: string | null | undefined): DttsParseResult {
  if (!xml) return { responseCode: null, unsuccessfulUnitCount: null, totalProductCount: 0, failedProducts: [] };

  const xmlWithoutProducts = xml.replace(/<PRODUCT\b[^>]*>[\s\S]*?<\/PRODUCT>/gi, "");

  const topRcMatch = xmlWithoutProducts.match(
    /<(?:RESPONSECODE|ResponseCode|responseCode|RC)>([^<]+)<\/(?:RESPONSECODE|ResponseCode|responseCode|RC)>/i
  );
  const topLevelRc = topRcMatch ? topRcMatch[1].trim() : null;

  const uccMatch = xmlWithoutProducts.match(
    /<(?:UNSUCCESSFULUNITCOUNT|UnsuccessfulUnitCount|unsuccessfulUnitCount)>([^<]+)<\/(?:UNSUCCESSFULUNITCOUNT|UnsuccessfulUnitCount|unsuccessfulUnitCount)>/i
  );
  const explicitUcc = uccMatch ? parseInt(uccMatch[1].trim(), 10) : null;

  const productBlocks = [...xml.matchAll(/<PRODUCT\b[^>]*>([\s\S]*?)<\/PRODUCT>/gi)];
  const failedProducts: DttsParseResult["failedProducts"] = [];

  for (const block of productBlocks) {
    const inner = block[1];
    const rcm   = inner.match(/<RC>([^<]+)<\/RC>/i);
    const rc    = rcm ? rcm[1].trim() : "00000";
    if (rc !== "00000") {
      const gtin = inner.match(/<GTIN>([^<]+)<\/GTIN>/i)?.[1]?.trim();
      const sn   = inner.match(/<SN>([^<]+)<\/SN>/i)?.[1]?.trim();
      failedProducts.push({ rc, gtin, sn });
    }
  }

  const totalProductCount = productBlocks.length;
  const unsuccessfulFromProducts = totalProductCount > 0 ? failedProducts.length : null;
  const unsuccessfulUnitCount = explicitUcc !== null ? explicitUcc : unsuccessfulFromProducts;

  let responseCode: string | null = topLevelRc;

  if (!responseCode) {
    if (totalProductCount > 0) {
      if (failedProducts.length === 0) {
        responseCode = "00000";
      } else {
        responseCode = failedProducts[0].rc;
      }
    }
  }

  return { responseCode, unsuccessfulUnitCount, totalProductCount, failedProducts };
}

export type DttsStatus = "success" | "partial" | "failed";

export function getDttsStatus(
  responseCode: string | null,
  unsuccessfulUnitCount: number | null,
  totalProductCount = 0,
): DttsStatus {
  if (!responseCode) return "failed";

  const failed = unsuccessfulUnitCount ?? 0;
  const total  = totalProductCount;

  if (responseCode === "00000") {
    if (failed === 0) return "success";
    return "partial";
  }

  if (total > 0 && failed < total) {
    return "partial";
  }

  return "failed";
}
