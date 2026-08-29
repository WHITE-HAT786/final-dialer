// Test IDs for the auth feature (sign in, two-factor, sign up, password reset,
// logout) — consumed via React Native's `testID` prop on TouchableOpacity /
// Pressable / TextInput / Button / Switch and friends. Add new keys here as you
// wire up additional auth UI; see ./index.js for the recipe to add a new
// feature file.
//
// React Native uses `testID` (camelCase, no dash), not `data-testid`:
//   import { LOGIN } from '../constants/testIds';
//   <TouchableOpacity testID={LOGIN.submitButton} onPress={...} />
//   <TextInput testID={LOGIN.emailInput} ... />
//
// Directive:
//   - Keys are camelCase, values are kebab-case shaped as `<feature>-<element>`
//     (or `<feature>-<element>-<qualifier>` when an element repeats). Examples:
//     'login-submit-button', 'cart-quantity-input', 'product-card-image'.
//
// Why kebab-case values: required by qabot's CSS-attribute-style selector
// matcher and the lint rule `emergent(kebab-case-testid-prop)`.

export const LOGIN = {
	emailInput: 'login-email-input',
	passwordInput: 'login-password-input',
	togglePassword: 'login-toggle-password',
	submitButton: 'login-submit-button',
	googleButton: 'login-google-button',
	error: 'login-error',
	forgotPasswordLink: 'login-forgot-password-link',
	registerLink: 'login-register-link',
};

// The 2FA step the password step hands off to, on its own route.
export const TWO_FACTOR = {
	codeInput: 'two-factor-code-input',
	submitButton: 'two-factor-submit-button',
	resendLink: 'two-factor-resend-link',
	emailFallback: 'two-factor-email-fallback',
	backButton: 'two-factor-back-button',
	error: 'two-factor-error',
};

export const REGISTER = {
	nameInput: 'register-name-input',
	emailInput: 'register-email-input',
	usernameInput: 'register-username-input',
	phoneInput: 'register-phone-input',
	passwordInput: 'register-password-input',
	passwordConfirmInput: 'register-password-confirm-input',
	togglePassword: 'register-toggle-password',
	togglePasswordConfirm: 'register-toggle-password-confirm',
	timezoneSelect: 'register-timezone-select',
	termsCheckbox: 'register-terms-checkbox',
	submitButton: 'register-submit-button',
	googleButton: 'register-google-button',
	backButton: 'register-back-button',
	error: 'register-error',
	loginLink: 'register-login-link',
};

export const FORGOT_PASSWORD = {
	emailInput: 'forgot-password-email-input',
	submitButton: 'forgot-password-submit-button',
	sentNotice: 'forgot-password-sent',
	backButton: 'forgot-password-back-button',
	backLink: 'forgot-password-back-link',
	error: 'forgot-password-error',
};

export const LOGOUT = {
	button: 'logout-button',
};
