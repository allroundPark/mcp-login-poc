import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Cookies from 'js-cookie';

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState(null);

  useEffect(() => {
    async function exchangeToken() {
      const { code, error: authError } = router.query;

      if (authError) {
        setError(`인증 실패: ${authError}`);
        return;
      }

      if (!code) {
        return; // 아직 쿼리 파라미터가 로드되지 않음
      }

      try {
        // 코드 교환을 위한 백엔드 API 호출
        const response = await axios.post('/api/token', { code });

        const { access_token, id_token, refresh_token } = response.data;

        // 쿠키에 토큰 저장 (실제 프로덕션에서는 HttpOnly 쿠키 권장)
        Cookies.set('access_token', access_token, { expires: 1 }); // 1일
        Cookies.set('id_token', id_token, { expires: 1 });
        
        if (refresh_token) {
          Cookies.set('refresh_token', refresh_token, { expires: 30 }); // 30일
        }

        // 대시보드로 리다이렉트
        router.push('/dashboard');
      } catch (err) {
        console.error('토큰 교환 실패:', err);
        setError('로그인 처리 중 오류가 발생했습니다.');
      }
    }

    exchangeToken();
  }, [router]);

  return (
    <div className="container">
      <main className="main center">
        {error ? (
          <div className="error-box">
            <h2>❌ 오류 발생</h2>
            <p>{error}</p>
            <button onClick={() => router.push('/')} className="btn btn-primary">
              홈으로 돌아가기
            </button>
          </div>
        ) : (
          <div className="loading-box">
            <h2>⏳ 로그인 처리 중...</h2>
            <p>잠시만 기다려주세요.</p>
          </div>
        )}
      </main>
    </div>
  );
}

