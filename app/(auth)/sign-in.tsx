import { useAuthActions } from '@convex-dev/auth/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Eye, EyeOff, Lock, LogIn, Mail } from 'lucide-react-native';
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
import { IS_DEV_MODE } from '@/config/appConfig';
import { rtl, tw } from '@/lib/rtl';

const REMEMBERED_EMAIL_KEY = 'remembered_email';

export default function SignInScreen() {
  const { signIn } = useAuthActions(); // פעולת ההתחברות מ-Convex Auth
  const router = useRouter(); // ניווט
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const isPreviewMode = IS_DEV_MODE && preview === 'true';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false); // מצב טעינה
  const [rememberMe, setRememberMe] = useState(false); // האם לזכור את האימייל
  const [showPassword, setShowPassword] = useState(false); // הצגת/הסתרת סיסמה

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

  // פונקציית ההתחברות
  const onSignInPress = async () => {
    // במצב תצוגה מקדימה - לא מבצעים התחברות אמיתית
    if (isPreviewMode) {
      return;
    }

    if (!email || !password) {
      Alert.alert('שגיאה', 'אנא מלא את כל השדות');
      return;
    }

    setLoading(true);

    try {
      // ניסיון התחברות מול השרת
      await signIn('password', { email, password, flow: 'signIn' });

      // שמירה או מחיקה של האימייל מהזיכרון בהתאם לתיבת הסימון
      if (rememberMe) {
        await AsyncStorage.setItem(REMEMBERED_EMAIL_KEY, email);
      } else {
        await AsyncStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }

      // מעבר לאזור המאומת (Authenticated)
      router.replace('/(authenticated)');
    } catch (err: unknown) {
      const error = err as { message?: string };
      const errorMessage = error.message || '';

      // מיפוי שגיאות Convex Auth להודעות בעברית ידידותיות למשתמש
      if (errorMessage.includes('InvalidSecret')) {
        Alert.alert('שגיאה', 'הסיסמה שהוזנה שגויה');
      } else if (
        errorMessage.includes('InvalidAccountId') ||
        errorMessage.includes('Could not find')
      ) {
        Alert.alert('שגיאה', 'לא נמצא חשבון עם כתובת האימייל הזו');
      } else if (errorMessage.includes('TooManyRequests')) {
        Alert.alert(
          'שגיאה',
          'יותר מדי ניסיונות התחברות. אנא נסה שוב מאוחר יותר'
        );
      } else {
        Alert.alert('שגיאה', 'התחברות נכשלה. אנא בדוק את הפרטים ונסה שוב');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f8f9ff]">
      {/* כפתור יציאה במצב תצוגה מקדימה */}
      {isPreviewMode && <PreviewModeBanner onClose={() => router.back()} />}

      {/* KeyboardAvoidingView דואג שהמקלדת לא תסתיר את שדות הקלט */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* באנר מצב תצוגה מקדימה */}
        {isPreviewMode && (
          <View className="p-3 bg-yellow-500/20 border-b border-yellow-500/50">
            <Text className="text-yellow-600 text-center text-sm font-medium">
              מצב תצוגה מקדימה - התחברות מושבתת
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
              <LogIn size={52} color="#ffffff" />
            </LinearGradient>
          </View>

          <View className="w-full rounded-3xl border border-[#c1c7d3] bg-white p-6">
            <Text
              className="text-[#191c21] text-[36px] font-bold mb-2"
              style={{ textAlign: rtl.textAlign }}
            >
              התחבר לחשבון
            </Text>
            <Text
              className="text-[#414751] text-lg mb-8"
              style={{ textAlign: rtl.textAlign }}
            >
              ברוך שובך! אנא התחבר כדי להמשיך
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
                  placeholder="הזן סיסמה"
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

            {/* כפתור התחברות */}
            <TouchableOpacity
              className={`overflow-hidden rounded-2xl ${loading || isPreviewMode ? 'opacity-60' : ''}`}
              onPress={onSignInPress}
              disabled={loading || isPreviewMode}
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
                    <Text className="text-white text-xl font-bold">התחבר</Text>
                    <LogIn size={24} color="#ffffff" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* קישור להרשמה */}
            <View className="flex-row justify-center gap-2 mt-6">
              {isPreviewMode ? (
                <TouchableOpacity disabled={true}>
                  <Text className="text-[#727782] font-bold text-base">
                    הירשם כאן
                  </Text>
                </TouchableOpacity>
              ) : (
                <Link href="/(auth)/sign-up" asChild={true}>
                  <TouchableOpacity>
                    <Text className="text-[#005da7] font-bold text-base">
                      הירשם כאן
                    </Text>
                  </TouchableOpacity>
                </Link>
              )}
              <Text className="text-[#414751] text-base">
                עדיין אין לך חשבון?
              </Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
