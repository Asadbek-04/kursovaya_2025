const API_BASE_URL = 'http://192.168.1.3:5000/api'; 

class ApiService {
  constructor() {
    this.token = null;
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    console.log('🔗 Making request to:', url);

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Добавляем токен если есть
    if (this.token) {
      config.headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);
      
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Response data:', data);
      return data;
      
    } catch (error) {
      console.error('❌ API Request failed:', error);
      console.error('🔗 Failed URL:', url);
      throw error;
    }
  }

  // Test endpoint для проверки
  async testConnection() {
    return this.request('/test');
  }

  // Auth
  async login(email, password) {
    const result = await this.request('/login', {
      method: 'POST',
      body: { email, password },
    });
    
    if (result && result.token) {
      this.token = result.token;
      // Сохраняем токен
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('authToken', this.token);
      }
    }
    
    return result;
  }

  async register(username, email, password) {
    const result = await this.request('/register', {
      method: 'POST',
      body: { username, email, password },
    });
    
    if (result && result.token) {
      this.token = result.token;
      // Сохраняем токен
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('authToken', this.token);
      }
    }
    
    return result;
  }

  // Users
  async getCurrentUser() {
    return this.request('/users/profile');
  }

  // Articles
  async getArticles() {
    return this.request('/articles');
  }

  async getArticle(slug) {
    return this.request(`/articles/${slug}`);
  }

  async createArticle(articleData) {
    return this.request('/articles', {
      method: 'POST',
      body: articleData,
    });
  }

  // Comments
  async getComments(slug) {
    return this.request(`/articles/${slug}/comments`);
  }

  async addComment(slug, text) {
    return this.request(`/articles/${slug}/comments`, {
      method: 'POST',
      body: { text },
    });
  }

  // Likes
  async toggleLike(slug) {
    return this.request(`/articles/${slug}/like`, {
      method: 'POST',
    });
  }

  // Profile
  async updateProfile(profileData) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: profileData,
    });
  }

  // Восстановление токена при запуске
  async restoreToken() {
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedToken = localStorage.getItem('authToken');
      if (savedToken) {
        this.token = savedToken;
        console.log('✅ Token restored from storage');
        return true;
      }
    }
    return false;
  }

  // Очистка токена
  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('authToken');
    }
    console.log('🗑️ Token cleared');
  }

  // Проверка авторизации
  async checkAuth() {
    try {
      if (!this.token) {
        await this.restoreToken();
      }
      const response = await this.request('/users/profile');
      return response;
    } catch (error) {
      this.clearToken();
      throw new Error('Not authenticated');
    }
  }

  // Получение статистики пользователя
  async getStatistics(userId) {
    return this.request(`/users/${userId}/statistics`);
  }

  async getFavoriteArticles() {
    return this.request('/users/favorites');
  }

  // Получение статей пользователя
  async getUserArticles() {
    return this.request('/users/articles');
  }

  // Получение лайков пользователя
  async getUserLikes() {
    return this.request('/users/likes');
  }

  // Получение комментариев пользователя
  async getUserComments() {
    return this.request('/users/comments');
  }

  // Получение статистики пользователя
  async getUserStatistics(userId) {
    return this.request(`/users/${userId}/statistics`);
  }

  // В api.js добавьте эти методы:

  // Обновление статьи
  async updateArticle(slug, articleData) {
    return this.request(`/articles/${slug}`, {
      method: 'PUT',
      body: articleData,
    });
  }

  // Удаление статьи
  async deleteArticle(slug) {
    return this.request(`/articles/${slug}`, {
      method: 'DELETE',
    });
  }

  // AI методы в api.js
  async generateAIContent(params) {
    return this.request('/ai/generate-article', {
      method: 'POST',
      body: params,
    });
  }

  async generateAIAnalytics(params) {
    return this.request('/ai/analytics', {
      method: 'POST',
      body: params,
    });
  }

  async getAIRecommendations() {
    return this.request('/ai/recommendations');
  }
}

export const apiService = new ApiService();