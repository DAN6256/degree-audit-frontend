import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import styles from './Dashboard.module.css';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <div className={styles.dashboardContainer}>
      <h2 className={styles.header}>Dashboard</h2>
      <div className={styles.cardsContainer}>
        <div className={styles.card} onClick={() => navigate('/audit')}>
          <h3>Run Audit</h3>
          <p>Upload student data and check who is on track.</p>
        </div>
        <div className={styles.card} onClick={() => navigate('/criteria')}>
          <h3>Define Criteria</h3>
          <p>Manage degree requirements for majors and semesters.</p>
        </div>
      </div>
      <button className={styles.logoutButton} onClick={logout}>Logout</button>
    </div>
  );
};

export default Dashboard;