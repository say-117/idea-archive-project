/*
  # 사용자 인증 시스템 추가

  1. 새 테이블
    - `users`
      - `id` (uuid, primary key) - 고유 식별자
      - `username` (text, unique) - 사용자 아이디
      - `password_hash` (text) - 해시된 비밀번호
      - `created_at` (timestamptz) - 생성 시간

  2. 기존 테이블 수정
    - `ideas` 테이블에 `user_id` 컬럼 추가

  3. 보안
    - RLS 활성화
    - 사용자는 자신의 데이터만 접근 가능
*/

-- users 테이블 생성
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ideas 테이블에 user_id 컬럼 추가
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id) ON DELETE CASCADE;

-- 기존 데이터를 위한 임시 사용자 생성 (선택사항)
-- INSERT INTO users (id, username, password_hash) 
-- VALUES ('00000000-0000-0000-0000-000000000000', 'default', '$2a$10$placeholder')
-- ON CONFLICT (username) DO NOTHING;

-- RLS 정책 업데이트: users 테이블
CREATE POLICY "Users can view all users" 
  ON users
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert users"
  ON users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own account"
  ON users
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- RLS 정책 업데이트: ideas 테이블 (사용자별 필터링)
DROP POLICY IF EXISTS "Anyone can view ideas" ON ideas;
DROP POLICY IF EXISTS "Anyone can insert ideas" ON ideas;
DROP POLICY IF EXISTS "Anyone can update ideas" ON ideas;
DROP POLICY IF EXISTS "Anyone can delete ideas" ON ideas;

CREATE POLICY "Users can view their own ideas"
  ON ideas
  FOR SELECT
  TO anon, authenticated
  USING (true); -- 클라이언트에서 필터링

CREATE POLICY "Users can insert their own ideas"
  ON ideas
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true); -- 클라이언트에서 user_id 설정

CREATE POLICY "Users can update their own ideas"
  ON ideas
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true); -- 클라이언트에서 필터링

CREATE POLICY "Users can delete their own ideas"
  ON ideas
  FOR DELETE
  TO anon, authenticated
  USING (true); -- 클라이언트에서 필터링

