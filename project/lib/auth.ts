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
    
    if (error) {
      // 디버깅을 위한 상세 로깅
      console.error('Login database error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });

      // 네트워크 오류 처리
      if (error.message?.includes('network') || error.message?.includes('fetch')) {
        return { success: false, error: '네트워크 연결을 확인해주세요.' };
      }
      // 사용자를 찾을 수 없는 경우 (PGRST116는 no rows returned)
      if (error.code === 'PGRST116' || !data) {
        return { success: false, error: '아이디 또는 비밀번호가 잘못되었습니다.' };
      }
      // 기타 오류
      return { success: false, error: '로그인 중 오류가 발생했습니다.' };
    }
    
    if (!data) {
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
    console.error('Login unexpected error:', error);
    return { success: false, error: '예상치 못한 오류가 발생했습니다.' };
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
      // 디버깅을 위한 상세 로깅
      console.error('Signup database error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });

      // 구체적인 오류 코드별 처리
      switch (error.code) {
        case '23505': // unique violation
          return { success: false, error: '이미 존재하는 아이디입니다.' };
        case '23502': // not null violation
          return { success: false, error: '필수 정보가 누락되었습니다.' };
        case '23503': // foreign key violation
          return { success: false, error: '데이터베이스 오류가 발생했습니다.' };
        case '42501': // insufficient privilege
          return { success: false, error: '권한이 없습니다. 관리자에게 문의하세요.' };
        case 'PGRST116': // no rows returned
          return { success: false, error: '회원가입이 완료되지 않았습니다. 다시 시도해주세요.' };
        default:
          // 네트워크 오류나 기타 오류
          if (error.message?.includes('JWT') || error.message?.includes('auth')) {
            return { success: false, error: '인증 오류가 발생했습니다.' };
          }
          if (error.message?.includes('network') || error.message?.includes('fetch')) {
            return { success: false, error: '네트워크 연결을 확인해주세요.' };
          }
          return { success: false, error: '회원가입 중 오류가 발생했습니다.' };
      }
    }
    
    if (!data) {
      return { success: false, error: '회원가입이 완료되지 않았습니다. 다시 시도해주세요.' };
    }
    
    const user = { id: data.id, username: data.username };
    
    // 로컬 스토리지에 사용자 정보 저장
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentUser', JSON.stringify(user));
    }
    
    return { success: true, user };
  } catch (error) {
    console.error('Signup unexpected error:', error);
    return { success: false, error: '예상치 못한 오류가 발생했습니다.' };
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
    
    if (error) {
      // 디버깅을 위한 상세 로깅
      console.error('Change password - user lookup error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });

      // 네트워크 오류 처리
      if (error.message?.includes('network') || error.message?.includes('fetch')) {
        return { success: false, error: '네트워크 연결을 확인해주세요.' };
      }
      // 사용자를 찾을 수 없는 경우
      if (error.code === 'PGRST116' || !data) {
        return { success: false, error: '현재 비밀번호가 올바르지 않습니다.' };
      }
      return { success: false, error: '사용자 정보를 확인할 수 없습니다.' };
    }
    
    if (!data) {
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
      // 디버깅을 위한 상세 로깅
      console.error('Change password database error:', {
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint
      });

      // 구체적인 오류 처리
      if (updateError.code === '42501') {
        return { success: false, error: '권한이 없습니다. 관리자에게 문의하세요.' };
      }
      if (updateError.message?.includes('network') || updateError.message?.includes('fetch')) {
        return { success: false, error: '네트워크 연결을 확인해주세요.' };
      }
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
    console.error('Change password unexpected error:', error);
    return { success: false, error: '예상치 못한 오류가 발생했습니다.' };
  }
}

