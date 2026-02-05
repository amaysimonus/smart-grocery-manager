const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const AppleStrategy = require('passport-apple').Strategy;
const { prisma } = require('./database');

// Serialize user into session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        oauthProviders: true
      }
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
  scope: ['profile', 'email'],
  state: true,
  passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
  try {
    // Extract user information from Google profile
    const email = profile.emails?.[0]?.value;
    const firstName = profile.name?.givenName || profile.displayName?.split(' ')[0] || '';
    const lastName = profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ') || '';
    const avatar = profile.photos?.[0]?.value;

    if (!email) {
      return done(new Error('No email provided by Google'), null);
    }

    // Check if this is an account linking request
    const isLinking = req.session.linkAccount && req.user;
    
    if (isLinking) {
      // Link OAuth provider to existing user
      const existingOAuthProvider = await prisma.oauthProvider.findUnique({
        where: {
          provider_providerId: {
            provider: 'GOOGLE',
            providerId: profile.id
          }
        }
      });

      if (existingOAuthProvider) {
        return done(new Error('Google account already linked to another user'), null);
      }

      // Create OAuth provider record for existing user
      await prisma.oauthProvider.create({
        data: {
          userId: req.user.id,
          provider: 'GOOGLE',
          providerId: profile.id,
          accessToken,
          refreshToken
        }
      });

      return done(null, req.user);
    }

    // Check if user exists by email
    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        oauthProviders: true
      }
    });

    // Check if OAuth provider exists for this user
    const existingOAuthProvider = await prisma.oauthProvider.findUnique({
      where: {
        provider_providerId: {
          provider: 'GOOGLE',
          providerId: profile.id
        }
      }
    });

    if (user && !existingOAuthProvider) {
      // User exists but no Google OAuth provider - link it
      await prisma.oauthProvider.create({
        data: {
          userId: user.id,
          provider: 'GOOGLE',
          providerId: profile.id,
          accessToken,
          refreshToken
        }
      });
    } else if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          avatar,
          password: '', // OAuth users don't have passwords
          emailVerified: true // OAuth emails are pre-verified
        }
      });

      // Create OAuth provider record
      await prisma.oauthProvider.create({
        data: {
          userId: user.id,
          provider: 'GOOGLE',
          providerId: profile.id,
          accessToken,
          refreshToken
        }
      });
    } else if (existingOAuthProvider) {
      // Update tokens if they exist
      await prisma.oauthProvider.update({
        where: { id: existingOAuthProvider.id },
        data: {
          accessToken: accessToken || existingOAuthProvider.accessToken,
          refreshToken: refreshToken || existingOAuthProvider.refreshToken
        }
      });
    }

    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

// Apple Sign-In Strategy
passport.use(new AppleStrategy({
  clientID: process.env.APPLE_CLIENT_ID,
  teamID: process.env.APPLE_TEAM_ID,
  keyID: process.env.APPLE_KEY_ID,
  keyFilePath: process.env.APPLE_KEY_FILE_PATH,
  callbackURL: process.env.APPLE_CALLBACK_URL || '/auth/apple/callback',
  scope: ['name', 'email'],
  state: true,
  passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
  try {
    // Extract user information from Apple profile
    const email = profile.email || profile.emails?.[0]?.value;
    const name = profile.name || profile.displayName || '';
    const firstName = name.givenName || name.split(' ')[0] || '';
    const lastName = name.familyName || name.split(' ').slice(1).join(' ') || '';

    if (!email) {
      return done(new Error('No email provided by Apple'), null);
    }

    // Check if this is an account linking request
    const isLinking = req.session.linkAccount && req.user;
    
    if (isLinking) {
      // Link OAuth provider to existing user
      const existingOAuthProvider = await prisma.oauthProvider.findUnique({
        where: {
          provider_providerId: {
            provider: 'APPLE',
            providerId: profile.id
          }
        }
      });

      if (existingOAuthProvider) {
        return done(new Error('Apple account already linked to another user'), null);
      }

      // Create OAuth provider record for existing user
      await prisma.oauthProvider.create({
        data: {
          userId: req.user.id,
          provider: 'APPLE',
          providerId: profile.id,
          accessToken,
          refreshToken
        }
      });

      return done(null, req.user);
    }

    // Check if user exists by email
    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        oauthProviders: true
      }
    });

    // Check if OAuth provider exists for this user
    const existingOAuthProvider = await prisma.oauthProvider.findUnique({
      where: {
        provider_providerId: {
          provider: 'APPLE',
          providerId: profile.id
        }
      }
    });

    if (user && !existingOAuthProvider) {
      // User exists but no Apple OAuth provider - link it
      await prisma.oauthProvider.create({
        data: {
          userId: user.id,
          provider: 'APPLE',
          providerId: profile.id,
          accessToken,
          refreshToken
        }
      });
    } else if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          password: '', // OAuth users don't have passwords
          emailVerified: true // OAuth emails are pre-verified
        }
      });

      // Create OAuth provider record
      await prisma.oauthProvider.create({
        data: {
          userId: user.id,
          provider: 'APPLE',
          providerId: profile.id,
          accessToken,
          refreshToken
        }
      });
    } else if (existingOAuthProvider) {
      // Update tokens if they exist
      await prisma.oauthProvider.update({
        where: { id: existingOAuthProvider.id },
        data: {
          accessToken: accessToken || existingOAuthProvider.accessToken,
          refreshToken: refreshToken || existingOAuthProvider.refreshToken
        }
      });
    }

    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

// Helper function to generate state parameter for CSRF protection
const generateState = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Helper function to validate state parameter
const validateState = (req, res, next) => {
  const { state } = req.query;
  const { oauthState } = req.session;

  if (!state || !oauthState || state !== oauthState) {
    return res.redirect('/login?error=invalid_state');
  }

  // Clear state from session
  delete req.session.oauthState;
  next();
};

module.exports = {
  passport,
  generateState,
  validateState
};