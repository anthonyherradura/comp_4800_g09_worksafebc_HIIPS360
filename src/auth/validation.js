// Client-side checks only. The server must validate again once it exists.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

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

export function validateRegister({ name, email, password, confirmPassword }) {
    const errors = {};
    if (!name.trim()) errors.name = "Enter your full name.";
    const emailError = checkEmail(email);
    if (emailError) errors.email = emailError;
    if (password.length < MIN_PASSWORD_LENGTH) {
        errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (!confirmPassword) errors.confirmPassword = "Enter your password again.";
    else if (confirmPassword !== password) errors.confirmPassword = "Passwords don't match.";
    return errors;
}
