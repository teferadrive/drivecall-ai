import { authTables } from '@convex-dev/auth/server';
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// הגדרת הסכמה (Schema) של מסד הנתונים
// קובץ זה מגדיר את מבנה הטבלאות והקשרים ב-Database
export default defineSchema({
  // יבוא טבלאות ברירת מחדל של ספריית האימות (users, sessions, etc.)
  ...authTables,

  // טבלת משתמשים מורחבת
  // מכילה מידע נוסף על המשתמשים מעבר לבסיס של ספריית האימות
  users: defineTable({
    email: v.string(), // כתובת אימייל
    emailVerified: v.optional(v.boolean()), // האם האימייל אומת
    fullName: v.optional(v.string()), // שם מלא
    role: v.union(v.literal('admin'), v.literal('user')), // תפקיד המשתמש (מנהל או משתמש רגיל)
    userType: v.optional(v.union(v.literal('free'), v.literal('paid'))), // סוג משתמש (חינמי או בתשלום) - אופציונלי לתאימות לאחור
    isActive: v.boolean(), // האם המשתמש פעיל
    createdAt: v.number(), // זמן יצירה (Timestamp)
    updatedAt: v.number(), // זמן עדכון אחרון (Timestamp)
  })
    .index('by_email', ['email']) // אינדקס לחיפוש מהיר לפי אימייל
    .index('by_role', ['role']) // אינדקס לסינון מהיר לפי תפקיד
    .index('by_userType', ['userType']), // אינדקס לסינון מהיר לפי סוג משתמש
  customers: defineTable({
    ownerId: v.id('users'),
    name: v.string(),
    phone: v.string(),
    imageUrl: v.optional(v.string()),
    address: v.optional(v.string()),
    language: v.string(),
    status: v.union(
      v.literal('חדש'),
      v.literal('מתעניין'),
      v.literal('נשלח קישור'),
      v.literal('עבר תיאוריה'),
      v.literal('קבע שיעור'),
      v.literal('לומד נהיגה'),
      v.literal('ממתין לטסט'),
      v.literal('עבר טסט'),
      v.literal('לא מעוניין'),
      v.literal('סגור')
    ),
    notes: v.optional(v.string()),
    preferredCallSource: v.union(
      v.literal('שיחה רגילה'),
      v.literal('WhatsApp'),
      v.literal('המספר הנוסף')
    ),
    balance: v.number(),
    lessonsCount: v.number(),
    messagesCount: v.number(),
    documentsCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_owner', ['ownerId'])
    .index('by_owner_status', ['ownerId', 'status'])
    .index('by_owner_phone', ['ownerId', 'phone']),

  callLogs: defineTable({
    ownerId: v.id('users'),
    customerId: v.optional(v.id('customers')),
    customerName: v.string(),
    phone: v.string(),
    direction: v.union(v.literal('נכנסת'), v.literal('יוצאת')),
    source: v.union(
      v.literal('שיחה רגילה'),
      v.literal('WhatsApp'),
      v.literal('המספר הנוסף')
    ),
    durationSeconds: v.optional(v.number()),
    handled: v.boolean(),
    aiRecommendation: v.string(),
    createdAt: v.number(),
  })
    .index('by_owner', ['ownerId'])
    .index('by_owner_handled', ['ownerId', 'handled'])
    .index('by_customer', ['customerId']),

  crmEvents: defineTable({
    ownerId: v.id('users'),
    customerId: v.id('customers'),
    type: v.union(
      v.literal('call'),
      v.literal('message'),
      v.literal('lesson'),
      v.literal('payment'),
      v.literal('document'),
      v.literal('reminder'),
      v.literal('note')
    ),
    title: v.string(),
    details: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_owner', ['ownerId'])
    .index('by_customer', ['customerId']),

  lessons: defineTable({
    ownerId: v.id('users'),
    customerId: v.id('customers'),
    customerName: v.string(),
    startsAt: v.number(),
    durationMinutes: v.number(),
    pickupAddress: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.union(
      v.literal('scheduled'),
      v.literal('completed'),
      v.literal('canceled')
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_owner_starts', ['ownerId', 'startsAt'])
    .index('by_customer', ['customerId']),

  reminders: defineTable({
    ownerId: v.id('users'),
    customerId: v.id('customers'),
    customerName: v.string(),
    title: v.string(),
    dueAt: v.number(),
    completed: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_owner_due', ['ownerId', 'dueAt'])
    .index('by_owner_completed', ['ownerId', 'completed'])
    .index('by_customer', ['customerId']),
});
