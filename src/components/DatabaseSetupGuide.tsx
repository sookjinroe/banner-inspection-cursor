import { Modal } from './common/Modal';

interface DatabaseSetupGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DatabaseSetupGuide({ isOpen, onClose }: DatabaseSetupGuideProps) {
  const sqlCode = `-- Banner Collection System Database Setup
-- Run this SQL in your Supabase SQL Editor

-- Create countries table
CREATE TABLE IF NOT EXISTS countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create collection_results table
CREATE TABLE IF NOT EXISTS collection_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid REFERENCES countries(id) ON DELETE SET NULL,
  country_name text,
  country_url text NOT NULL,
  status text NOT NULL DEFAULT 'idle',
  inspection_status text NOT NULL DEFAULT 'not_inspected',
  banner_count integer DEFAULT 0,
  passed_count integer,
  error_message text,
  collected_at timestamptz DEFAULT now()
);

-- Create banners table
CREATE TABLE IF NOT EXISTS banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_result_id uuid NOT NULL REFERENCES collection_results(id) ON DELETE CASCADE,
  title text NOT NULL,
  banner_type text NOT NULL DEFAULT 'web',
  html_code text NOT NULL,
  css_code text NOT NULL,
  image_urls text[] DEFAULT '{}',
  screenshot_url text,
  extracted_at timestamptz DEFAULT now()
);

-- Create inspection_results table
CREATE TABLE IF NOT EXISTS inspection_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  banner_id uuid NOT NULL REFERENCES banners(id) ON DELETE CASCADE,
  guideline_checks jsonb NOT NULL DEFAULT '[]',
  ai_feedback text NOT NULL,
  inspected_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_results ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public read access to countries"
  ON countries FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert to countries"
  ON countries FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update to countries"
  ON countries FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from countries"
  ON countries FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read access to collection_results"
  ON collection_results FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert to collection_results"
  ON collection_results FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update to collection_results"
  ON collection_results FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read access to banners"
  ON banners FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert to banners"
  ON banners FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update to banners"
  ON banners FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read access to inspection_results"
  ON inspection_results FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert to inspection_results"
  ON inspection_results FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update to inspection_results"
  ON inspection_results FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_collection_results_country_id ON collection_results(country_id);
CREATE INDEX IF NOT EXISTS idx_banners_collection_result_id ON banners(collection_result_id);
CREATE INDEX IF NOT EXISTS idx_inspection_results_banner_id ON inspection_results(banner_id);
CREATE INDEX IF NOT EXISTS idx_collection_results_collected_at ON collection_results(collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_countries_created_at ON countries(created_at DESC);`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlCode);
    alert('SQL이 클립보드에 복사되었습니다!');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="데이터베이스 설정 필요">
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-semibold text-amber-900 mb-2">설정이 필요합니다</h3>
          <p className="text-sm text-amber-800">
            데이터베이스 테이블이 생성되지 않았습니다. 아래 단계를 따라 설정해주세요.
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900">설정 단계:</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Supabase 대시보드
              </a>
              에 로그인하세요
            </li>
            <li>프로젝트 목록에서 현재 프로젝트를 선택하세요</li>
            <li>왼쪽 메뉴에서 <strong>SQL Editor</strong>를 클릭하세요</li>
            <li>아래 SQL 코드를 복사하여 붙여넣고 실행하세요 (Run 버튼 클릭)</li>
            <li>완료 후 이 페이지를 새로고침하세요</li>
          </ol>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold text-gray-900">SQL 코드:</h4>
            <button
              onClick={copyToClipboard}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              복사하기
            </button>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-auto">
            <pre className="text-xs text-gray-100 font-mono whitespace-pre-wrap">
              {sqlCode}
            </pre>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </Modal>
  );
}
