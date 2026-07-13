import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import {
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from './_generated/server';

const leadStatusValidator = v.union(
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
);

const callSourceValidator = v.union(
  v.literal('שיחה רגילה'),
  v.literal('WhatsApp'),
  v.literal('המספר הנוסף')
);

const callDirectionValidator = v.union(v.literal('נכנסת'), v.literal('יוצאת'));

const crmEventTypeValidator = v.union(
  v.literal('call'),
  v.literal('message'),
  v.literal('lesson'),
  v.literal('payment'),
  v.literal('document'),
  v.literal('reminder'),
  v.literal('note')
);

async function getCurrentUserId(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity?.email) {
    throw new Error('Not authenticated');
  }

  const user = await ctx.db
    .query('users')
    .withIndex('by_email', (q) => q.eq('email', identity.email ?? ''))
    .unique();

  if (!user) {
    throw new Error('User not found');
  }

  return user._id;
}

export const listCustomers = query({
  args: {
    search: v.optional(v.string()),
    status: v.optional(leadStatusValidator),
  },
  handler: async (ctx, { search, status }) => {
    const ownerId = await getCurrentUserId(ctx);
    const rows = status
      ? await ctx.db
          .query('customers')
          .withIndex('by_owner_status', (q) =>
            q.eq('ownerId', ownerId).eq('status', status)
          )
          .order('desc')
          .collect()
      : await ctx.db
          .query('customers')
          .withIndex('by_owner', (q) => q.eq('ownerId', ownerId))
          .order('desc')
          .collect();

    const normalizedSearch = search?.trim().toLowerCase();

    if (!normalizedSearch) {
      return rows;
    }

    return rows.filter((customer) => {
      const haystack = [
        customer.name,
        customer.phone,
        customer.address ?? '',
        customer.status,
        customer.notes ?? '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  },
});

export const getCustomer = query({
  args: {
    customerId: v.id('customers'),
  },
  handler: async (ctx, { customerId }) => {
    const ownerId = await getCurrentUserId(ctx);
    const customer = await ctx.db.get(customerId);

    if (!customer || customer.ownerId !== ownerId) {
      return null;
    }

    return customer;
  },
});

export const getDashboardStats = query({
  args: {
    dayStart: v.number(),
    dayEnd: v.number(),
  },
  handler: async (ctx, { dayStart, dayEnd }) => {
    let ownerId: Id<'users'>;

    try {
      ownerId = await getCurrentUserId(ctx);
    } catch {
      return emptyDashboardStats();
    }

    const customers = await ctx.db
      .query('customers')
      .withIndex('by_owner', (q) => q.eq('ownerId', ownerId))
      .collect();
    const calls = await ctx.db
      .query('callLogs')
      .withIndex('by_owner', (q) => q.eq('ownerId', ownerId))
      .collect();
    const lessons = await ctx.db
      .query('lessons')
      .withIndex('by_owner_starts', (q) => q.eq('ownerId', ownerId))
      .collect();
    const reminders = await ctx.db
      .query('reminders')
      .withIndex('by_owner_completed', (q) =>
        q.eq('ownerId', ownerId).eq('completed', false)
      )
      .collect();

    const callsToday = calls.filter(
      (call) => call.createdAt >= dayStart && call.createdAt <= dayEnd
    );
    const lessonsToday = lessons.filter(
      (lesson) => lesson.startsAt >= dayStart && lesson.startsAt <= dayEnd
    );
    const remindersToday = reminders.filter(
      (reminder) => reminder.dueAt >= dayStart && reminder.dueAt <= dayEnd
    );

    const activeStatuses = new Set(['קבע שיעור', 'לומד נהיגה', 'ממתין לטסט']);

    return {
      callsToday: callsToday.length,
      newLeads: customers.filter((customer) => customer.status === 'חדש')
        .length,
      newStudents: customers.filter(
        (customer) =>
          customer.status === 'קבע שיעור' || customer.status === 'לומד נהיגה'
      ).length,
      activeStudents: customers.filter((customer) =>
        activeStatuses.has(customer.status)
      ).length,
      remindersToday: remindersToday.length,
      unhandledCalls: calls.filter((call) => !call.handled).length,
      tasksToday: remindersToday.length + lessonsToday.length,
      lessonsToday: lessonsToday.length,
      openReminders: reminders.length,
    };
  },
});

function emptyDashboardStats() {
  return {
    callsToday: 0,
    newLeads: 0,
    newStudents: 0,
    activeStudents: 0,
    remindersToday: 0,
    unhandledCalls: 0,
    tasksToday: 0,
    lessonsToday: 0,
    openReminders: 0,
  };
}

export const getSmartAlerts = query({
  args: {},
  handler: async (ctx) => {
    const ownerId = await getCurrentUserId(ctx);
    const now = Date.now();
    const customers = await ctx.db
      .query('customers')
      .withIndex('by_owner', (q) => q.eq('ownerId', ownerId))
      .collect();
    const reminders = await ctx.db
      .query('reminders')
      .withIndex('by_owner_completed', (q) =>
        q.eq('ownerId', ownerId).eq('completed', false)
      )
      .collect();

    const overdueReminders = reminders
      .filter((reminder) => reminder.dueAt < now)
      .slice(0, 3)
      .map((reminder) => ({
        kind: 'reminder' as const,
        title: reminder.title,
        meta: `${reminder.customerName} · עבר הזמן`,
      }));

    const newLeadAlerts = customers
      .filter((customer) => customer.status === 'חדש')
      .slice(0, 3)
      .map((customer) => ({
        kind: 'lead' as const,
        title: `${customer.name} עדיין בסטטוס חדש`,
        meta: 'מומלץ לשלוח הודעת פתיחה או קישור הרשמה',
      }));

    const activeStudentAlerts = customers
      .filter(
        (customer) =>
          customer.status === 'לומד נהיגה' || customer.status === 'קבע שיעור'
      )
      .slice(0, 2)
      .map((customer) => ({
        kind: 'lesson' as const,
        title: `${customer.name} צריך רצף שיעורים`,
        meta: 'בדוק אם צריך לקבוע שיעור נוסף השבוע',
      }));

    return [
      ...overdueReminders,
      ...newLeadAlerts,
      ...activeStudentAlerts,
    ].slice(0, 8);
  },
});

export const getReportStats = query({
  args: {},
  handler: async (ctx) => {
    const ownerId = await getCurrentUserId(ctx);
    const customers = await ctx.db
      .query('customers')
      .withIndex('by_owner', (q) => q.eq('ownerId', ownerId))
      .collect();
    const calls = await ctx.db
      .query('callLogs')
      .withIndex('by_owner', (q) => q.eq('ownerId', ownerId))
      .collect();

    const totalCustomers = customers.length;
    const studentStatuses = new Set([
      'עבר תיאוריה',
      'קבע שיעור',
      'לומד נהיגה',
      'ממתין לטסט',
      'עבר טסט',
    ]);
    const students = customers.filter((customer) =>
      studentStatuses.has(customer.status)
    ).length;
    const passedTests = customers.filter(
      (customer) => customer.status === 'עבר טסט'
    ).length;
    const handledCalls = calls.filter((call) => call.handled).length;

    return {
      leadConversionRate: calculatePercent(students, totalCustomers),
      testPassRate: calculatePercent(passedTests, Math.max(students, 1)),
      callHandlingRate: calculatePercent(handledCalls, calls.length),
    };
  },
});

export const createCustomer = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    address: v.optional(v.string()),
    language: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.optional(leadStatusValidator),
    preferredCallSource: v.optional(callSourceValidator),
  },
  handler: async (ctx, args) => {
    const ownerId = await getCurrentUserId(ctx);
    const now = Date.now();
    const phone = args.phone.trim();

    const existing = await ctx.db
      .query('customers')
      .withIndex('by_owner_phone', (q) =>
        q.eq('ownerId', ownerId).eq('phone', phone)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name.trim(),
        address: args.address?.trim(),
        language: args.language?.trim() || existing.language,
        notes: args.notes?.trim() || existing.notes,
        status: args.status ?? existing.status,
        preferredCallSource:
          args.preferredCallSource ?? existing.preferredCallSource,
        updatedAt: now,
      });

      return existing._id;
    }

    return await ctx.db.insert('customers', {
      ownerId,
      name: args.name.trim(),
      phone,
      address: args.address?.trim(),
      language: args.language?.trim() || 'עברית',
      status: args.status ?? 'חדש',
      notes: args.notes?.trim(),
      preferredCallSource: args.preferredCallSource ?? 'שיחה רגילה',
      balance: 0,
      lessonsCount: 0,
      messagesCount: 0,
      documentsCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateCustomerStatus = mutation({
  args: {
    customerId: v.id('customers'),
    status: leadStatusValidator,
  },
  handler: async (ctx, { customerId, status }) => {
    const ownerId = await getCurrentUserId(ctx);
    const customer = await ctx.db.get(customerId);

    if (!customer || customer.ownerId !== ownerId) {
      throw new Error('Customer not found');
    }

    await ctx.db.patch(customerId, {
      status,
      updatedAt: Date.now(),
    });
  },
});

export const updateCustomer = mutation({
  args: {
    customerId: v.id('customers'),
    name: v.string(),
    phone: v.string(),
    address: v.optional(v.string()),
    language: v.string(),
    status: leadStatusValidator,
    notes: v.optional(v.string()),
    preferredCallSource: callSourceValidator,
  },
  handler: async (ctx, args) => {
    const ownerId = await getCurrentUserId(ctx);
    const customer = await ctx.db.get(args.customerId);

    if (!customer || customer.ownerId !== ownerId) {
      throw new Error('Customer not found');
    }

    const now = Date.now();

    await ctx.db.patch(args.customerId, {
      name: args.name.trim(),
      phone: args.phone.trim(),
      address: args.address?.trim(),
      language: args.language.trim() || 'עברית',
      status: args.status,
      notes: args.notes?.trim(),
      preferredCallSource: args.preferredCallSource,
      updatedAt: now,
    });

    await ctx.db.insert('crmEvents', {
      ownerId,
      customerId: args.customerId,
      type: 'note',
      title: 'פרטי לקוח עודכנו',
      details: 'עודכנו פרטים בכרטיס הלקוח.',
      createdAt: now,
    });
  },
});

export const removeCustomer = mutation({
  args: {
    customerId: v.id('customers'),
  },
  handler: async (ctx, { customerId }) => {
    const ownerId = await getCurrentUserId(ctx);
    const customer = await ctx.db.get(customerId);

    if (!customer || customer.ownerId !== ownerId) {
      throw new Error('Customer not found');
    }

    await ctx.db.delete(customerId);
  },
});

export const logCall = mutation({
  args: {
    customerId: v.optional(v.id('customers')),
    customerName: v.string(),
    phone: v.string(),
    direction: callDirectionValidator,
    source: callSourceValidator,
    durationSeconds: v.optional(v.number()),
    handled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const ownerId = await getCurrentUserId(ctx);
    const now = Date.now();
    const aiRecommendation =
      args.source === 'המספר הנוסף'
        ? 'לתעד את השיחה, לשלוח הודעת המשך ולקבוע תזכורת אם אין מענה.'
        : 'לבדוק סטטוס לקוח ולשלוח את הפעולה הבאה המתאימה.';

    const callId = await ctx.db.insert('callLogs', {
      ownerId,
      customerId: args.customerId,
      customerName: args.customerName.trim(),
      phone: args.phone.trim(),
      direction: args.direction,
      source: args.source,
      durationSeconds: args.durationSeconds,
      handled: args.handled ?? false,
      aiRecommendation,
      createdAt: now,
    });

    if (args.customerId) {
      const customer = await ctx.db.get(args.customerId);

      if (customer?.ownerId === ownerId) {
        await ctx.db.insert('crmEvents', {
          ownerId,
          customerId: args.customerId,
          type: 'call',
          title: `שיחה ${args.direction} דרך ${args.source}`,
          details: aiRecommendation,
          createdAt: now,
        });
      }
    }

    return callId;
  },
});

export const logCrmEvent = mutation({
  args: {
    customerId: v.id('customers'),
    type: crmEventTypeValidator,
    title: v.string(),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const ownerId = await getCurrentUserId(ctx);
    const customer = await ctx.db.get(args.customerId);

    if (!customer || customer.ownerId !== ownerId) {
      throw new Error('Customer not found');
    }

    const now = Date.now();

    await ctx.db.insert('crmEvents', {
      ownerId,
      customerId: args.customerId,
      type: args.type,
      title: args.title.trim(),
      details: args.details?.trim(),
      createdAt: now,
    });

    const counterPatch =
      args.type === 'message'
        ? { messagesCount: customer.messagesCount + 1 }
        : args.type === 'lesson'
          ? { lessonsCount: customer.lessonsCount + 1 }
          : args.type === 'document'
            ? { documentsCount: customer.documentsCount + 1 }
            : {};

    await ctx.db.patch(args.customerId, {
      ...counterPatch,
      updatedAt: now,
    });
  },
});

export const listRecentCalls = query({
  args: {},
  handler: async (ctx) => {
    const ownerId = await getCurrentUserId(ctx);

    return await ctx.db
      .query('callLogs')
      .withIndex('by_owner', (q) => q.eq('ownerId', ownerId))
      .order('desc')
      .take(10);
  },
});

export const listCustomerEvents = query({
  args: {
    customerId: v.id('customers'),
  },
  handler: async (ctx, { customerId }) => {
    const ownerId = await getCurrentUserId(ctx);
    const customer = await ctx.db.get(customerId);

    if (!customer || customer.ownerId !== ownerId) {
      return [];
    }

    return await ctx.db
      .query('crmEvents')
      .withIndex('by_customer', (q) => q.eq('customerId', customerId))
      .order('desc')
      .take(30);
  },
});

export const createLesson = mutation({
  args: {
    customerId: v.id('customers'),
    startsAt: v.number(),
    durationMinutes: v.number(),
    pickupAddress: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const ownerId = await getCurrentUserId(ctx);
    const customer = await ctx.db.get(args.customerId);

    if (!customer || customer.ownerId !== ownerId) {
      throw new Error('Customer not found');
    }

    const now = Date.now();
    const lessonId = await ctx.db.insert('lessons', {
      ownerId,
      customerId: args.customerId,
      customerName: customer.name,
      startsAt: args.startsAt,
      durationMinutes: args.durationMinutes,
      pickupAddress: args.pickupAddress?.trim(),
      notes: args.notes?.trim(),
      status: 'scheduled',
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('crmEvents', {
      ownerId,
      customerId: args.customerId,
      type: 'lesson',
      title: 'נקבע שיעור נהיגה',
      details: `${formatServerDateTime(args.startsAt)} · ${args.durationMinutes} דקות`,
      createdAt: now,
    });

    await ctx.db.patch(args.customerId, {
      lessonsCount: customer.lessonsCount + 1,
      updatedAt: now,
    });

    return lessonId;
  },
});

export const listTodayLessons = query({
  args: {
    dayStart: v.number(),
    dayEnd: v.number(),
  },
  handler: async (ctx, { dayStart, dayEnd }) => {
    const ownerId = await getCurrentUserId(ctx);

    const lessons = await ctx.db
      .query('lessons')
      .withIndex('by_owner_starts', (q) => q.eq('ownerId', ownerId))
      .order('asc')
      .collect();

    return lessons.filter(
      (lesson) => lesson.startsAt >= dayStart && lesson.startsAt <= dayEnd
    );
  },
});

export const createReminder = mutation({
  args: {
    customerId: v.id('customers'),
    title: v.string(),
    dueAt: v.number(),
  },
  handler: async (ctx, args) => {
    const ownerId = await getCurrentUserId(ctx);
    const customer = await ctx.db.get(args.customerId);

    if (!customer || customer.ownerId !== ownerId) {
      throw new Error('Customer not found');
    }

    const now = Date.now();
    const reminderId = await ctx.db.insert('reminders', {
      ownerId,
      customerId: args.customerId,
      customerName: customer.name,
      title: args.title.trim(),
      dueAt: args.dueAt,
      completed: false,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('crmEvents', {
      ownerId,
      customerId: args.customerId,
      type: 'reminder',
      title: 'נוצרה תזכורת',
      details: `${args.title.trim()} · ${formatServerDateTime(args.dueAt)}`,
      createdAt: now,
    });

    return reminderId;
  },
});

export const listOpenReminders = query({
  args: {},
  handler: async (ctx) => {
    const ownerId = await getCurrentUserId(ctx);

    return await ctx.db
      .query('reminders')
      .withIndex('by_owner_completed', (q) =>
        q.eq('ownerId', ownerId).eq('completed', false)
      )
      .order('asc')
      .take(30);
  },
});

export const completeReminder = mutation({
  args: {
    reminderId: v.id('reminders'),
  },
  handler: async (ctx, { reminderId }) => {
    const ownerId = await getCurrentUserId(ctx);
    const reminder = await ctx.db.get(reminderId);

    if (!reminder || reminder.ownerId !== ownerId) {
      throw new Error('Reminder not found');
    }

    const now = Date.now();

    await ctx.db.patch(reminderId, {
      completed: true,
      updatedAt: now,
    });

    await ctx.db.insert('crmEvents', {
      ownerId,
      customerId: reminder.customerId,
      type: 'reminder',
      title: 'תזכורת בוצעה',
      details: reminder.title,
      createdAt: now,
    });
  },
});

function formatServerDateTime(value: number) {
  return new Intl.DateTimeFormat('he-IL', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function calculatePercent(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}
