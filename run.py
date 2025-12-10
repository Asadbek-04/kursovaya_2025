from flask import Flask, request, jsonify, session
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
from werkzeug.security import generate_password_hash, check_password_hash
import secrets
from config import Config


def get_db_connection():
    conn = psycopg2.connect(
        host=Config.DB_HOST,
        database=Config.DB_NAME,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        port=Config.DB_PORT
    )
    return conn

def get_article():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

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
    ''', ('test',))

    article = cur.fetchone()
    print(article)
    cur.close()
    conn.close()

get_article()