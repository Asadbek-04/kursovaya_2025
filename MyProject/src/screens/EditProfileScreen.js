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
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { apiService } from '../services/api';

export default function EditProfileScreen({ route }) {
  const navigation = useNavigation();
  const { user } = route.params || {};

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setEmail(user.email || '');
      setPhoto(user.photo || null);
    }
  }, [user]);

  const pickImageFromGallery = async () => {
    try {
      setPhotoLoading(true);
      
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Ошибка', 'Разрешение на доступ к галерее отклонено');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Ошибка', 'Не удалось выбрать изображение');
    } finally {
      setPhotoLoading(false);
    }
  };

  const takePhoto = async () => {
    try {
      setPhotoLoading(true);
      
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Ошибка', 'Разрешение на доступ к камере отклонено');
        return;
      }

      let result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Ошибка', 'Не удалось сделать фото');
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleSave = async () => {
  if (!username.trim() || !email.trim()) {
    Alert.alert('Ошибка', 'Заполните все обязательные поля');
    return;
  }

  if (!email.includes('@')) {
    Alert.alert('Ошибка', 'Введите корректный email');
    return;
  }

  setLoading(true);
  try {
    const updateData = {
      username: username.trim(),
      email: email.trim(),
      photo: photo,
    };

    const result = await apiService.updateProfile(updateData);
    
    if (result && result.user) {
      Alert.alert('Успех', 'Профиль обновлен!');
      navigation.goBack();
    } else {
      throw new Error('Не удалось обновить профиль');
    }
    
  } catch (error) {
    console.error('Error updating profile:', error);
    Alert.alert('Ошибка', error.message || 'Не удалось обновить профиль');
  } finally {
    setLoading(false);
  }
};

  const removePhoto = () => {
    setPhoto(null);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>Редактирование профиля</Text>

        {/* Аватар */}
        <View style={styles.avatarSection}>
          <Text style={styles.label}>Аватар</Text>
          <View style={styles.avatarContainer}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {username ? username.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.photoButtons}>
            <TouchableOpacity 
              style={[styles.photoButton, photoLoading && styles.disabledButton]} 
              onPress={pickImageFromGallery}
              disabled={photoLoading}
            >
              {photoLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.photoButtonText}>📁 Из галереи</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.photoButton, photoLoading && styles.disabledButton]} 
              onPress={takePhoto}
              disabled={photoLoading}
            >
              {photoLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.photoButtonText}>📷 Сделать фото</Text>
              )}
            </TouchableOpacity>

            {photo && (
              <TouchableOpacity style={styles.removeButton} onPress={removePhoto}>
                <Text style={styles.removeButtonText}>🗑️ Удалить</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Имя пользователя */}
        <Text style={styles.label}>Имя пользователя *</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="Введите имя пользователя"
          autoCapitalize="none"
        />

        {/* Email */}
        <Text style={styles.label}>Email *</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Введите email"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* Кнопки */}
        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.disabledButton]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveButtonText}>Сохранить</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Отмена</Text>
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 15,
    color: '#333',
  },
  avatarContainer: {
    marginBottom: 15,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    color: 'white',
    fontSize: 48,
    fontWeight: 'bold',
  },
  photoButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  photoButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  removeButton: {
    backgroundColor: '#FF6B35',
    padding: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  photoButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  removeButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 5,
  },
  buttons: {
    marginTop: 30,
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
});