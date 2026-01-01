import { supabase } from './supabase';

export interface User {
  id: string;
  username: string;
}

// 비밀번호 해시 (간단한 SHA-256 해시 - 프로덕션에서는 더 강력한 방법 사용 권장)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hash));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 로그인
export async function login(username: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const passwordHash = await hashPassword(password);
    
    const { data, error } = await supabase
      .from('users')
      .select('id, username, password_hash')
      .eq('username', username)
      .single();
    
    if (error || !data) {
      return { success: false, error: '아이디 또는 비밀번호가 잘못되었습니다.' };
    }
    
    if (data.password_hash !== passwordHash) {
      return { success: false, error: '아이디 또는 비밀번호가 잘못되었습니다.' };
    }
    
    const user = { id: data.id, username: data.username };
    
    // 로컬 스토리지에 사용자 정보 저장
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentUser', JSON.stringify(user));
    }
    
    return { success: true, user };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: '로그인 중 오류가 발생했습니다.' };
  }
}

// 회원가입
export async function signup(username: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const passwordHash = await hashPassword(password);
    
    const { data, error } = await supabase
      .from('users')
      .insert([{
        username,
        password_hash: passwordHash,
      }])
      .select('id, username')
      .single();
    
    if (error) {
      if (error.code === '23505') { // unique violation
        return { success: false, error: '이미 존재하는 아이디입니다.' };
      }
      return { success: false, error: '회원가입 중 오류가 발생했습니다.' };
    }
    
    const user = { id: data.id, username: data.username };
    
    // 로컬 스토리지에 사용자 정보 저장
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentUser', JSON.stringify(user));
    }
    
    return { success: true, user };
  } catch (error) {
    console.error('Signup error:', error);
    return { success: false, error: '회원가입 중 오류가 발생했습니다.' };
  }
}

// 로그아웃
export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('currentUser');
    window.location.href = '/';
  }
}

// 현재 사용자 가져오기
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  
  const userStr = localStorage.getItem('currentUser');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

// 비밀번호 변경
export async function changePassword(
  username: string,
  currentPassword: string,
  newPassword: string,
  newUsername?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentPasswordHash = await hashPassword(currentPassword);
    
    // 현재 비밀번호 확인
    const { data, error } = await supabase
      .from('users')
      .select('id, password_hash')
      .eq('username', username)
      .single();
    
    if (error || !data) {
      return { success: false, error: '현재 비밀번호가 올바르지 않습니다.' };
    }
    
    if (data.password_hash !== currentPasswordHash) {
      return { success: false, error: '현재 비밀번호가 올바르지 않습니다.' };
    }
    
    const updateData: any = {};
    
    // 새 비밀번호가 있으면 업데이트
    if (newPassword) {
      updateData.password_hash = await hashPassword(newPassword);
    }
    
    // 새 아이디가 있으면 업데이트
    if (newUsername && newUsername !== username) {
      // 아이디 중복 확인
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', newUsername)
        .single();
      
      if (existingUser) {
        return { success: false, error: '이미 존재하는 아이디입니다.' };
      }
      
      updateData.username = newUsername;
    }
    
    // 업데이트 실행
    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', data.id);
    
    if (updateError) {
      return { success: false, error: '변경 중 오류가 발생했습니다.' };
    }
    
    // 로컬 스토리지 업데이트
    if (typeof window !== 'undefined') {
      const currentUser = getCurrentUser();
      if (currentUser) {
        const updatedUser = {
          ...currentUser,
          username: newUsername || currentUser.username,
        };
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Change password error:', error);
    return { success: false, error: '변경 중 오류가 발생했습니다.' };
  }
}

