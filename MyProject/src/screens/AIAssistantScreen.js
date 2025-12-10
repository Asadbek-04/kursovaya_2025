import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { apiService } from '../services/api';

export default function AIAssistantScreen() {
  const navigation = useNavigation();
  const [topic, setTopic] = useState('');
  const [style, setStyle] = useState('news');
  const [length, setLength] = useState('medium');
  const [includeLocation, setIncludeLocation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [suggestedTitle, setSuggestedTitle] = useState('');

  const stylesOptions = [
    { value: 'news', label: '📰 Новостной' },
    { value: 'tech', label: '📊 Технологии' },
    { value: 'sports', label: ' Спорт' },
    { value: 'science', label: '🔬 Научный' },
    { value: 'entertainment', label: '🎭 Развлекательный' },
  ];

  const lengthOptions = [
    { value: 'short', label: 'Короткий (100-200 слов)' },
    { value: 'medium', label: 'Средний (300-500 слов)' },
    { value: 'long', label: 'Длинный (500+ слов)' },
  ];

  const generateArticle = async () => {
    if (!topic.trim()) {
      Alert.alert('Ошибка', 'Введите тему статьи');
      return;
    }

    setLoading(true);
    try {
      const result = await apiService.generateAIContent({
        topic: topic.trim(),
        style,
        length,
        includeLocation,
      });

      if (result && result.content) {
        setGeneratedContent(result.content);
        setSuggestedTitle(result.title || '');
        Alert.alert('Успех', 'Статья сгенерирована!');
      } else {
        throw new Error('Не удалось сгенерировать статью');
      }
    } catch (error) {
      console.error('Error generating article:', error);
      Alert.alert('Ошибка', 'Не удалось сгенерировать статью');
      
      // Демо-контент для тестирования
      setGeneratedContent(`# ${topic}\n\nЭто демо-версия сгенерированной статьи на тему "${topic}". В реальном приложении здесь был бы текст, созданный искусственным интеллектом.\n\nСтатья написана в ${stylesOptions.find(s => s.value === style)?.label} стиле.`);
      setSuggestedTitle(`ИИ-статья: ${topic}`);
    } finally {
      setLoading(false);
    }
  };

  const useGeneratedContent = () => {
    if (!generatedContent) return;
    
    // Переходим на экран Add в Stack Navigator и передаем данные
    navigation.navigate('Add', {
      prefillData: {
        title: suggestedTitle || `AI Статья: ${topic}`,
        content: generatedContent,
        category: style,
      }
    });
  };

  const clearAll = () => {
    setTopic('');
    setGeneratedContent('');
    setSuggestedTitle('');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>🤖 AI-Ассистент для статей</Text>
        <Text style={styles.subtitle}>
          Создайте уникальную статью с помощью искусственного интеллекта
        </Text>

        {/* Тема статьи */}
        <Text style={styles.label}>Тема статьи *</Text>
        <TextInput
          style={styles.input}
          value={topic}
          onChangeText={setTopic}
          placeholder="Например: Искусственный интеллект в медицине"
          multiline
        />

        {/* Стиль статьи */}
        <Text style={styles.label}>Стиль статьи</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.optionsContainer}>
            {stylesOptions.map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  style === option.value && styles.optionButtonActive
                ]}
                onPress={() => setStyle(option.value)}
              >
                <Text style={[
                  styles.optionText,
                  style === option.value && styles.optionTextActive
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Длина статьи */}
        <Text style={styles.label}>Длина статьи</Text>
        <View style={styles.optionsContainer}>
          {lengthOptions.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionButton,
                length === option.value && styles.optionButtonActive
              ]}
              onPress={() => setLength(option.value)}
            >
              <Text style={[
                styles.optionText,
                length === option.value && styles.optionTextActive
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Дополнительные опции */}
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Добавить информацию о местоположении</Text>
          <Switch
            value={includeLocation}
            onValueChange={setIncludeLocation}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={includeLocation ? '#007AFF' : '#f4f3f4'}
          />
        </View>

        {/* Кнопка генерации */}
        <TouchableOpacity
          style={[styles.generateButton, loading && styles.disabledButton]}
          onPress={generateArticle}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.generateButtonText}>🎲 Сгенерировать статью</Text>
          )}
        </TouchableOpacity>

        {/* Результат */}
        {generatedContent ? (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>Результат:</Text>
            
            {suggestedTitle && (
              <View style={styles.suggestedTitle}>
                <Text style={styles.suggestedTitleLabel}>Предложенный заголовок:</Text>
                <Text style={styles.suggestedTitleText}>{suggestedTitle}</Text>
              </View>
            )}

            <ScrollView style={styles.generatedContent}>
              <Text style={styles.generatedText}>{generatedContent}</Text>
            </ScrollView>

            <View style={styles.resultButtons}>
              <TouchableOpacity
                style={styles.useButton}
                onPress={useGeneratedContent}
              >
                <Text style={styles.useButtonText}>📝 Использовать статью</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.regenerateButton}
                onPress={generateArticle}
              >
                <Text style={styles.regenerateButtonText}>🔄 Перегенерировать</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>💡 Советы для лучших результатов:</Text>
            <Text style={styles.tip}>• Будьте конкретны в теме</Text>
            <Text style={styles.tip}>• Укажите ключевые аспекты</Text>
            <Text style={styles.tip}>• Выберите подходящий стиль</Text>
            <Text style={styles.tip}>• Используйте четкие формулировки</Text>
          </View>
        )}

        <TouchableOpacity style={styles.clearButton} onPress={clearAll}>
          <Text style={styles.clearButtonText}>🗑️ Очистить все</Text>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 15,
    color: '#333',
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 50,
    textAlignVertical: 'top',
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  optionButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  optionButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  optionText: {
    fontSize: 14,
    color: '#666',
  },
  optionTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  generateButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  generateButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  suggestedTitle: {
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: 6,
    marginBottom: 15,
  },
  suggestedTitleLabel: {
    fontSize: 12,
    color: '#1976D2',
    marginBottom: 5,
  },
  suggestedTitleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  generatedContent: {
    maxHeight: 200,
    marginBottom: 15,
  },
  generatedText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
  resultButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  useButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 6,
  },
  regenerateButton: {
    flex: 1,
    backgroundColor: '#FFA000',
    padding: 12,
    borderRadius: 6,
  },
  useButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  regenerateButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  tipsContainer: {
    backgroundColor: '#FFF3E0',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#E65100',
  },
  tip: {
    fontSize: 14,
    color: '#E65100',
    marginBottom: 5,
  },
  clearButton: {
    backgroundColor: '#FF6B35',
    padding: 15,
    borderRadius: 8,
  },
  clearButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
});