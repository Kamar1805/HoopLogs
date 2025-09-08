import React from 'react';
import './RequestCoaching.css';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';

const coaches = [
  {
    id: 1,
    name: 'Coach Stanley Gumut',
    description: 'Head Coach, Nile Spartans, 6\'6 big two, has led his team to NUGA games final.',
    fee: 10000,
    image: '/images/gumut.jpg',
  },
  {
    id: 2,
    name: 'Coach AK',
    description: 'Assistant Coach, River Hawks, expert in defensive strategies and team building.',
    fee: 10000,
    image: '/images/ak.JPG',
  },
  {
    id: 3,
    name: 'Coach Umar',
    description: 'Captain, Nile Spartans specializes in shooting and playmaking.',
    fee: 10000,
    image: '/images/umar.jpg',
  },
  {
    id: 4,
    name: 'Coach Ernest',
    description: 'Fitness Coach, Ocean Warriors, focuses on endurance and strength training.',
    fee: 10000,
    image: '/images/ernest.JPG',
  },
  {
    id: 5,
    name: 'Coach Hamza',
    description: 'Tactical Coach, Desert Eagles, known for innovative game strategies.',
    fee: 10000,
    image: '/images/er7.jpg',
  },
];

const RequestCoaching = () => {
  return (
    <>
      <SiteHeader />
      <div className="request-coaching premium-blur">
        <div className="premium-overlay">
          <div className="premium-message">
            <h2>Premium Feature</h2>
            <p>
              <b>Personal Coaching</b> is coming soon for HoopLogs Premium users.<br />
              Stay tuned for exclusive access to top coaches!
            </p>
          </div>
        </div>
        <h1>Request a Personal Workout from our Top Coaches</h1>
        <div className="coaches-list">
          {coaches.map((coach) => (
            <div key={coach.id} className="coach-card">
              <div className="coach-info">
                <h2>{coach.name}</h2>
                <p>{coach.description}</p>
                <p className="fee">Fee per hour: ₦{coach.fee}</p>
                <button className="request-btn" disabled>Request Workout</button>
              </div>
              <div className="coach-image">
                <img src={coach.image} alt={`${coach.name}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <SiteFooter />
    </>
  );
};

export default RequestCoaching;