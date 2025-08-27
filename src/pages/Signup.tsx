import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signup as apiSignup, login as apiLogin } from '../api';
import styles from './Signup.module.css';
import { useAuth } from '../hooks/useAuth';

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await apiSignup(email, password, name);
      const data = await apiLogin(email, password);
      login(data.token);
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Signup failed');
    }
  };

  return (
    <div className={styles.wrapper}>
      <h2>Sign Up</h2>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div>
          <label>Name:</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label>Email:</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label>Password:</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <button type="submit">Sign Up</button>
      </form>
      <p>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
};

export default Signup;