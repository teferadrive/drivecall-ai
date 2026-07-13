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
              className="h-24 w-24 items-center justify-center rounded-3xl"
            >
              <UserPlus size={52} color="#ffffff" />
            </LinearGradient>
          </View>

          <View className="w-full rounded-3xl border border-[#c1c7d3] bg-white p-6">
            <Text
              className="text-[#191c21] text-[36px] font-bold mb-2"
              style={{ textAlign: rtl.textAlign }}
            >
              צור חשבון חדש
            </Text>
            <Text
              className="text-[#414751] text-lg mb-8"
              style={{ textAlign: rtl.textAlign }}
            >
              הירשם כדי להתחיל להשתמש באפליקציה
            </Text>

            {/* שדה אימייל */}
            <View className="mb-5">
              <View className={`${tw.flexRow} items-center gap-2 mb-2`}>
                <View className="rounded-lg bg-[#d3e3ff] p-1.5">
                  <Mail size={18} color="#005da7" />
                </View>
                <Text
                  className="text-[#191c21] text-base font-bold"
                  style={{ textAlign: rtl.textAlign }}
                >
                  כתובת אימייל
                </Text>
              </View>
              <TextInput
                className="bg-[#e7e8ef] border-2 border-[#c1c7d3] rounded-xl px-4 py-4 text-[#191c21] text-lg"
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
                <View className="rounded-lg bg-[#d3e3ff] p-1.5">
                  <Lock size={18} color="#005da7" />
                </View>
                <Text
                  className="text-[#191c21] text-base font-bold"
                  style={{ textAlign: rtl.textAlign }}
                >
                  סיסמה
                </Text>
              </View>
              <View className="relative">
                <TextInput
                  className="bg-[#e7e8ef] border-2 border-[#c1c7d3] rounded-xl px-4 py-4 pl-12 text-[#191c21] text-lg"
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
                className={`${tw.flexRow} items-center justify-center gap-2 py-5`}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Text className="text-white text-xl font-bold">הירשם</Text>
                    <UserPlus size={24} color="#ffffff" />
                  </>
                )}
              </LinearGradient>
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
