/**
 * auth.js - Fichier centralisé pour la gestion de l'authentification
 * NOVA BANK - Version adaptée à la nouvelle base de données
 */

// ==================== CONFIGURATION ====================
const SUPABASE_URL = 'https://lvbdafzdsuotairqkcnv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2YmRhZnpkc3VvdGFpcnFrY252Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwNTg0MTUsImV4cCI6MjA4NjYzNDQxNX0.MWPo0ZnTNTzK4_8N1GB_mtri7LkgfP43W4gjBGB7zhI';

// Email administrateur (pour les vérifications admin)
const ADMIN_EMAIL = 'serviceclient08987@gmail.com';

// ==================== INITIALISATION ====================
const { createClient } = supabase;
const novabank = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
});

// ==================== GESTION DES UTILISATEURS ====================

/**
 * Inscription d'un nouvel utilisateur
 * @param {Object} userData - Données de l'utilisateur
 * @param {string} userData.nom - Nom complet
 * @param {string} userData.email - Email
 * @param {string} userData.password - Mot de passe
 * @returns {Promise<Object>} - Résultat de l'inscription
 */
async function register(userData) {
    try {
        const { nom, email, password } = userData;
        
        // Validation rapide
        if (!nom || !email || !password) {
            return {
                success: false,
                message: 'Tous les champs sont requis'
            };
        }

        if (password.length < 6) {
            return {
                success: false,
                message: 'Le mot de passe doit contenir au moins 6 caractères'
            };
        }

        // Inscription avec Supabase
        const { data, error } = await novabank.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    nom: nom
                }
            }
        });

        if (error) throw error;

        if (data && data.user) {
            // Attendre la création du profil
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            return {
                success: true,
                user: data.user,
                message: 'Inscription réussie'
            };
        }

        return {
            success: false,
            message: 'Erreur lors de l\'inscription'
        };

    } catch (error) {
        console.error('Erreur register:', error);
        
        let message = error.message;
        if (error.message.includes('User already registered')) {
            message = 'Un compte existe déjà avec cet email';
        } else if (error.message.includes('password')) {
            message = 'Le mot de passe doit contenir au moins 6 caractères';
        } else if (error.message.includes('email')) {
            message = 'Format d\'email invalide';
        }
        
        return {
            success: false,
            message: message
        };
    }
}

/**
 * Connexion d'un utilisateur
 * @param {string} email - Email de l'utilisateur
 * @param {string} password - Mot de passe
 * @returns {Promise<Object>} - Résultat de la connexion
 */
async function login(email, password) {
    try {
        if (!email || !password) {
            return {
                success: false,
                message: 'Email et mot de passe requis'
            };
        }

        const { data, error } = await novabank.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        if (data && data.user) {
            return {
                success: true,
                user: data.user,
                session: data.session,
                message: 'Connexion réussie'
            };
        }

        return {
            success: false,
            message: 'Erreur lors de la connexion'
        };

    } catch (error) {
        console.error('Erreur login:', error);
        
        let message = 'Erreur lors de la connexion';
        if (error.message.includes('Invalid login credentials')) {
            message = 'Email ou mot de passe incorrect';
        } else if (error.message.includes('Email not confirmed')) {
            message = 'Veuillez confirmer votre email avant de vous connecter';
        } else if (error.message.includes('rate limit')) {
            message = 'Trop de tentatives, réessayez plus tard';
        }
        
        return {
            success: false,
            message: message
        };
    }
}

/**
 * Déconnexion de l'utilisateur
 * @returns {Promise<Object>} - Résultat de la déconnexion
 */
async function logout() {
    try {
        const { error } = await novabank.auth.signOut();
        if (error) throw error;
        
        return {
            success: true,
            message: 'Déconnexion réussie'
        };
    } catch (error) {
        console.error('Erreur logout:', error);
        return {
            success: false,
            message: error.message || 'Erreur lors de la déconnexion'
        };
    }
}

// ==================== GESTION DES PROFILS ====================

/**
 * Récupérer le profil de l'utilisateur connecté
 * @returns {Promise<Object>} - Profil utilisateur
 */
