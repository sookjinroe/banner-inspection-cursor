# Netlify 배포 가이드

## 🚀 Netlify 배포 방법

### 1. GitHub 연결
1. Netlify 대시보드에서 "New site from Git" 클릭
2. GitHub 저장소 선택: `sookjinroe/banner-inspection-cursor`
3. 브랜치: `main`

### 2. 빌드 설정
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Node version**: `20`

### 3. 환경 변수 설정
Netlify 대시보드 > Site settings > Environment variables에서 설정:

```
VITE_SUPABASE_URL=https://kfsawswzupmullhwrypa.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtmc2F3c3d6dXBtdWxsaHdyeXBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NDI0ODIsImV4cCI6MjA3NjExODQ4Mn0.IaHEGcKvajz5_t22UV3r8vwTkYEdSfFq3ByzslrMocw
VITE_OPENAI_API_KEY=your_openai_api_key_here
```

### 4. 배포 완료
- 자동 배포: GitHub push 시 자동 배포
- 수동 배포: Netlify 대시보드에서 "Deploy site" 클릭

## 📋 배포 후 확인사항

### ✅ 정상 작동 확인:
1. **홈페이지 로딩**: React 앱이 정상 로드되는지
2. **데이터베이스 연결**: Supabase 연결 상태 확인
3. **배너 수집**: 새로운 배너 수집 테스트
4. **AI 검수**: 검수 기능 정상 작동 확인

### 🔧 문제 해결:
- **환경 변수**: Netlify 대시보드에서 올바르게 설정되었는지 확인
- **빌드 오류**: Netlify 빌드 로그 확인
- **CORS 오류**: Supabase 설정에서 도메인 허용 확인

## 🌐 배포 URL
배포 완료 후 `https://your-site-name.netlify.app` 형태의 URL 제공
