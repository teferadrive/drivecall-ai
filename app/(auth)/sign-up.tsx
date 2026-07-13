import { useAuthActions } from '@convex-dev/auth/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Eye, EyeOff, Lock, Mail, UserPlus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { PreviewModeBanner } from '@/components/PreviewModeBanner';
import { WebViewModal } from '@/components/WebViewModal';
import { IS_DEV_MODE, PRIVACY_URL, TERMS_URL } from '@/config/appConfig';
import { rtl, tw } from '@/lib/rtl';

const REMEMBERED_EMAIL_KEY = 'remembered_email';

export default function SignUpScreen() {
  const { signIn } = useAuthActions(); // פעולת ההרשמה (משתמשת באותה פונקציה כמו התחברות)
  const router = useRouter(); // ניווט
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const isPreviewMode = IS_DEV_MODE && preview === 'true';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false); // מצב טעינה
  const [rememberMe, setRememberMe] = useState(false); // האם לזכור את האימייל
  const [showPassword, setShowPassword] = useState(false); // הצגת/הסתרת סיסמה
  const [consentAccepted, setConsentAccepted] = useState(false); // הסכמה לתנאי שימוש ופרטיות
  const [termsModalVisible, setTermsModalVisible] = useState(false); // מודל תנאי שימוש
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false); // מודל מדיניות פרטיות

  // טעינת האימייל השמור בעת טעינת המסך
  useEffect(() => {
    const loadRememberedEmail = async () => {
      try {
        const rememberedEmail =
          await AsyncStorage.getItem(REMEMBERED_EMAIL_KEY);
        if (rememberedEmail) {
          setEmail(rememberedEmail);
          setRememberMe(true);
        }
      } catch {
        // התעלמות משגיאות אחסון
      }
    };
    loadRememberedEmail();
  }, []);

  // הרשמה/התחברות עם Google (OAuth דרך Convex Auth).
  const onGooglePress = async () => {
    if (isPreviewMode) {
      return;
    }

    setLoading(true);

    try {
      await signIn('google');
      router.replace('/(authenticated)');
    } catch {
      Alert.alert(
        'התחברות Google',
        'ההתחברות עם Google אינה זמינה עדיין. ודא שהוגדר ספק Google בשרת.'
      );
    } finally {
      setLoading(false);
    }
  };

  // פונקציית ההרשמה
  const onSignUpPress = async () => {
    // במצב תצוגה מקדימה - לא מבצעים הרשמה אמיתית
    if (isPreviewMode) {
      return;
    }

    if (!email || !password) {
      Alert.alert('שגיאה', 'אנא מלא את כל השדות');
      return;
    }

    // בדיקה שהמשתמש אישר את תנאי השימוש ומדיניות הפרטיות
    if (!consentAccepted) {
      Alert.alert('שגיאה', 'אנא קרא ואשר קודם את תנאי השימוש ומדיניות הפרטיות');
      return;
    }

    if (password.length < 6) {
      Alert.alert('שגיאה', 'הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }

    setLoading(true);

    try {
      // יצירת משתמש חדש והתחברות (flow: 'signUp')
      await signIn('password', {
        email,
        password,
        flow: 'signUp',
      });

      // שמירה או מחיקה של האימייל מהזיכרון
      if (rememberMe) {
        await AsyncStorage.setItem(REMEMBERED_EMAIL_KEY, email);
      } else {
        await AsyncStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }

      // מעבר לאזור המאומת
      router.replace('/(authenticated)');
    } catch (err: unknown) {
      const error = err as { message?: string };
      const errorMessage = error.message || '';

      // מיפוי שגיאות Convex Auth להודעות בעברית ידידותיות למשתמש
      if (
        errorMessage.includes('already exists') ||
        errorMessage.includes('AccountAlreadyExists')
      ) {
        Alert.alert('שגיאה', 'כתובת האימייל כבר רשומה במערכת');
      } else if (
        errorMessage.includes('password') &&
        errorMessage.includes('weak')
      ) {
        Alert.alert('שגיאה', 'הסיסמה חלשה מדי. אנא בחר סיסמה חזקה יותר');
      } else if (errorMessage.includes('TooManyRequests')) {
        Alert.alert('שגיאה', 'יותר מדי ניסיונות. אנא נסה שוב מאוחר יותר');
      } else if (
        errorMessage.includes('invalid') &&
        errorMessage.includes('email')
      ) {
        Alert.alert('שגיאה', 'כתובת האימייל אינה תקינה');
      } else {
        Alert.alert('שגיאה', 'הרשמה נכשלה. אנא בדוק את הפרטים ונסה שוב');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTermsPress = () => {
    setTermsModalVisible(true);
  };

  const handlePrivacyPress = () => {
    setPrivacyModalVisible(true);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f8f9ff]">
      {/* כפתור יציאה במצב תצוגה מקדימה */}
      {isPreviewMode && <PreviewModeBanner onClose={() => router.back()} />}

      {/* מודלים לתנאי שימוש ומדיניות פרטיות */}
      <WebViewModal
        visible={termsModalVisible}
        url={TERMS_URL}
        title="תנאי השימוש"
        onClose={() => setTermsModalVisible(false)}
      />

      <WebViewModal
        visible={privacyModalVisible}
        url={PRIVACY_URL}
        title="מדיניות הפרטיות"
        onClose={() => setPrivacyModalVisible(false)}
      />

      {/* KeyboardAvoidingView דואג שהמקלדת לא תסתיר את שדות הקלט */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* באנר מצב תצוגה מקדימה */}
        {isPreviewMode && (
          <View className="p-3 bg-yellow-500/20 border-b border-yellow-500/50">
            <Text className="text-yellow-600 text-center text-sm font-medium">
              מצב תצוגה מקדימה - הרשמה מושבתת
            </Text>
          </View>
        )}

        <View className="flex-1 justify-center px-6">
          {/* אייקון גדול בגרדיאנט חי */}
          <View className="items-center mb-6">
            <LinearGradient
              colors={['#00457f', '#005da7', '#1b6d24']}
              className="h-28 w-28 items-center justify-center rounded-3xl"
            >
              <UserPlus size={64} color="#ffffff" />
            </LinearGradient>
          </View>

          <View className="w-full rounded-3xl border border-[#c1c7d3] bg-white p-6">
            <Text
              className="text-[#191c21] text-[42px] font-bold mb-2"
              style={{ textAlign: rtl.textAlign }}
            >
              צור חשבון חדש
            </Text>
            <Text
              className="text-[#414751] text-xl mb-8"
              style={{ textAlign: rtl.textAlign }}
            >
              הירשם כדי להתחיל להשתמש באפליקציה
            </Text>

            {/* שדה אימייל */}
            <View className="mb-5">
              <View className={`${tw.flexRow} items-center gap-2 mb-2`}>
                <View className="rounded-lg bg-[#d3e3ff] p-2">
                  <Mail size={24} color="#005da7" />
                </View>
                <Text
                  className="text-[#191c21] text-lg font-bold"
                  style={{ textAlign: rtl.textAlign }}
                >
                  כתובת אימייל
                </Text>
              </View>
              <TextInput
                className="bg-[#e7e8ef] border-2 border-[#c1c7d3] rounded-xl px-4 py-4 text-[#191c21] text-xl"
                style={{ textAlign: rtl.textAlign }}
                value={email}
                onChangeText={setEmail}
                placeholder="example@gmail.com"
                placeholderTextColor="#727782"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            {/* שדה סיסמה */}
            <View className="mb-5">
              <View className={`${tw.flexRow} items-center gap-2 mb-2`}>
                <View className="rounded-lg bg-[#d3e3ff] p-2">
                  <Lock size={24} color="#005da7" />
                </View>
                <Text
                  className="text-[#191c21] text-lg font-bold"
                  style={{ textAlign: rtl.textAlign }}
                >
                  סיסמה
                </Text>
              </View>
              <View className="relative">
                <TextInput
                  className="bg-[#e7e8ef] border-2 border-[#c1c7d3] rounded-xl px-4 py-4 pl-12 text-[#191c21] text-xl"
                  style={{ textAlign: rtl.textAlign }}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="לפחות 6 תווים"
                  placeholderTextColor="#727782"
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                {/* כפתור הצגת/הסתרת סיסמה */}
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  hitSlop={8}
                >
                  {showPassword ? (
                    <EyeOff size={22} color="#005da7" />
                  ) : (
                    <Eye size={22} color="#005da7" />
                  )}
                </Pressable>
              </View>
            </View>

            {/* תיבת סימון "זכור אותי" */}
            <View className={`${tw.flexRow} items-center justify-between mb-6`}>
              <Pressable
                onPress={() => setRememberMe(!rememberMe)}
                className="flex-row items-center gap-2"
                disabled={loading}
              >
                <Text className="text-[#414751] text-base font-medium">
                  זכור אותי
                </Text>
                <View
                  className={`w-6 h-6 rounded-md border-2 items-center justify-center ${
                    rememberMe
                      ? 'bg-[#005da7] border-[#005da7]'
                      : 'border-[#c1c7d3] bg-transparent'
                  }`}
                >
                  {rememberMe && (
                    <Text className="text-white text-sm font-bold">✓</Text>
                  )}
                </View>
              </Pressable>
            </View>

            {/* תיבת סימון הסכמה לתנאי שימוש ומדיניות פרטיות */}
            <View className="mb-6">
              <TouchableOpacity
                accessibilityLabel="אשר תנאי שימוש ומדיניות פרטיות"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: consentAccepted }}
                accessible={true}
                className={`${tw.flexRow} items-center gap-2`}
                onPress={() => setConsentAccepted(!consentAccepted)}
                disabled={loading}
              >
                <View
                  className={`h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border-2 ${
                    consentAccepted
                      ? 'bg-[#005da7] border-[#005da7]'
                      : 'bg-transparent border-[#c1c7d3]'
                  }`}
                >
                  {consentAccepted && <Check color="#ffffff" size={16} />}
                </View>
                <View className="flex-1">
                  <Text className={`${tw.textStart} text-[#414751] text-base`}>
                    אני מסכים ל
                    <Text
                      onPress={handleTermsPress}
                      className="text-[#005da7] font-bold"
                    >
                      תנאי השימוש
                    </Text>{' '}
                    ול
                    <Text
                      onPress={handlePrivacyPress}
                      className="text-[#005da7] font-bold"
                    >
                      מדיניות הפרטיות
                    </Text>
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* כפתור הרשמה */}
            <TouchableOpacity
              className={`overflow-hidden rounded-2xl ${loading || isPreviewMode || !consentAccepted ? 'opacity-60' : ''}`}
              onPress={onSignUpPress}
              disabled={loading || isPreviewMode || !consentAccepted}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#00457f', '#005da7', '#1b6d24']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className={`${tw.flexRow} items-center justify-center gap-2 py-6`}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Text className="text-white text-2xl font-bold">הירשם</Text>
                    <UserPlus size={28} color="#ffffff" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* מפריד "או" */}
            <View className={`${tw.flexRow} items-center gap-3 my-6`}>
              <View className="h-px flex-1 bg-[#c1c7d3]" />
              <Text className="text-[#727782] text-base font-medium">או</Text>
              <View className="h-px flex-1 bg-[#c1c7d3]" />
            </View>

            {/* כפתור הרשמה עם Google */}
            <TouchableOpacity
              accessibilityLabel="הרשמה עם חשבון Google"
              accessibilityRole="button"
              accessible={true}
              className={`${tw.flexRow} items-center justify-center gap-3 rounded-2xl border-2 border-[#c1c7d3] bg-white py-5 ${loading || isPreviewMode ? 'opacity-60' : ''}`}
              disabled={loading || isPreviewMode}
              onPress={onGooglePress}
              activeOpacity={0.85}
            >
              <GoogleGlyph />
              <Text className="text-[#191c21] text-xl font-bold">
                המשך עם Google
              </Text>
            </TouchableOpacity>

            {/* קישור להתחברות */}
            <View className="flex-row justify-center gap-2 mt-6">
              {isPreviewMode ? (
                <TouchableOpacity disabled={true}>
                  <Text className="text-[#727782] font-bold text-base">
                    התחבר כאן
                  </Text>
                </TouchableOpacity>
              ) : (
                <Link href="/(auth)/sign-in" asChild={true}>
                  <TouchableOpacity>
                    <Text className="text-[#005da7] font-bold text-base">
                      התחבר כאן
                    </Text>
                  </TouchableOpacity>
                </Link>
              )}
              <Text className="text-[#414751] text-base">כבר יש לך חשבון?</Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// לוגו Google הרשמי בארבעת הצבעים.
function GoogleGlyph() {
  return (
    <Svg width={26} height={26} viewBox="0 0 48 48">
      <Path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <Path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Svg>
  );
}
