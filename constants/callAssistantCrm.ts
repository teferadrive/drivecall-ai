import type { LucideIcon } from 'lucide-react-native';
import {
  Bell,
  BookOpenCheck,
  CalendarClock,
  Car,
  CheckCircle2,
  Clipboard,
  FileText,
  GraduationCap,
  Link2,
  Map as MapIcon,
  MessageCircle,
  Navigation,
  Phone,
  Save,
  Send,
  Smartphone,
  Trash2,
  UsersRound,
} from 'lucide-react-native';

export type LeadStatus =
  | 'חדש'
  | 'מתעניין'
  | 'נשלח קישור'
  | 'עבר תיאוריה'
  | 'קבע שיעור'
  | 'לומד נהיגה'
  | 'ממתין לטסט'
  | 'עבר טסט'
  | 'לא מעוניין'
  | 'סגור';

export type CallDirection = 'נכנסת' | 'יוצאת';
export type CallSource = 'שיחה רגילה' | 'WhatsApp' | 'המספר הנוסף';

export type Customer = {
  id: string;
  name: string;
  phone: string;
  address: string;
  language: string;
  createdAt: string;
  status: LeadStatus;
  notes: string;
  lastCallAt: string;
  nextAction: string;
  balance: number;
  lessons: number;
  messages: number;
  documents: number;
  preferredCallSource: CallSource;
};

export type QuickAction = {
  label: string;
  detail: string;
  icon: LucideIcon;
  tone: 'primary' | 'neutral' | 'success' | 'danger';
};

export type DashboardMetric = {
  label: string;
  value: string;
  trend: string;
  icon: LucideIcon;
};

export const defaultWhatsAppSenderNumber = '0557221170';

export const callSources: CallSource[] = [
  'שיחה רגילה',
  'WhatsApp',
  'המספר הנוסף',
];

export const leadStatuses: LeadStatus[] = [
  'חדש',
  'מתעניין',
  'נשלח קישור',
  'עבר תיאוריה',
  'קבע שיעור',
  'לומד נהיגה',
  'ממתין לטסט',
  'עבר טסט',
  'לא מעוניין',
  'סגור',
];

export const dashboardMetrics: DashboardMetric[] = [
  {
    label: 'שיחות היום',
    value: '18',
    trend: '6 עדיין דורשות טיפול',
    icon: Phone,
  },
  {
    label: 'לידים חדשים',
    value: '7',
    trend: '3 משיחות נכנסות',
    icon: UsersRound,
  },
  {
    label: 'תלמידים חדשים',
    value: '4',
    trend: '2 נקבעו לשיעור ראשון',
    icon: GraduationCap,
  },
  {
    label: 'תלמידים פעילים',
    value: '42',
    trend: '9 צריכים שיעור השבוע',
    icon: Car,
  },
  {
    label: 'תזכורות להיום',
    value: '11',
    trend: '5 תשלומים פתוחים',
    icon: Bell,
  },
  {
    label: 'משימות להיום',
    value: '14',
    trend: '8 בעדיפות גבוהה',
    icon: CheckCircle2,
  },
];

export const customers: Customer[] = [
  {
    id: 'lead-1',
    name: 'נועה לוי',
    phone: '052-744-1930',
    address: 'הרצל 12, ראשון לציון',
    language: 'עברית',
    createdAt: '12.07.2026',
    status: 'חדש',
    notes: 'שאלה על שיעור ראשון באזור מערב העיר. זמינה בערב.',
    lastCallAt: 'היום 14:32',
    nextAction: 'לשלוח קישור הרשמה ולהציע שיעור היכרות',
    balance: 0,
    lessons: 0,
    messages: 1,
    documents: 0,
    preferredCallSource: 'המספר הנוסף',
  },
  {
    id: 'lead-2',
    name: 'דניאל כהן',
    phone: '050-381-4722',
    address: 'ויצמן 8, חולון',
    language: 'עברית',
    createdAt: '09.07.2026',
    status: 'עבר תיאוריה',
    notes: 'עבר תיאוריה ומחפש להתחיל בשבוע הבא.',
    lastCallAt: 'אתמול 18:05',
    nextAction: 'לקבוע שיעור נהיגה ראשון',
    balance: 0,
    lessons: 0,
    messages: 3,
    documents: 1,
    preferredCallSource: 'שיחה רגילה',
  },
  {
    id: 'lead-3',
    name: 'מיכל אברהם',
    phone: '054-910-2284',
    address: 'הפלמ"ח 4, בת ים',
    language: 'עברית',
    createdAt: '28.06.2026',
    status: 'לומד נהיגה',
    notes: 'מעדיפה שיעורי בוקר. צריכה חיזוק בחניה.',
    lastCallAt: 'לפני 3 ימים',
    nextAction: 'להציע שיעור נוסף ביום שלישי',
    balance: 260,
    lessons: 14,
    messages: 12,
    documents: 2,
    preferredCallSource: 'WhatsApp',
  },
];

