/**
 * #25: barcha yo'riqnoma matnlari bitta joyda — tahrirlash va keyin rus tiliga
 * tarjima qilish oson bo'lsin. Tamoyil: tizim qishloqdagi oshxonadan
 * megapolisdagi restorangacha ishlaydi — matnlar oddiy o'zbekcha, texnik so'zlarsiz,
 * har sahifada "nima uchun" + 3–5 qadam.
 */
import type { Role } from '../types';

export interface Guide {
  title: string;
  intro: string;
  steps: string[];
}

export const GUIDES = {
  dashboard: {
    title: 'Qayerdan boshlash kerak?',
    intro: "Bosh sahifa — ishni boshlash nuqtasi. Restoran tayyor bo'lguncha pastda «Birinchi qadamlar» ro'yxati turadi: bajarilganlari o'zi belgilanadi.",
    steps: [
      "Ro'yxatdagi qadamni bosing — kerakli bo'lim ochiladi.",
      "Qadamlarni tartib bilan bajaring: menyu → stollar → xodimlar → smena.",
      "Hammasi bajarilsa, ro'yxat yashirinadi — kundalik ish «Ofitsiant», «Buyurtmalar» va «Kassa» bo'limlarida.",
    ],
  },
  menu: {
    title: "Menyu bo'limi nima uchun?",
    intro: "Bu yerda restoraningiz menyusini tuzasiz. Ofitsiant, kassa va Telegram mijozlari aynan shu menyuni ko'radi. Menyu ikki qavatli: kategoriya (masalan, «Suvlar») → uning ichida sub-menyu («Gazli suv») → taomlar.",
    steps: [
      "«Kategoriya» tugmasini bosib asosiy kategoriya qo'shing — masalan, «Milliy taomlar» yoki «Suvlar».",
      "Kategoriya yonidagi papka belgisini bosib, uning ichida sub-menyu qo'shing — masalan, «Palov» yoki «Gazli suv».",
      "«Taom» tugmasini bosing va taomni kerakli sub-menyuga qo'shing.",
      "Narxini yozing. Vazn bilan sotilsa (osh, kabob) — «Vazn bilan» ni tanlab, 1 kg narxini yozing.",
      "Osh uchun qo'shimchalar (qazi, bedana tuxumi, limon) — chap menyudagi «Qo'shimchalar» bo'limida qo'shiladi va taomga biriktiriladi.",
    ],
  },
  modifiers: {
    title: "Qo'shimchalar bo'limi nima uchun?",
    intro: "Taomga qo'shib sotiladigan narsalar va taom tayyorlash istaklari shu yerda.",
    steps: [
      "«Qo'shimchalar» — alohida pulli narsalar (qazi, bedana tuxumi, limon). Nomi va narxini yozing.",
      "«Istaklar» — taomni qanday tayyorlash haqida (piyozsiz, achchiq, kam tuzli). Narxi 0 yoki kichik bo'ladi.",
      "Qo'shimchani taomga biriktirish uchun «Menyu» da taomni tahrirlang va kerakli qo'shimchalarni belgilang.",
      "Ofitsiant buyurtma olayotganda taom ostida shu qo'shimchalarni ko'radi.",
    ],
  },
  tables: {
    title: "Stollar bo'limi nima uchun?",
    intro: "Bu yerda zaldagi stollaringiz turadi. Ofitsiant bo'sh stolni tanlab buyurtma qabul qiladi.",
    steps: [
      '"Yangi stol" tugmasini bosing va stol raqamini yozing (masalan 1, 2 yoki A1).',
      "Nechta odam sig'ishini (o'rindiq) kiriting.",
      'Stolga har doim bir xil narsalar qo\'yilsa (masalan 3 sharbat, 4 mohito) — "Stol shablonlari" bo\'limida shablon tuzing va stolga tanlang.',
      "Mehmon ketayotganda ofitsiant nechtasi ochilganini belgilaydi — faqat o'shalar hisobga qo'shiladi.",
    ],
  },
  waiter: {
    title: 'Ofitsiant ekrani — qanday ishlaydi?',
    intro: "Buyurtmani shu yerda olasiz. Oshxona uni darhol o'z ekranida ko'radi, taom tayyor bo'lsa sizga xabar keladi.",
    steps: [
      "Bo'sh stolni bosing.",
      "Menyudan taomlarni tanlang — soni va izohni savatda o'zgartirasiz.",
      "«Buyurtma berish» ni bosing — buyurtma oshxonaga ketadi.",
      "Taom tayyor bo'lsa — «Tayyor» belgisi chiqadi. Mehmonga berganingizdan keyin «Berildi» ni bosing.",
      "Mehmon to'lamoqchi bo'lsa — kassirga ayting, u «Kassa» da hisobni yopadi.",
    ],
  },
  orders: {
    title: "Buyurtmalar bo'limi nima uchun?",
    intro: "Barcha buyurtmalar ro'yxati: zaldagi, olib ketish va Telegram orqali kelganlari.",
    steps: [
      "Holat bo'yicha saralang: tayyorlanmoqda, tayyor, berildi, to'landi.",
      "Buyurtmani bosing — tarkibi, summasi va kim olgani ochiladi.",
      "Buyurtmani tahrirlash yoki bekor qilish faqat to'lovdan oldin mumkin.",
      "Kassir shu yerdan to'lov qabul qiladi (smena ochiq bo'lishi kerak).",
    ],
  },
  kitchen: {
    title: 'Oshxona ekrani — qanday ishlaydi?',
    intro: "Ofitsiant yoki Telegram mijozi bergan buyurtmalar shu ekranga o'zi tushadi. Sahifani yangilash shart emas.",
    steps: [
      "Yangi buyurtma kartochkasi chiqadi — eng eskisi birinchi turadi.",
      "Taom tayyor bo'lsa — kartochkadagi «Tayyor» tugmasini bosing.",
      "Ofitsiant darhol xabar oladi va taomni olib ketadi.",
      "Ekranni oshxonadagi planshet yoki televizorda ochiq qoldiring.",
    ],
  },
  cashShifts: {
    title: "Kassa bo'limi nima uchun?",
    intro: "Kun boshida smena ochasiz, kun davomida to'lov qabul qilasiz, kun oxirida smenani yopib pulni sanaysiz.",
    steps: [
      "Ish boshida «Smena ochish» ni bosing va kassadagi boshlang'ich naqd pulni yozing.",
      "To'lovni «Buyurtmalar» bo'limida qabul qilasiz: naqd, karta, Click yoki Payme.",
      "Kun oxirida «Smena yopish» ni bosing va kassadagi pulni sanab yozing.",
      "Tizim kutilgan summa bilan solishtiradi — farq bo'lsa ko'rsatadi.",
    ],
  },
  staff: {
    title: "Xodimlar bo'limi nima uchun?",
    intro: "Har xodimga o'z login va paroli beriladi. Har kim faqat o'z ishiga kerakli bo'limlarni ko'radi.",
    steps: [
      "«Yangi xodim» ni bosing: ismi, telefoni va parol yozing.",
      "Lavozimni tanlang: menejer (menyu va stollar), ofitsiant (buyurtma), oshpaz (oshxona ekrani), kassir (to'lov va smena).",
      "Xodim telefoni va paroli bilan tizimga kiradi.",
      "Ishdan ketgan xodimni o'chirib qo'ying — u tizimga kira olmaydi, tarixi saqlanadi.",
    ],
  },
  branches: {
    title: "Filiallar bo'limi nima uchun?",
    intro: "Restoraningizning har bir manzili — alohida filial. Bitta manzil bo'lsa, bu yerda hech narsa qilish shart emas: «Asosiy filial» o'zi yaratilgan.",
    steps: [
      "Ikkinchi manzil ochsangiz — «Yangi filial» ni bosing.",
      "Har filialning o'z stollari va xodimlari bo'ladi, menyu esa umumiy.",
      "Hisobotlarda filiallar bo'yicha alohida ko'rasiz.",
    ],
  },
  catalog: {
    title: 'Standart menyu nima?',
    intro: "Bu — barcha yangi korxonalar uchun tayyor menyu. Yangi korxona ochganda restoran turini tanlaysiz (Oshxona, Fast food, Kafe yoki Hammasi) va shu turga mos taomlar unga avtomatik qo'shiladi. Korxona rahbari keyin o'z menyusini o'zi o'zgartiradi.",
    steps: [
      "Kategoriyani bosing — ichidagi sub-menyular ochiladi (masalan: Suvlar → Gazli suv).",
      "Sub-menyuni bosing — taomlar ro'yxati va narxlari ochiladi.",
      "Taom qo'shish uchun sub-menyu ichidagi \"Taom qo'shish\" tugmasini bosing.",
      "Rangli belgilar qaysi restoran turiga berilishini ko'rsatadi.",
      "Bu yerdagi o'zgarish faqat bundan keyin ochiladigan yangi korxonalarga ta'sir qiladi.",
    ],
  },
  companies: {
    title: "Kompaniyalar bo'limi nima uchun?",
    intro: "Tizimdagi barcha restoranlar. Yangi restoran shu yerda ochiladi.",
    steps: [
      "«Yangi kompaniya» ni bosing: restoran nomi, telefoni va manzil nomini (lotincha, masalan oliyaviy) yozing.",
      "Restoran turini tanlang — mos standart menyu avtomatik qo'shiladi.",
      "Korxona rahbari (admin) telefoni va parolini kiriting — u shu bilan tizimga kiradi.",
      "Rahbarga login va parolni bering; qolganini (stollar, xodimlar) u o'zi sozlaydi.",
    ],
  },
} satisfies Record<string, Guide>;

