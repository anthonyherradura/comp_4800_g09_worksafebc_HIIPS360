// Shared by the browser forms and the API (server/routes/auth.js), so the rules live in one place.
// Plain ESM with no browser APIs: keep it that way so the server can import it.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;
// bcrypt ignores everything past 72 bytes, so longer passwords would only look stronger
export const MAX_PASSWORD_LENGTH = 72;

const checkEmail = (email) => {
    if (!email.trim()) return "Enter your email address.";
    if (!EMAIL_PATTERN.test(email.trim())) return "Enter an email address like name@example.com.";
    return null;
};

export function validateLogin({ email, password }) {
    const errors = {};
    const emailError = checkEmail(email);
    if (emailError) errors.email = emailError;
    if (!password) errors.password = "Enter your password.";
    return errors;
}

export function validateAccount({ name, email, password }) {
    const errors = {};
    if (!name.trim()) errors.name = "Enter your full name.";
    const emailError = checkEmail(email);
    if (emailError) errors.email = emailError;
    if (password.length < MIN_PASSWORD_LENGTH) {
        errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    } else if (new TextEncoder().encode(password).length > MAX_PASSWORD_LENGTH) {
        errors.password = `Use ${MAX_PASSWORD_LENGTH} characters or fewer.`;
    }
    return errors;
}

export function validateRegister({ name, email, password, confirmPassword }) {
    const errors = validateAccount({ name, email, password });
    if (!confirmPassword) errors.confirmPassword = "Enter your password again.";
    else if (confirmPassword !== password) errors.confirmPassword = "Passwords don't match.";
    return errors;
}