export const latestCall = {
  name: 'נועה לוי',
  phone: '052-744-1930',
  duration: '04:18',
  dateTime: '12.07.2026, 14:32',
  direction: 'נכנסת' as CallDirection,
  source: 'שיחה רגילה' as CallSource,
  customerType: 'לקוחה חדשה',
  aiRecommendation: 'שיחה ראשונה: מומלץ לשלוח קישור הרשמה ולתאם שיעור היכרות.',
};

export const latestExternalNumberCall = {
  name: 'לקוח מהמספר הנוסף',
  phone: 'הדבק או בחר מספר',
  duration: 'לא זוהה אוטומטית',
  dateTime: 'תיעוד ידני מהיר',
  direction: 'נכנסת' as CallDirection,
  source: 'המספר הנוסף' as CallSource,
  customerType: 'לקוח לבדיקה',
  aiRecommendation:
    'אחרי שיחה במספר הנוסף: הדבק מספר, מצא או צור לקוח, ואז שלח הודעת המשך או קבע תזכורת.',
};

export const externalNumberFlow = [
  {
    title: 'לחיצה אחת אחרי השיחה',
    detail: 'פותחת את מסך After Call גם בלי גישה אוטומטית לאפליקציה השנייה.',
    icon: Smartphone,
  },
  {
    title: 'הדבקת מספר או בחירת לקוח',
    detail: 'האפליקציה תחפש לקוח קיים או תיצור ליד חדש.',
    icon: Clipboard,
  },
  {
    title: 'AI מציע פעולה הבאה',
    detail: 'WhatsApp, SMS, תזכורת, שיעור או שינוי סטטוס.',
    icon: CheckCircle2,
  },
];

export const quickActions: QuickAction[] = [
  {
    label: 'סיימתי שיחה במספר הנוסף',
    detail: 'תיעוד שיחה ידני חכם',
    icon: Smartphone,
    tone: 'primary',
  },
  {
    label: 'שליחת WhatsApp',
    detail: 'פתיחת הודעה מוכנה',
    icon: MessageCircle,
    tone: 'primary',
  },
  {
    label: 'שליחת SMS',
    detail: 'הודעת המשך קצרה',
    icon: Send,
    tone: 'neutral',
  },
  {
    label: 'קישור לאפליקציה',
    detail: 'אפליקציית תיאוריה',
    icon: Link2,
    tone: 'success',
  },
  {
    label: 'קישור להרשמה',
    detail: 'טופס תלמיד חדש',
    icon: FileText,
    tone: 'success',
  },
  {
    label: 'קביעת שיעור',
    detail: 'פתיחת יומן',
    icon: CalendarClock,
    tone: 'primary',
  },
  {
    label: 'מבחן תיאוריה',
    detail: 'הוספת תזכורת',
    icon: BookOpenCheck,
    tone: 'neutral',
  },
  {
    label: 'תזכורת',
    detail: 'מעקב אוטומטי',
    icon: Bell,
    tone: 'neutral',
  },
  {
    label: 'התקשרות חוזרת',
    detail: 'חיוג מהיר',
    icon: Phone,
    tone: 'primary',
  },
  {
    label: 'פתיחת Waze',
    detail: 'ניווט לכתובת',
    icon: Navigation,
    tone: 'neutral',
  },
  {
    label: 'Google Maps',
    detail: 'פתיחת מיקום',
    icon: MapIcon,
    tone: 'neutral',
  },
  {
    label: 'שמירת איש קשר',
    detail: 'יצירה באנשי קשר',
    icon: Save,
    tone: 'success',
  },
  {
    label: 'מחיקת הליד',
    detail: 'מחיקה לאחר אישור',
    icon: Trash2,
    tone: 'danger',
  },
];

export const readyMessages = [
  'היי, שמחתי לדבר איתך. מצורף קישור הרשמה לשיעורי נהיגה.',
  'מצורף קישור לאפליקציית התיאוריה. אחרי מעבר התיאוריה נקבע שיעור ראשון.',
  'היי, עברו כמה ימים מאז שדיברנו. רוצה שאשריין לך שיעור השבוע?',
  'כל הכבוד על ההתקדמות. מומלץ לקבוע שיעור נוסף כדי לשמור על רצף.',
];

export const calendarItems = [
  {
    time: '08:30',
    title: 'שיעור כפול עם מיכל',
    meta: 'בת ים, חניה ורוורס',
  },
  {
    time: '11:00',
    title: 'שיעור ראשון עם דניאל',
    meta: 'איסוף מחולון',
  },
  {
    time: '15:45',
    title: 'תזכורת תשלום',
    meta: '2 תלמידים עם יתרה פתוחה',
  },
  {
    time: '18:20',
    title: 'חזרה ללידים שלא טופלו',
    meta: '6 שיחות מהיום',
  },
];

export const reports = [
  { label: 'המרת לידים לתלמידים', value: '46%', widthClass: 'w-[46%]' },
  { label: 'מעבר טסט ראשון', value: '71%', widthClass: 'w-[71%]' },
  { label: 'חזרה לשיחה תוך 24 שעות', value: '88%', widthClass: 'w-[88%]' },
];
