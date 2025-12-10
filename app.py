from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
from werkzeug.security import generate_password_hash, check_password_hash
from config import Config
import os
from datetime import datetime, timedelta
import unicodedata
import re
import secrets
import jwt

app = Flask(__name__)
app.config.from_object(Config())
app.config['SECRET_KEY'] = 'your-super-secret-jwt-key-2024'  # Ваш секретный ключ
CORS(app, supports_credentials=True)


# JWT функции
def generate_token(user_id):
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')


def verify_token(token):
    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        return payload['user_id']
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


# Middleware для проверки JWT токена
def get_current_user():
    token = None
    if 'Authorization' in request.headers:
        auth_header = request.headers['Authorization']
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]

    if not token:
        return None

    user_id = verify_token(token)
    return user_id


def create_slug(text):
    if not text:
        return secrets.token_hex(8)

    text = text.lower().strip()

    cyrillic_map = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
        'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    }

    slug_chars = []
    for char in text:
        if char in cyrillic_map:
            slug_chars.append(cyrillic_map[char])
        elif char == ' ' or char == '_':
            slug_chars.append('-')
        elif char.isalnum():
            slug_chars.append(char)

    slug = ''.join(slug_chars)
    slug = re.sub(r'-+', '-', slug)
    slug = slug.strip('-')

    if not slug:
        slug = secrets.token_hex(8)

    return slug


def get_db_connection():
    conn = psycopg2.connect(
        host=app.config['DB_HOST'],
        database=app.config['DB_NAME'],
        user=app.config['DB_USER'],
        password=app.config['DB_PASSWORD'],
        port=app.config['DB_PORT']
    )
    return conn


