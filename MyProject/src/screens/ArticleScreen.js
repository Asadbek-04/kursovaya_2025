import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { apiService } from '../services/api';

export default function ArticleScreen({ route, navigation }) {
  const { slug, onArticleUpdate } = route.params || {};
  const [article, setArticle] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);

  const loadArticle = async () => {
    if (!slug) {
      Alert.alert('Ошибка', 'Статья не найдена');
      navigation.goBack();
      return;
    }

    try {
      setLoading(true);
      const articleData = await apiService.getArticle(slug);
      setArticle(articleData);
      
      const commentsData = await apiService.getComments(slug);
      setComments(commentsData);
    } catch (error) {
      console.error('Error loading article:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить статью');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArticle();
  }, [slug]);

  const handleLike = async () => {
    try {
      setLikeLoading(true);
      const result = await apiService.toggleLike(slug);
      if (article) {
        setArticle({
          ...article,
          likes_count: result.likes_count
        });
      }
      
      // Обновляем главную страницу если передана функция
      if (onArticleUpdate) {
        onArticleUpdate();
      }
      
    } catch (error) {
      console.error('Error toggling like:', error);
      Alert.alert('Ошибка', 'Не удалось поставить лайк');
    } finally {
      setLikeLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      Alert.alert('Ошибка', 'Введите текст комментария');
      return;
    }

    try {
      setCommentLoading(true);
      await apiService.addComment(slug, newComment.trim());
      setNewComment('');
      
      // Перезагружаем комментарии
      const commentsData = await apiService.getComments(slug);
      setComments(commentsData);
      
      if (article) {
        setArticle({
          ...article,
          comments_count: commentsData.length
        });
      }
      
      // Обновляем главную страницу если передана функция
      if (onArticleUpdate) {
        onArticleUpdate();
      }
      
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Ошибка', 'Не удалось добавить комментарий');
    } finally {
      setCommentLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Загрузка статьи...</Text>
      </View>
    );
  }

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
      <View style={styles.articleHeader}>
        <Text style={styles.title}>{article.title}</Text>
        <Text style={styles.meta}>
          Автор: {article.author_name} • {new Date(article.created_at).toLocaleDateString('ru-RU')}
        </Text>
        <Text style={styles.category}>Категория: {article.category}</Text>
        
        {article.location_lat && article.location_lng && (
          <View style={styles.locationContainer}>
            <Text style={styles.locationTitle}>📍 Местоположение:</Text>
            <Text style={styles.locationCoords}>
              Широта: {article.location_lat}
            </Text>
            <Text style={styles.locationCoords}>
              Долгота: {article.location_lng}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.stats}>
        <Text style={styles.stat}>👁️ {article.views}</Text>
        <TouchableOpacity onPress={handleLike} disabled={likeLoading}>
          <Text style={[styles.stat, likeLoading && styles.disabledStat]}>
            ❤️ {article.likes_count}
          </Text>
        </TouchableOpacity>
        <Text style={styles.stat}>💬 {article.comments_count}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.contentText}>{article.content}</Text>
      </View>

      {/* Комментарии */}
      <View style={styles.commentsSection}>
        <Text style={styles.commentsTitle}>Комментарии ({comments.length})</Text>
        
        {/* Форма добавления комментария */}
        <View style={styles.commentForm}>
          <TextInput
            style={styles.commentInput}
            placeholder="Напишите комментарий..."
            value={newComment}
            onChangeText={setNewComment}
            multiline
            numberOfLines={3}
          />
          <TouchableOpacity
            style={[styles.commentButton, commentLoading && styles.disabledButton]}
            onPress={handleAddComment}
            disabled={commentLoading}
          >
            {commentLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.commentButtonText}>Отправить</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Список комментариев */}
        {comments.map((comment) => (
          <View key={comment.id} style={styles.comment}>
            <Text style={styles.commentAuthor}>{comment.username}</Text>
            <Text style={styles.commentText}>{comment.text}</Text>
            <Text style={styles.commentDate}>
              {new Date(comment.created_at).toLocaleDateString('ru-RU')}
            </Text>
          </View>
        ))}

        {comments.length === 0 && (
          <Text style={styles.noComments}>Пока нет комментариев. Будьте первым!</Text>
        )}
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
  articleHeader: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  meta: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  category: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 10,
    fontWeight: '500',
  },
  locationContainer: {
    backgroundColor: '#f0f8ff',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  locationTitle: {
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
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
  },
  stat: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  disabledStat: {
    opacity: 0.5,
  },
  content: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 10,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  commentsSection: {
    backgroundColor: 'white',
    padding: 20,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  commentForm: {
    marginBottom: 20,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  commentButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  commentButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  comment: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 12,
    paddingHorizontal: 5,
  },
  commentAuthor: {
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  commentText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#555',
    lineHeight: 20,
  },
  commentDate: {
    fontSize: 12,
    color: '#888',
  },
  noComments: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginTop: 20,
    padding: 20,
  },
});