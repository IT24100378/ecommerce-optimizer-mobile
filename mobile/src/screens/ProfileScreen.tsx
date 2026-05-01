import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { API_BASE_URL, useStorefrontStore } from '../storefront/store';

type AuthMode = 'signin' | 'signup';
type PanelMode = 'profile' | 'password';

export default function ProfileScreen() {
    const { user, setUser, signOut } = useStorefrontStore();
    const [mode, setMode] = useState<AuthMode>('signin');
    const [panelMode, setPanelMode] = useState<PanelMode>('profile');
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        address: '',
    });
    const [profileForm, setProfileForm] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        address: user?.address || '',
    });
    const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const authHeaders = useMemo(() => (
        user?.token ? { Authorization: `Bearer ${user.token}` } : undefined
    ), [user?.token]);

    const handleAuthSubmit = async () => {
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            if (mode === 'signup') {
                const { data } = await axios.post(`${API_BASE_URL}/api/users`, {
                    name: form.name,
                    email: form.email,
                    password: form.password,
                    phone: form.phone,
                    address: form.address,
                });
                setUser(data);
                setProfileForm({
                    name: data?.name || '',
                    email: data?.email || '',
                    phone: data?.phone || '',
                    address: data?.address || '',
                });
            } else {
                const { data } = await axios.post(`${API_BASE_URL}/api/users/login`, {
                    email: form.email,
                    password: form.password,
                });
                setUser(data);
                setProfileForm({
                    name: data?.name || '',
                    email: data?.email || '',
                    phone: data?.phone || '',
                    address: data?.address || '',
                });
            }
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Unable to authenticate.');
        } finally {
            setLoading(false);
        }
    };

    const saveProfile = async () => {
        if (!user?.id || !authHeaders) return;
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const { data } = await axios.put(`${API_BASE_URL}/api/users/${user.id}`, {
                name: profileForm.name.trim(),
                email: profileForm.email.trim(),
                phone: profileForm.phone.trim() || null,
                address: profileForm.address.trim() || null,
            }, { headers: authHeaders });
            setUser({ ...user, ...data, token: user.token });
            setSuccess('Profile updated successfully.');
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Failed to update profile.');
        } finally {
            setLoading(false);
        }
    };

    const changePassword = async () => {
        if (!user?.id || !authHeaders) return;
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await axios.put(`${API_BASE_URL}/api/users/${user.id}/change-password`, {
                oldPassword: passwordForm.oldPassword,
                newPassword: passwordForm.newPassword,
            }, { headers: authHeaders });
            setPasswordForm({ oldPassword: '', newPassword: '' });
            setSuccess('Password updated successfully.');
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Failed to change password.');
        } finally {
            setLoading(false);
        }
    };

    if (user?.id) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Profile</Text>
                    <Text style={styles.subtitle}>Signed in as {user.email}</Text>
                </View>

                <View style={styles.modeRow}>
                    <Pressable onPress={() => setPanelMode('profile')} style={panelMode === 'profile' ? styles.modeButtonActive : styles.modeButton}>
                        <Text style={panelMode === 'profile' ? styles.modeTextActive : styles.modeText}>Profile</Text>
                    </Pressable>
                    <Pressable onPress={() => setPanelMode('password')} style={panelMode === 'password' ? styles.modeButtonActive : styles.modeButton}>
                        <Text style={panelMode === 'password' ? styles.modeTextActive : styles.modeText}>Password</Text>
                    </Pressable>
                </View>

                <View style={styles.formCard}>
                    {panelMode === 'profile' ? (
                        <>
                            <TextInput value={profileForm.name} onChangeText={(value) => setProfileForm((prev) => ({ ...prev, name: value }))} placeholder="Full name" placeholderTextColor="#94a3b8" style={styles.input} />
                            <TextInput value={profileForm.email} onChangeText={(value) => setProfileForm((prev) => ({ ...prev, email: value }))} placeholder="Email" placeholderTextColor="#94a3b8" style={styles.input} autoCapitalize="none" keyboardType="email-address" />
                            <TextInput value={profileForm.phone} onChangeText={(value) => setProfileForm((prev) => ({ ...prev, phone: value }))} placeholder="Phone" placeholderTextColor="#94a3b8" style={styles.input} />
                            <TextInput value={profileForm.address} onChangeText={(value) => setProfileForm((prev) => ({ ...prev, address: value }))} placeholder="Address" placeholderTextColor="#94a3b8" style={styles.input} />
                            <Pressable onPress={saveProfile} style={styles.submitButton} disabled={loading}>
                                <Text style={styles.submitButtonText}>{loading ? 'Saving...' : 'Save Profile'}</Text>
                            </Pressable>
                        </>
                    ) : (
                        <>
                            <TextInput value={passwordForm.oldPassword} onChangeText={(value) => setPasswordForm((prev) => ({ ...prev, oldPassword: value }))} placeholder="Current password" placeholderTextColor="#94a3b8" style={styles.input} secureTextEntry />
                            <TextInput value={passwordForm.newPassword} onChangeText={(value) => setPasswordForm((prev) => ({ ...prev, newPassword: value }))} placeholder="New password" placeholderTextColor="#94a3b8" style={styles.input} secureTextEntry />
                            <Pressable onPress={changePassword} style={styles.submitButton} disabled={loading}>
                                <Text style={styles.submitButtonText}>{loading ? 'Updating...' : 'Change Password'}</Text>
                            </Pressable>
                        </>
                    )}
                    {error ? <Text style={styles.errorText}>{error}</Text> : null}
                    {success ? <Text style={styles.successText}>{success}</Text> : null}
                </View>

                <Pressable onPress={signOut} style={styles.signOutButton}>
                    <Text style={styles.signOutText}>Sign Out</Text>
                </Pressable>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Profile</Text>
                <Text style={styles.subtitle}>Sign in to sync orders and admin access</Text>
            </View>
            <View style={styles.modeRow}>
                <Pressable onPress={() => setMode('signin')} style={mode === 'signin' ? styles.modeButtonActive : styles.modeButton}>
                    <Text style={mode === 'signin' ? styles.modeTextActive : styles.modeText}>Sign In</Text>
                </Pressable>
                <Pressable onPress={() => setMode('signup')} style={mode === 'signup' ? styles.modeButtonActive : styles.modeButton}>
                    <Text style={mode === 'signup' ? styles.modeTextActive : styles.modeText}>Create Account</Text>
                </Pressable>
            </View>
            <View style={styles.formCard}>
                {mode === 'signup' ? (
                    <TextInput value={form.name} onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))} placeholder="Full name" placeholderTextColor="#94a3b8" style={styles.input} />
                ) : null}
                <TextInput value={form.email} onChangeText={(value) => setForm((prev) => ({ ...prev, email: value }))} placeholder="Email" placeholderTextColor="#94a3b8" style={styles.input} autoCapitalize="none" keyboardType="email-address" />
                <TextInput value={form.password} onChangeText={(value) => setForm((prev) => ({ ...prev, password: value }))} placeholder="Password" placeholderTextColor="#94a3b8" style={styles.input} secureTextEntry />
                {mode === 'signup' ? (
                    <>
                        <TextInput value={form.phone} onChangeText={(value) => setForm((prev) => ({ ...prev, phone: value }))} placeholder="Phone (optional)" placeholderTextColor="#94a3b8" style={styles.input} />
                        <TextInput value={form.address} onChangeText={(value) => setForm((prev) => ({ ...prev, address: value }))} placeholder="Address" placeholderTextColor="#94a3b8" style={styles.input} />
                    </>
                ) : null}
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                <Pressable onPress={handleAuthSubmit} style={styles.submitButton} disabled={loading}>
                    {loading ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={styles.submitButtonText}>{mode === 'signup' ? 'Create Account' : 'Sign In'}</Text>}
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0b0f1a',
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#1f2937',
    },
    title: {
        color: '#f8fafc',
        fontSize: 20,
        fontWeight: '700',
    },
    subtitle: {
        color: '#94a3b8',
        fontSize: 13,
        marginTop: 4,
    },
    modeRow: {
        flexDirection: 'row',
        gap: 8,
        padding: 16,
    },
    modeButton: {
        flex: 1,
        backgroundColor: '#111827',
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        minHeight: 48,
    },
    modeButtonActive: {
        flex: 1,
        backgroundColor: '#2563eb',
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        minHeight: 48,
    },
    modeText: {
        color: '#94a3b8',
        fontWeight: '600',
        fontSize: 12,
    },
    modeTextActive: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 12,
    },
    formCard: {
        backgroundColor: '#111827',
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 16,
        gap: 12,
    },
    input: {
        backgroundColor: '#0f172a',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: '#f8fafc',
        borderWidth: 1,
        borderColor: '#1f2937',
        minHeight: 48,
    },
    submitButton: {
        backgroundColor: '#22c55e',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
    submitButtonText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 15,
    },
    errorText: {
        color: '#f87171',
        fontSize: 12,
    },
    successText: {
        color: '#22c55e',
        fontSize: 12,
    },
    signOutButton: {
        marginHorizontal: 16,
        marginTop: 14,
        backgroundColor: '#1f2937',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
    signOutText: {
        color: '#f8fafc',
        fontWeight: '700',
        fontSize: 14,
    },
});
