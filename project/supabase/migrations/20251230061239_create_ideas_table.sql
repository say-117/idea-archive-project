/*
  # 아이디어 아카이브 테이블 생성

  1. 새 테이블
    - `ideas`
      - `id` (uuid, primary key) - 고유 식별자
      - `title` (text) - 아이디어 제목
      - `body` (text) - 아이디어 본문
      - `created_at` (timestamptz) - 생성 시간

  2. 보안
    - RLS 활성화
    - 모든 사용자가 조회, 삽입, 수정, 삭제 가능 (공개 앱)
*/

CREATE TABLE IF NOT EXISTS ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ideas"
  ON ideas
  FOR SELECT
  TO authenticated + USING (auth.uid() = user_id)
  USING (true);

CREATE POLICY "Anyone can insert ideas"
  ON ideas
  FOR INSERT
  TO authenticated + USING (auth.uid() = user_id)
  WITH CHECK (true);

CREATE POLICY "Anyone can update ideas"
  ON ideas
  FOR UPDATE
  TO authenticated + USING (auth.uid() = user_id)
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete ideas"
  ON ideas
  FOR DELETE
  TO authenticated + USING (auth.uid() = user_id)
  USING (true);

