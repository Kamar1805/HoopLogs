// Updated Signup.jsx
import React, { useState, useEffect } from 'react';
import './Signup.css';
import { auth, db } from '../Firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';

const Signup = () => {
  const [form, setForm] = useState({});
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  useEffect(() => {
    if (error || success) {
      const timeout = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [error, success]);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );

      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: form.name,
        email: form.email,
        level: form.level,
        position: form.position,
        category: form.category,
        inTeam: form.inTeam,
        height: form.height,
        weight: form.weight,
        nickname: form.nickname || '',
        favPlayer: form.favPlayer,
        favTeam: form.favTeam,
        createdAt: new Date().toISOString(),
      });

      setSuccess("Account created successfully!");
      setTimeout(() => navigate("/login", { state: { signupSuccess: true } }), 1000);
    } catch (err) {
      console.error(err);
      setError(err.message);
    }

    setLoading(false);
  };

  return (
    <div className="signup-page">
      <form onSubmit={handleSubmit} className="form-box">
        <img src='hoop.png' alt="Hoop Logs Logo" className="logo" />
        <h2>Sign Up to Hoop Logs</h2>

        {error && <p className="error-text">{error}</p>}
        {success && <p className="success-text">{success}</p>}

        {step === 1 && (
          <div className="form-section">
            <h3>Personal Information</h3>
            <div className="form-group">
              <label>Name</label>
              <input type="text" name="name" onChange={handleChange} required placeholder='e.g Kamar' />
              <label>Email Address</label>
              <input type="email" name="email" onChange={handleChange} required  placeholder='e.g Kamar@gmail.com'/>
              <label>Password</label>
              <input type="password" name="password" onChange={handleChange} required placeholder='e.g 12345##AK' />
              <label>Confirm Password</label>
              <input type="password" name="confirmPassword" onChange={handleChange} required />
            </div>
            <button type="button" onClick={nextStep} className="submit-btn">Next</button>
          </div>
        )}

{step === 2 && (
    <div className="form-section">
      <h3>Basketball Profile</h3>
      <div className="form-group">
        <label>Experience Level</label>
        <div className="radio-group">
          <label><input type="radio" name="level" value="Beginner" onChange={handleChange} required /> Beginner</label>
          <label><input type="radio" name="level" value="Intermediate" onChange={handleChange} /> Intermediate</label>
          <label><input type="radio" name="level" value="Pro" onChange={handleChange} /> Pro</label>
        </div>

        <label>Position</label>
        <select name="position" onChange={handleChange} required>
          <option value="">Select Position</option>
          <option>PG</option>
          <option>SG</option>
          <option>SF</option>
          <option>PF</option>
          <option>C</option>
        </select>

        <label>Category</label>
        <select name="category" onChange={handleChange} required>
          <option value="">Select Category</option>
          <option>Student</option>
          <option>Pro</option>
          <option>Casual</option>
        </select>

        <label>Currently in a basketball team?</label>
        <div className="radio-group">
          <label><input type="radio" name="inTeam" value="Yes" onChange={handleChange} required /> Yes</label>
          <label><input type="radio" name="inTeam" value="No" onChange={handleChange} /> No</label>
        </div>

        <label>Enter Height (in feet and inches)</label>
        <input type="text" name="height" onChange={handleChange} required placeholder="e.g 5'10 " />

        <label>Enter Weight (in kg)</label>
        <input type="number" name="weight" onChange={handleChange} required placeholder="e.g 70 kg" />
      </div>
      <div className="btn-group">
        <button type="button" onClick={prevStep} className="back-btn">Back</button>
        <button type="button" onClick={nextStep} className="submit-btn">Next</button>
      </div>
    </div>
  )}

  {step === 3 && (
    <div className="form-section">
      <h3>Additional Information</h3>
      <div className="form-group">
        <label>Nickname</label>
        <input type="text" name="nickname" onChange={handleChange} required placeholder='e.g AK'/>

        <label>Favorite Basketball Player</label>
        <input type="text" name="favPlayer" onChange={handleChange} required placeholder='e.g Lebron James' />

        <label>Favorite NBA Team</label>
        <input type="text" name="favTeam" onChange={handleChange} required placeholder="e.g Timberwolves"/>
      </div>
      <div className="btn-group">
        <button type="button" onClick={prevStep} className="back-btn">Back</button>
        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? "Creating..." : "Create Account"}
        </button>
      </div>
    </div>
  )}


        <div className="form-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="login-link">Log in</Link>
          </p>
        </div>
      </form>
    </div>
  );
};

export default Signup;
