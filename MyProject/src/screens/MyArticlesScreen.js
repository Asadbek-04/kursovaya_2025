import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { apiService } from '../services/api';

export default function MyArticlesScreen() {
  const navigation = useNavigation();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMyArticles = async () => {
    try {
      setLoading(true);
      
      // Получаем статьи пользователя
      const userArticles = await apiService.getUserArticles();
      setArticles(userArticles);
      
    } catch (error) {
      console.error('Error loading my articles:', error);
      setArticles([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMyArticles();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadMyArticles();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadMyArticles();
  };

  const handleEditArticle = (article) => {
    navigation.navigate('EditArticle', { article });
  };

  const handleViewArticle = (article) => {
    navigation.navigate('Article', { slug: article.slug });
  };

  const handleDeleteArticle = (article) => {
    Alert.alert(
      'Удаление статьи',
      `Вы уверены, что хотите удалить статью "${article.title}"?`,
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Удалить', 
          style: 'destructive',
          onPress: () => deleteArticle(article.slug)
        },
      ]
    );
  };

  const deleteArticle = async (slug) => {
    try {
      await apiService.deleteArticle(slug);
      Alert.alert('Успех', 'Статья удалена!');
      loadMyArticles(); // Перезагружаем список
    } catch (error) {
      console.error('Error deleting article:', error);
      Alert.alert('Ошибка', 'Не удалось удалить статью');
    }
  };

  const renderArticle = ({ item }) => (
    <View style={styles.articleCard}>
      {item.photo && (
        <Image 
          source={{ uri: item.photo }} 
          style={styles.articleImage}
        />
      )}
      <View style={styles.articleContent}>
        <Text style={styles.articleTitle}>{item.title}</Text>
        <Text style={styles.articleMeta}>
          {new Date(item.created_at).toLocaleDateString('ru-RU')}
          {item.category && ` • ${item.category}`}
        </Text>
        <Text style={styles.articleExcerpt} numberOfLines={2}>
          {item.content}
        </Text>
        <View style={styles.articleStats}>
          <Text style={styles.stat}>👁️ {item.views || 0}</Text>
          <Text style={styles.stat}>❤️ {item.likes_count || 0}</Text>
          <Text style={styles.stat}>💬 {item.comments_count || 0}</Text>
        </View>
        
        {/* Кнопки действий */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.viewButton}
            onPress={() => handleViewArticle(item)}
          >
            <Text style={styles.viewButtonText}>👁️ Просмотреть</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => handleEditArticle(item)}
          >
            <Text style={styles.editButtonText}>✏️ Редактировать</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => handleDeleteArticle(item)}
          >
            <Text style={styles.deleteButtonText}>🗑️ Удалить</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Загрузка ваших статей...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Мои статьи</Text>
        <Text style={styles.subtitle}>
          Управление вашими статьями
        </Text>
        <Text style={styles.count}>
          Всего: {articles.length} статей
        </Text>
      </View>

      <FlatList
        data={articles}
        renderItem={renderArticle}
        keyExtractor={(item) => item.slug}
        contentContainerStyle={styles.list}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>У вас пока нет статей</Text>
            <Text style={styles.emptySubtext}>
              Создайте свою первую статью!
            </Text>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => navigation.navigate('Add')}
            >
              <Text style={styles.createButtonText}>Создать статью</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
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
  header: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  count: {
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  list: {
    padding: 10,
  },
  articleCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  articleImage: {
    width: '100%',
    height: 200,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  articleContent: {
    padding: 15,
  },
  articleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  articleMeta: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  articleExcerpt: {
    fontSize: 14,
    color: '#555',
    marginBottom: 10,
    lineHeight: 20,
  },
  articleStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  stat: {
    fontSize: 12,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  viewButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  editButton: {
    flex: 1,
    backgroundColor: '#FFA000',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  viewButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  editButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: '#FF6B35',
    padding: 15,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});