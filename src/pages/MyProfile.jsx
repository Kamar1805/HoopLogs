import { useEffect, useState } from "react";
import { getAuth, updatePassword, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../Firebase";
import './MyProfile.css';
import SIteHeader from "../components/SIteHeader";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SIteHeader";

export default function MyProfile() {
  const auth = getAuth();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newPassword, setNewPassword] = useState("");

  // ✅ Watch auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        setLoading(false); // No user found
      }
    });

    return () => unsubscribe();
  }, [auth]);

  // ✅ Fetch Firestore data when user is ready
  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile(docSnap.data());
      }
      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleToggle = (field) => {
    setProfile({ ...profile, [field]: !profile[field] });
  };

  const handleSave = async () => {
    const docRef = doc(db, "users", user.uid);
    await updateDoc(docRef, profile);

    if (newPassword.trim() !== "") {
      await updatePassword(user, newPassword);
      setNewPassword("");
    }
    setIsEditing(false);
  };

  if (loading) return <p className="loading-text">Loading...</p>;

  if (!user) return <p className="loading-text">No user found. Please log in.</p>;

  return (
   
    <div className="profile-container">
        <SiteHeader />
        
      <h2 className="profile-header">My Profile</h2>

      {/* Profile Picture */}
      <div className="profile-photo">
        <img
          src={profile.photoURL || "/default-avatar.jpeg"}
          alt="Profile"
          className="profile-image"
        />
        <p className="photo-note">Image upload (Cloudinary) coming soon</p>
      </div>

      <div className="profile-grid">
        <Field label="Name" name="name" value={profile.name} isEditing={isEditing} onChange={handleChange} />
        <Field label="Nickname" name="nickname" value={profile.nickname} isEditing={isEditing} onChange={handleChange} />
        <Field label="Email" name="email" value={profile.email} isEditing={false} />

        <div>
          <label className="field-label">Password</label>
          {!isEditing ? (
            <p className="field-display">********</p>
          ) : (
            <input
              type="password"
              name="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="field-input"
              placeholder="Set new password"
            />
          )}
        </div>

        <SelectField label="Experience Level" name="experience" value={profile.experience} options={["Beginner", "Intermediate", "Pro"]} isEditing={isEditing} onChange={handleChange} />
        <SelectField label="Position" name="position" value={profile.position} options={["PG", "SG", "SF", "PF", "C"]} isEditing={isEditing} onChange={handleChange} />
        <SelectField label="Category" name="category" value={profile.category} options={["Student", "Pro", "Casual"]} isEditing={isEditing} onChange={handleChange} />

        <div className="grid-span">
          <label className="field-label">Currently in a Basketball Team?</label>
          <input
            type="checkbox"
            checked={profile.inTeam || false}
            onChange={() => handleToggle("inTeam")}
            disabled={!isEditing}
            className="checkbox"
          />
          {profile.inTeam && (
            <input
              type="text"
              name="teamName"
              value={profile.teamName || ""}
              onChange={handleChange}
              disabled={!isEditing}
              className="field-input mt-1"
              placeholder="Enter Team Name"
            />
          )}
        </div>

        <Field label="Height (feet and inches)" name="height" value={profile.height} isEditing={isEditing} onChange={handleChange} />
        <Field label="Weight (kg)" name="weight" value={profile.weight} isEditing={isEditing} onChange={handleChange} />
        <Field label="Favorite Player" name="favPlayer" value={profile.favPlayer} isEditing={isEditing} onChange={handleChange} />
        <Field label="Favorite NBA Team" name="favTeam" value={profile.favTeam} isEditing={isEditing} onChange={handleChange} />
      </div>

      {/* Public Profile Toggle */}
      <div className="public-toggle">
        <span className="toggle-label">Set Profile to Public</span>
        <input
          type="checkbox"
          checked={profile.publicProfile || false}
          onChange={() => handleToggle("publicProfile")}
          disabled={!isEditing}
          className="checkbox"
        />
      </div>
      <p className="public-note">
        Once set to public, your profile will be publicly visible on <strong>Locker Room</strong>.
      </p>

      {/* Buttons */}
      <div className="button-group">
        {!isEditing ? (
          <button onClick={() => setIsEditing(true)} className="edit-btn">
            Edit
          </button>
        ) : (
          <button onClick={handleSave} className="save-btn">
            Save Changes
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, name, value, isEditing, onChange }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {!isEditing ? (
        <p className="field-display">{value || "—"}</p>
      ) : (
        <input
          type="text"
          name={name}
          value={value || ""}
          onChange={onChange}
          className="field-input"
        />
      )}
    </div>
  );
}

function SelectField({ label, name, value, options, isEditing, onChange }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {!isEditing ? (
        <p className="field-display">{value || "—"}</p>
      ) : (
        <select
          name={name}
          value={value || ""}
          onChange={onChange}
          className="field-input"
        >
          <option value="">Select</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )}
    </div>
  );
}
