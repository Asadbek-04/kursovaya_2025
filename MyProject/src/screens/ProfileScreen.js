import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { apiService } from '../services/api';

export default function ProfileScreen({ onLogout }) {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    articlesCount: 0,
    likesCount: 0,
    commentsCount: 0,
    favoritesCount: 0
  });

  // Загрузка данных пользователя
  const loadUserData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading user data...');
      const userData = await apiService.getCurrentUser();
      console.log('✅ User data loaded:', userData);
      setUser(userData);
      
      // Загружаем дополнительную статистику
      await loadUserStatistics();
      
    } catch (error) {
      console.error('❌ Error loading user data:', error);
      if (error.message.includes('401') || error.message.includes('403')) {
        setUser(null);
        // Не показываем алерт здесь
      }
    } finally {
      setLoading(false);
    }
  };

  // Загрузка статистики пользователя
  const loadUserStatistics = async () => {
    try {
      console.log('🔄 Loading user statistics...');
      
      // Загрузка количества статей пользователя
      const userArticles = await apiService.getUserArticles();
      const articlesCount = userArticles.length || 0;

      // Загрузка количества лайков пользователя
      const userLikes = await apiService.getUserLikes();
      const likesCount = userLikes.length || 0;

      // Загрузка количества комментариев пользователя
      const userComments = await apiService.getUserComments();
      const commentsCount = userComments.length || 0;

      // Загрузка понравившихся статей
      const favoriteArticles = await apiService.getFavoriteArticles();
      const favoritesCount = favoriteArticles.length || 0;

      console.log('✅ Statistics loaded:', {
        articlesCount,
        likesCount,
        commentsCount,
        favoritesCount
      });

      setStats({
        articlesCount,
        likesCount,
        commentsCount,
        favoritesCount
      });

    } catch (error) {
      console.error('❌ Error loading statistics:', error);
      // Используем базовые данные если API не доступно
      setStats({
        articlesCount: user?.articles_count || 0,
        likesCount: user?.likes_count || 0,
        commentsCount: user?.comments_count || 0,
        favoritesCount: 0
      });
    }
  };

  // Обновляем данные при фокусе на экране
  useFocusEffect(
    React.useCallback(() => {
      console.log('🎯 Profile screen focused, reloading data...');
      loadUserData();
    }, [])
  );

  // Первоначальная загрузка
  useEffect(() => {
    loadUserData();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Выход',
      'Вы уверены, что хотите выйти?',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Выйти', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Очищаем токен в API service
              apiService.clearToken();
              
              // Вызываем колбэк выхода из App.js
              if (onLogout) {
                onLogout();
              }
            } catch (error) {
              console.error('Error during logout:', error);
              if (onLogout) {
                onLogout();
              }
            }
          }
        },
      ]
    );
  };

  const handleStatistics = () => {
    if (user) {
      navigation.navigate('Statistics');
    } else {
      Alert.alert('Ошибка', 'Необходимо войти в систему');
    }
  };

  const handleFavoriteArticles = () => {
    if (user) {
      navigation.navigate('FavoriteArticles');
    } else {
      Alert.alert('Ошибка', 'Необходимо войти в систему');
    }
  };

  const handleMyArticles = () => {
    if (user) {
      navigation.navigate('MyArticles');
    } else {
      Alert.alert('Ошибка', 'Необходимо войти в систему');
    }
  };

  const handleEditProfile = () => {
    if (user) {
      navigation.navigate('EditProfile', { user });
    } else {
      Alert.alert('Ошибка', 'Необходимо войти в систему');
    }
  };

  const handleRefresh = () => {
    console.log('🔄 Manual refresh...');
    loadUserData();
  };

  // Если пользователь не авторизован
  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.authContainer}>
          <Text style={styles.authTitle}>Вы не авторизованы</Text>
          <Text style={styles.authSubtitle}>
            Войдите в систему чтобы получить доступ к вашему профилю
          </Text>
          
          <TouchableOpacity 
            style={styles.loginButton} 
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>Войти</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.registerButton} 
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.registerButtonText}>Зарегистрироваться</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Загрузка профиля...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          {user.photo ? (
            <Image source={{ uri: user.photo }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>
              {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
            </Text>
          )}
        </View>
        <Text style={styles.username}>{user.username || 'Пользователь'}</Text>
        <Text style={styles.email}>{user.email || 'Email не указан'}</Text>
        <Text style={styles.role}>Роль: {user.role || 'user'}</Text>
        
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <Text style={styles.refreshButtonText}>🔄 Обновить</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.articlesCount}</Text>
          <Text style={styles.statLabel}>Статей</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.likesCount}</Text>
          <Text style={styles.statLabel}>Лайков</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.commentsCount}</Text>
          <Text style={styles.statLabel}>Комментариев</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.favoritesCount}</Text>
          <Text style={styles.statLabel}>В избранном</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleStatistics}>
          <Text style={styles.actionText}>📊 Статистика</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleFavoriteArticles}>
          <Text style={styles.actionText}>❤️ Понравившиеся статьи</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleMyArticles}>
          <Text style={styles.actionText}>📝 Мои статьи</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleEditProfile}>
          <Text style={styles.actionText}>✏️ Редактировать профиль</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>🚪 Выйти</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {user.created_at ? `Зарегистрирован: ${new Date(user.created_at).toLocaleDateString('ru-RU')}` : ''}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  authSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  loginButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    marginBottom: 10,
  },
  loginButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  registerButton: {
    backgroundColor: '#34C759',
    padding: 15,
    borderRadius: 8,
    width: '100%',
  },
  registerButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  header: {
    backgroundColor: 'white',
    alignItems: 'center',
    padding: 30,
    marginBottom: 10,
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarText: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  role: {
    fontSize: 14,
    color: '#888',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  refreshButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: '#FF6B35',
    padding: 8,
    borderRadius: 6,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stats: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 10,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  actions: {
    backgroundColor: 'white',
    marginBottom: 10,
  },
  actionButton: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionText: {
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    margin: 20,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});