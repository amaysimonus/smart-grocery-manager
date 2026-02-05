const { generateToken } = require('../utils/jwt');
const { prisma } = require('../config/database');

// Google OAuth callback handler
const googleCallback = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect('/login?error=oauth_failed');
    }

    // Validate user profile data
    if (!req.user.email) {
      return res.redirect('/login?error=invalid_profile');
    }

    // Generate JWT token
    const token = generateToken({
      userId: req.user.id,
      email: req.user.email
    });

    // Store session info if needed
    req.session.user = {
      id: req.user.id,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName
    };

    // Redirect to dashboard with token
    const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard?token=${token}`;
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.redirect('/login?error=oauth_failed');
  }
};

// Apple Sign-In callback handler
const appleCallback = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect('/login?error=oauth_failed');
    }

    // Validate user profile data
    if (!req.user.email) {
      return res.redirect('/login?error=invalid_profile');
    }

    // Generate JWT token
    const token = generateToken({
      userId: req.user.id,
      email: req.user.email
    });

    // Store session info if needed
    req.session.user = {
      id: req.user.id,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName
    };

    // Redirect to dashboard with token
    const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard?token=${token}`;
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Apple OAuth callback error:', error);
    res.redirect('/login?error=oauth_failed');
  }
};

// OAuth failure handler
const oauthFailure = (req, res) => {
  const { error, error_description } = req.query;
  
  // Map OAuth errors to user-friendly messages
  let errorMessage = 'oauth_failed';
  
  switch (error) {
    case 'access_denied':
      errorMessage = 'access_denied';
      break;
    case 'invalid_request':
      errorMessage = 'invalid_request';
      break;
    case 'unauthorized_client':
      errorMessage = 'unauthorized_client';
      break;
    case 'unsupported_response_type':
      errorMessage = 'unsupported_response';
      break;
    case 'invalid_scope':
      errorMessage = 'invalid_scope';
      break;
    case 'server_error':
      errorMessage = 'server_error';
      break;
    case 'temporarily_unavailable':
      errorMessage = 'service_unavailable';
      break;
    default:
      errorMessage = 'oauth_failed';
  }

  res.redirect(`/login?error=${errorMessage}`);
};

// Link OAuth provider to existing account
const linkOAuthProvider = async (req, res) => {
  try {
    const { provider } = req.params;
    const userId = req.user.id;

    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Check if OAuth provider is already linked
    const existingProvider = await prisma.oauthProvider.findFirst({
      where: {
        userId,
        provider: provider.toUpperCase()
      }
    });

    if (existingProvider) {
      return res.status(400).json({ 
        error: `${provider} account already linked` 
      });
    }

    // The actual linking happens in the Passport strategy
    // This endpoint just initiates the OAuth flow
    res.status(200).json({ 
      message: `Initiating ${provider} account linking` 
    });
  } catch (error) {
    console.error('OAuth linking error:', error);
    res.status(500).json({ error: 'Failed to link OAuth provider' });
  }
};

// Unlink OAuth provider from account
const unlinkOAuthProvider = async (req, res) => {
  try {
    const { provider } = req.params;
    const userId = req.user.id;

    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Check if user has password (required for unlinking OAuth)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true }
    });

    if (!user || !user.password) {
      return res.status(400).json({ 
        error: 'Cannot unlink OAuth provider without password. Please set a password first.' 
      });
    }

    // Delete OAuth provider record
    const deletedProvider = await prisma.oauthProvider.deleteMany({
      where: {
        userId,
        provider: provider.toUpperCase()
      }
    });

    if (deletedProvider.count === 0) {
      return res.status(404).json({ 
        error: `${provider} account not found` 
      });
    }

    res.status(200).json({ 
      message: `${provider} account unlinked successfully` 
    });
  } catch (error) {
    console.error('OAuth unlinking error:', error);
    res.status(500).json({ error: 'Failed to unlink OAuth provider' });
  }
};

// Get linked OAuth providers for user
const getLinkedProviders = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userId = req.user.id;

    const providers = await prisma.oauthProvider.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        createdAt: true
      }
    });

    res.status(200).json({ providers });
  } catch (error) {
    console.error('Get OAuth providers error:', error);
    res.status(500).json({ error: 'Failed to get OAuth providers' });
  }
};

module.exports = {
  googleCallback,
  appleCallback,
  oauthFailure,
  linkOAuthProvider,
  unlinkOAuthProvider,
  getLinkedProviders
};