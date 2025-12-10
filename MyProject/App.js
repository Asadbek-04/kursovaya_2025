import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ActivityIndicator 
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

// Импортируем экраны
import HomeScreen from './src/screens/HomeScreen';
import ArticleScreen from './src/screens/ArticleScreen';
import AddArticleScreen from './src/screens/AddArticleScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import StatisticsScreen from './src/screens/StatisticsScreen';
import FavoriteArticlesScreen from './src/screens/FavoriteArticlesScreen';
import MyArticlesScreen from './src/screens/MyArticlesScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import { apiService } from './src/services/api';
import EditArticleScreen from './src/screens/EditArticleScreen';
import AIAssistantScreen from './src/screens/AIAssistantScreen'

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs({ onLogout }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'HomeTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'AddTab') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'ProfileTab') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: 'tomato',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: 'Статьи', headerShown: false }} />
      <Tab.Screen name="AddTab" component={AddArticleScreen} options={{ title: 'Добавить', headerShown: false }} />
      <Tab.Screen 
        name="ProfileTab" 
        children={() => <ProfileScreen onLogout={onLogout} />} 
        options={{ title: 'Профиль', headerShown: false }} 
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [appReady, setAppReady] = useState(false);

  // Проверка авторизации при запуске приложения
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Восстанавливаем токен и проверяем авторизацию
      const isAuthenticated = await apiService.restoreToken();
      if (isAuthenticated) {
        // Проверяем валидность токена
        try {
          await apiService.checkAuth();
          setIsLoggedIn(true);
          console.log('✅ User is authenticated');
        } catch (error) {
          console.log('❌ Token is invalid');
          apiService.clearToken();
          setIsLoggedIn(false);
        }
      } else {
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsLoggedIn(false);
    } finally {
      setAppReady(true);
    }
  };

  const handleLoginSuccess = async (userData) => {
    try {
      console.log('✅ Login successful');
      setIsLoggedIn(true);
    } catch (error) {
      console.error('Error during login:', error);
    }
  };

  const handleLogout = async () => {
    try {
      apiService.clearToken();
      console.log('🚪 Logging out...');
      setIsLoggedIn(false);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // Пока приложение загружается, показываем индикатор
  if (!appReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Загрузка...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator>
        {isLoggedIn ? (
          // Авторизованный пользователь
          <>
            <Stack.Screen 
              name="Main" 
              children={() => <MainTabs onLogout={handleLogout} />} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="Article" 
              component={ArticleScreen} 
              options={{ title: 'Статья' }} 
            />
            <Stack.Screen 
              name="Statistics" 
              component={StatisticsScreen} 
              options={{ title: 'Статистика' }} 
            />
            <Stack.Screen 
              name="FavoriteArticles" 
              component={FavoriteArticlesScreen} 
              options={{ title: 'Понравившиеся' }} 
            />
            <Stack.Screen 
              name="MyArticles" 
              component={MyArticlesScreen} 
              options={{ title: 'Мои статьи' }} 
            />
            <Stack.Screen 
              name="EditProfile" 
              component={EditProfileScreen} 
              options={{ title: 'Редактирование профиля' }} 
            />
            <Stack.Screen 
              name="EditArticle" 
              component={EditArticleScreen} 
              options={{ title: 'Редактирование статьи' }} 
            />
            <Stack.Screen 
              name="AIAssistant" 
              component={AIAssistantScreen} 
              options={{ title: 'AI Ассистент' }} 
            />
            {/* Добавляем экран Add в Stack Navigator для навигации из AIAssistant */}
            <Stack.Screen 
              name="Add" 
              component={AddArticleScreen} 
              options={{ title: 'Добавить статью' }} 
            />
          </>
        ) : (
          // Неавторизованный пользователь
          <>
            <Stack.Screen 
              name="Login" 
              children={() => <LoginScreen onLoginSuccess={handleLoginSuccess} />} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="Register" 
              children={() => <RegisterScreen onLoginSuccess={handleLoginSuccess} />} 
              options={{ headerShown: false }} 
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}