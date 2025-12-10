import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Location from 'expo-location';
import { apiService } from '../services/api';

export default function EditArticleScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { article } = route.params || {};

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('news');
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    if (article) {
      setTitle(article.title || '');
      setContent(article.content || '');
      setCategory(article.category || 'news');
      if (article.location_lat && article.location_lng) {
        setLocation({
          lat: parseFloat(article.location_lat),
          lng: parseFloat(article.location_lng)
        });
      }
    }
  }, [article]);

  const getLocation = async () => {
    try {
      setLocationLoading(true);
      
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Ошибка', 'Разрешение на доступ к местоположению отклонено');
        setLocationLoading(false);
        return;
      }

      let locationData = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 15000,
      });
      
      const { latitude, longitude } = locationData.coords;
      
      setLocation({
        lat: latitude,
        lng: longitude,
      });
      
      Alert.alert('Успех', 'Местоположение обновлено!');
      
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Ошибка', 'Не удалось получить местоположение');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Ошибка', 'Заполните заголовок и содержание');
      return;
    }

    setLoading(true);
    try {
      const articleData = {
        title: title.trim(),
        content: content.trim(),
        category,
        location_lat: location?.lat || null,
        location_lng: location?.lng || null,
      };

      await apiService.updateArticle(article.slug, articleData);

      Alert.alert('Успех', 'Статья обновлена!');
      navigation.goBack();
      
    } catch (error) {
      console.error('Error updating article:', error);
      Alert.alert('Ошибка', 'Не удалось обновить статью');
    } finally {
      setLoading(false);
    }
  };

  const clearLocation = () => {
    setLocation(null);
  };

  const handleDelete = () => {
    Alert.alert(
      'Удаление статьи',
      'Вы уверены, что хотите удалить эту статью? Это действие нельзя отменить.',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Удалить', 
          style: 'destructive',
          onPress: deleteArticle
        },
      ]
    );
  };

  const deleteArticle = async () => {
    try {
      setLoading(true);
      await apiService.deleteArticle(article.slug);
      Alert.alert('Успех', 'Статья удалена!');
      navigation.navigate('MyArticles');
    } catch (error) {
      console.error('Error deleting article:', error);
      Alert.alert('Ошибка', 'Не удалось удалить статью');
    } finally {
      setLoading(false);
    }
  };

  if (!article) {
    return (
      <View style={styles.center}>
        <Text>Статья не найдена</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Назад</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>Редактирование статьи</Text>

        <Text style={styles.label}>Заголовок *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Введите заголовок статьи"
        />

        <Text style={styles.label}>Содержание *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={content}
          onChangeText={setContent}
          placeholder="Введите содержание статьи"
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />

        <Text style={styles.label}>Категория</Text>
        <TextInput
          style={styles.input}
          value={category}
          onChangeText={setCategory}
          placeholder="news, tech, sports, etc."
        />

        <Text style={styles.label}>Геолокация</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.locationButton, locationLoading && styles.disabledButton]} 
            onPress={getLocation}
            disabled={locationLoading}
          >
            {locationLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.buttonText}>📍 Обновить локацию</Text>
            )}
          </TouchableOpacity>

          {location && (
            <TouchableOpacity style={styles.clearButton} onPress={clearLocation}>
              <Text style={styles.buttonText}>❌ Очистить</Text>
            </TouchableOpacity>
          )}
        </View>

        {location && (
          <View style={styles.locationInfo}>
            <Text style={styles.locationText}>📍 Координаты установлены</Text>
            <Text style={styles.locationCoords}>Широта: {location.lat.toFixed(6)}</Text>
            <Text style={styles.locationCoords}>Долгота: {location.lng.toFixed(6)}</Text>
          </View>
        )}

        <View style={styles.stats}>
          <Text style={styles.stat}>👁️ Просмотры: {article.views || 0}</Text>
          <Text style={styles.stat}>❤️ Лайки: {article.likes_count || 0}</Text>
          <Text style={styles.stat}>💬 Комментарии: {article.comments_count || 0}</Text>
          <Text style={styles.stat}>
            📅 Создана: {new Date(article.created_at).toLocaleDateString('ru-RU')}
          </Text>
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveButtonText}>Сохранить изменения</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Отмена</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            disabled={loading}
          >
            <Text style={styles.deleteButtonText}>🗑️ Удалить статью</Text>
          </TouchableOpacity>
        </View>
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
    padding: 20,
  },
  backButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  form: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  locationButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    flex: 1,
  },
  clearButton: {
    backgroundColor: '#FF6B35',
    padding: 15,
    borderRadius: 8,
    justifyContent: 'center',
  },
  locationInfo: {
    backgroundColor: '#E8F5E8',
    padding: 12,
    borderRadius: 8,
    marginTop: 5,
  },
  locationText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 5,
  },
  locationCoords: {
    fontSize: 12,
    color: '#2E7D32',
    fontFamily: 'monospace',
  },
  stats: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 10,
  },
  stat: {
    fontSize: 14,
    color: '#1976D2',
    marginBottom: 5,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  buttons: {
    marginTop: 20,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  cancelButton: {
    backgroundColor: '#9E9E9E',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  deleteButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
});