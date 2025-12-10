import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { apiService } from '../services/api';

export default function FavoriteArticlesScreen() {
  const navigation = useNavigation();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFavoriteArticles = async () => {
    try {
      setLoading(true);
      
      // Получаем понравившиеся статьи
      const favoriteArticles = await apiService.getFavoriteArticles();
      setArticles(favoriteArticles);
      
    } catch (error) {
      console.error('Error loading favorite articles:', error);
      // Если API не работает, показываем сообщение
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavoriteArticles();
  }, []);

  const renderArticle = ({ item }) => (
    <TouchableOpacity
      style={styles.articleCard}
      onPress={() => navigation.navigate('Article', { slug: item.slug })}
    >
      {item.photo && (
        <Image 
          source={{ uri: item.photo }} 
          style={styles.articleImage}
        />
      )}
      <View style={styles.articleContent}>
        <Text style={styles.articleTitle}>{item.title}</Text>
        <Text style={styles.articleMeta}>
          {item.author_name} • {new Date(item.created_at).toLocaleDateString('ru-RU')}
        </Text>
        <Text style={styles.articleExcerpt} numberOfLines={2}>
          {item.content}
        </Text>
        <View style={styles.articleStats}>
          <Text style={styles.stat}>👁️ {item.views || 0}</Text>
          <Text style={styles.stat}>❤️ {item.likes_count || 0}</Text>
          <Text style={styles.stat}>💬 {item.comments_count || 0}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Загрузка понравившихся статей...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Понравившиеся статьи</Text>
        <Text style={styles.subtitle}>
          Статьи, которые вы отметили лайком
        </Text>
      </View>

      <FlatList
        data={articles}
        renderItem={renderArticle}
        keyExtractor={(item) => item.slug}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Нет понравившихся статей</Text>
            <Text style={styles.emptySubtext}>
              Отмечайте статьи лайками, и они появятся здесь
            </Text>
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
  },
  stat: {
    fontSize: 12,
    color: '#666',
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
  },
});