'use client';

import { useState } from 'react';
import { login, signup, type User } from '@/lib/auth';

interface LoginModalProps {
  onSuccess: (user: User) => void;
  onClose?: () => void;
}

export default function LoginModal({ onSuccess, onClose }: LoginModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isLogin) {
      const result = await login(username, password);
      if (result.success && result.user) {
        onSuccess(result.user);
        if (onClose) onClose();
      } else {
        setError(result.error || '로그인에 실패했습니다.');
      }
    } else {
      if (password !== confirmPassword) {
        setError('비밀번호가 일치하지 않습니다.');
        setLoading(false);
        return;
      }
      if (password.length < 4) {
        setError('비밀번호는 최소 4자 이상이어야 합니다.');
        setLoading(false);
        return;
      }
      const result = await signup(username, password);
      if (result.success && result.user) {
        onSuccess(result.user);
        if (onClose) onClose();
      } else {
        setError(result.error || '회원가입에 실패했습니다.');
      }
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{isLogin ? '로그인' : '회원가입'}</h2>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold transition-colors"
            >
              ×
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">아이디</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:border-gray-900 focus:ring-0 bg-white transition-colors"
              placeholder="아이디를 입력하세요"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:border-gray-900 focus:ring-0 bg-white transition-colors"
              placeholder="비밀번호를 입력하세요"
              required
              disabled={loading}
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium mb-1">비밀번호 확인</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:border-gray-900 focus:ring-0 bg-white transition-colors"
                placeholder="비밀번호를 다시 입력하세요"
                required
                disabled={loading}
              />
            </div>
          )}

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white px-4 py-2 rounded hover:bg-gray-900 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '처리 중...' : (isLogin ? '로그인' : '회원가입')}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setPassword('');
              setConfirmPassword('');
            }}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            {isLogin ? '회원가입이 필요하신가요?' : '이미 계정이 있으신가요?'}
          </button>
        </div>
      </div>
    </div>
  );
}

