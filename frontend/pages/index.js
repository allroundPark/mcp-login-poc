import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';

export default function Home() {
  const [cards, setCards] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  useEffect(() => {
    async function fetchPublicData() {
      try {
        setLoading(true);
        const [cardsRes, productsRes] = await Promise.all([
          axios.get(`${apiBaseUrl}/public/cards`),
          axios.get(`${apiBaseUrl}/public/products`),
        ]);
        setCards(cardsRes.data);
        setProducts(productsRes.data);
      } catch (err) {
        console.error('공개 컨텐츠 로딩 실패:', err);
        setError('데이터를 불러올 수 없습니다.');
      } finally {
        setLoading(false);
      }
    }

    if (apiBaseUrl) {
      fetchPublicData();
    }
  }, [apiBaseUrl]);

  return (
    <div className="container">
      <header className="header">
        <h1>🌙 루나카드 POC</h1>
        <nav>
          <Link href="/dashboard" className="btn btn-primary">
            마이 대시보드
          </Link>
        </nav>
      </header>

      <main className="main">
        {loading && <p className="loading">로딩 중...</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && (
          <>
            <section className="section">
              <h2>💳 카드 상품</h2>
              <div className="grid">
                {cards.map((card) => (
                  <div key={card.contentId} className="card">
                    <h3>{card.title}</h3>
                    <p className="teaser">{card.teaser}</p>
                    <p className="body">{card.body}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="section">
              <h2>🏦 금융 상품</h2>
              <div className="grid">
                {products.map((product) => (
                  <div key={product.contentId} className="card">
                    <h3>{product.name}</h3>
                    <p className="apr">연 {product.apr}</p>
                    <p className="benefits">{product.benefits}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="footer">
        <p>© 2025 루나카드 MCP Login POC</p>
      </footer>
    </div>
  );
}