async function getProfile() {
    try {
        const { data: { user }, error: userError } = await novabank.auth.getUser();
        
        if (userError) throw userError;
        if (!user) throw new Error('Utilisateur non connecté');

        const { data, error } = await novabank
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) throw error;

        return {
            success: true,
            profile: data
        };

    } catch (error) {
        console.error('Erreur getProfile:', error);
        return {
            success: false,
            message: error.message || 'Erreur lors du chargement du profil'
        };
    }
}

/**
 * Mettre à jour le profil utilisateur
 * @param {Object} profileData - Données à mettre à jour
 * @returns {Promise<Object>} - Résultat de la mise à jour
 */
async function updateProfile(profileData) {
    try {
        const { data: { user }, error: userError } = await novabank.auth.getUser();
        
        if (userError) throw userError;
        if (!user) throw new Error('Utilisateur non connecté');

        const { data, error } = await novabank
            .from('profiles')
            .update(profileData)
            .eq('id', user.id)
            .select()
            .single();

        if (error) throw error;

        return {
            success: true,
            profile: data,
            message: 'Profil mis à jour'
        };

    } catch (error) {
        console.error('Erreur updateProfile:', error);
        return {
            success: false,
            message: error.message || 'Erreur lors de la mise à jour'
        };
    }
}

/**
 * Récupérer le solde de l'utilisateur
 * @returns {Promise<number>} - Solde actuel
 */
async function getBalance() {
    try {
        const profile = await getProfile();
        if (profile.success && profile.profile) {
            return profile.profile.solde || 0;
        }
        return 0;
    } catch (error) {
        console.error('Erreur getBalance:', error);
        return 0;
    }
}

// ==================== GESTION ADMIN ====================

/**
 * Vérifier si l'utilisateur connecté est admin
 * @returns {Promise<boolean>}
 */
async function isAdmin() {
    try {
        const { data: { user } } = await novabank.auth.getUser();
        if (!user) return false;
        
        // Vérification par email admin
        if (user.email === ADMIN_EMAIL) return true;
        
        // Vérification par rôle dans profiles (si la colonne existe)
        const { data, error } = await novabank
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        
        if (error || !data) return false;
        
        return data.role === 'admin';
    } catch {
        return false;
    }
}

/**
 * Récupérer tous les utilisateurs (admin uniquement)
 * @returns {Promise<Object>} - Liste des utilisateurs
 */
async function getAllUsers() {
    try {
        // Vérifier les droits admin
        const admin = await isAdmin();
        if (!admin) {
            return {
                success: false,
                message: 'Accès non autorisé'
            };
        }

        const { data, error } = await novabank
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return {
            success: true,
            users: data
        };

    } catch (error) {
        console.error('Erreur getAllUsers:', error);
        return {
            success: false,
            message: error.message || 'Erreur lors du chargement des utilisateurs'
        };
    }
}

/**
 * Mettre à jour le solde d'un utilisateur (admin uniquement)
 * @param {string} userId - ID de l'utilisateur
 * @param {number} newBalance - Nouveau solde
 * @returns {Promise<Object>} - Résultat de la mise à jour
 */
async function updateUserBalance(userId, newBalance) {
    try {
        // Vérifier les droits admin
        const admin = await isAdmin();
        if (!admin) {
            return {
                success: false,
                message: 'Accès non autorisé'
            };
        }

        const { error } = await novabank
            .from('profiles')
            .update({ solde: newBalance })
            .eq('id', userId);

        if (error) throw error;

        return {
            success: true,
            message: 'Solde mis à jour avec succès'
        };

    } catch (error) {
        console.error('Erreur updateUserBalance:', error);
        return {
            success: false,
            message: error.message || 'Erreur lors de la mise à jour du solde'
        };
    }
}

/**
 * Supprimer un utilisateur (admin uniquement)
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Object>} - Résultat de la suppression
 */
async function deleteUser(userId) {
    try {
        // Vérifier les droits admin
        const admin = await isAdmin();
        if (!admin) {
            return {
                success: false,
                message: 'Accès non autorisé'
            };
        }

        const { error } = await novabank
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (error) throw error;

        return {
            success: true,
            message: 'Utilisateur supprimé avec succès'
        };

    } catch (error) {
        console.error('Erreur deleteUser:', error);
        return {
            success: false,
            message: error.message || 'Erreur lors de la suppression'
        };
    }
}

