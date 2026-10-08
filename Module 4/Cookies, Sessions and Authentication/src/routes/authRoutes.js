const express = require("express");
const authService = require("../services/authService");

const router = express.Router();

const INVALID_CREDENTIALS_BODY = {
  error: {
    code: "INVALID_CREDENTIALS",
    message: "Invalid email or password",
  },
};

router.post("/register", async (req, res) => {
  try {
    const user = await authService.register(req.body || {});

    return res.status(201).json({
      data: user,
    });
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({
        error: {
          code: "INVALID_INPUT",
          message: "Name, email, and password are required",
        },
      });
    }

    if (error.status === 409) {
      return res.status(409).json({
        error: {
          code: "EMAIL_EXISTS",
          message: "An account with this email already exists",
        },
      });
    }

    // Do not expose Prisma/bcrypt details.
    console.error("Registration failed");

    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const user = await authService.login(req.body || {});

    return res.status(200).json({
      data: user,
    });
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({
        error: {
          code: "INVALID_INPUT",
          message: "Email and password are required",
        },
      });
    }

    if (error.status === 401) {
      // EXACT same JSON body for unknown email and wrong password.
      return res.status(401).json(INVALID_CREDENTIALS_BODY);
    }

    // Do not expose internal implementation details.
    console.error("Login failed");

    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
    });
  }
});

module.exports = router;
