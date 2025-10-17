import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';
import axios from 'axios';
import Link from 'next/link';

export default function Dashboard() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const router = useRouter();

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  useEffect(() => {
    async function fetchPayments() {
      try {
        const accessToken = Cookies.get('access_token');
        const idToken = Cookies.get('id_token');

        if (!accessToken) {
          router.push('/api/login');
          return;
        }

        // ID 토큰에서 사용자 정보 추출 (간단히 디코딩)
        if (idToken) {
          try {
            const payload = JSON.parse(atob(idToken.split('.')[1]));
            setUser({
              email: payload.email,
              sub: payload.sub,
            });
          } catch (e) {
            console.error('ID 토큰 파싱 실패:', e);
          }
        }

        setLoading(true);
        const response = await axios.get(`${apiBaseUrl}/me/payments`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        setPayments(response.data);
      } catch (err) {
        console.error('결제내역 로딩 실패:', err);
        if (err.response?.status === 401) {
          // 토큰 만료 또는 인증 실패
          Cookies.remove('access_token');
          Cookies.remove('id_token');
          router.push('/api/login');
        } else {
          setError('결제내역을 불러올 수 없습니다.');
        }
      } finally {
        setLoading(false);
      }
    }

    if (apiBaseUrl) {
      fetchPayments();
    }
  }, [apiBaseUrl, router]);

  const handleLogout = () => {
    Cookies.remove('access_token');
    Cookies.remove('id_token');
    
    const cognitoDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
    const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
    const redirectUri = encodeURIComponent(window.location.origin);
    
    window.location.href = `https://${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${redirectUri}`;
  };

  return (
    <div className="container">
      <header className="header">
        <h1>📊 마이 대시보드</h1>
        <nav>
          <Link href="/" className="btn btn-secondary">
            홈으로
          </Link>
          <button onClick={handleLogout} className="btn btn-danger">
            로그아웃
          </button>
        </nav>
      </header>

      <main className="main">
        {user && (
          <div className="user-info">
            <p>👤 로그인: {user.email}</p>
          </div>
        )}

        {loading && <p className="loading">로딩 중...</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && (
          <section className="section">
            <h2>💰 최근 결제내역</h2>
            {payments.length === 0 ? (
              <p className="empty">결제내역이 없습니다.</p>
            ) : (
              <div className="payments-list">
                {payments.map((payment) => (
                  <div key={payment.paymentId} className="payment-item">
                    <div className="payment-merchant">{payment.merchant}</div>
                    <div className="payment-amount">
                      {payment.amount.toLocaleString()} {payment.currency}
                    </div>
                    <div className="payment-date">
                      {new Date(payment.paidAt).toLocaleString('ko-KR')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="footer">
        <p>© 2025 루나카드 MCP Login POC</p>
      </footer>
    </div>
  );
}

