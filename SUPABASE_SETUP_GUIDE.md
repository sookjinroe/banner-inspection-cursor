# 새 Supabase 프로젝트 연결 가이드

이 가이드는 기존 Supabase 연결을 끊고 새로운 프로젝트로 연결하는 방법을 설명합니다.

## 1. 새 Supabase 프로젝트 생성

1. [Supabase Dashboard](https://supabase.com/dashboard)에 로그인
2. "New Project" 클릭
3. 프로젝트 정보 입력:
   - **Name**: `banner-inspection-system` (또는 원하는 이름)
   - **Database Password**: 강력한 비밀번호 설정
   - **Region**: 가장 가까운 지역 선택
4. "Create new project" 클릭

## 2. 환경변수 설정

프로젝트 생성 후 다음 정보를 복사하여 `.env` 파일에 설정하세요:

```bash
# .env 파일 생성
cp .env.example .env
```

`.env` 파일을 편집하여 다음 값들을 설정:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# OpenAI Configuration  
VITE_OPENAI_API_KEY=your-openai-api-key-here
```

### Supabase 정보 찾는 방법:
1. Supabase Dashboard → Settings → API
2. **Project URL** → `VITE_SUPABASE_URL`
3. **anon public** 키 → `VITE_SUPABASE_ANON_KEY`

## 3. 데이터베이스 스키마 설정

### 방법 1: 자동 설정 (권장)
```bash
npm run setup-db
```

### 방법 2: 수동 설정
1. Supabase Dashboard → SQL Editor
2. `database-setup.sql` 파일 내용 복사하여 실행
3. 또는 각 마이그레이션 파일을 순서대로 실행

## 4. 스토리지 버킷 설정

```bash
# 스토리지 버킷 생성
node create-bucket.mjs
```

또는 수동으로:
1. Supabase Dashboard → Storage
2. "Create a new bucket" 클릭
3. **Bucket name**: `banner-assets`
4. **Public bucket**: ✅ 체크
5. "Create bucket" 클릭

## 5. Edge Functions 배포

```bash
# Supabase CLI 설치 (아직 설치하지 않은 경우)
npm install -g supabase

# 프로젝트 초기화
supabase init

# 로그인
supabase login

# 프로젝트 연결
supabase link --project-ref your-project-id

# Edge Functions 배포
supabase functions deploy crawl-banners
supabase functions deploy process-inspection
```

## 6. 승인된 아이콘 업로드

```bash
# 승인된 아이콘 이미지 업로드
node upload-approved-icons.js
```

## 7. 연결 테스트

```bash
# 데이터베이스 연결 테스트
node check-db.js

# 개발 서버 실행
npm run dev
```

## 8. Edge Functions 환경변수 설정

Supabase Dashboard → Edge Functions → Settings에서 다음 환경변수 설정:

```bash
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-api-key
```

### Service Role Key 찾는 방법:
1. Supabase Dashboard → Settings → API
2. **service_role secret** 키 복사

## 9. 기존 데이터 정리 (선택사항)

새 프로젝트로 완전히 전환하려면:

1. 기존 Supabase 프로젝트 삭제 또는 비활성화
2. 로컬 캐시 정리:
   ```bash
   rm -rf node_modules/.cache
   npm run dev
   ```

## 문제 해결

### "Supabase configuration missing" 오류
- `.env` 파일이 올바르게 설정되었는지 확인
- 환경변수 이름이 정확한지 확인 (`VITE_` 접두사 필수)

### Edge Functions 배포 실패
- Supabase CLI가 최신 버전인지 확인
- 프로젝트 ID가 올바른지 확인
- Service Role Key가 올바른지 확인

### 스토리지 접근 오류
- 버킷이 공개로 설정되었는지 확인
- RLS 정책이 올바르게 설정되었는지 확인

## 완료 확인

모든 설정이 완료되면:
1. ✅ 데이터베이스 테이블들이 생성됨
2. ✅ 스토리지 버킷이 생성됨
3. ✅ Edge Functions이 배포됨
4. ✅ 승인된 아이콘이 업로드됨
5. ✅ 앱이 정상적으로 실행됨

이제 새로운 Supabase 프로젝트에서 배너 검수 시스템을 사용할 수 있습니다!
