import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleKey = (e: React.KeyboardEvent<HTMLButtonElement>, path: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(path);
    }
  };

  return (
    <div className="dashboardContainer">
      <header className="topbar">
        <h2 className="header">Dashboard</h2>
        <button type="button" className="logoutButton" onClick={logout}>
          Logout
        </button>
      </header>

      <div className="cardsContainer">
        <button
          type="button"
          className="card"
          onClick={() => navigate('/audit')}
          onKeyDown={(e) => handleKey(e, '/audit')}
          aria-label="Run Audit"
        >
          <span className="cardIcon" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="iconSvg" focusable="false" aria-hidden="true">
              <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h8.879a1.5 1.5 0 0 1 1.06.44l4.121 4.121A1.5 1.5 0 0 1 19 8.621V19.5A1.5 1.5 0 0 1 17.5 21h-13A1.5 1.5 0 0 1 3 19.5v-15zM14 4.5V8a1 1 0 0 0 1 1h3.5" fill="currentColor"/>
            </svg>
          </span>
          <h3 className="cardTitle">Run Audit</h3>
          <p className="cardDesc">Upload student data and check who is on track.</p>
        </button>

        <button
          type="button"
          className="card"
          onClick={() => navigate('/criteria')}
          onKeyDown={(e) => handleKey(e, '/criteria')}
          aria-label="Define Criteria"
        >
          <span className="cardIcon" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="iconSvg" focusable="false" aria-hidden="true">
              <path d="M4 7h12M4 17h16M16 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm-6 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            </svg>
          </span>
          <h3 className="cardTitle">Define Criteria</h3>
          <p className="cardDesc">Manage degree requirements for majors and semesters.</p>
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