// ==================== UTILITAIRES ====================

/**
 * Vérifier si l'utilisateur est connecté
 * @returns {Promise<boolean>}
 */
async function isAuthenticated() {
    try {
        const { data: { user } } = await novabank.auth.getUser();
        return !!user;
    } catch {
        return false;
    }
}

/**
 * Récupérer l'utilisateur connecté
 * @returns {Promise<Object|null>}
 */
async function getCurrentUser() {
    try {
        const { data: { user } } = await novabank.auth.getUser();
        return user;
    } catch {
        return null;
    }
}

/**
 * Rediriger si non connecté
 * @param {string} redirectUrl - URL de redirection
 */
async function requireAuth(redirectUrl = 'connexion.html') {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
        window.location.href = redirectUrl;
    }
}

/**
 * Rediriger si déjà connecté
 * @param {string} redirectUrl - URL de redirection
 */
async function redirectIfAuthenticated(redirectUrl = 'dashboard.html') {
    const authenticated = await isAuthenticated();
    if (authenticated) {
        window.location.href = redirectUrl;
    }
}

/**
 * Calculer la force du mot de passe
 * @param {string} password - Mot de passe
 * @returns {Object} - Force et couleur
 */
function checkPasswordStrength(password) {
    let strength = 0;
    
    if (password.length >= 8) strength += 20;
    if (password.length >= 10) strength += 10;
    if (password.match(/[a-z]/)) strength += 20;
    if (password.match(/[A-Z]/)) strength += 20;
    if (password.match(/[0-9]/)) strength += 20;
    if (password.match(/[^a-zA-Z0-9]/)) strength += 20;

    // Limiter à 100
    strength = Math.min(strength, 100);

    let text = 'Très faible';
    let color = '#ff6b4a';
    
    if (strength <= 20) {
        text = 'Très faible';
        color = '#ff6b4a';
    } else if (strength <= 40) {
        text = 'Faible';
        color = '#ff8a5c';
    } else if (strength <= 60) {
        text = 'Moyen';
        color = '#f0b34b';
    } else if (strength <= 80) {
        text = 'Bon';
        color = '#34a853';
    } else {
        text = 'Excellent';
        color = '#2d7a4b';
    }

    return {
        strength: strength,
        text: text,
        color: color
    };
}

/**
 * Formater un montant en euros
 * @param {number} amount - Montant à formater
 * @returns {string} - Montant formaté
 */
function formatAmount(amount) {
    if (amount === null || amount === undefined) return '0,00 €';
    return amount.toFixed(2).replace('.', ',') + ' €';
}

// ==================== SESSION ====================

/**
 * Rafraîchir la session utilisateur
 * @returns {Promise<Object>} - Résultat
 */
async function refreshSession() {
    try {
        const { data, error } = await novabank.auth.refreshSession();
        if (error) throw error;
        return {
            success: true,
            session: data.session
        };
    } catch (error) {
        console.error('Erreur refreshSession:', error);
        return {
            success: false,
            message: error.message
        };
    }
}

// ==================== EXPORTS ====================

// Exporter toutes les fonctions vers l'objet window.NOVABANK
window.NOVABANK = {
    // Authentification
    register: register,
    login: login,
    logout: logout,
    
    // Profils
    getProfile: getProfile,
    updateProfile: updateProfile,
    getBalance: getBalance,
    
    // Admin
    isAdmin: isAdmin,
    getAllUsers: getAllUsers,
    updateUserBalance: updateUserBalance,
    deleteUser: deleteUser,
    
    // Session
    isAuthenticated: isAuthenticated,
    getCurrentUser: getCurrentUser,
    requireAuth: requireAuth,
    redirectIfAuthenticated: redirectIfAuthenticated,
    refreshSession: refreshSession,
    
    // Utilitaires
    checkPasswordStrength: checkPasswordStrength,
    formatAmount: formatAmount,
    
    // Constantes
    SUPABASE_URL: SUPABASE_URL,
    ADMIN_EMAIL: ADMIN_EMAIL,
    supabase: novabank
};

console.log('✅ NOVA BANK Auth chargé - Version adaptée');