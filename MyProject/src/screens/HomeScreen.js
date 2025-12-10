import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { apiService } from '../services/api';

export default function HomeScreen({ navigation, route }) {
  const [articles, setArticles] = useState([]);
  const [filteredArticles, setFilteredArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  
  // Состояния для фильтров
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  
  // Список категорий
  const categories = [
    { value: 'all', label: 'Все категории' },
    { value: 'news', label: 'Новости' },
    { value: 'tech', label: 'Технологии' },
    { value: 'sports', label: 'Спорт' },
    { value: 'science', label: 'Наука' },
    { value: 'entertainment', label: 'Развлечения' },
    { value: 'travel', label: 'Путешествия' },
    { value: 'food', label: 'Еда' },
    { value: 'health', label: 'Здоровье' },
    { value: 'business', label: 'Бизнес' },
  ];

  const loadArticles = async () => {
    try {
      setError(null);
      console.log('🔄 Loading articles...');
      const data = await apiService.getArticles();
      console.log('✅ Loaded articles:', data.length);
      setArticles(data);
      setLastUpdate(Date.now());
    } catch (err) {
      console.error('❌ Error loading articles:', err);
      setError('Ошибка загрузки статей');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Фильтрация и сортировка статей
  useEffect(() => {
    let filtered = [...articles];

    // Фильтрация по поисковому запросу
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(article => 
        article.title.toLowerCase().includes(query) ||
        article.content.toLowerCase().includes(query) ||
        article.author_name.toLowerCase().includes(query)
      );
    }

    // Фильтрация по категории
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(article => 
        article.category === selectedCategory
      );
    }

    // Сортировка
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'oldest':
          return new Date(a.created_at) - new Date(b.created_at);
        case 'most_views':
          return (b.views || 0) - (a.views || 0);
        case 'most_likes':
          return (b.likes_count || 0) - (a.likes_count || 0);
        case 'most_comments':
          return (b.comments_count || 0) - (a.comments_count || 0);
        default:
          return new Date(b.created_at) - new Date(a.created_at);
      }
    });

    setFilteredArticles(filtered);
  }, [articles, searchQuery, selectedCategory, sortBy]);

  useEffect(() => {
    loadArticles();
  }, []);

  // Обновляем статьи при возврате с других экранов
  useEffect(() => {
    console.log('🔄 Route params changed:', route.params);
    if (route.params?.refresh) {
      console.log('🔄 Refreshing articles from route params');
      loadArticles();
    }
  }, [route.params?.refresh]);

  const onRefresh = () => {
    console.log('🔄 Manual refresh...');
    setRefreshing(true);
    loadArticles();
  };

  const navigateToArticle = (slug) => {
    navigation.navigate('Article', { 
      slug: slug,
      onArticleUpdate: loadArticles
    });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSortBy('newest');
  };

  const getAIRecommendations = async () => {
    try {
      const recommendations = await apiService.getAIRecommendations();
      
      // Показываем рекомендации
      Alert.alert(
        '🎯 AI рекомендует',
        `На основе ваших интересов:\n\n` +
        `• ${recommendations[0]?.title || "Изучите статьи о технологиях"}\n` +
        `• ${recommendations[1]?.title || "Почитайте научные публикации"}\n` +
        `• ${recommendations[2]?.title || "Ознакомьтесь с новостями"}`,
        [{ text: 'Спасибо!' }]
      );
    } catch (error) {
      console.error('Error getting AI recommendations:', error);
    }
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedCategory !== 'all') count++;
    if (sortBy !== 'newest') count++;
    return count;
  };

  const renderArticle = ({ item }) => (
    <TouchableOpacity
      style={styles.articleCard}
      onPress={() => navigateToArticle(item.slug)}
    >
      {item.photo && (
        <Image source={{ uri: item.photo }} style={styles.articleImage} />
      )}
      <View style={styles.articleContent}>
        {item.category && (
          <Text style={styles.articleCategory}>{item.category}</Text>
        )}
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
          {item.location_lat && (
            <Text style={styles.stat}>📍</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Загрузка статей...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadArticles}>
          <Text style={styles.retryText}>Повторить</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Панель поиска и фильтров */}
      <View style={styles.filterContainer}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск по статьям..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowFilters(true)}
          >
            <Text style={styles.filterButtonText}>
              🎛️ Фильтры {getActiveFiltersCount() > 0 && `(${getActiveFiltersCount()})`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Быстрые фильтры категорий */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categoriesContainer}
        >
          {categories.slice(0, 6).map(category => (
            <TouchableOpacity
              key={category.value}
              style={[
                styles.categoryChip,
                selectedCategory === category.value && styles.categoryChipActive
              ]}
              onPress={() => setSelectedCategory(category.value)}
            >
              <Text style={[
                styles.categoryChipText,
                selectedCategory === category.value && styles.categoryChipTextActive
              ]}>
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Информация о результатах */}
      <View style={styles.resultsInfo}>
        <Text style={styles.resultsText}>
          Найдено: {filteredArticles.length} статей
        </Text>
        {getActiveFiltersCount() > 0 && (
          <TouchableOpacity onPress={clearFilters}>
            <Text style={styles.clearFiltersText}>Очистить фильтры</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredArticles}
        renderItem={renderArticle}
        keyExtractor={(item) => item.slug}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#FF6B35']}
            tintColor="#FF6B35"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {articles.length === 0 ? 'Статьи не найдены' : 'Статьи не найдены по вашему запросу'}
            </Text>
            <Text style={styles.emptySubtext}>
              {articles.length === 0 
                ? 'Будьте первым, кто добавит статью!' 
                : 'Попробуйте изменить параметры поиска'
              }
            </Text>
            {getActiveFiltersCount() > 0 && (
              <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                <Text style={styles.clearButtonText}>Очистить фильтры</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListHeaderComponent={
          <View style={styles.lastUpdate}>
            <Text style={styles.lastUpdateText}>
              Обновлено: {new Date(lastUpdate).toLocaleTimeString('ru-RU')}
            </Text>
            <TouchableOpacity style={styles.refreshButton} onPress={loadArticles}>
              <Text style={styles.refreshButtonText}>🔄 Обновить</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Модальное окно фильтров */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Фильтры и сортировка</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Сортировка */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Сортировка</Text>
                {[
                  { value: 'newest', label: 'Сначала новые' },
                  { value: 'oldest', label: 'Сначала старые' },
                  { value: 'most_views', label: 'По просмотрам' },
                  { value: 'most_likes', label: 'По лайкам' },
                  { value: 'most_comments', label: 'По комментариям' },
                ].map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.radioOption,
                      sortBy === option.value && styles.radioOptionActive
                    ]}
                    onPress={() => setSortBy(option.value)}
                  >
                    <Text style={[
                      styles.radioText,
                      sortBy === option.value && styles.radioTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Категории */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Категории</Text>
                <View style={styles.categoriesGrid}>
                  {categories.map(category => (
                    <TouchableOpacity
                      key={category.value}
                      style={[
                        styles.categoryOption,
                        selectedCategory === category.value && styles.categoryOptionActive
                      ]}
                      onPress={() => setSelectedCategory(category.value)}
                    >
                      <Text style={[
                        styles.categoryOptionText,
                        selectedCategory === category.value && styles.categoryOptionTextActive
                      ]}>
                        {category.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.clearAllButton}
                onPress={clearFilters}
              >
                <Text style={styles.clearAllButtonText}>Очистить все</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.applyButton}
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.applyButtonText}>Применить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  },
  // Стили для фильтров
  filterContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  filterButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  filterButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  categoriesScroll: {
    marginHorizontal: -5,
  },
  categoriesContainer: {
    paddingHorizontal: 5,
  },
  categoryChip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#007AFF',
  },
  categoryChipText: {
    fontSize: 12,
    color: '#666',
  },
  categoryChipTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  resultsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  resultsText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  clearFiltersText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  // Стили для статей
  lastUpdate: {
    padding: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lastUpdateText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  refreshButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 12,
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
  articleCategory: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: 'bold',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  articleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  articleMeta: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  articleExcerpt: {
    fontSize: 14,
    color: '#333',
    marginBottom: 10,
    lineHeight: 20,
  },
  articleStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stat: {
    fontSize: 12,
    color: '#666',
  },
  error: {
    color: 'red',
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
  },
  retryText: {
    color: 'white',
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
  clearButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Стили для модального окна
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 20,
    color: '#666',
  },
  modalBody: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 25,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  radioOption: {
    padding: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 8,
  },
  radioOptionActive: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  radioText: {
    fontSize: 16,
    color: '#333',
  },
  radioTextActive: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 8,
  },
  categoryOptionActive: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  categoryOptionText: {
    fontSize: 14,
    color: '#333',
  },
  categoryOptionTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 10,
  },
  clearAllButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearAllButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});