# Регистрация пользователя
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if not username or not email or not password:
        return jsonify({'error': 'Все поля обязательны'}), 400

    hashed_password = generate_password_hash(password)

    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        cur.execute(
            'INSERT INTO users (username, email, password) VALUES (%s, %s, %s) RETURNING id, username, email, role',
            (username, email, hashed_password)
        )
        user = cur.fetchone()

        # Генерируем JWT токен
        token = generate_token(user['id'])

        conn.commit()

        return jsonify({
            'message': 'Регистрация успешна',
            'user': dict(user),
            'token': token
        }), 201

    except psycopg2.IntegrityError:
        return jsonify({'error': 'Пользователь с таким email или username уже существует'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


# Авторизация
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute('SELECT * FROM users WHERE email = %s', (email,))
    user = cur.fetchone()

    if user and check_password_hash(user['password'], password):
        # Генерируем JWT токен
        token = generate_token(user['id'])

        return jsonify({
            'message': 'Вход успешен',
            'user': {
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'role': user['role'],
                'photo': user.get('photo')
            },
            'token': token
        }), 200
    else:
        return jsonify({'error': 'Неверный email или пароль'}), 401


# Получение текущего пользователя
@app.route('/api/users/profile', methods=['GET'])
def get_current_user_profile():
    user_id = get_current_user()
    if not user_id:
        return jsonify({'error': 'Не авторизован'}), 401

    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    try:
        cur.execute('''
            SELECT id, username, email, role, photo, created_at 
            FROM users WHERE id = %s
        ''', (user_id,))
        user = cur.fetchone()

        if user:
            # Получаем реальную статистику пользователя
            cur.execute('''
                SELECT COUNT(*) as articles_count 
                FROM articles 
                WHERE author_id = %s
            ''', (user_id,))
            articles_count = cur.fetchone()['articles_count']

            cur.execute('''
                SELECT COUNT(*) as likes_count 
                FROM likes 
                WHERE user_id = %s
            ''', (user_id,))
            likes_count = cur.fetchone()['likes_count']

            cur.execute('''
                SELECT COUNT(*) as comments_count 
                FROM comments 
                WHERE user_id = %s
            ''', (user_id,))
            comments_count = cur.fetchone()['comments_count']

            user_data = dict(user)
            user_data['articles_count'] = articles_count
            user_data['likes_count'] = likes_count
            user_data['comments_count'] = comments_count

            return jsonify(user_data)
        else:
            return jsonify({'error': 'Пользователь не найден'}), 404

    except Exception as e:
        print("Error getting user profile:", e)
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


# Обновление профиля
@app.route('/api/users/profile', methods=['PUT'])
def update_profile():
    user_id = get_current_user()
    if not user_id:
        return jsonify({'error': 'Не авторизован'}), 401

    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    photo = data.get('photo')

    if not username or not email:
        return jsonify({'error': 'Имя пользователя и email обязательны'}), 400

    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    try:
        cur.execute('''
            UPDATE users 
            SET username = %s, email = %s, photo = %s 
            WHERE id = %s
            RETURNING id, username, email, photo, role, created_at
        ''', (username, email, photo, user_id))

        user = cur.fetchone()
        conn.commit()

        return jsonify({
            'message': 'Профиль обновлен',
            'user': dict(user)
        }), 200

    except psycopg2.IntegrityError:
        return jsonify({'error': 'Пользователь с таким email или username уже существует'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


# Получение всех статей
@app.route('/api/articles', methods=['GET'])
def get_articles():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute('''
        SELECT 
            a.*, 
            u.username as author_name,
            COUNT(DISTINCT l.id) as likes_count,
            COUNT(DISTINCT c.id) as comments_count,
            COALESCE(a.views, 0) as views
        FROM articles a
        LEFT JOIN users u ON a.author_id = u.id
        LEFT JOIN likes l ON a.id = l.article_id
        LEFT JOIN comments c ON a.id = c.article_id
        GROUP BY a.id, u.username, a.views
        ORDER BY a.created_at DESC
    ''')
    articles = cur.fetchall()

    cur.close()
    conn.close()

    return jsonify([dict(article) for article in articles])


# Создание статьи
@app.route('/api/articles', methods=['POST'])
def create_article():
    user_id = get_current_user()
    if not user_id:
        return jsonify({'error': 'Не авторизован'}), 401

    data = request.get_json()
    title = data.get('title')
    content = data.get('content')
    category = data.get('category', 'general')
    location_lat = data.get('location_lat')
    location_lng = data.get('location_lng')
    photo = data.get('photo')

    if not title or not content:
        return jsonify({'error': 'Заголовок и содержание обязательны'}), 400

    slug = create_slug(title)
    import time
    slug = f"{slug}-{int(time.time())}"

    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    try:
        cur.execute('''
            INSERT INTO articles (title, slug, content, author_id, category, location_lat, location_lng, photo)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        ''', (title, slug, content, user_id, category, location_lat, location_lng, photo))

        article = cur.fetchone()
        conn.commit()

        return jsonify({
            'message': 'Статья создана',
            'article': dict(article)
        }), 201

    except psycopg2.IntegrityError:
        slug = f"{slug}-{secrets.token_hex(4)}"
        cur.execute('''
            INSERT INTO articles (title, slug, content, author_id, category, location_lat, location_lng, photo)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        ''', (title, slug, content, user_id, category, location_lat, location_lng, photo))

        article = cur.fetchone()
        conn.commit()

        return jsonify({
            'message': 'Статья создана',
            'article': dict(article)
        }), 201

    except Exception as e:
        print("Error creating article:", e)
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


# Получение одной статьи
@app.route('/api/articles/<slug>', methods=['GET'])
def get_article(slug):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute('UPDATE articles SET views = COALESCE(views, 0) + 1 WHERE slug = %s', (slug,))
    conn.commit()

    cur.execute('''
        SELECT a.*, u.username as author_name,
               COUNT(DISTINCT l.id) as likes_count,
               COUNT(DISTINCT c.id) as comments_count
        FROM articles a
        LEFT JOIN users u ON a.author_id = u.id
        LEFT JOIN likes l ON a.id = l.article_id
        LEFT JOIN comments c ON a.id = c.article_id
        WHERE a.slug = %s
        GROUP BY a.id, u.username
    ''', (slug,))

    article = cur.fetchone()

    cur.close()
    conn.close()

    if article:
        return jsonify(dict(article))
    else:
        return jsonify({'error': 'Статья не найдена'}), 404


# Добавление комментария
@app.route('/api/articles/<slug>/comments', methods=['POST'])
def add_comment(slug):
    user_id = get_current_user()
    if not user_id:
        return jsonify({'error': 'Не авторизован'}), 401

    data = request.get_json()
    text = data.get('text')

    if not text:
        return jsonify({'error': 'Текст комментария обязателен'}), 400

    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute('SELECT id FROM articles WHERE slug = %s', (slug,))
    article = cur.fetchone()

    if not article:
        return jsonify({'error': 'Статья не найдена'}), 404

    cur.execute('''
        INSERT INTO comments (article_id, user_id, text)
        VALUES (%s, %s, %s)
        RETURNING *
    ''', (article['id'], user_id, text))

    comment = cur.fetchone()
    conn.commit()

    cur.close()
    conn.close()

    return jsonify({'message': 'Комментарий добавлен', 'comment': dict(comment)})


# Лайк статьи
@app.route('/api/articles/<slug>/like', methods=['POST'])
def toggle_like(slug):
    user_id = get_current_user()
    if not user_id:
        return jsonify({'error': 'Не авторизован'}), 401

    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute('SELECT id FROM articles WHERE slug = %s', (slug,))
    article = cur.fetchone()

    if not article:
        return jsonify({'error': 'Статья не найдена'}), 404

    cur.execute('''
        SELECT id FROM likes 
        WHERE article_id = %s AND user_id = %s
    ''', (article['id'], user_id))

    existing_like = cur.fetchone()

    if existing_like:
        cur.execute('DELETE FROM likes WHERE id = %s', (existing_like['id'],))
        message = 'Лайк удален'
    else:
        cur.execute('''
            INSERT INTO likes (article_id, user_id)
            VALUES (%s, %s)
        ''', (article['id'], user_id))
        message = 'Лайк добавлен'

    cur.execute('''
        SELECT COUNT(*) as likes_count FROM likes 
        WHERE article_id = %s
    ''', (article['id'],))

    likes_count = cur.fetchone()['likes_count']

    conn.commit()
    cur.close()
    conn.close()

    return jsonify({'message': message, 'likes_count': likes_count})


# Получение комментариев статьи
@app.route('/api/articles/<slug>/comments', methods=['GET'])
def get_comments(slug):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute('''
        SELECT c.*, u.username 
        FROM comments c
        JOIN users u ON c.user_id = u.id
        JOIN articles a ON c.article_id = a.id
        WHERE a.slug = %s
        ORDER BY c.created_at DESC
    ''', (slug,))

    comments = cur.fetchall()

    cur.close()
    conn.close()

    return jsonify([dict(comment) for comment in comments])


# Получение статей пользователя
@app.route('/api/users/articles', methods=['GET'])
def get_user_articles():
    user_id = get_current_user()
    if not user_id:
        return jsonify({'error': 'Не авторизован'}), 401

    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    try:
        cur.execute('''
            SELECT a.*, u.username as author_name,
                   COUNT(DISTINCT l.id) as likes_count,
                   COUNT(DISTINCT c.id) as comments_count
            FROM articles a
            LEFT JOIN users u ON a.author_id = u.id
            LEFT JOIN likes l ON a.id = l.article_id
            LEFT JOIN comments c ON a.id = c.article_id
            WHERE a.author_id = %s
            GROUP BY a.id, u.username
            ORDER BY a.created_at DESC
        ''', (user_id,))
        articles = cur.fetchall()

        return jsonify([dict(article) for article in articles])

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


# Получение лайков пользователя
@app.route('/api/users/likes', methods=['GET'])
def get_user_likes():
    user_id = get_current_user()
    if not user_id:
        return jsonify({'error': 'Не авторизован'}), 401

    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    try:
        cur.execute('''
            SELECT l.*, a.title, a.slug
            FROM likes l
            JOIN articles a ON l.article_id = a.id
            WHERE l.user_id = %s
            ORDER BY l.created_at DESC
        ''', (user_id,))
        likes = cur.fetchall()

        return jsonify([dict(like) for like in likes])

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


# Получение комментариев пользователя
@app.route('/api/users/comments', methods=['GET'])
def get_user_comments():
    user_id = get_current_user()
    if not user_id:
        return jsonify({'error': 'Не авторизован'}), 401

    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    try:
        cur.execute('''
            SELECT c.*, a.title, a.slug
            FROM comments c
            JOIN articles a ON c.article_id = a.id
            WHERE c.user_id = %s
            ORDER BY c.created_at DESC
        ''', (user_id,))
        comments = cur.fetchall()

        return jsonify([dict(comment) for comment in comments])

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


# Получение избранных статей
@app.route('/api/users/favorites', methods=['GET'])
def get_user_favorites():
    user_id = get_current_user()
    if not user_id:
        return jsonify({'error': 'Не авторизован'}), 401

    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    try:
        cur.execute('''
            SELECT a.*, u.username as author_name,
                   COUNT(DISTINCT l.id) as likes_count,
                   COUNT(DISTINCT c.id) as comments_count
            FROM articles a
            LEFT JOIN users u ON a.author_id = u.id
            LEFT JOIN likes l ON a.id = l.article_id
            LEFT JOIN comments c ON a.id = c.article_id
            WHERE a.id IN (
                SELECT article_id FROM likes WHERE user_id = %s
            )
            GROUP BY a.id, u.username
            ORDER BY a.created_at DESC
        ''', (user_id,))
        articles = cur.fetchall()

        return jsonify([dict(article) for article in articles])

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


# Обновление статьи
@app.route('/api/articles/<slug>', methods=['PUT'])
def update_article(slug):
    user_id = get_current_user()
    if not user_id:
        return jsonify({'error': 'Не авторизован'}), 401

    data = request.get_json()
    title = data.get('title')
    content = data.get('content')
    category = data.get('category')
    location_lat = data.get('location_lat')
    location_lng = data.get('location_lng')

    if not title or not content:
        return jsonify({'error': 'Заголовок и содержание обязательны'}), 400

    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # Проверяем, что пользователь является автором статьи
        cur.execute('SELECT author_id FROM articles WHERE slug = %s', (slug,))
        article = cur.fetchone()

        if not article:
            return jsonify({'error': 'Статья не найдена'}), 404

        if article['author_id'] != user_id:
            return jsonify({'error': 'Недостаточно прав'}), 403

        cur.execute('''
            UPDATE articles 
            SET title = %s, content = %s, category = %s, 
                location_lat = %s, location_lng = %s, updated_at = CURRENT_TIMESTAMP
            WHERE slug = %s
            RETURNING *
        ''', (title, content, category, location_lat, location_lng, slug))

        updated_article = cur.fetchone()
        conn.commit()

        return jsonify({
            'message': 'Статья обновлена',
            'article': dict(updated_article)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


# Удаление статьи
@app.route('/api/articles/<slug>', methods=['DELETE'])
def delete_article(slug):
    user_id = get_current_user()
    if not user_id:
        return jsonify({'error': 'Не авторизован'}), 401

    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # Проверяем, что пользователь является автором статьи
        cur.execute('SELECT author_id FROM articles WHERE slug = %s', (slug,))
        article = cur.fetchone()

        if not article:
            return jsonify({'error': 'Статья не найдена'}), 404

        if article['author_id'] != user_id:
            return jsonify({'error': 'Недостаточно прав'}), 403

        # Удаляем связанные комментарии и лайки
        cur.execute('DELETE FROM comments WHERE article_id IN (SELECT id FROM articles WHERE slug = %s)', (slug,))
        cur.execute('DELETE FROM likes WHERE article_id IN (SELECT id FROM articles WHERE slug = %s)', (slug,))

        # Удаляем статью
        cur.execute('DELETE FROM articles WHERE slug = %s', (slug,))

        conn.commit()

        return jsonify({'message': 'Статья удалена'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


# AI endpoints в app.py
@app.route('/api/ai/generate-article', methods=['POST'])
def generate_ai_article():
    user_id = get_current_user()
    if not user_id:
        return jsonify({'error': 'Не авторизован'}), 401

    data = request.get_json()
    topic = data.get('topic')
    style = data.get('style', 'news')
    length = data.get('length', 'medium')

    # Здесь будет интеграция с реальным AI API (OpenAI, etc.)
    # Пока возвращаем демо-данные

    word_counts = {
        'short': '100-200',
        'medium': '300-500',
        'long': '500+'
    }

    demo_content = f"""# {topic}

Это демонстрационная статья, сгенерированная искусственным интеллектом. В реальном приложении здесь был бы уникальный контент, созданный нейросетью.

## Основные аспекты темы

Статья написана в {style} стиле и содержит примерно {word_counts.get(length, '300-500')} слов. ИИ анализирует тему и создает релевантный контент с учетом выбранного стиля написания.

## Ключевые преимущества AI-генерации

• Уникальный контент
• Быстрое создание
• Различные стили написания
• Адаптация под целевую аудиторию

## Заключение

Искусственный интеллект открывает новые возможности для создания качественного контента."""

    return jsonify({
        'content': demo_content,
        'title': f'AI Статья: {topic}',
        'style': style,
        'length': length
    })


@app.route('/api/ai/analytics', methods=['POST'])
def generate_ai_analytics():
    user_id = get_current_user()
    if not user_id:
        return jsonify({'error': 'Не авторизован'}), 401

    data = request.get_json()
    articles = data.get('articles', [])

    # AI анализ статей пользователя
    total_articles = len(articles)
    total_views = sum(article.get('views', 0) for article in articles)
    avg_views = total_views / max(total_articles, 1)

    insights = f"Вы опубликовали {total_articles} статей с общим количеством просмотров {total_views}. "
    insights += f"Средняя популярность статей: {avg_views:.1f} просмотров."

    recommendations = "Рекомендуем публиковать больше контента в популярных категориях и использовать мультимедиа для увеличения вовлеченности."

    return jsonify({
        'insights': insights,
        'recommendations': recommendations,
        'stats': {
            'total_articles': total_articles,
            'total_views': total_views,
            'avg_views': avg_views
        }
    })


@app.route('/api/ai/recommendations', methods=['GET'])
def get_ai_recommendations():
    user_id = get_current_user()
    if not user_id:
        return jsonify({'error': 'Не авторизован'}), 401

    # AI рекомендации на основе поведения пользователя
    # Пока возвращаем демо-рекомендации

    return jsonify([
        {
            'title': 'Последние тенденции в искусственном интеллекте',
            'category': 'tech',
            'reason': 'На основе вашего интереса к технологиям'
        },
        {
            'title': 'Как писать эффективные статьи',
            'category': 'news',
            'reason': 'Для улучшения ваших писательских навыков'
        },
        {
            'title': 'Будущее мобильных приложений',
            'category': 'tech',
            'reason': 'С учетом вашей активности в технических темах'
        }
    ])


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)