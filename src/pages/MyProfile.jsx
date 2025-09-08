import { useEffect, useState } from "react";
import { getAuth, updatePassword, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../Firebase";
import './MyProfile.css';
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

// --- Cloudinary config ---
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dmybkmqs6/upload";
const CLOUDINARY_PRESET = "hooplogs_unsigned";

// Spinner loader SVG
function Spinner() {
  return (
    <span className="profile-spinner" aria-label="Loading">
      <svg width="36" height="36" viewBox="0 0 36 36">
        <circle
          cx="18"
          cy="18"
          r="16"
          stroke="#6A89A7"
          strokeWidth="4"
          fill="none"
          strokeDasharray="80"
          strokeDashoffset="60"
          strokeLinecap="round"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 18 18"
            to="360 18 18"
            dur="0.9s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
    </span>
  );
}

export default function MyProfile() {
  const auth = getAuth();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [uploading, setUploading] = useState(false);

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

  // --- Cloudinary image upload handler ---
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_PRESET);

    try {
      const res = await fetch(CLOUDINARY_URL, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.secure_url) {
        setProfile((prev) => ({ ...prev, photoURL: data.secure_url }));
      } else {
        alert("Upload failed. Please try again.");
      }
    } catch (err) {
      alert("Upload error. Please try again.");
    }
    setUploading(false);
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

  if (loading) return (
    <div className="profile-loading">
      <Spinner />
    </div>
  );

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
        {isEditing && (
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="profile-upload-input"
              disabled={uploading}
            />
            {uploading && <Spinner />}
            <p className="photo-note">Upload a clear photo. Max 5MB. (Powered by Cloudinary)</p>
          </div>
        )}
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

        {/* --- BIO SECTION --- */}
        <div className="grid-span">
          <label className="field-label">Bio</label>
          {!isEditing ? (
            <p className="field-display">{profile.bio || "—"}</p>
          ) : (
            <textarea
              name="bio"
              value={profile.bio || ""}
              onChange={handleChange}
              className="field-input"
              rows={3}
              placeholder="Tell us about yourself, your basketball journey, or anything you'd like others to know..."
            />
          )}
        </div>

        {/* --- PHONE NUMBER SECTION --- */}
        <div className="grid-span">
          <label className="field-label">
            Phone Number (for WhatsApp)
            <span className="phone-note">
              <br />
              <small>
                <b>Optional:</b> If you add your phone number and set it to public, other hoopers will be able to reach out to you directly via WhatsApp from the Hoopers page.<br />
                <b>Format:</b> Use your full international number (e.g. 08012345678).
              </small>
            </span>
          </label>
          {!isEditing ? (
            <p className="field-display">{profile.phoneNumber ? profile.phoneNumber : "—"}</p>
          ) : (
            <input
              type="tel"
              name="phoneNumber"
              value={profile.phoneNumber || ""}
              onChange={handleChange}
              className="field-input"
              placeholder="e.g. 08012345678"
              autoComplete="tel"
            />
          )}
          <div className="public-toggle mt-1">
            <span className="toggle-label">Make phone number public</span>
            <input
              type="checkbox"
              checked={profile.phonePublic || false}
              onChange={() => handleToggle("phonePublic")}
              disabled={!isEditing}
              className="checkbox"
            />
          </div>
          <p className="public-note">
            If set to public, your WhatsApp button will appear on your Hooper profile for others to contact you.
          </p>
        </div>
        {/* --- END PHONE NUMBER SECTION --- */}
      </div>

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
      <SiteFooter />
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