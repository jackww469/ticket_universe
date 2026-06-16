# -*- coding: utf-8 -*-
"""登录会话与密码哈希"""
from functools import wraps
from flask import session, redirect, url_for, request, jsonify

SESSION_USER_ID = 'user_id'
SESSION_USERNAME = 'username'


def login_user(user_id: int, username: str) -> None:
    session[SESSION_USER_ID] = user_id
    session[SESSION_USERNAME] = username
    session.permanent = True


def logout_user() -> None:
    session.pop(SESSION_USER_ID, None)
    session.pop(SESSION_USERNAME, None)


def current_user_id():
    return session.get(SESSION_USER_ID)


def current_username():
    return session.get(SESSION_USERNAME)


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if current_user_id() is None:
            if request.path.startswith('/api/'):
                return jsonify({'success': False, 'message': '请先登录'}), 401
            return redirect(url_for('login', next=request.path))
        return f(*args, **kwargs)
    return decorated
