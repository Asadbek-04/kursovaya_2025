import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { apiService } from '../services/api';

export default function AddArticleScreen({ navigation, route }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('news');
  const [location, setLocation] = useState(null);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  // Обрабатываем prefilled данные при получении
  useEffect(() => {
    if (route.params?.prefillData) {
      const { prefillData } = route.params;
      console.log('📝 Received prefill data:', prefillData);
      
      if (prefillData.title) {
        setTitle(prefillData.title);
      }
      if (prefillData.content) {
        setContent(prefillData.content);
      }
      if (prefillData.category) {
        setCategory(prefillData.category);
      }
      
      // Очищаем параметры после использования
      navigation.setParams({ prefillData: undefined });
    }
  }, [route.params?.prefillData]);

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
      
      Alert.alert('Успех', 'Местоположение получено!');
      
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Ошибка', 'Не удалось получить местоположение');
    } finally {
      setLocationLoading(false);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Ошибка', 'Разрешение на доступ к камере отклонено');
        return;
      }

      let result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setImage(result.assets[0].uri);
        Alert.alert('Успех', 'Фото сделано!');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Ошибка', 'Не удалось сделать фото');
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
        photo: image || null,
      };

      await apiService.createArticle(articleData);

      Alert.alert('Успех', 'Статья создана!');
      
      // Очищаем форму
      setTitle('');
      setContent('');
      setCategory('news');
      setLocation(null);
      setImage(null);
      
      // Возвращаемся на главную
      navigation.navigate('Home', { refresh: true });
      
    } catch (error) {
      console.error('Error creating article:', error);
      Alert.alert('Ошибка', 'Не удалось создать статью');
    } finally {
      setLoading(false);
    }
  };

  const clearLocation = () => {
    setLocation(null);
  };

  const clearImage = () => {
    setImage(null);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <TouchableOpacity 
          style={styles.aiButton}
          onPress={() => navigation.navigate('AIAssistant')}
        >
          <Text style={styles.aiButtonText}>🤖 Создать с помощью AI</Text>
        </TouchableOpacity>

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
              <Text style={styles.buttonText}>📍 Получить локацию</Text>
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
            <Text style={styles.locationText}>📍 Координаты получены</Text>
            <Text style={styles.locationCoords}>Широта: {location.lat.toFixed(6)}</Text>
            <Text style={styles.locationCoords}>Долгота: {location.lng.toFixed(6)}</Text>
          </View>
        )}

        <Text style={styles.label}>Фото</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.cameraButton} onPress={takePhoto}>
            <Text style={styles.buttonText}>📷 Сделать фото</Text>
          </TouchableOpacity>

          {image && (
            <TouchableOpacity style={styles.clearButton} onPress={clearImage}>
              <Text style={styles.buttonText}>❌ Удалить</Text>
            </TouchableOpacity>
          )}
        </View>

        {image && (
          <View style={styles.imageInfo}>
            <Text style={styles.imageText}>📷 Фото готово к загрузке</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitButtonText}>Опубликовать статью</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  form: {
    padding: 20,
  },
  aiButton: {
    backgroundColor: '#9C27B0',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  aiButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
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
  cameraButton: {
    backgroundColor: '#2196F3',
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
  imageInfo: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginTop: 5,
  },
  imageText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: 'bold',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#FF6B35',
    padding: 15,
    borderRadius: 8,
    marginTop: 30,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
});