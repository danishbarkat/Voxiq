import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Calendar } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import Footer from '../components/Footer';
import { blogs } from '../config/blogData';

export default function BlogPost() {
  const { id } = useParams();
  const blogId = parseInt(id, 10);
  const blog = blogs.find(b => b.id === blogId);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
      setEmail("");
    }
  };

  const accentColor = blog?.color || "#7FCDFF";

  if (!blog) {
    return (
      <div style={{ background: '#020D1A', minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', flexDirection: 'column' }}>
        <main style={{ flex: 1, padding: '120px 24px 80px', display: 'grid', placeItems: 'center' }}>
          <div style={{ maxWidth: '640px', width: '100%', textAlign: 'center' }}>
            <Link to="/blog" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#6B9AB8', textDecoration: 'none', fontSize: '14px', fontWeight: 600, marginBottom: '32px' }} className="back-btn-hover">
              <ArrowLeft size={16} /> Back to blog
            </Link>
            <div style={{ background: '#111929', border: '1px solid rgba(127,205,255,0.08)', borderRadius: '24px', padding: '48px 32px', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)' }}>
              <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#F1F5F9', fontSize: '2.2rem', fontWeight: 700, margin: '0 0 16px' }}>Article Not Found</h1>
              <p style={{ color: '#6B9AB8', fontSize: '15px', lineHeight: 1.6, margin: 0 }}>The requested article does not exist or has been moved.</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div style={{ background: '#020D1A', minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .back-btn-hover:hover {
          color: ${accentColor} !important;
        }
        .back-btn-hover:hover .back-arrow {
          transform: translateX(-4px) !important;
          color: ${accentColor} !important;
        }
        .inp:focus {
          border-color: rgba(127, 205, 255, 0.5) !important;
          box-shadow: 0 0 0 3px rgba(127, 205, 255, 0.08);
        }
        .sb:hover {
          box-shadow: 0 0 20px rgba(127, 205, 255, 0.35);
          transform: translateY(-1px);
        }
        @media (max-width: 768px) {
          .article-body {
            padding: 32px 24px !important;
          }
          .newsletter-form {
            flex-direction: column;
            gap: 12px !important;
          }
          .newsletter-form input {
            width: 100% !important;
          }
        }
      `}</style>
      
      {/* Article Detail Area */}
      <main style={{ flex: 1, padding: '120px 24px 80px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ maxWidth: '800px', width: '100%' }}>
          
          {/* Back button */}
          <Link 
            to="/blog" 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              color: '#6B9AB8', 
              textDecoration: 'none', 
              fontSize: '14px', 
              fontWeight: 600,
              marginBottom: '32px',
              transition: 'color 0.15s'
            }}
            className="back-btn-hover"
          >
            <ArrowLeft size={16} style={{ transform: 'translateX(0)', transition: 'transform 0.15s' }} className="back-arrow" /> Back to blog
          </Link>

          {/* Article Header Card */}
          <div style={{
            background: blog.bg || 'linear-gradient(135deg, #0A2540, #0D3B6E)',
            borderRadius: '24px',
            padding: '56px 40px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            border: '1px solid rgba(127,205,255,0.08)',
            marginBottom: '40px'
          }}>
            {/* Grid Overlay */}
            <div style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
              `,
              backgroundSize: '24px 24px',
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none'
            }} />

            <div style={{ position: 'relative', zIndex: 2 }}>
              <span style={{
                background: `${accentColor}22`,
                border: `1px solid ${accentColor}44`,
                color: accentColor,
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '5px 14px',
                borderRadius: '100px',
                display: 'inline-block',
                marginBottom: '24px'
              }}>
                {blog.category}
              </span>

              <h1 style={{
                fontFamily: "'Space Grotesk', sans-serif",
                color: '#FFFFFF',
                fontSize: 'clamp(1.8rem, 4.5vw, 2.8rem)',
                fontWeight: 700,
                letterSpacing: '-0.03em',
                lineHeight: 1.2,
                margin: '0 0 24px'
              }}>
                {blog.title}
              </h1>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '20px',
                fontSize: '13px',
                color: '#DFF7FF',
                fontWeight: 500
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={14} style={{ color: accentColor }} />
                  <span>{blog.date}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={14} style={{ color: accentColor }} />
                  <span>{blog.readTime}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Article Main Body */}
          <article style={{
            background: '#111929',
            border: '1px solid rgba(127,205,255,0.08)',
            borderRadius: '24px',
            padding: '56px 48px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.2)',
            marginBottom: '40px'
          }} className="article-body">
            
            {/* Excerpt introduction */}
            <p style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#DFF7FF',
              lineHeight: 1.7,
              marginBottom: '32px',
              borderLeft: `4px solid ${accentColor}`,
              paddingLeft: '20px'
            }}>
              {blog.excerpt}
            </p>

            {/* Paragraphs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {blog.content && blog.content.map((paragraph, index) => (
                <p 
                  key={index} 
                  style={{
                    fontSize: '16px',
                    color: '#6B9AB8',
                    lineHeight: 1.8,
                    margin: 0
                  }}
                >
                  {paragraph}
                </p>
              ))}
            </div>

          </article>

          {/* Newsletter Box (inside detail view) */}
          <div style={{
            background: '#111929',
            border: '1px solid rgba(127,205,255,0.08)',
            borderRadius: '24px',
            padding: '48px 40px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              backgroundImage: `
                linear-gradient(rgba(127,205,255,0.02) 1px, transparent 1px),
                linear-gradient(90deg, rgba(127,205,255,0.02) 1px, transparent 1px)
              `,
              backgroundSize: '24px 24px',
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none'
            }} />

            <div style={{ position: 'relative', zIndex: 2 }}>
              <div style={{ width: 56, height: 56, borderRadius: '16px', background: 'rgba(127,205,255,.08)', border: '1px solid rgba(127,205,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '24px' }}>📬</div>
              <span style={{
                color: '#7FCDFF',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                display: 'block',
                marginBottom: '16px'
              }}>
                NEWSLETTER
              </span>

              <h3 style={{
                fontFamily: "'Space Grotesk', sans-serif",
                color: '#F1F5F9',
                fontSize: '1.8rem',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                margin: '0 0 8px'
              }}>
                Loved this article? Get more sent to your inbox.
              </h3>

              <p style={{
                color: '#64748B',
                fontSize: '14px',
                maxWidth: '460px',
                margin: '0 auto 24px',
                lineHeight: 1.6
              }}>
                Join 1,200+ sales leaders who receive our best tactics every week.
              </p>

              {!submitted ? (
                <form onSubmit={handleSubscribe} style={{
                  display: 'flex',
                  gap: '10px',
                  maxWidth: '440px',
                  margin: '0 auto',
                  flexWrap: 'wrap'
                }} className="newsletter-form">
                  <input 
                    type="email"
                    required
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      flex: 1,
                      minWidth: '220px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(127,205,255,0.12)',
                      borderRadius: '10px',
                      padding: '13px 18px',
                      color: '#DFF7FF',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box'
                    }}
                    className="inp"
                  />
                  <button 
                    type="submit"
                    style={{
                      background: 'linear-gradient(135deg, #7FCDFF, #5BB8F5)',
                      color: '#020D1A',
                      fontWeight: 700,
                      fontSize: '14px',
                      padding: '13px 24px',
                      borderRadius: '10px',
                      border: 'none',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s'
                    }}
                    className="sb"
                  >
                    Subscribe
                  </button>
                </form>
              ) : (
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  style={{
                    color: '#00E5A0',
                    fontSize: '15px',
                    fontWeight: 600,
                    padding: '12px',
                    display: 'inline-block'
                  }}
                >
                  ✓ You're in! Thanks for subscribing.
                </motion.div>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
