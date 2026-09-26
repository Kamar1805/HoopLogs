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
        setProfile(data);
        return data;
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
          setProfile(created);
          return created;
        }
      }
    } catch (err) {
      console.error('Fetch profile catch:', err);
    }
    return null;
  };

  useEffect(() => {
    // Check initial active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id, session.user.user_metadata);
      } else {
        setUser(null);
        setProfile(null);
      }
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
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single();
    if (error) throw error;
    setProfile(data);
    return data;
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
