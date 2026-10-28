import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch or create profile for authenticated user
  const fetchProfile = async (userId, userMetadata = null) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      if (data) {
        const localWa = typeof window !== 'undefined' ? (localStorage.getItem(`hooplogs_wa_${userId}`) || '') : '';
        const phone = data.phone_number || userMetadata?.phone_number || userMetadata?.whatsapp || localWa || '';
        const merged = {
          ...data,
          phone_number: phone,
          whatsapp: phone,
          phoneNumber: phone,
          gender: userMetadata?.gender || 'Male',
          jersey_number: userMetadata?.jersey_number || '',
          bio: userMetadata?.bio || ''
        };
        setProfile(merged);
        return merged;
      } else {
        // Fallback: If trigger didn't run, create profile now
        const newProfile = {
          id: userId,
          full_name: userMetadata?.full_name || userMetadata?.name || 'Hooper',
          nickname: userMetadata?.nickname || '',
          role: userMetadata?.role || 'player',
        };
        const { data: created, error: insertErr } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();
        if (!insertErr && created) {
          const localWa = typeof window !== 'undefined' ? (localStorage.getItem(`hooplogs_wa_${userId}`) || '') : '';
          const phone = created.phone_number || userMetadata?.phone_number || userMetadata?.whatsapp || localWa || '';
          const mergedCreated = {
            ...created,
            phone_number: phone,
            whatsapp: phone,
            phoneNumber: phone,
            gender: userMetadata?.gender || 'Male',
            jersey_number: userMetadata?.jersey_number || '',
            bio: userMetadata?.bio || ''
          };
          setProfile(mergedCreated);
          return mergedCreated;
        }
      }
    } catch (err) {
      console.error('Fetch profile catch:', err);
    }
    return null;
  };

  useEffect(() => {
    // Check initial active session
    supabase.auth.getSession()
      .then(({ data }) => {
        const session = data?.session;
        if (session?.user) {
          setUser(session.user);
          fetchProfile(session.user.id, session.user.user_metadata);
        } else {
          setUser(null);
          setProfile(null);
        }
      })
      .catch((err) => {
        console.warn('Could not connect to Supabase (backend may be paused or offline):', err);
        setUser(null);
        setProfile(null);
      })
      .finally(() => {
        setLoading(false);
      });

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id, session.user.user_metadata);
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
    return data;
  };

  const signUp = async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: metadata,
      },
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase auth.signOut error (clearing local state anyway):', err);
    } finally {
      setUser(null);
      setProfile(null);
    }
  };

  const updateProfile = async (updates) => {
    if (!user) return;

    const rawPhone = updates.phone_number !== undefined ? updates.phone_number : updates.whatsapp;
    const cleanWa = rawPhone !== undefined ? String(rawPhone || '').replace(/[^0-9]/g, '') : null;

    const dbPayload = {
      updated_at: new Date().toISOString()
    };
    if (updates.full_name !== undefined) dbPayload.full_name = updates.full_name;
    if (updates.nickname !== undefined) dbPayload.nickname = updates.nickname;
    if (updates.position !== undefined) dbPayload.position = updates.position;
    if (updates.experience !== undefined) dbPayload.experience = updates.experience;
    if (updates.height !== undefined) dbPayload.height = updates.height;
    if (updates.weight !== undefined) dbPayload.weight = updates.weight;
    if (updates.avatar_url !== undefined) dbPayload.avatar_url = updates.avatar_url;
    if (updates.role !== undefined) dbPayload.role = updates.role;
    if (cleanWa !== null) dbPayload.phone_number = cleanWa;

    // A. Update Supabase 'profiles' table safely
    let savedData = null;
    const { data, error } = await supabase
      .from('profiles')
      .update(dbPayload)
      .eq('id', user.id)
      .select()
      .maybeSingle();

    if (error) {
      console.warn('Supabase profiles update notice:', error);
    } else {
      savedData = data;
    }

    // B. Save extended metadata to Supabase Auth so it is persistently attached to account
    try {
      const authMetaUpdates = {};
      if (updates.full_name !== undefined) authMetaUpdates.full_name = updates.full_name;
      if (updates.nickname !== undefined) authMetaUpdates.nickname = updates.nickname;
      if (cleanWa !== null) {
        authMetaUpdates.phone_number = cleanWa;
        authMetaUpdates.whatsapp = cleanWa;
        localStorage.setItem(`hooplogs_wa_${user.id}`, cleanWa);
      }
      if (updates.gender !== undefined) authMetaUpdates.gender = updates.gender;
      if (updates.jersey_number !== undefined) authMetaUpdates.jersey_number = updates.jersey_number;
      if (updates.bio !== undefined) authMetaUpdates.bio = updates.bio;

      await supabase.auth.updateUser({ data: authMetaUpdates });
    } catch (authErr) {
      console.warn('Supabase auth updateUser metadata notice:', authErr);
    }

    const merged = {
      ...(profile || {}),
      ...(savedData || {}),
      ...updates,
      phone_number: cleanWa !== null ? cleanWa : (savedData?.phone_number || profile?.phone_number || ''),
      whatsapp: cleanWa !== null ? cleanWa : (savedData?.phone_number || profile?.whatsapp || ''),
      phoneNumber: cleanWa !== null ? cleanWa : (savedData?.phone_number || profile?.phoneNumber || '')
    };
    setProfile(merged);
    return merged;
  };

  // Strictly protected admin role update
  const upgradeToAdmin = async (passcode) => {
    if (passcode?.trim() !== 'hooplogsadmin001') {
      throw new Error('Invalid admin passcode. Only authorized staff can access admin privileges.');
    }
    await updateProfile({ role: 'admin' });
    return true;
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAdmin,
        loading,
        signIn,
        signUp,
        signOut,
        updateProfile,
        upgradeToAdmin,
        refreshProfile: () => user && fetchProfile(user.id),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