export type GuideId = keyof typeof GUIDES;

/** #25: murakkab maydonlar yonidagi "?" izohlari */
export const FIELD_HINTS = {
  weightPrice: "Vazn bilan sotiladigan taomda 1 kilogramm narxini yozing — tizim tortilgan vaznga qarab o'zi hisoblaydi.",
  slug: "Restoranning lotincha qisqa nomi, bo'shliqsiz (masalan: oliyaviy). Telegram menyu havolasida ishlatiladi: kitchens.uz/tg?company=oliyaviy",
  seats: "Stolga nechta odam sig'adi. Ofitsiant katta guruhga mos stolni tanlashi uchun.",
  openingCash: "Smena boshida kassada turgan naqd pul (qaytim uchun). Kun oxirida shu summa ham hisobga olinadi.",
  closingCash: "Kassadagi naqd pulni sanab yozing. Tizim kutilgan summa bilan solishtiradi.",
  addonMax: "Mijoz bitta taomga shu qo'shimchadan nechtagacha qo'sha oladi. Masalan go'sht uchun 3 — oshga 1, 2 yoki 3 marta go'sht.",
  tableTemplate: "Stolga oldindan qo'yiladigan narsalar to'plami. Faqat mehmon ochganlari hisobga qo'shiladi.",
} as const;

export interface FirstStep {
  label: string;
  hint: string;
  to: string;
}

/** #25: rol bo'yicha "Birinchi qadamlar" */
export const FIRST_STEPS: Partial<Record<Role, FirstStep[]>> = {
  company_admin: [
    { label: "Menyu tuzing", hint: "Kategoriya va taomlarni qo'shing, narxlarni yozing", to: '/menu' },
    { label: "Stollarni qo'shing", hint: "Zaldagi stollar raqamlari va o'rindiqlar soni", to: '/tables' },
    { label: "Xodimlarni qo'shing", hint: 'Ofitsiant, oshpaz, kassirga login va parol bering', to: '/staff' },
    { label: 'Kassada smena oching', hint: "To'lov qabul qilish uchun smena ochiq bo'lishi kerak", to: '/cash-shifts' },
  ],
  manager: [
    { label: "Menyuni tekshiring", hint: "Narxlar to'g'riligini va tugagan taomlarni belgilang", to: '/menu' },
    { label: 'Stollarni sozlang', hint: "Stol raqamlari va shablonlari", to: '/tables' },
  ],
};
