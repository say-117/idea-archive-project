'use client';

import { useState } from 'react';
import { changePassword, type User } from '@/lib/auth';

interface ChangePasswordModalProps {
  currentUser: User;
  onSuccess: () => void;
  onClose: () => void;
}

export default function ChangePasswordModal({ currentUser, onSuccess, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newUsername, setNewUsername] = useState(currentUser.username);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!newPassword && newUsername === currentUser.username) {
      setError('변경할 내용을 입력해주세요.');
      setLoading(false);
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다.');
      setLoading(false);
      return;
    }

    if (newPassword && newPassword.length < 4) {
      setError('새 비밀번호는 최소 4자 이상이어야 합니다.');
      setLoading(false);
      return;
    }

    const result = await changePassword(
      currentUser.username,
      currentPassword,
      newPassword || currentPassword, // 새 비밀번호가 없으면 현재 비밀번호 사용 (변경하지 않음)
      newUsername !== currentUser.username ? newUsername : undefined
    );

    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setError(result.error || '변경에 실패했습니다.');
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
          <h2 className="text-2xl font-bold">계정 설정</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold transition-colors"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">현재 비밀번호</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:border-gray-900 focus:ring-0 bg-white transition-colors"
              placeholder="현재 비밀번호를 입력하세요"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">새 아이디 (선택사항)</label>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:border-gray-900 focus:ring-0 bg-white transition-colors"
              placeholder="새 아이디를 입력하세요"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">새 비밀번호 (선택사항)</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:border-gray-900 focus:ring-0 bg-white transition-colors"
              placeholder="새 비밀번호를 입력하세요"
              disabled={loading}
            />
          </div>

          {newPassword && (
            <div>
              <label className="block text-sm font-medium mb-1">새 비밀번호 확인</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:border-gray-900 focus:ring-0 bg-white transition-colors"
                placeholder="새 비밀번호를 다시 입력하세요"
                disabled={loading}
              />
            </div>
          )}

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-200 rounded hover:bg-gray-50 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-black text-white px-4 py-2 rounded hover:bg-gray-900 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '변경 중...' : '변경'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

