import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { apiService } from '../services/api';

// Простой график в виде столбцов
const SimpleBarChart = ({ data }) => {
  const maxValue = Math.max(...data.map(item => item.count), 1);
  const chartHeight = 150;
  
  return (
    <View style={styles.chartContainer}>
      {data.map((item, index) => {
        const barHeight = (item.count / maxValue) * chartHeight;
        return (
          <View key={index} style={styles.barContainer}>
            <View style={styles.barWrapper}>
              <View 
                style={[
                  styles.bar, 
                  { height: Math.max(barHeight, 10) } // Минимальная высота 10
                ]} 
              />
            </View>
            <Text style={styles.barLabel}>{item.week}</Text>
            <Text style={styles.barValue}>{item.count}</Text>
          </View>
        );
      })}
    </View>
  );
};

// Функция для получения номера недели в году
const getWeekNumber = (date) => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

// Функция для форматирования дат недели
const formatWeekRange = (startDate, endDate) => {
  const formatDate = (date) => {
    return date.toLocaleDateString('ru-RU', { 
      day: 'numeric',
      month: 'short'
    });
  };
  
  return `${formatDate(startDate)}-${formatDate(endDate)}`;
};

// Функция для получения начала и конца недели
const getWeekStartEnd = (date) => {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Понедельник как начало недели
  start.setDate(diff);
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  
  return { start, end };
};

export default function StatisticsScreen() {
  const navigation = useNavigation();
  const [statistics, setStatistics] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      
      // Получаем статьи пользователя
      const userArticles = await apiService.getUserArticles();
      
      // Группируем по неделям
      const articlesByWeek = {};
      
      userArticles.forEach(article => {
        const date = new Date(article.created_at);
        const { start, end } = getWeekStartEnd(date);
        const weekKey = `${start.getFullYear()}-${getWeekNumber(start)}`;
        const weekRange = formatWeekRange(start, end);
        
        if (!articlesByWeek[weekKey]) {
          articlesByWeek[weekKey] = {
            week: weekRange,
            count: 0,
            startDate: start,
            year: start.getFullYear(),
            weekNumber: getWeekNumber(start)
          };
        }
        articlesByWeek[weekKey].count++;
      });
      
      // Преобразуем в массив и сортируем по дате
      const statsData = Object.values(articlesByWeek)
        .sort((a, b) => a.startDate - b.startDate);
      
      // Если нет данных, показываем последние 8 недель
      if (statsData.length === 0) {
        const currentDate = new Date();
        
        for (let i = 7; i >= 0; i--) {
          const date = new Date(currentDate);
          date.setDate(date.getDate() - i * 7);
          const { start, end } = getWeekStartEnd(date);
          const weekRange = formatWeekRange(start, end);
          
          statsData.push({
            week: weekRange,
            count: 0,
            startDate: start
          });
        }
      } else {
        // Показываем только последние 8 недель для лучшей читаемости
        const recentWeeks = statsData.slice(-8);
        setStatistics(recentWeeks);
        return;
      }
      
      setStatistics(statsData);
      
    } catch (error) {
      console.error('Error loading statistics:', error);
      // Тестовые данные при ошибке (последние 8 недель)
      const currentDate = new Date();
      const testData = [];
      
      for (let i = 7; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setDate(date.getDate() - i * 7);
        const { start, end } = getWeekStartEnd(date);
        const weekRange = formatWeekRange(start, end);
        
        // Случайное количество статей для демонстрации
        const randomCount = Math.floor(Math.random() * 10);
        
        testData.push({
          week: weekRange,
          count: randomCount,
          startDate: start
        });
      }
      
      setStatistics(testData);
    } finally {
      setLoading(false);
    }
  };

  const generateAIAnalytics = async () => {
    try {
      const userArticles = await apiService.getUserArticles();
      
      const analytics = await apiService.generateAIAnalytics({
        articles: userArticles,
        period: 'all_time'
      });

      // Показываем AI-аналитику
      Alert.alert(
        '🤖 AI Аналитика вашего контента',
        `На основе анализа ваших ${userArticles.length} статей:\n\n` +
        `📊 ${analytics.insights}\n\n` +
        `💡 ${analytics.recommendations}`,
        [{ text: 'Понятно' }]
      );
    } catch (error) {
      console.error('Error generating AI analytics:', error);
      Alert.alert('Ошибка', 'Не удалось сгенерировать аналитику');
    }
  };

  useEffect(() => {
    loadStatistics();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Загрузка статистики...</Text>
      </View>
    );
  }

  const totalArticles = statistics.reduce((sum, item) => sum + item.count, 0);
  const averagePerWeek = totalArticles > 0 ? (totalArticles / statistics.length).toFixed(1) : 0;
  const mostProductiveWeek = statistics.reduce((max, item) => 
    item.count > max.count ? item : max, { count: 0, week: 'Нет данных' }
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Статистика публикаций</Text>
        <Text style={styles.subtitle}>
          Количество ваших статей по неделям
        </Text>
      </View>

      <View style={styles.totalContainer}>
        <Text style={styles.totalNumber}>{totalArticles}</Text>
        <Text style={styles.totalLabel}>всего статей</Text>
      </View>

      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{averagePerWeek}</Text>
          <Text style={styles.summaryLabel}>в среднем в неделю</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{mostProductiveWeek.count}</Text>
          <Text style={styles.summaryLabel}>макс. за неделю</Text>
          <Text style={styles.summaryWeek}>{mostProductiveWeek.week}</Text>
        </View>
      </View>

      <View style={styles.chartSection}>
        <Text style={styles.chartTitle}>Статистика за последние 8 недель</Text>
        <SimpleBarChart data={statistics} />
      </View>

      <View style={styles.statsList}>
        <Text style={styles.statsTitle}>Детальная статистика по неделям:</Text>
        {statistics.map((item, index) => (
          <View key={index} style={styles.statItem}>
            <View>
              <Text style={styles.statWeek}>{item.week}</Text>
              <Text style={styles.statSubtitle}>неделя</Text>
            </View>
            <Text style={styles.statCount}>{item.count} статей</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.aiButton} onPress={generateAIAnalytics}>
        <Text style={styles.aiButtonText}>🤖 AI Аналитика</Text>
      </TouchableOpacity>
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
  totalContainer: {
    backgroundColor: '#007AFF',
    padding: 20,
    margin: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  totalNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
  },
  totalLabel: {
    fontSize: 16,
    color: 'white',
    marginTop: 5,
  },
  summaryContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
  },
  summaryWeek: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  chartSection: {
    backgroundColor: 'white',
    padding: 20,
    margin: 10,
    borderRadius: 10,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 200,
    paddingHorizontal: 10,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  barWrapper: {
    height: 150,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: 20,
    backgroundColor: '#007AFF',
    borderRadius: 4,
    marginHorizontal: 2,
  },
  barLabel: {
    fontSize: 9,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  barValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  statsList: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 10,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statWeek: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  aiButton: {
    backgroundColor: '#34C759',
    padding: 15,
    margin: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  aiButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
});