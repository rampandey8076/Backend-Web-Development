const bcrypt = require("bcryptjs");
const userRepository = require("../repositories/userRepository");

const COST_FACTOR = 12;

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function safeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}

function invalidInput(message) {
  const error = new Error(message);
  error.status = 400;
  error.code = "INVALID_INPUT";
  return error;
}

function invalidCredentials() {
  const error = new Error("Invalid email or password");
  error.status = 401;
  error.code = "INVALID_CREDENTIALS";
  return error;
}

async function register({ name, email, password }) {
  // Validate before expensive bcrypt/database work.
  if (
    !isNonEmptyString(name) ||
    !isNonEmptyString(email) ||
    !isNonEmptyString(password)
  ) {
    throw invalidInput("Name, email, and password are required");
  }

  const normalizedEmail = normalizeEmail(email);

  const existingUser =
    await userRepository.findByEmail(normalizedEmail);

  if (existingUser) {
    const error = new Error(
      "An account with this email already exists"
    );

    error.status = 409;
    error.code = "EMAIL_EXISTS";

    throw error;
  }

  // Store only the bcrypt hash.
  const passwordHash = await bcrypt.hash(
    password,
    COST_FACTOR
  );

  const user = await userRepository.createUser({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
  });

  // Explicit allowlist. Never expose passwordHash.
  return safeUser(user);
}

async function login({ email, password }) {
  if (
    !isNonEmptyString(email) ||
    !isNonEmptyString(password)
  ) {
    throw invalidInput("Email and password are required");
  }

  const normalizedEmail = normalizeEmail(email);

  const user =
    await userRepository.findByEmail(normalizedEmail);

  if (!user) {
    throw invalidCredentials();
  }

  // Candidate password first, stored hash second.
  const valid = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!valid) {
    throw invalidCredentials();
  }

  return safeUser(user);
}

module.exports = {
  register,
  login,
};
