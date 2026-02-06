const express = require('express');
const passportLib = require('passport');
const { generateState, validateState } = require('../config/passport');
const {
  googleCallback,
  appleCallback,
  oauthFailure,
  linkOAuthProvider,
  unlinkOAuthProvider,
  getLinkedProviders
} = require('../controllers/oauthController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Initialize Passport
router.use(passportLib.initialize());
router.use(passportLib.session());

// Google OAuth routes
router.get('/google', (req, res, next) => {
  // Generate and store state parameter for CSRF protection
  const state = generateState();
  req.session.oauthState = state;
  
  passportLib.authenticate('google', {
    scope: ['profile', 'email'],
    state: state
  })(req, res, next);
});

router.get('/google/callback', 
  validateState,
  passportLib.authenticate('google', { 
    failureRedirect: '/login?error=google_failed',
    session: true 
  }),
  googleCallback
);

// Apple Sign-In routes
router.get('/apple', (req, res, next) => {
  // Generate and store state parameter for CSRF protection
  const state = generateState();
  req.session.oauthState = state;
  
  passportLib.authenticate('apple', {
    scope: ['name', 'email'],
    state: state
  })(req, res, next);
});

router.get('/apple/callback',
  validateState,
  passportLib.authenticate('apple', { 
    failureRedirect: '/login?error=apple_failed',
    session: true 
  }),
  appleCallback
);

// OAuth failure handler
router.get('/failure', oauthFailure);

// OAuth provider management (requires authentication)
router.get('/providers', authMiddleware, getLinkedProviders);

router.post('/link/:provider', authMiddleware, linkOAuthProvider);
router.delete('/unlink/:provider', authMiddleware, unlinkOAuthProvider);

// OAuth linking routes (for existing users)
router.get('/link/google', authMiddleware, (req, res, next) => {
  const state = generateState();
  req.session.oauthState = state;
  req.session.linkAccount = true;
  
  passportLib.authenticate('google', {
    scope: ['profile', 'email'],
    state: state
  })(req, res, next);
});

router.get('/link/apple', authMiddleware, (req, res, next) => {
  const state = generateState();
  req.session.oauthState = state;
  req.session.linkAccount = true;
  
  passportLib.authenticate('apple', {
    scope: ['name', 'email'],
    state: state
  })(req, res, next);
});

// OAuth linking callbacks
router.get('/link/google/callback',
  validateState,
  passportLib.authenticate('google', { 
    failureRedirect: '/settings?error=google_link_failed',
    session: true 
  }),
  async (req, res) => {
    try {
      if (req.session.linkAccount) {
        delete req.session.linkAccount;
        return res.redirect('/settings?success=google_linked');
      }
      res.redirect('/dashboard');
    } catch (error) {
      console.error('Google linking callback error:', error);
      res.redirect('/settings?error=google_link_failed');
    }
  }
);

router.get('/link/apple/callback',
  validateState,
  passportLib.authenticate('apple', { 
    failureRedirect: '/settings?error=apple_link_failed',
    session: true 
  }),
  async (req, res) => {
    try {
      if (req.session.linkAccount) {
        delete req.session.linkAccount;
        return res.redirect('/settings?success=apple_linked');
      }
      res.redirect('/dashboard');
    } catch (error) {
      console.error('Apple linking callback error:', error);
      res.redirect('/settings?error=apple_link_failed');
    }
  }
);

module.exports = router;